import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.Simulation import Simulation
import time

print("Running 10 simulations to test failure frequency...")
print("-" * 70)

results = []

for i in range(10):
    print(f"\nSimulation {i+1}/10...")
    
    # Add small delay to change random seed
    time.sleep(0.1)
    
    sim = Simulation(config_path='config.json')
    result = sim.run()
    
    failures = result['reliability']['inverter_failures']
    results.append(failures)
    
    print(f"  Failures: {failures}")

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"Simulations with 0 failures: {results.count(0)}")
print(f"Simulations with 1 failure: {results.count(1)}")
print(f"Simulations with 2+ failures: {sum(1 for x in results if x >= 2)}")
print(f"Average failures: {sum(results)/10:.2f}")
print(f"Expected: ~0.15 (13.95% chance of 1+ failures)")