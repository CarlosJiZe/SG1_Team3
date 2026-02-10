"""
GreenGrid Simulation - Strategy & Season Comparison Tool

Automatically runs multiple simulations to compare:
- Energy management strategies (LOAD, CHARGE, PRODUCE)
- Seasonal effects (spring, summer, fall, winter)

Uses the same random seed for fair comparisons.

Generates a comprehensive comparison report.

Usage:
    python3 compare_strategies.py

Author: Team 3 - GreenGrid Project
"""

from src.Simulation import Simulation
import json
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def print_header():
    """Print comparison tool header."""
    print("\n" + "=" * 70)
    print("  ___                          _                ")
    print(" / __|___ _ __  _ __  __ _ _ _(_)___ ___ _ _   ")
    print("| (__/ _ \ '  \| '_ \/ _` | '_| (_-</ _ \ ' \  ")
    print(" \___\___/_|_|_| .__/\__,_|_| |_/__/\___/_||_| ")
    print("              |_|                              ")
    print("")
    print("    Strategy & Season Comparison Tool")
    print("=" * 70)
    print("\nThis will run 7 simulations total:")
    print("  - 3 strategies x 1 season = 3 simulations (Strategy comparison)")
    print("  - 1 strategy x 4 seasons = 4 simulations (Season comparison)")
    print("")
    print("WARNING: All comparisons use the SAME random seed for fair comparison.")
    print("   (Same weather, same load patterns, same failures)")
    print("")
    print("This will take several minutes. Please be patient.")
    print("=" * 70)

def load_base_config():
    """Load base configuration from config.json."""
    with open(os.path.join(BASE_DIR, 'config.json'), 'r') as f:
        return json.load(f)

