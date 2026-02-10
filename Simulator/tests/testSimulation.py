import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.Simulation import Simulation

print("\n" + "=" * 70)
print("RUNNING GREENGRID SIMULATION")
print("=" * 70 + "\n")

# Run simulation
sim = Simulation(config_path='config.json')
results = sim.run()

# Print results
print("\n" + "=" * 70)
print("SIMULATION RESULTS")
print("=" * 70)

print("\n--- Summary ---")
for key, value in results['summary'].items():
    print(f"  {key}: {value}")

print("\n--- Financial ---")
for key, value in results['financial'].items():
    if isinstance(value, (int, float)):
        print(f"  {key}: ${value:.2f}")
    else:
        print(f"  {key}: {value}")

print("\n--- Battery ---")
for key, value in results['battery'].items():
    print(f"  {key}: {value}")

print("\n--- Reliability ---")
for key, value in results['reliability'].items():
    print(f"  {key}: {value}")

print("\n--- System Configuration ---")
for key, value in results['system'].items():
    print(f"  {key}: {value}")

# Calculate some additional insights
print("\n" + "=" * 70)
print("KEY INSIGHTS")
print("=" * 70)

solar_gen = results['summary']['total_solar_generated_kwh']
load_cons = results['summary']['total_load_consumed_kwh']
grid_imp = results['summary']['total_grid_imported_kwh']
grid_exp = results['summary']['total_grid_exported_kwh']
curtailed = results['summary']['total_curtailed_kwh']

print(f"\n✓ Solar Coverage: {(solar_gen/load_cons*100):.1f}% of load from solar")
print(f"✓ Grid Dependency: {(grid_imp/load_cons*100):.1f}% of load from grid")
print(f"✓ Export Ratio: {(grid_exp/solar_gen*100):.1f}% of solar exported")
print(f"✓ Curtailment: {(curtailed/solar_gen*100):.1f}% of solar curtailed")

if results['financial']['net_cost'] < 0:
    print(f"✓ Financial: PROFIT of ${abs(results['financial']['net_cost']):.2f}")
else:
    print(f"✓ Financial: COST of ${results['financial']['net_cost']:.2f}")

print(f"✓ Battery Usage: Avg SoC {results['battery']['average_soc_percent']:.1f}%")

if results['reliability']['inverter_failures'] > 0:
    print(f"⚠ Inverter Failures: {results['reliability']['inverter_failures']} failures occurred")
else:
    print(f"✓ Inverter: No failures during simulation")

if results['reliability']['unmet_load_percentage'] > 0:
    print(f"⚠ Unmet Load: {results['reliability']['unmet_load_percentage']:.1f}% of time steps had grid dependency")
else:
    print(f"✓ Self-Sufficient: 100% of load met by internal system")

print("\n" + "=" * 70)
print("SIMULATION TEST COMPLETED ✓")
print("=" * 70 + "\n")

print("\n" + "=" * 70)
print("SAVING DATA TO FILES")
print("=" * 70 + "\n")

from src.DataLogger import DataLogger

# Create logger and save all data
logger = DataLogger(results, sim.config, output_dir='results')
saved_files = logger.save_all()

print("\n" + "=" * 70)
print("FILES SAVED SUCCESSFULLY")
print("=" * 70)
for file_type, filepath in saved_files.items():
    if filepath:
        print(f"  {file_type}: {filepath}")

print("\n" + "=" * 70)
print("ALL TASKS COMPLETED ✓")
print("=" * 70 + "\n")