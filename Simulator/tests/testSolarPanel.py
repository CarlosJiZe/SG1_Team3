import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.SolarPanel import SolarPanel

solar = SolarPanel(peak_capacity_kw=5.0)

print("=== Test SolarPanel - Clear Day ===")
for hour in [0, 6, 9, 12, 15, 18, 21]:
    generation = solar.generate(hour, cloud_coverage=0.0)
    print(f"Hour {hour:2d}:00 → {generation:.2f} kW")

print("\n=== Test SolarPanel - Cloudy Day (30% clouds) ===")
for hour in [6, 9, 12, 15, 18]:
    generation = solar.generate(hour, cloud_coverage=0.3)
    print(f"Hour {hour:2d}:00 → {generation:.2f} kW")

print("\n=== Test SolarPanel - Very Cloudy (80% clouds) ===")
generation_clear = solar.generate(12, cloud_coverage=0.0)
generation_cloudy = solar.generate(12, cloud_coverage=0.8)
print(f"12 PM Clear: {generation_clear:.2f} kW")
print(f"12 PM 80% clouds: {generation_cloudy:.2f} kW")
print(f"Reduction: {((generation_clear - generation_cloudy) / generation_clear * 100):.1f}%")