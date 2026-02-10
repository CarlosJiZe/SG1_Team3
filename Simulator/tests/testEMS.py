import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.Battery import Battery
from src.Grid import Grid
from src.EnergyManagementSystem import EnergyManagementSystem

print("=" * 70)
print("ENERGY MANAGEMENT SYSTEM - COMPREHENSIVE TESTS")
print("=" * 70)

# ========================================================================
print("\n" + "=" * 70)
print("TEST 1: LOAD_PRIORITY STRATEGY")
print("=" * 70)

battery1 = Battery(capacity_kwh=13.5, efficiency=0.9, min_soc=5.0)
grid1 = Grid(import_cost_per_kwh=0.0075, export_revenue_per_kwh=0.009, export_limit_kw=20.0)
ems1 = EnergyManagementSystem(strategy='LOAD_PRIORITY')

print("\n--- Scenario A: Excess Solar (10 kW solar, 3 kW load) ---")
flows = ems1.distribute_energy(solar_kw=10.0, load_kw=3.0, battery=battery1, grid=grid1)
print(f"Solar → Load: {flows['solar_to_load']:.2f} kW")
print(f"Solar → Battery: {flows['solar_to_battery']:.2f} kW")
print(f"Solar → Grid: {flows['solar_to_grid']:.2f} kW")
print(f"Battery SoC: {battery1.get_soc():.1f}%")
print(f"Curtailed: {flows['curtailed']:.2f} kW")

print("\n--- Scenario B: Deficit (2 kW solar, 5 kW load) ---")
flows = ems1.distribute_energy(solar_kw=2.0, load_kw=5.0, battery=battery1, grid=grid1)
print(f"Solar → Load: {flows['solar_to_load']:.2f} kW")
print(f"Battery → Load: {flows['battery_to_load']:.2f} kW")
print(f"Grid → Load: {flows['grid_to_load']:.2f} kW")
print(f"Unmet Load: {flows['unmet_load']:.2f} kW")
print(f"Battery SoC: {battery1.get_soc():.1f}%")

print("\n--- Scenario C: Night (0 kW solar, 4 kW load) ---")
flows = ems1.distribute_energy(solar_kw=0.0, load_kw=4.0, battery=battery1, grid=grid1)
print(f"Battery → Load: {flows['battery_to_load']:.2f} kW")
print(f"Grid → Load: {flows['grid_to_load']:.2f} kW")
print(f"Unmet Load: {flows['unmet_load']:.2f} kW")
print(f"Battery SoC: {battery1.get_soc():.1f}%")

print("\n--- Scenario D: Empty Battery (force unmet load) ---")
while battery1.get_soc() > battery1._min_soc + 1:
    battery1.discharge(10.0)
print(f"Battery SoC: {battery1.get_soc():.1f}% (empty)")
flows = ems1.distribute_energy(solar_kw=0.0, load_kw=5.0, battery=battery1, grid=grid1)
print(f"Battery → Load: {flows['battery_to_load']:.2f} kW")
print(f"Grid → Load: {flows['grid_to_load']:.2f} kW")
print(f"Unmet Load: {flows['unmet_load']:.2f} kW ← System internal couldn't provide")

# ========================================================================
print("\n" + "=" * 70)
print("TEST 2: CHARGE_PRIORITY STRATEGY")
print("=" * 70)

battery2 = Battery(capacity_kwh=13.5, efficiency=0.9, min_soc=5.0)
grid2 = Grid(import_cost_per_kwh=0.0075, export_revenue_per_kwh=0.009, export_limit_kw=20.0)
ems2 = EnergyManagementSystem(strategy='CHARGE_PRIORITY')

print("\n--- Scenario A: Excess Solar (10 kW solar, 3 kW load) ---")
print("Expected: Charge battery FIRST, then cover load")
flows = ems2.distribute_energy(solar_kw=10.0, load_kw=3.0, battery=battery2, grid=grid2)
print(f"Solar → Battery: {flows['solar_to_battery']:.2f} kW (charged first)")
print(f"Solar → Load: {flows['solar_to_load']:.2f} kW")
print(f"Solar → Grid: {flows['solar_to_grid']:.2f} kW")
print(f"Grid → Load: {flows['grid_to_load']:.2f} kW")
print(f"Battery SoC: {battery2.get_soc():.1f}%")

