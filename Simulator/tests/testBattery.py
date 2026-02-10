import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.Battery import Battery

battery = Battery(capacity_kwh=13.5, efficiency=0.90, min_soc=5.0)

print("=== Test Discharge ===")
print(f"SoC initial: {battery.get_soc():.1f}%")

# Request 3 kWh
supplied = battery.discharge(3.0)
print(f"Lost: 3.0 kWh")
print(f"Received: {supplied:.3f} kWh")
print(f"SoC after: {battery.get_soc():.1f}%")