import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.Load import Load

load = Load(base_load_kw=0.5, peak_load_max_kw=3.0, 
            peak_hours_start=18, peak_hours_end=21)

print("=== Test Load - Sample Day ===")
for hour in range(24):
    demand = load.get_demand(hour)
    period = "PEAK" if 18 <= hour < 21 else "normal"
    print(f"Hour {hour:2d}:00 → {demand:.2f} kW ({period})")

print("\n=== Test Load - Statistics (100 samples per hour) ===")
test_hours = [6, 7, 8, 12, 18, 19, 20, 22]
for hour in test_hours:
    demands = [load.get_demand(hour) for _ in range(100)]
    avg = sum(demands) / len(demands)
    min_d = min(demands)
    max_d = max(demands)
    
    # Classify period
    if 18 <= hour < 21:
        period = "PEAK"
    elif hour in [6, 7, 8, 12, 22]:
        period = "scheduled"
    else:
        period = "normal"
    
    print(f"Hour {hour:2d} ({period:9s}): avg={avg:.2f} kW, min={min_d:.2f}, max={max_d:.2f}")

print("\n=== Component Breakdown (Hour 19, 100 samples) ===")
# Test to verify all components work
samples = []
for _ in range(100):
    samples.append(load.get_demand(19))

avg_19 = sum(samples) / len(samples)
print(f"Average at 7 PM: {avg_19:.2f} kW")
print(f"Expected: Base (0.5) + Peak (avg ~2.0) + Noise (avg ~0.24*0.3) = ~2.57 kW")
print(f"Min observed: {min(samples):.2f} kW")
print(f"Max observed: {max(samples):.2f} kW")