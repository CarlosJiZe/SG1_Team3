"""
GreenGrid Simulation - Main Entry Point

This is the main script to run the GreenGrid digital twin simulation.
Configure parameters in config.json before running.

Usage:
    python3 main.py

Author: Team 3 - GreenGrid Project
Course: COM 139 - Simulation & Visualization
Universidad Panamericana, Guadalajara
"""

from src.Simulation import Simulation
from src.DataLogger import DataLogger
import sys
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def print_header():
    """Print welcome header."""
    print("\n" + "=" * 70)
    print("   ___                  ___     _     _   ___ _          ")
    print("  / __|_ _ ___ ___ _ _ / __|_ _(_)__| | / __(_)_ __     ")
    print(" | (_ | '_/ -_) -_) ' \ (_ | '_| / _` | \__ \ | '  \    ")
    print("  \___|_| \___\___|_||_\___|_| |_\__,_| |___/_|_|_|_|   ")
    print("")
    print("          Digital Twin Simulation - Phase 1")
    print("=" * 70)
    print("\nTeam 3 - COM 139: Simulation & Visualization")
    print("Universidad Panamericana, Guadalajara")
    print("-" * 70)

def print_configuration_info(config):
    """Print simulation configuration summary."""
    print("\n SIMULATION CONFIGURATION:")
    print(f"  Duration: {config['simulation']['duration_days']} days")
    print(f"  Season: {config['simulation']['season']}")
    print(f"  Strategy: {config['energy_management']['strategy']}")
    print(f"  Start Date: {config['simulation']['start_date']}")
    print(f"  Time Step: {config['simulation']['time_step_minutes']} minutes")
    
    print(f"\n⚡ SYSTEM:")
    battery_count = config['battery'].get('count', 1)
    battery_unit = config['battery']['unit_capacity_kwh']
    print(f"  Battery: {battery_count} × {battery_unit} kWh = {battery_count * battery_unit} kWh")
    
    solar_count = config['solar'].get('count', 1)
    solar_unit = config['solar']['unit_peak_power_kw']
    print(f"  Solar: {solar_count} × {solar_unit} kW = {solar_count * solar_unit} kW peak")
    
    inverter_count = config['inverter'].get('count', 1)
    inverter_unit = config['inverter']['unit_max_output_kw']
    print(f"  Inverter: {inverter_count} × {inverter_unit} kW = {inverter_count * inverter_unit} kW max")

def print_results_summary(results):
    """Print key results summary."""
    print("\n" + "=" * 70)
    print(" SIMULATION RESULTS SUMMARY")
    print("=" * 70)
    
    print("\n Energy:")
    print(f"  Solar Generated: {results['summary']['total_solar_generated_kwh']:.2f} kWh")
    print(f"  Load Consumed: {results['summary']['total_load_consumed_kwh']:.2f} kWh")
    print(f"  Grid Imported: {results['summary']['total_grid_imported_kwh']:.2f} kWh")
    print(f"  Grid Exported: {results['summary']['total_grid_exported_kwh']:.2f} kWh")
    print(f"  Curtailed: {results['summary']['total_curtailed_kwh']:.2f} kWh")
    
    print("\n Financial:")
    print(f"  Import Cost: ${results['financial']['total_import_cost']:.2f}")
    print(f"  Export Revenue: ${results['financial']['total_export_revenue']:.2f}")
    print(f"  Net Cost: ${results['financial']['net_cost']:.2f}")
    
    print("\n Battery:")
    print(f"  Average SoC: {results['battery']['average_soc_percent']:.2f}%")
    print(f"  Final SoC: {results['battery']['final_soc_percent']:.2f}%")
    
    print("\n Performance:")
    print(f"  Self-Sufficiency: {results['summary']['self_sufficiency_percent']:.2f}%")
    print(f"  Inverter Failures: {results['reliability']['inverter_failures']}")
    print(f"  Unmet Load: {results['reliability']['unmet_load_percentage']:.2f}%")

def main():
    """Main execution function."""
    try:
        # Print header
        print_header()
        
        # Load and display configuration
        print("\n Loading configuration from config.json...")
        sim = Simulation(config_path=os.path.join(BASE_DIR, 'config.json'))
        print_configuration_info(sim.config)
        
        # Confirm before running
        print("\n" + "-" * 70)
        response = input("▶ Press ENTER to start simulation (or Ctrl+C to cancel): ")
        
        # Run simulation
        print("\n Starting simulation...")
        results = sim.run()
        
        # Print results summary
        print_results_summary(results)
        
        # Save data
        print("\n" + "=" * 70)
        print(" SAVING SIMULATION DATA")
        print("=" * 70)
        
        logger = DataLogger(results, sim.config, output_dir=os.path.join(BASE_DIR, 'results'))
        saved_files = logger.save_all()
        
        # Print saved files
        print("\n Files saved:")
        for file_type, filepath in saved_files.items():
            if filepath:
                print(f"  ✓ {filepath}")
        
        # Final message
        print("\n" + "=" * 70)
        print(" SIMULATION COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        print("\n Next Steps:")
        print("  1. Review answers.txt for project questions")
        print("  2. Check hourly_data.csv for detailed analysis")
        print("  3. Use summary.json for quick insights")
        print("  4. Try different strategies or seasons by editing config.json")
        print("\n Ready for Phase 2 (Visualization) and Phase 3 (Machine Learning)\n")
        
        return 0
        
    except KeyboardInterrupt:
        print("\n\n  Simulation cancelled by user.")
        return 1
    
    except FileNotFoundError as e:
        print(f"\n Error: Configuration file not found.")
        print(f"   Make sure 'config.json' exists in the project root.")
        print(f"   Details: {e}")
        return 1
    
    except Exception as e:
        print(f"\n Error during simulation:")
        print(f"   {type(e).__name__}: {e}")
        print("\n   Please check your configuration and try again.")
        return 1

if __name__ == "__main__":
    sys.exit(main())