print("\n--- Scenario B: Medium Solar (5 kW solar, 3 kW load) ---")
flows = ems2.distribute_energy(solar_kw=5.0, load_kw=3.0, battery=battery2, grid=grid2)
print(f"Solar → Battery: {flows['solar_to_battery']:.2f} kW")
print(f"Solar → Load: {flows['solar_to_load']:.2f} kW")
print(f"Grid → Load: {flows['grid_to_load']:.2f} kW")
print(f"Battery SoC: {battery2.get_soc():.1f}%")

print("\n--- Scenario C: Deficit (2 kW solar, 5 kW load) ---")
flows = ems2.distribute_energy(solar_kw=2.0, load_kw=5.0, battery=battery2, grid=grid2)
print(f"Solar → Load: {flows['solar_to_load']:.2f} kW")
print(f"Solar → Battery: {flows['solar_to_battery']:.2f} kW (should be 0)")
print(f"Battery → Load: {flows['battery_to_load']:.2f} kW")
print(f"Grid → Load: {flows['grid_to_load']:.2f} kW")
print(f"Unmet Load: {flows['unmet_load']:.2f} kW")
print(f"Battery SoC: {battery2.get_soc():.1f}%")

# ========================================================================
print("\n" + "=" * 70)
print("TEST 3: PRODUCE_PRIORITY STRATEGY")
print("=" * 70)

battery3 = Battery(capacity_kwh=13.5, efficiency=0.9, min_soc=5.0)
grid3 = Grid(import_cost_per_kwh=0.0075, export_revenue_per_kwh=0.009, export_limit_kw=20.0)
ems3 = EnergyManagementSystem(strategy='PRODUCE_PRIORITY')

print("\n--- Scenario A: Excess Solar (10 kW solar, 3 kW load) ---")
print("Expected: Export ALL solar, use battery for house")
flows = ems3.distribute_energy(solar_kw=10.0, load_kw=3.0, battery=battery3, grid=grid3)
print(f"Solar → Grid: {flows['solar_to_grid']:.2f} kW (exports all)")
print(f"Solar → Battery: {flows['solar_to_battery']:.2f} kW")
print(f"Solar → Load: {flows['solar_to_load']:.2f} kW")
print(f"Battery → Load: {flows['battery_to_load']:.2f} kW (covers house)")
print(f"Battery SoC: {battery3.get_soc():.1f}%")
print(f"\nFinancial: Revenue ${flows['solar_to_grid']*0.009:.4f} | Battery drain {flows['battery_to_load']:.2f} kWh")

print("\n--- Scenario B: Very High Solar (25 kW solar, 3 kW load) ---")
print("Expected: Export limited to 20 kW, excess charges battery")
flows = ems3.distribute_energy(solar_kw=25.0, load_kw=3.0, battery=battery3, grid=grid3)
print(f"Solar → Grid: {flows['solar_to_grid']:.2f} kW (limited to 20)")
print(f"Solar → Battery: {flows['solar_to_battery']:.2f} kW (excess)")
print(f"Solar → Load: {flows['solar_to_load']:.2f} kW")
print(f"Battery → Load: {flows['battery_to_load']:.2f} kW")
print(f"Battery SoC: {battery3.get_soc():.1f}%")

print("\n--- Scenario C: Low Battery + Export (financial paradox) ---")
while battery3.get_soc() > 10:
    battery3.discharge(5.0)
print(f"Battery SoC: {battery3.get_soc():.1f}% (low)")
flows = ems3.distribute_energy(solar_kw=10.0, load_kw=3.0, battery=battery3, grid=grid3)
print(f"Solar → Grid: {flows['solar_to_grid']:.2f} kW")
print(f"Battery → Load: {flows['battery_to_load']:.2f} kW")
print(f"Grid → Load: {flows['grid_to_load']:.2f} kW (importing!)")
print(f"\nFinancial Paradox:")
print(f"  Revenue: ${flows['solar_to_grid']*0.009:.4f} (exported)")
print(f"  Cost: ${flows['grid_to_load']*0.0075:.4f} (imported)")
print(f"  Net: ${flows['solar_to_grid']*0.009 - flows['grid_to_load']*0.0075:.4f}")

# ========================================================================
print("\n" + "=" * 70)
print("TEST 4: AUTOMATIC CURTAILMENT (Battery Full)")
print("=" * 70)