def run_strategy_comparison(base_config):
    """
    Compare all three energy management strategies.
    
    Uses the same random seed for fair comparison.
    
    Returns:
        dict: Results for each strategy
    """
    print("\n" + "=" * 70)
    print("PART 1: STRATEGY COMPARISON")
    print("=" * 70)
    
    # Determine seed to use
    config_seed = base_config['simulation'].get('random_seed', None)
    
    if config_seed is None:
        # No seed specified - generate one for this comparison run
        import time
        comparison_seed = int(time.time() * 1000000) % 2147483647
        print(f"\nWARNING: config.json has no random_seed specified.")
        print(f"   Generated seed for this comparison: {comparison_seed}")
        print(f"   To reproduce these comparisons, add to config.json:")
        print(f'   "random_seed": {comparison_seed}')
        print("")
    else:
        comparison_seed = config_seed
        print(f"\nUsing seed from config: {comparison_seed}")
        print("  (Comparisons will be reproducible)")
        print("")
    
    print("Running simulations with:")
    print(f"  - Season: {base_config['simulation']['season']}")
    print(f"  - Duration: {base_config['simulation']['duration_days']} days")
    print(f"  - Strategies: LOAD_PRIORITY, CHARGE_PRIORITY, PRODUCE_PRIORITY")
    print(f"  - Random Seed: {comparison_seed}")
    print("-" * 70)
    
    strategies = ['LOAD_PRIORITY', 'CHARGE_PRIORITY', 'PRODUCE_PRIORITY']
    results = {}
    
    for i, strategy in enumerate(strategies, 1):
        print(f"\n[{i}/3] Running {strategy}...")
        
        # Create modified config with deep copy
        config = json.loads(json.dumps(base_config))  # Deep copy
        config['energy_management']['strategy'] = strategy
        config['simulation']['random_seed'] = comparison_seed  # Same seed for all
        
        # Save temporary config
        temp_config_path = os.path.join(BASE_DIR, f'temp_config_{strategy}.json')
        with open(temp_config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        # Run simulation
        sim = Simulation(config_path=temp_config_path)
        sim_results = sim.run()
        
        # Store results
        results[strategy] = sim_results
        
        # Clean up temp config
        os.remove(temp_config_path)
        
        print(f"  {strategy} completed")
    
    print("\nStrategy comparison complete!")
    return results

def run_season_comparison(base_config):
    """
    Compare all four seasons.
    
    Uses the same random seed for fair comparison.
    
    Returns:
        dict: Results for each season
    """
    print("\n" + "=" * 70)
    print("PART 2: SEASONAL COMPARISON")
    print("=" * 70)
    
    # Determine seed to use
    config_seed = base_config['simulation'].get('random_seed', None)
    
    if config_seed is None:
        # No seed specified - generate one for this comparison run
        import time
        comparison_seed = int(time.time() * 1000000) % 2147483647
        print(f"\nWARNING: config.json has no random_seed specified.")
        print(f"   Generated seed for this comparison: {comparison_seed}")
        print(f"   To reproduce these comparisons, add to config.json:")
        print(f'   "random_seed": {comparison_seed}')
        print("")
    else:
        comparison_seed = config_seed
        print(f"\nUsing seed from config: {comparison_seed}")
        print("  (Comparisons will be reproducible)")
        print("")
    
    print("Running simulations with:")
    print(f"  - Strategy: {base_config['energy_management']['strategy']}")
    print(f"  - Duration: {base_config['simulation']['duration_days']} days")
    print(f"  - Seasons: spring, summer, fall, winter")
    print(f"  - Random Seed: {comparison_seed}")
    print("-" * 70)
    
    seasons = {
        'spring': '2024-03-01',
        'summer': '2024-06-01',
        'fall': '2024-09-01',
        'winter': '2024-12-01'
    }
    results = {}
    
    for i, (season, start_date) in enumerate(seasons.items(), 1):
        print(f"\n[{i}/4] Running {season}...")
        
        # Create modified config with deep copy
        config = json.loads(json.dumps(base_config))  # Deep copy
        config['simulation']['season'] = season
        config['simulation']['start_date'] = start_date
        config['simulation']['random_seed'] = comparison_seed  # Same seed for all
        
        # Save temporary config
        temp_config_path = os.path.join(BASE_DIR, f'temp_config_{season}.json')
        with open(temp_config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        # Run simulation
        sim = Simulation(config_path=temp_config_path)
        sim_results = sim.run()
        
        # Store results
        results[season] = sim_results
        
        # Clean up temp config
        os.remove(temp_config_path)
        
        print(f"  {season} completed")
    
    print("\nSeasonal comparison complete!")
    return results

def generate_comparison_report(strategy_results, season_results, base_config):
    """
    Generate comprehensive comparison report.
    
    Args:
        strategy_results (dict): Results from strategy comparison
        season_results (dict): Results from season comparison
        base_config (dict): Base configuration used
        
    Returns:
        str: Formatted report
    """
    report = []
    report.append("=" * 70)
    report.append("GREENGRID SIMULATION - COMPREHENSIVE COMPARISON REPORT")
    report.append("=" * 70)
    report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"Duration: {base_config['simulation']['duration_days']} days")
    
    # Show seed used
    seed_used = base_config['simulation'].get('actual_seed_used', 
                base_config['simulation'].get('random_seed', 'unknown'))
    report.append(f"Random Seed: {seed_used}")
    report.append("")
    report.append("=" * 70)
    report.append("REPRODUCIBILITY")
    report.append("=" * 70)
    report.append("To reproduce these EXACT comparisons, add to config.json:")
    report.append(f'  "random_seed": {seed_used}')
    report.append("Then run: python3 compare_strategies.py")
    report.append("=" * 70)
    report.append("")
    report.append("NOTE: All comparisons use the SAME random seed, ensuring:")
    report.append("  - Identical weather patterns (cloud coverage)")
    report.append("  - Identical load patterns (household consumption)")
    report.append("  - Identical failure events (inverter downtime)")
    report.append("  This makes comparisons scientifically valid and fair.")
    report.append("")
    
    # ========== PART 1: STRATEGY COMPARISON ==========
    report.append("=" * 70)
    report.append("QUESTION 11: ENERGY MANAGEMENT STRATEGY COMPARISON")
    report.append("=" * 70)
    report.append("\nHow does the energy management strategy affect overall system performance?")
    report.append("")
    
    # Create comparison table
    report.append("Strategy Performance Comparison:")
    report.append("-" * 70)
    report.append(f"{'Metric':<30} | {'LOAD':<12} | {'CHARGE':<12} | {'PRODUCE':<12}")
    report.append("-" * 70)
    
    # Solar generated
    report.append(f"{'Solar Generated (kWh)':<30} | "
                 f"{strategy_results['LOAD_PRIORITY']['summary']['total_solar_generated_kwh']:>12.2f} | "
                 f"{strategy_results['CHARGE_PRIORITY']['summary']['total_solar_generated_kwh']:>12.2f} | "
                 f"{strategy_results['PRODUCE_PRIORITY']['summary']['total_solar_generated_kwh']:>12.2f}")
    
    # Load consumed
    report.append(f"{'Load Consumed (kWh)':<30} | "
                 f"{strategy_results['LOAD_PRIORITY']['summary']['total_load_consumed_kwh']:>12.2f} | "
                 f"{strategy_results['CHARGE_PRIORITY']['summary']['total_load_consumed_kwh']:>12.2f} | "
                 f"{strategy_results['PRODUCE_PRIORITY']['summary']['total_load_consumed_kwh']:>12.2f}")
    
    # Grid imported
    report.append(f"{'Grid Imported (kWh)':<30} | "
                 f"{strategy_results['LOAD_PRIORITY']['summary']['total_grid_imported_kwh']:>12.2f} | "
                 f"{strategy_results['CHARGE_PRIORITY']['summary']['total_grid_imported_kwh']:>12.2f} | "
                 f"{strategy_results['PRODUCE_PRIORITY']['summary']['total_grid_imported_kwh']:>12.2f}")
    
    # Grid exported
    report.append(f"{'Grid Exported (kWh)':<30} | "
                 f"{strategy_results['LOAD_PRIORITY']['summary']['total_grid_exported_kwh']:>12.2f} | "
                 f"{strategy_results['CHARGE_PRIORITY']['summary']['total_grid_exported_kwh']:>12.2f} | "
                 f"{strategy_results['PRODUCE_PRIORITY']['summary']['total_grid_exported_kwh']:>12.2f}")
    
    # Curtailed
    report.append(f"{'Curtailed (kWh)':<30} | "
                 f"{strategy_results['LOAD_PRIORITY']['summary']['total_curtailed_kwh']:>12.2f} | "
                 f"{strategy_results['CHARGE_PRIORITY']['summary']['total_curtailed_kwh']:>12.2f} | "
                 f"{strategy_results['PRODUCE_PRIORITY']['summary']['total_curtailed_kwh']:>12.2f}")
    
    # Self-sufficiency
    report.append(f"{'Self-Sufficiency (%)':<30} | "
                 f"{strategy_results['LOAD_PRIORITY']['summary']['self_sufficiency_percent']:>12.2f} | "
                 f"{strategy_results['CHARGE_PRIORITY']['summary']['self_sufficiency_percent']:>12.2f} | "
                 f"{strategy_results['PRODUCE_PRIORITY']['summary']['self_sufficiency_percent']:>12.2f}")
    
    # Battery avg SoC
    report.append(f"{'Battery Avg SoC (%)':<30} | "
                 f"{strategy_results['LOAD_PRIORITY']['battery']['average_soc_percent']:>12.2f} | "
                 f"{strategy_results['CHARGE_PRIORITY']['battery']['average_soc_percent']:>12.2f} | "
                 f"{strategy_results['PRODUCE_PRIORITY']['battery']['average_soc_percent']:>12.2f}")
    
    # Unmet load
    report.append(f"{'Unmet Load (%)':<30} | "
                 f"{strategy_results['LOAD_PRIORITY']['reliability']['unmet_load_percentage']:>12.2f} | "
                 f"{strategy_results['CHARGE_PRIORITY']['reliability']['unmet_load_percentage']:>12.2f} | "
                 f"{strategy_results['PRODUCE_PRIORITY']['reliability']['unmet_load_percentage']:>12.2f}")
    
    report.append("-" * 70)
    report.append("")
    
    # Analysis
    report.append("Key Insights:")
    report.append("")
    
    # Best for self-sufficiency
    self_suff = {
        'LOAD_PRIORITY': strategy_results['LOAD_PRIORITY']['summary']['self_sufficiency_percent'],
        'CHARGE_PRIORITY': strategy_results['CHARGE_PRIORITY']['summary']['self_sufficiency_percent'],
        'PRODUCE_PRIORITY': strategy_results['PRODUCE_PRIORITY']['summary']['self_sufficiency_percent']
    }
    best_self_suff = max(self_suff, key=self_suff.get)
    report.append(f"  Best Self-Sufficiency: {best_self_suff} ({self_suff[best_self_suff]:.2f}%)")
    
    # Best for battery usage
    battery_soc = {
        'LOAD_PRIORITY': strategy_results['LOAD_PRIORITY']['battery']['average_soc_percent'],
        'CHARGE_PRIORITY': strategy_results['CHARGE_PRIORITY']['battery']['average_soc_percent'],
        'PRODUCE_PRIORITY': strategy_results['PRODUCE_PRIORITY']['battery']['average_soc_percent']
    }
    best_battery = max(battery_soc, key=battery_soc.get)
    report.append(f"  Best Battery Utilization: {best_battery} ({battery_soc[best_battery]:.2f}% avg SoC)")
    
    # Lowest unmet load
    unmet = {
        'LOAD_PRIORITY': strategy_results['LOAD_PRIORITY']['reliability']['unmet_load_percentage'],
        'CHARGE_PRIORITY': strategy_results['CHARGE_PRIORITY']['reliability']['unmet_load_percentage'],
        'PRODUCE_PRIORITY': strategy_results['PRODUCE_PRIORITY']['reliability']['unmet_load_percentage']
    }
    best_reliability = min(unmet, key=unmet.get)
    report.append(f"  Most Reliable (Lowest Unmet Load): {best_reliability} ({unmet[best_reliability]:.2f}%)")
    
    report.append("")
    report.append("Strategy Characteristics:")
    report.append("  - LOAD_PRIORITY: Balanced approach, prioritizes house comfort")
    report.append("  - CHARGE_PRIORITY: Maximizes battery storage, better for off-grid scenarios")
    report.append("  - PRODUCE_PRIORITY: Maximizes grid export, may sacrifice reliability")
    report.append("")
    
    # ========== PART 2: FINANCIAL COMPARISON ==========
    report.append("=" * 70)
    report.append("QUESTION 12: COST-EFFECTIVENESS COMPARISON")
    report.append("=" * 70)
    report.append("\nWhich energy management strategy is most cost-effective?")
    report.append("")
    
    report.append(f"Grid Rates:")
    report.append(f"  - Import cost: ${base_config['grid']['import_cost_per_kwh']}/kWh")
    report.append(f"  - Export revenue: ${base_config['grid']['export_revenue_per_kwh']}/kWh")
    report.append("")
    
    report.append("Financial Performance:")
    report.append("-" * 70)
    report.append(f"{'Metric':<30} | {'LOAD':<12} | {'CHARGE':<12} | {'PRODUCE':<12}")
    report.append("-" * 70)
    
    # Import cost
    report.append(f"{'Import Cost ($)':<30} | "
                 f"{strategy_results['LOAD_PRIORITY']['financial']['total_import_cost']:>12.2f} | "
                 f"{strategy_results['CHARGE_PRIORITY']['financial']['total_import_cost']:>12.2f} | "
                 f"{strategy_results['PRODUCE_PRIORITY']['financial']['total_import_cost']:>12.2f}")
    
    # Export revenue
    report.append(f"{'Export Revenue ($)':<30} | "
                 f"{strategy_results['LOAD_PRIORITY']['financial']['total_export_revenue']:>12.2f} | "
                 f"{strategy_results['CHARGE_PRIORITY']['financial']['total_export_revenue']:>12.2f} | "
                 f"{strategy_results['PRODUCE_PRIORITY']['financial']['total_export_revenue']:>12.2f}")
    
    # Net cost
    report.append(f"{'Net Cost ($)':<30} | "
                 f"{strategy_results['LOAD_PRIORITY']['financial']['net_cost']:>12.2f} | "
                 f"{strategy_results['CHARGE_PRIORITY']['financial']['net_cost']:>12.2f} | "
                 f"{strategy_results['PRODUCE_PRIORITY']['financial']['net_cost']:>12.2f}")
    
    report.append("-" * 70)
    report.append("")
    
    # Find best strategy
    costs = {
        'LOAD_PRIORITY': strategy_results['LOAD_PRIORITY']['financial']['net_cost'],
        'CHARGE_PRIORITY': strategy_results['CHARGE_PRIORITY']['financial']['net_cost'],
        'PRODUCE_PRIORITY': strategy_results['PRODUCE_PRIORITY']['financial']['net_cost']
    }
    best_strategy = min(costs, key=costs.get)
    worst_strategy = max(costs, key=costs.get)
    
    report.append(f"Most Cost-Effective Strategy: {best_strategy}")
    report.append(f"  -> Net cost: ${costs[best_strategy]:.2f}")
    if costs[best_strategy] < 0:
        report.append(f"  -> Result: PROFIT of ${abs(costs[best_strategy]):.2f}")
    else:
        report.append(f"  -> Savings vs worst: ${costs[worst_strategy] - costs[best_strategy]:.2f}")
    report.append("")
    
    # ========== PART 3: SEASONAL COMPARISON ==========
    report.append("=" * 70)
    report.append("QUESTION 13 & 14: SEASONAL PERFORMANCE COMPARISON")
    report.append("=" * 70)
    report.append("\nHow do cloud coverage and seasons affect system performance?")
    report.append("")
    
    report.append("Seasonal Performance:")
    report.append("-" * 70)
    report.append(f"{'Metric':<30} | {'Spring':<10} | {'Summer':<10} | {'Fall':<10} | {'Winter':<10}")
    report.append("-" * 70)
    
    # Cloud coverage
    spring_cloud = sum(h['cloud_coverage'] for h in season_results['spring']['data']['hourly_data']) / len(season_results['spring']['data']['hourly_data'])
    summer_cloud = sum(h['cloud_coverage'] for h in season_results['summer']['data']['hourly_data']) / len(season_results['summer']['data']['hourly_data'])
    fall_cloud = sum(h['cloud_coverage'] for h in season_results['fall']['data']['hourly_data']) / len(season_results['fall']['data']['hourly_data'])
    winter_cloud = sum(h['cloud_coverage'] for h in season_results['winter']['data']['hourly_data']) / len(season_results['winter']['data']['hourly_data'])
    
    report.append(f"{'Avg Cloud Coverage':<30} | "
                 f"{spring_cloud:>10.2f} | "
                 f"{summer_cloud:>10.2f} | "
                 f"{fall_cloud:>10.2f} | "
                 f"{winter_cloud:>10.2f}")
    
    # Solar generated
    report.append(f"{'Solar Generated (kWh)':<30} | "
                 f"{season_results['spring']['summary']['total_solar_generated_kwh']:>10.2f} | "
                 f"{season_results['summer']['summary']['total_solar_generated_kwh']:>10.2f} | "
                 f"{season_results['fall']['summary']['total_solar_generated_kwh']:>10.2f} | "
                 f"{season_results['winter']['summary']['total_solar_generated_kwh']:>10.2f}")
    
    # Self-sufficiency
    report.append(f"{'Self-Sufficiency (%)':<30} | "
                 f"{season_results['spring']['summary']['self_sufficiency_percent']:>10.2f} | "
                 f"{season_results['summer']['summary']['self_sufficiency_percent']:>10.2f} | "
                 f"{season_results['fall']['summary']['self_sufficiency_percent']:>10.2f} | "
                 f"{season_results['winter']['summary']['self_sufficiency_percent']:>10.2f}")
    
    # Battery avg SoC
    report.append(f"{'Battery Avg SoC (%)':<30} | "
                 f"{season_results['spring']['battery']['average_soc_percent']:>10.2f} | "
                 f"{season_results['summer']['battery']['average_soc_percent']:>10.2f} | "
                 f"{season_results['fall']['battery']['average_soc_percent']:>10.2f} | "
                 f"{season_results['winter']['battery']['average_soc_percent']:>10.2f}")
    
    # Net cost
    report.append(f"{'Net Cost ($)':<30} | "
                 f"{season_results['spring']['financial']['net_cost']:>10.2f} | "
                 f"{season_results['summer']['financial']['net_cost']:>10.2f} | "
                 f"{season_results['fall']['financial']['net_cost']:>10.2f} | "
                 f"{season_results['winter']['financial']['net_cost']:>10.2f}")
    
    report.append("-" * 70)
    report.append("")
    
    # Find best and worst seasons
    season_solar = {
        'spring': season_results['spring']['summary']['total_solar_generated_kwh'],
        'summer': season_results['summer']['summary']['total_solar_generated_kwh'],
        'fall': season_results['fall']['summary']['total_solar_generated_kwh'],
        'winter': season_results['winter']['summary']['total_solar_generated_kwh']
    }
    best_season = max(season_solar, key=season_solar.get)
    worst_season = min(season_solar, key=season_solar.get)
    
    report.append(f"Best Season for Solar Generation: {best_season.capitalize()}")
    report.append(f"  -> Solar generated: {season_solar[best_season]:.2f} kWh")
    report.append(f"  -> Cloud coverage: {eval(f'{best_season}_cloud'):.2f}")
    report.append("")
    report.append(f"Worst Season for Solar Generation: {worst_season.capitalize()}")
    report.append(f"  -> Solar generated: {season_solar[worst_season]:.2f} kWh")
    report.append(f"  -> Cloud coverage: {eval(f'{worst_season}_cloud'):.2f}")
    report.append(f"  -> {((season_solar[best_season] - season_solar[worst_season])/season_solar[worst_season]*100):.1f}% less than {best_season}")
    report.append("")
    
    report.append("Seasonal Insights:")
    report.append("  - Summer (Guadalajara): High cloud coverage due to monsoon season")
    report.append("  - Winter: Lowest cloud coverage but shorter daylight hours")
    report.append("  - Spring/Fall: Moderate conditions, balanced generation")
    report.append("")
    
    report.append("=" * 70)
    report.append("SUMMARY AND RECOMMENDATIONS")
    report.append("=" * 70)
    report.append("")
    report.append(f"Based on {base_config['simulation']['duration_days']}-day simulations:")
    report.append("")
    report.append(f"1. Best Overall Strategy: {best_strategy}")
    report.append(f"   - Lowest cost: ${costs[best_strategy]:.2f}")
    report.append(f"   - {('Best' if best_strategy == best_self_suff else 'Good')} self-sufficiency")
    report.append(f"   - {('Best' if best_strategy == best_reliability else 'Good')} reliability")
    report.append("")
    report.append(f"2. Best Season: {best_season.capitalize()}")
    report.append(f"   - Highest solar generation: {season_solar[best_season]:.2f} kWh")
    report.append(f"   - Lowest cloud coverage: {eval(f'{best_season}_cloud'):.2f}")
    report.append("")
    report.append("3. System Sizing Recommendations:")
    
    # Check if system is undersized
    avg_self_suff = sum(self_suff.values()) / len(self_suff)
    if avg_self_suff < 50:
        report.append("   WARNING: System appears UNDERSIZED for load requirements")
        report.append("   -> Consider: Increasing battery capacity (add more batteries)")
        report.append("   -> Consider: Increasing solar capacity (add more panels)")
    else:
        report.append("   System sizing appears adequate for current load")
    
    report.append("")
    report.append("=" * 70)
    report.append("END OF COMPARISON REPORT")
    report.append("=" * 70)
    
    return "\n".join(report)

def main():
    """Main execution function."""
    try:
        # Print header
        print_header()
        
        # Confirm
        response = input("\nPress ENTER to start comparisons (or Ctrl+C to cancel): ")
        
        # Load base configuration
        print("\nLoading base configuration from config.json...")
        base_config = load_base_config()
        
        # Ensure random_seed exists
        if 'random_seed' not in base_config['simulation']:
            base_config['simulation']['random_seed'] = None
            print("  No random seed specified in config")
        
        # Run strategy comparison
        strategy_results = run_strategy_comparison(base_config)
        
        # Run season comparison
        season_results = run_season_comparison(base_config)
        
        # Generate report
        print("\n" + "=" * 70)
        print("GENERATING COMPARISON REPORT")
        print("=" * 70)
        
        report = generate_comparison_report(strategy_results, season_results, base_config)
        
        # Save report
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        results_dir = os.path.join(BASE_DIR, 'results')
        report_filename = os.path.join(results_dir, f"comparison_report_{timestamp}.txt")
        
        os.makedirs(results_dir, exist_ok=True)
        with open(report_filename, 'w') as f:
            f.write(report)
        
        # Print report to console
        print("\n" + report)
        
        # Print save location
        print(f"\nReport saved to: {report_filename}")
        
        print("\n" + "=" * 70)
        print("COMPARISON COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        print("\nThe report answers questions 11, 12, 13, and 14 comprehensively.")
        print("   Use this report in your project documentation.")
        print("\nAll simulations used the same random seed for fair comparison.")
        print("   This ensures identical conditions across all tests.\n")
        
        return 0
        
    except KeyboardInterrupt:
        print("\n\nComparison cancelled by user.")
        return 1
    
    except FileNotFoundError as e:
        print(f"\nError: Configuration file not found.")
        print(f"   Make sure 'config.json' exists in the project root.")
        print(f"   Details: {e}")
        return 1
    
    except Exception as e:
        print(f"\nError during comparison:")
        print(f"   {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())