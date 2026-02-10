import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.Grid import Grid

grid = Grid(import_cost_per_kwh=0.0075, 
            export_revenue_per_kwh=0.009, 
            export_limit_kw=20.0)

print("=== Test Grid - Import Energy ===")
cost1 = grid.import_energy(10.0)
print(f"Import 10 kWh → Cost: ${cost1:.4f}")

cost2 = grid.import_energy(5.0)
print(f"Import 5 kWh → Cost: ${cost2:.4f}")

print(f"\nTotal imported: {grid.get_total_imported():.2f} kWh")
print(f"Total cost: ${grid.get_total_cost():.4f}")

print("\n=== Test Grid - Export Energy ===")
exported1 = grid.export_energy(15.0)
print(f"Export 15 kWh → Actual exported: {exported1:.2f} kWh")

exported2 = grid.export_energy(8.0)
print(f"Export 8 kWh → Actual exported: {exported2:.2f} kWh")

print(f"\nTotal exported: {grid.get_total_exported():.2f} kWh")
print(f"Total revenue: ${grid.get_total_revenue():.4f}")

print("\n=== Test Grid - Export Limit ===")
print(f"Export limit: {grid._export_limit_kw} kW")
exported3 = grid.export_energy(25.0)
print(f"Try to export 25 kWh → Actual exported: {exported3:.2f} kWh (limited!)")

print("\n=== Test Grid - Net Balance ===")
print(f"Total imported: {grid.get_total_imported():.2f} kWh")
print(f"Total exported: {grid.get_total_exported():.2f} kWh")
print(f"Total cost: ${grid.get_total_cost():.4f}")
print(f"Total revenue: ${grid.get_total_revenue():.4f}")
print(f"Net balance: ${grid.get_net_balance():.4f}")

if grid.get_net_balance() > 0:
    print("✅ PROFIT: You earned more than you spent!")
else:
    print("❌ LOSS: You spent more than you earned!")

print("\n=== Simulation Example (One Day) ===")
# Reset grid for clean example
grid2 = Grid(0.0075, 0.009, 20.0)

# Simulate a day
print("Simulating 24 hours...")
for hour in range(24):
    if 6 <= hour < 18:  # Daytime - solar generation
        if 12 <= hour < 15:  # Peak solar hours
            grid2.export_energy(3.0)  # Export excess
        # Otherwise solar covers load
    else:  # Night - need to import
        grid2.import_energy(2.0)

print(f"\nDaily summary:")
print(f"  Imported: {grid2.get_total_imported():.2f} kWh (${grid2.get_total_cost():.4f})")
print(f"  Exported: {grid2.get_total_exported():.2f} kWh (${grid2.get_total_revenue():.4f})")
print(f"  Net balance: ${grid2.get_net_balance():.4f}")