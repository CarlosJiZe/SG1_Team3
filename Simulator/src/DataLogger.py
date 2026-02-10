import csv
import json
from datetime import datetime
import os

class DataLogger:
    """
    Handles data export for simulation results.
    
    Exports data in formats ready for:
    - Phase 2: Web-based visualization dashboard
    - Phase 3: Machine learning integration
    """
    
    def __init__(self, results, config, output_dir='results'):
        """
        Initialize data logger with simulation results.
        
        Args:
            results (dict): Simulation results from Simulation.run()
            config (dict): Configuration used for the simulation
            output_dir (str): Base directory to save output files
        """
        self.results = results
        self.config = config
        
        # Generate timestamp for folder naming
        self.timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Get key parameters for descriptive folder name
        strategy = config['energy_management']['strategy']
        season = config['simulation']['season']
        days = config['simulation']['duration_days']
        
        # Create descriptive folder name
        folder_name = f"sim_{self.timestamp}_{strategy}_{season}_{days}d"
        self.run_folder = os.path.join(output_dir, folder_name)
        
        # Create the folder
        os.makedirs(self.run_folder, exist_ok=True)
        
        print(f"\nSaving to: {self.run_folder}")
    
    def save_all(self):
        """
        Save all required data for project deliverables.
        
        Returns:
            dict: Paths to saved files
        """
        print("\n" + "=" * 70)
        print("EXPORTING SIMULATION DATA")
        print("=" * 70)
        
        saved_files = {}
        
        # Core data files (required for visualization phase)
        saved_files['hourly_csv'] = self.save_hourly_data()
        saved_files['daily_csv'] = self.save_daily_summaries()
        saved_files['events_csv'] = self.save_events_log()
        
        # Configuration (for reproducibility)
        saved_files['config_json'] = self.save_config()
        
        # Summary for quick analysis
        saved_files['summary_json'] = self.save_summary_json()
        
        # Answers to document questions (for report)
        saved_files['answers_txt'] = self.save_answers()
        
        print("\nAll data exported successfully!")
        print(f"Ready for Phase 2 (Visualization) and Phase 3 (ML)")
        
        return saved_files
    
    def save_hourly_data(self):
        """
        Export hourly data to CSV (for visualization dashboard).
        
        Returns:
            str: Path to saved file
        """
        filename = os.path.join(self.run_folder, "hourly_data.csv")
        
        if not self.results['data']['hourly_data']:
            print("  Warning: No hourly data")
            return None
        
        fieldnames = self.results['data']['hourly_data'][0].keys()
        
        with open(filename, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(self.results['data']['hourly_data'])
        
        rows = len(self.results['data']['hourly_data'])
        print(f"  Hourly data: {rows} rows")
        return filename
    
    def save_daily_summaries(self):
        """
        Export daily summaries to CSV.
        
        Returns:
            str: Path to saved file
        """
        filename = os.path.join(self.run_folder, "daily_summaries.csv")
        
        if not self.results['data']['daily_summaries']:
            print("  Warning: No daily summaries")
            return None
        
        fieldnames = self.results['data']['daily_summaries'][0].keys()
        
        with open(filename, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(self.results['data']['daily_summaries'])
        
        rows = len(self.results['data']['daily_summaries'])
        print(f"  Daily summaries: {rows} days")
        return filename
    
    def save_events_log(self):
        """
        Export events log to CSV.
        
        Returns:
            str: Path to saved file
        """
        filename = os.path.join(self.run_folder, "events_log.csv")
        
        if not self.results['data']['events_log']:
            with open(filename, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=['timestamp', 'message'])
                writer.writeheader()
            print(f"  Events log: 0 events")
            return filename
        
        fieldnames = self.results['data']['events_log'][0].keys()
        
        with open(filename, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(self.results['data']['events_log'])
        
        rows = len(self.results['data']['events_log'])
        print(f"  Events log: {rows} events")
        return filename
    
    def save_config(self):
        """
        Save configuration (including actual seed used for reproducibility).
        
        Returns:
            str: Path to saved file
        """
        filename = os.path.join(self.run_folder, "config.json")
        
        with open(filename, 'w') as f:
            json.dump(self.config, f, indent=2)
        
        seed = self.config['simulation'].get('actual_seed_used', 'N/A')
        print(f"  Configuration saved (seed: {seed})")
        return filename
    
    def save_summary_json(self):
        """
        Save summary statistics as JSON.
        
        Returns:
            str: Path to saved file
        """
        filename = os.path.join(self.run_folder, "summary.json")
        
        summary = {
            'simulation': self.results['summary'],
            'financial': self.results['financial'],
            'battery': self.results['battery'],
            'reliability': self.results['reliability'],
            'system': self.results['system']
        }
        
        with open(filename, 'w') as f:
            json.dump(summary, f, indent=2)
        
        print(f"  Summary JSON saved")
        return filename
    
    def save_answers(self):
        """
        Save answers to all document questions.
        
        Returns:
            str: Path to saved file
        """
        filename = os.path.join(self.run_folder, "answers.txt")
        
        answers_text = self._generate_answers()
        
        with open(filename, 'w') as f:
            f.write(answers_text)
        
        print(f"  Answers document saved")
        return filename
    
    def _generate_answers(self):
        """
        Generate answers to all questions from the document.
        
        Returns:
            str: Formatted answers
        """
        answers = []
        answers.append("=" * 70)
        answers.append("ANSWERS TO PROJECT QUESTIONS")
        answers.append("=" * 70)
        
        duration_days = self.results['summary']['duration_days']
        months = duration_days / 30.0
        
        # Show the actual seed used
        actual_seed = self.config['simulation'].get('actual_seed_used', 'unknown')
        
        answers.append(f"Simulation: {self.config['simulation']['start_date']} | "
                      f"{self.results['summary']['season']} | "
                      f"{self.results['summary']['strategy']}")
        answers.append(f"Duration: {duration_days} days ({months:.1f} months)")
        answers.append(f"Random Seed Used: {actual_seed}")
        answers.append("")
        answers.append("=" * 70)
        answers.append("REPRODUCIBILITY")
        answers.append("=" * 70)
        answers.append("To reproduce these EXACT results, add to config.json:")
        answers.append(f'  "random_seed": {actual_seed}')
        answers.append("")
        answers.append("Then run: python3 main.py")
        answers.append("=" * 70)
        answers.append("")
        
        # Question 1
        answers.append("1. What is the average state of charge of the battery over the month?")
        answers.append(f"   -> {self.results['battery']['average_soc_percent']:.2f}%")
        answers.append("")
        
        # Question 2: Use config values
        answers.append("2. How often does the battery reach full charge or empty state?")
        
        # Get thresholds from config
        min_soc_threshold = self.config['battery']['min_soc'] * 100
        max_soc_threshold = 100.0
        
        # Count using config-based thresholds
        full_count = sum(
            1 for h in self.results['data']['hourly_data'] 
            if h['battery_soc'] >= (max_soc_threshold - 0.1)
        )
        empty_count = sum(
            1 for h in self.results['data']['hourly_data'] 
            if h['battery_soc'] <= (min_soc_threshold + 0.1)
        )

        # Calculate hours based on time step
        time_step_hours = self.config['simulation']['time_step_minutes'] / 60.0
        total_steps = len(self.results['data']['hourly_data'])

        full_hours = full_count * time_step_hours
        empty_hours = empty_count * time_step_hours
        full_per_month = (full_hours / months) if months > 0 else full_hours
        empty_per_month = (empty_hours / months) if months > 0 else empty_hours

        answers.append(f"   -> Full (>={max_soc_threshold - 0.1:.1f}%): {full_hours:.1f} hours total ({full_count/total_steps*100:.1f}%)")
        answers.append(f"      Per month average: {full_per_month:.1f} hours")
        answers.append(f"   -> Empty (<={min_soc_threshold + 0.1:.1f}%): {empty_hours:.1f} hours total ({empty_count/total_steps*100:.1f}%)")
        answers.append(f"      Per month average: {empty_per_month:.1f} hours")
        
        # Question 3
        answers.append("3. What is the total energy generated by the solar panels over the month?")
        solar_total = self.results['summary']['total_solar_generated_kwh']
        solar_per_month = solar_total / months
        answers.append(f"   -> Total ({duration_days} days): {solar_total:.2f} kWh")
        answers.append(f"   -> Average per month: {solar_per_month:.2f} kWh")
        answers.append("")
        
        # Question 4
        answers.append("4. What is the total energy consumed by the household over the month?")
        load_total = self.results['summary']['total_load_consumed_kwh']
        load_per_month = load_total / months
        answers.append(f"   -> Total ({duration_days} days): {load_total:.2f} kWh")
        answers.append(f"   -> Average per month: {load_per_month:.2f} kWh")
        answers.append("")
        
        # Question 5
        answers.append("5. How much energy is imported from/exported to the grid over the month?")
        import_total = self.results['summary']['total_grid_imported_kwh']
        export_total = self.results['summary']['total_grid_exported_kwh']
        import_per_month = import_total / months
        export_per_month = export_total / months
        answers.append(f"   -> Imported total: {import_total:.2f} kWh")
        answers.append(f"      Per month: {import_per_month:.2f} kWh")
        answers.append(f"   -> Exported total: {export_total:.2f} kWh")
        answers.append(f"      Per month: {export_per_month:.2f} kWh")
        answers.append("")
        
        # Question 6 : Calculate downtime from hourly_data
        answers.append("6. How many times did the inverter fail, and what was the total downtime?")
        failures = self.results['reliability']['inverter_failures']
        
        #Calculate actual downtime from hourly data
        time_step_minutes = self.config['simulation']['time_step_minutes']
        time_step_hours = time_step_minutes / 60.0
        
        total_downtime = sum(
            time_step_hours for h in self.results['data']['hourly_data']
            if not h['inverter_operational']
        )
        
        answers.append(f"   -> Failures: {failures} ({failures/months:.1f} per month)")
        answers.append(f"   -> Total downtime: {total_downtime:.1f} hours ({total_downtime/months:.1f} hours per month)")
        answers.append("")
        
        # Question 7
        answers.append("7. What is the average cloud coverage during the month?")
        avg_cloud = sum(h['cloud_coverage'] for h in self.results['data']['hourly_data']) / len(self.results['data']['hourly_data'])
        answers.append(f"   -> {avg_cloud:.3f} ({avg_cloud*100:.1f}%)")
        answers.append("")
        
        # Question 8
        answers.append("8. What is the peak load demand observed during the month?")
        peak_load = max(h['load_demand_kw'] for h in self.results['data']['hourly_data'])
        answers.append(f"   -> {peak_load:.2f} kW")
        answers.append("")
        
        # Question 9
        answers.append("9. How often was there unmet load (when demand exceeded supply)?")
        unmet_hours = self.results['reliability']['hours_with_unmet_load']
        unmet_pct = self.results['reliability']['unmet_load_percentage']
        unmet_per_month = unmet_hours / months
        answers.append(f"   -> {unmet_hours} hours total ({unmet_pct:.2f}%)")
        answers.append(f"   -> Per month average: {unmet_per_month:.1f} hours")
        answers.append(f"   -> Note: 'Unmet load' = energy not covered by solar+battery (imported from grid)")
        answers.append("")
        
        # Question 10
        answers.append("10. What is the efficiency of the battery system (considering round-trip losses)?")
        answers.append(f"   -> {self.config['battery']['efficiency'] * 100}% (configured)")
        answers.append("")
        
        # Question 11
        answers.append("11. How does the energy management strategy affect overall system performance?")
        answers.append(f"   -> Current strategy: {self.results['summary']['strategy']}")
        answers.append(f"   -> Self-sufficiency: {self.results['summary']['self_sufficiency_percent']:.2f}%")
        answers.append(f"   -> Battery avg SoC: {self.results['battery']['average_soc_percent']:.2f}%")
        curtailed_total = self.results['summary']['total_curtailed_kwh']
        curtailed_per_month = curtailed_total / months
        answers.append(f"   -> Curtailed total: {curtailed_total:.2f} kWh ({curtailed_per_month:.2f} kWh/month)")
        answers.append("   -> Note: Run 'python3 compare_strategies.py' for complete comparison")
        answers.append("")
        
        # Question 12
        answers.append("12. Which energy management strategy is most cost-effective?")
        answers.append(f"   -> Export rate: ${self.config['grid']['export_revenue_per_kwh']}/kWh")
        answers.append(f"   -> Import rate: ${self.config['grid']['import_cost_per_kwh']}/kWh")
        net_cost_total = self.results['financial']['net_cost']
        net_cost_per_month = net_cost_total / months
        answers.append(f"   -> Current strategy net cost: ${net_cost_total:.2f} total (${net_cost_per_month:.2f}/month)")
        answers.append("   -> Note: Run 'python3 compare_strategies.py' for complete comparison")
        answers.append("")
        
        # Question 13
        answers.append("13. What is the impact of different cloud coverage levels on solar generation?")
        answers.append(f"   -> Season: {self.results['summary']['season']}")
        answers.append(f"   -> Avg cloud coverage: {avg_cloud:.2f}")
        answers.append(f"   -> Solar generated: {solar_total:.2f} kWh total ({solar_per_month:.2f} kWh/month)")
        answers.append("   -> Note: Run simulations with different seasons for comparison")
        answers.append("")
        
        # Question 14
        answers.append("14. How does the system perform under different seasonal conditions?")
        answers.append(f"   -> Current season: {self.results['summary']['season']}")
        answers.append(f"   -> Solar generation: {solar_total:.2f} kWh total ({solar_per_month:.2f} kWh/month)")
        answers.append("   -> Note: Run simulations with different seasons for comparison")
        answers.append("")
        
        # Question 15
        answers.append("15. What is the average duration of inverter failures?")
        if total_downtime > 0 and failures > 0:
            avg_duration = total_downtime / failures
            answers.append(f"   -> Average duration: {avg_duration:.1f} hours per failure")
            answers.append(f"   -> Impact: {total_downtime:.1f} hours total without solar ({total_downtime/months:.1f} hours/month)")
        else:
            answers.append(f"   -> No failures occurred during this simulation")
        answers.append("")
        
        answers.append("=" * 70)
        answers.append(f"NOTE: This simulation ran for {duration_days} days ({months:.1f} months).")
        answers.append("Monthly averages are calculated by dividing totals by number of months.")
        answers.append("")
        answers.append("For complete analysis, run multiple simulations with different:")
        answers.append("  - Strategies (LOAD_PRIORITY, CHARGE_PRIORITY, PRODUCE_PRIORITY)")
        answers.append("  - Seasons (spring, summer, fall, winter)")
        answers.append("  - System configurations (battery count, solar count, etc.)")
        answers.append("=" * 70)
        
        return "\n".join(answers)