import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


from src.CloudCoverage import CloudCoverage

cloud_sim = CloudCoverage()

print("=== Summer Days (more overcast) ===")
summer_days = [cloud_sim.get_daily_coverage('summer') for _ in range(10)]
for i, coverage in enumerate(summer_days, 1):
    level = "Clear" if coverage < 0.2 else "Partly" if coverage < 0.6 else "Mostly" if coverage < 0.8 else "Overcast"
    print(f"Day {i:2d}: {coverage:.3f} ({level})")

print(f"\nAverage summer coverage: {sum(summer_days)/len(summer_days):.3f}")

print("\n=== Winter Days (more clear) ===")
winter_days = [cloud_sim.get_daily_coverage('winter') for _ in range(10)]
for i, coverage in enumerate(winter_days, 1):
    level = "Clear" if coverage < 0.2 else "Partly" if coverage < 0.6 else "Mostly" if coverage < 0.8 else "Overcast"
    print(f"Day {i:2d}: {coverage:.3f} ({level})")

print(f"\nAverage winter coverage: {sum(winter_days)/len(winter_days):.3f}")

print("\n=== Statistics over 100 days ===")
for season in ['spring', 'summer', 'fall', 'winter']:
    days = [cloud_sim.get_daily_coverage(season) for _ in range(100)]
    avg = sum(days) / len(days)
    
    clear = sum(1 for d in days if d < 0.2)
    partly = sum(1 for d in days if 0.2 <= d < 0.6)
    mostly = sum(1 for d in days if 0.6 <= d < 0.8)
    overcast = sum(1 for d in days if d >= 0.8)
    
    print(f"{season.capitalize():7s}: Avg={avg:.3f} | Clear={clear:2d}% Partly={partly:2d}% Mostly={mostly:2d}% Overcast={overcast:2d}%")