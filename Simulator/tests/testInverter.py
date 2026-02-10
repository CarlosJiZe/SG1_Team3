import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.Inverter import Inverter

inverter = Inverter(max_output_kw=4.0)

print("=== Test Clipping ===")
print(f"Solar: 3.0 kW → Output: {inverter.apply_limit(3.0):.2f} kW")
print(f"Solar: 5.0 kW → Output: {inverter.apply_limit(5.0):.2f} kW (clipped)")
print(f"Solar: 4.5 kW → Output: {inverter.apply_limit(4.5):.2f} kW (clipped)")

print("\n=== Test Failure Simulation ===")
print("Simulating 200 days to trigger ~1 failure...\n")

failures = 0
for day in range(200):
    inverter.check_failure()
    
    if not inverter.is_operational():
        failures += 1
        duration = inverter._failure_hours_remaining
        print(f"Day {day}: ⚠️  FAILURE! Duration: {duration:.0f} hours")
        
        # Simulate the failure duration (hour by hour)
        hours_down = 0
        while not inverter.is_operational():
            inverter.update(1)  # 1 hour passes
            hours_down += 1
        
        print(f"         ✅ Repaired after {hours_down} hours\n")

print(f"Total failures in 200 days: {failures}")
print(f"Expected: ~1 (0.5% × 200 = 1)")

print("\n=== Test During Failure ===")
inverter._is_failing = True  # Force failure
print(f"Operational: {inverter.is_operational()}")
print(f"Solar: 5.0 kW → Output: {inverter.apply_limit(5.0):.2f} kW (0 due to failure)")