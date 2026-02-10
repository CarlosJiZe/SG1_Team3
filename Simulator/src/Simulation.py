"""
Simulation Module - Main orchestrator for GreenGrid digital twin

This module coordinates all components and runs the discrete-event simulation.
"""

import simpy
import json
from datetime import datetime, timedelta
import random

from .Battery import Battery
from .SolarPanel import SolarPanel
from .CloudCoverage import CloudCoverage
from .Inverter import Inverter
from .Load import Load
from .Grid import Grid
from .EnergyManagementSystem import EnergyManagementSystem

class Simulation:
    """
    Main simulation orchestrator using SimPy discrete-event simulation.
    
    Coordinates all system components and manages energy flow through time.
    """
    
    def __init__(self, config_path='config.json'):
        """
        Initialize simulation with configuration.
        
        Args:
            config_path (str): Path to configuration JSON file
        """
        # Load configuration
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        # Create SimPy environment
        self.env = simpy.Environment()
        
        print("\n" + "=" * 70)
        print("GREENGRID SIMULATION - STARTING")
        print("=" * 70)
        print(f"Duration: {self.config['simulation']['duration_days']} days")
        print(f"Start date: {self.config['simulation']['start_date']}")
        print(f"Season: {self.config['simulation']['season']}")
        print(f"Strategy: {self.config['energy_management']['strategy']}")
        print(f"Time step: {self.config['simulation']['time_step_minutes']} minutes")
        
        # Handle random seed for reproducibility
        config_seed = self.config['simulation'].get('random_seed', None)
        
        if config_seed is None:
            # Generate random seed based on current time
            import time
            self.actual_seed = int(time.time() * 1000000) % 2147483647  # Max int32
            print(f"Random seed: {self.actual_seed} (auto-generated)")
            print(f"  -> Add to config.json to reproduce these exact results")
        else:
            self.actual_seed = config_seed
            print(f"Random seed: {self.actual_seed} (from config - reproducible)")
        
        # Set the seed
        random.seed(self.actual_seed)
        
        # Store the actual seed used in config for logging
        self.config['simulation']['actual_seed_used'] = self.actual_seed
        
        # Calculate component counts and total capacities
        battery_count = self.config['battery'].get('count', 1)
        battery_unit = self.config['battery']['unit_capacity_kwh']
        battery_total = battery_count * battery_unit
        
        solar_count = self.config['solar'].get('count', 1)
        solar_unit = self.config['solar']['unit_peak_power_kw']
        solar_total = solar_count * solar_unit
        
        inverter_count = self.config['inverter'].get('count', 1)
        inverter_unit = self.config['inverter']['unit_max_output_kw']
        inverter_total = inverter_count * inverter_unit
        
        print("\nSystem Configuration:")
        print(f"  Battery: {battery_total} kWh")
        print(f"  Solar: {solar_total} kW peak")
        print(f"  Inverter: {inverter_total} kW max output")
        
        # Store counts for reporting
        self.battery_count = battery_count
        self.solar_count = solar_count
        self.inverter_count = inverter_count
        
        # Initialize components with total capacities
        self.battery = Battery(
            capacity_kwh=battery_total,
            efficiency=self.config['battery']['efficiency'],
            min_soc=self.config['battery']['min_soc']
        )
        
        self.solar_panel = SolarPanel(
            peak_power_kw=solar_total
        )
        
        self.cloud_coverage = CloudCoverage(
            season=self.config['simulation']['season']
        )
        
        self.inverter = Inverter(
            max_output_kw=inverter_total,
            failure_rate=self.config['inverter']['failure_rate'],
            min_failure_duration=self.config['inverter']['min_failure_duration_hours'],
            max_failure_duration=self.config['inverter']['max_failure_duration_hours']
        )
        
        self.load = Load(
            base_load_kw=self.config['load']['base_load_kw'],
            peak_hours_max_kw=self.config['load']['peak_hours_max_kw'],
            peak_hours_start=self.config['load']['peak_hours_start'],
            peak_hours_end=self.config['load']['peak_hours_end']
        )
        
        self.grid = Grid(
            import_cost_per_kwh=self.config['grid']['import_cost_per_kwh'],
            export_revenue_per_kwh=self.config['grid']['export_revenue_per_kwh'],
            export_limit_kw=self.config['grid']['export_limit_kw']
        )
        
        self.ems = EnergyManagementSystem(
            strategy=self.config['energy_management']['strategy']
        )
        
        # Data collection
        self.hourly_data = []
        self.daily_summaries = []
        self.events_log = []
        
        # Simulation parameters
        self.duration_days = self.config['simulation']['duration_days']
        self.time_step_minutes = self.config['simulation']['time_step_minutes']
        self.start_date = datetime.strptime(
            self.config['simulation']['start_date'], 
            '%Y-%m-%d'
        )
        
        # Daily cloud coverage (will be updated each day)
        self.current_cloud_coverage = self.cloud_coverage.get_daily_coverage()
    
    def run(self):
        """
        Run the simulation.
        
        Returns:
            dict: Simulation results including all data and statistics
        """
        print("-" * 70)
        
        # Calculate total steps
        total_steps = (self.duration_days * 24 * 60) // self.time_step_minutes
        print(f"Simulating {self.duration_days * 24} hours ({self.duration_days} days)...")
        print(f"Time step: {self.time_step_minutes} min ({total_steps} total steps)")
        
        # Register simulation process
        self.env.process(self._simulation_loop())
        
        # Run simulation
        self.env.run()
        
        print("-" * 70)
        print("SIMULATION COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        
        # Compile results
        return self._compile_results()
    
    def _simulation_loop(self):
        """
        Main simulation loop (SimPy generator process).
        
        Yields:
            simpy.Timeout: Time advancement events
        """
        current_step = 0
        total_steps = (self.duration_days * 24 * 60) // self.time_step_minutes
        time_step_hours = self.time_step_minutes / 60.0
        
        # Calculate steps per day for day detection
        steps_per_day = (24 * 60) // self.time_step_minutes
        
        # Daily accumulators
        daily_solar = 0
        daily_load = 0
        daily_grid_import = 0
        daily_grid_export = 0
        daily_curtailed = 0
        current_day = 0
        
        while current_step < total_steps:
            # ========== CALCULATE CURRENT TIME (BEFORE STEP) ==========
            # This is used for solar generation and load calculation
            minutes_since_midnight = (current_step * self.time_step_minutes) % (24 * 60)
            hour_of_day = minutes_since_midnight / 60.0
            
            # Calculate current date
            current_date = self.start_date + timedelta(
                minutes=current_step * self.time_step_minutes
            )
            
            # ========== GENERATE SOLAR POWER ==========
            solar_available = self.solar_panel.generate(
                hour_of_day,
                self.current_cloud_coverage
            )
            
            # Apply inverter limits and check for failures
            if self.inverter.is_operational():
                solar_generated = self.inverter.apply_limit(solar_available)
            else:
                solar_generated = 0  # No solar during inverter failure
            
            # ========== GENERATE LOAD DEMAND ==========
            load_demand = self.load.generate(hour=hour_of_day)
            
            # ========== DISTRIBUTE ENERGY USING EMS ==========
            flows = self.ems.distribute_energy(
                solar_kw=solar_generated,
                load_kw=load_demand,
                battery=self.battery,
                grid=self.grid,
                time_step_hours=time_step_hours
            )
            
            # ========== LOG HOURLY DATA ==========
            self.hourly_data.append({
                'timestamp': current_date.strftime('%Y-%m-%d %H:%M:%S'),
                'step': current_step,
                'hour': hour_of_day,
                'solar_generated_kw': solar_generated,
                'solar_available_kw': solar_available,
                'load_demand_kw': load_demand,
                'cloud_coverage': self.current_cloud_coverage,
                'battery_soc': self.battery.get_soc(),
                'solar_to_load': flows['solar_to_load'],
                'solar_to_battery': flows['solar_to_battery'],
                'solar_to_grid': flows['solar_to_grid'],
                'battery_to_load': flows['battery_to_load'],
                'grid_to_load': flows['grid_to_load'],
                'unmet_load': flows['unmet_load'],
                'curtailed': flows['curtailed'],
                'inverter_operational': self.inverter.is_operational()
            })
            
            # ========== UPDATE DAILY TOTALS ==========
            # Curtailed is NOT counted in solar_generated
            daily_solar += (
                flows['solar_to_load'] + 
                flows['solar_to_battery'] + 
                flows['solar_to_grid']
            ) * time_step_hours
            
            daily_load += load_demand * time_step_hours
            daily_grid_import += flows['grid_to_load'] * time_step_hours
            daily_grid_export += flows['solar_to_grid'] * time_step_hours
            daily_curtailed += flows['curtailed'] * time_step_hours
            
            # ========== ADVANCE TIME ==========
            yield self.env.timeout(self.time_step_minutes)
            current_step += 1
            
            # ========== UPDATE INVERTER (EVERY TIMESTEP) ==========
            self.inverter.update(time_step_hours)
            
            # ========== CHECK FOR NEW DAY (AFTER INCREMENT) ==========
            if current_step % steps_per_day == 0 and current_step > 0:
                # Correct self-sufficiency formula in daily summary
                daily_self_sufficiency = (
                    (1 - daily_grid_import / daily_load)
                ) * 100 if daily_load > 0 else 0
                
                # Log daily summary
                self._log_daily_summary(
                    current_day,
                    daily_solar,
                    daily_load,
                    daily_grid_import,
                    daily_grid_export,
                    daily_curtailed,
                    daily_self_sufficiency
                )
                
                # Reset daily accumulators
                daily_solar = 0
                daily_load = 0
                daily_grid_import = 0
                daily_grid_export = 0
                daily_curtailed = 0
                current_day += 1
                
                # Progress indicator
                if current_day % 5 == 0:
                    print(f"  Day {current_day}/{self.duration_days} completed ({current_day/self.duration_days*100:.1f}%)")
                
                # Check for inverter failure (once per day at day start)
                self.inverter.check_failure()
                
                # Log inverter failure events
                if self.inverter._is_failing:
                    event_msg = f"Inverter FAILURE (remaining: {self.inverter._failure_hours_remaining}h)"
                    print(f"  EVENT: {event_msg}")
                    self.events_log.append({
                        'timestamp': current_date.strftime('%Y-%m-%d %H:%M:%S'),
                        'message': event_msg
                    })
                
                # Generate new cloud coverage for next day
                self.current_cloud_coverage = self.cloud_coverage.get_daily_coverage()
        
        # Log final day if incomplete
        if daily_solar > 0 or daily_load > 0:
            daily_self_sufficiency = (
                (1 - daily_grid_import / daily_load)
            ) * 100 if daily_load > 0 else 0
            
            self._log_daily_summary(
                current_day,
                daily_solar,
                daily_load,
                daily_grid_import,
                daily_grid_export,
                daily_curtailed,
                daily_self_sufficiency
            )
    
    def _log_daily_summary(self, day, solar, load, grid_import, grid_export, 
                          curtailed, self_sufficiency):
        """
        Log daily summary statistics.
        
        Args:
            day (int): Day number
            solar (float): Solar energy generated (kWh)
            load (float): Load consumed (kWh)
            grid_import (float): Energy imported from grid (kWh)
            grid_export (float): Energy exported to grid (kWh)
            curtailed (float): Energy curtailed (kWh)
            self_sufficiency (float): Self-sufficiency percentage
        """
        self.daily_summaries.append({
            'day': day + 1,
            'solar_generated_kwh': solar,
            'load_consumed_kwh': load,
            'grid_imported_kwh': grid_import,
            'grid_exported_kwh': grid_export,
            'curtailed_kwh': curtailed,
            'battery_soc_end': self.battery.get_soc(),
            'self_sufficiency_percent': self_sufficiency
        })
    
    def _compile_results(self):
        """
        Compile all simulation results.
        
        Returns:
            dict: Complete results dictionary
        """
        # Calculate totals
        total_solar = sum(d['solar_generated_kwh'] for d in self.daily_summaries)
        total_load = sum(d['load_consumed_kwh'] for d in self.daily_summaries)
        total_grid_import = sum(d['grid_imported_kwh'] for d in self.daily_summaries)
        total_grid_export = sum(d['grid_exported_kwh'] for d in self.daily_summaries)
        total_curtailed = sum(d['curtailed_kwh'] for d in self.daily_summaries)
        
        # Calculate financial
        total_import_cost = total_grid_import * self.config['grid']['import_cost_per_kwh']
        total_export_revenue = total_grid_export * self.config['grid']['export_revenue_per_kwh']
        net_cost = total_import_cost - total_export_revenue
        
        # Calculate battery statistics
        soc_values = [h['battery_soc'] for h in self.hourly_data]
        avg_soc = sum(soc_values) / len(soc_values) if soc_values else 0
        final_soc = self.battery.get_soc()
        
        # Use config values instead of hardcoded thresholds
        min_soc_threshold = self.config['battery']['min_soc'] * 100
        max_soc_threshold = 100.0  # Always 100% for full
        
        battery_full_count = sum(
            1 for h in self.hourly_data 
            if h['battery_soc'] >= (max_soc_threshold - 0.1)
        )
        
        battery_empty_count = sum(
            1 for h in self.hourly_data 
            if h['battery_soc'] <= (min_soc_threshold + 0.1)
        )
        
        # Calculate reliability metrics
        inverter_failures = len([e for e in self.events_log if 'FAILURE' in e['message']])
        
        # Calculate inverter downtime from hourly data
        downtime_hours = sum(
            1 for h in self.hourly_data 
            if not h['inverter_operational']
        ) * (self.time_step_minutes / 60.0)
        
        time_step_hours = self.time_step_minutes / 60.0
        unmet_load_hours = sum(1 for h in self.hourly_data if h['unmet_load'] > 0) * time_step_hours
        total_hours = len(self.hourly_data) * time_step_hours
        unmet_load_percentage = (unmet_load_hours / total_hours * 100) if total_hours > 0 else 0
        
        # Correct self-sufficiency formula
        self_sufficiency = (
            (1 - total_grid_import / total_load)
        ) * 100 if total_load > 0 else 0
        
        return {
            'summary': {
                'duration_days': self.duration_days,
                'season': self.config['simulation']['season'],
                'strategy': self.config['energy_management']['strategy'],
                'total_solar_generated_kwh': total_solar,
                'total_load_consumed_kwh': total_load,
                'total_grid_imported_kwh': total_grid_import,
                'total_grid_exported_kwh': total_grid_export,
                'total_curtailed_kwh': total_curtailed,
                'self_sufficiency_percent': self_sufficiency
            },
            'financial': {
                'total_import_cost': total_import_cost,
                'total_export_revenue': total_export_revenue,
                'net_cost': net_cost
            },
            'battery': {
                'average_soc_percent': avg_soc,
                'final_soc_percent': final_soc,
                'capacity_kwh': self.battery._capacity_kwh,
                'count': self.battery_count,
                'times_full': battery_full_count,
                'times_empty': battery_empty_count
            },
            'reliability': {
                'inverter_failures': inverter_failures,
                'inverter_downtime_hours': downtime_hours,
                'total_unmet_load_kwh': total_grid_import,
                'hours_with_unmet_load': unmet_load_hours,
                'unmet_load_percentage': unmet_load_percentage
            },
            'system': {
                'battery_count': self.battery_count,
                'solar_panel_count': self.solar_count,
                'inverter_count': self.inverter_count
            },
            'data': {
                'hourly_data': self.hourly_data,
                'daily_summaries': self.daily_summaries,
                'events_log': self.events_log
            }
        }