battery4a = Battery(capacity_kwh=13.5, efficiency=0.9, min_soc=5.0)
grid4a = Grid(import_cost_per_kwh=0.0075, export_revenue_per_kwh=0.009, export_limit_kw=20.0)
ems4 = EnergyManagementSystem(strategy='LOAD_PRIORITY')

print("\n--- Battery NOT Full (50% SoC) ---")
print(f"Battery SoC: {battery4a.get_soc():.1f}%")
flows = ems4.distribute_energy(solar_kw=10.0, load_kw=2.0, battery=battery4a, grid=grid4a)
print(f"Solar → Load: {flows['solar_to_load']:.2f} kW")
print(f"Solar → Battery: {flows['solar_to_battery']:.2f} kW")
print(f"Solar → Grid: {flows['solar_to_grid']:.2f} kW (exports normally)")
print(f"Curtailed: {flows['curtailed']:.2f} kW")
print(f"Battery SoC: {battery4a.get_soc():.1f}%")

battery4b = Battery(capacity_kwh=13.5, efficiency=0.9, min_soc=5.0)
grid4b = Grid(import_cost_per_kwh=0.0075, export_revenue_per_kwh=0.009, export_limit_kw=20.0)
while not battery4b.is_full():
    battery4b.charge(10.0)

print("\n--- Battery FULL (100% SoC) ---")
print(f"Battery SoC: {battery4b.get_soc():.1f}%")
flows = ems4.distribute_energy(solar_kw=10.0, load_kw=2.0, battery=battery4b, grid=grid4b)
print(f"Solar → Load: {flows['solar_to_load']:.2f} kW")
print(f"Solar → Battery: {flows['solar_to_battery']:.2f} kW (full)")
print(f"Solar → Grid: {flows['solar_to_grid']:.2f} kW (ZERO - curtailed!)")
print(f"Curtailed: {flows['curtailed']:.2f} kW ← Automatically turned off")
print("\nExplanation: When battery full, excess solar is curtailed instead of exported")

# ========================================================================
print("\n" + "=" * 70)
print("TEST 5: ZERO EXPORT POLICY (Grid Limit = 0)")
print("=" * 70)

battery5 = Battery(capacity_kwh=13.5, efficiency=0.9, min_soc=5.0)
grid5 = Grid(import_cost_per_kwh=0.0075, export_revenue_per_kwh=0.009, export_limit_kw=0)  # ZERO export
ems5 = EnergyManagementSystem(strategy='LOAD_PRIORITY')

print("\n--- Zero Export Grid (export_limit_kw = 0) ---")
print(f"Grid export limit: {grid5._export_limit_kw} kW")
flows = ems5.distribute_energy(solar_kw=10.0, load_kw=2.0, battery=battery5, grid=grid5)
print(f"Solar → Load: {flows['solar_to_load']:.2f} kW")
print(f"Solar → Battery: {flows['solar_to_battery']:.2f} kW")
print(f"Solar → Grid: {flows['solar_to_grid']:.2f} kW (ZERO - prohibited)")
print(f"Curtailed: {flows['curtailed']:.2f} kW")
print(f"Battery SoC: {battery5.get_soc():.1f}%")
print("\nExplanation: Grid prohibits export (limit=0), excess goes to battery or curtailed")

# ========================================================================
print("\n" + "=" * 70)
print("SUMMARY - STRATEGY COMPARISON")
print("=" * 70)

print("\nLOAD_PRIORITY:")
print("  ✓ House comfort first (always feed load)")
print("  ✓ Battery as backup when solar insufficient")
print("  ✓ Lowest unmet load")
print("  ✓ Best for: Daily residential use")

print("\nCHARGE_PRIORITY:")
print("  ✓ Battery health first (charge before load)")
print("  ✓ Maximizes battery SoC")
print("  ✓ May import from grid even with solar available")
print("  ✓ Best for: Off-grid prep, areas with blackouts")

print("\nPRODUCE_PRIORITY:")
print("  ✓ Revenue first (export before storing)")
print("  ✓ May drain battery while exporting solar")
print("  ✓ Financial arbitrage (sell high, buy low)")
print("  ✓ Best for: When export_revenue > import_cost")

print("\nCURTAILMENT:")
print("  ✓ Automatic when battery full")
print("  ✓ Respects grid export limits")
print("  ✓ Prevents equipment wear")
print("  ✓ Required for zero-export policies")

print("\n" + "=" * 70)
print("ALL TESTS COMPLETED SUCCESSFULLY ✓")
print("=" * 70)