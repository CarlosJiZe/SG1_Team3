"""
HouseholdSimulation.py for second phase of GreenGrid digital twin simulation project.

Reads neightborhood_config.json to generate households according to the selected
mode (auto or manual), runs an independent simulation for each household, and saves results
to results/neighborhood/

Fix:
- Added random_seed handling to ensure reproducibility across households while maintaining variability.

"""

import json
import os
import random
from datetime import datetime

from .Simulation import Simulation
from .DataLogger import DataLogger

class HouseholdSimulation:
    """
    Manages a neighborhood simulation by running one Simulation 
    intance per household
    """

    def __init__(self, config_path='neighborhood_config.json'):
        """
        Initialize the HouseholdSimulation.

        Args:
            config_path (str): Path to neighborhood configuration JSON file
        """
        #Load configuration
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        self.base_dir = os.path.dirname(os.path.abspath(config_path))
        from datetime import datetime
        strategy = self.config['energy_management']['strategy']
        season = self.config['simulation']['season']
        days = self.config['simulation']['duration_days']
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        run_name = f"sim_{timestamp}_{strategy}_{season}_{days}d"
        self.output_dir = os.path.join(self.base_dir, 'results', 'neighborhood', run_name)
        os.makedirs(self.output_dir, exist_ok=True)

        #Set seed for reproducibility
        config_seed = self.config['simulation'].get('random_seed',None)
        if config_seed is not None:
            random.seed(config_seed)
        
        # Generate households list form config
        self.households = self._generate_households()

        print("\n" + "=" * 70)
        print("GREENGRID NEIGHBORHOOD SIMULATION")
        print("=" * 70)
        print(f"Mode:       {self.config['neighborhood']['mode']}")
        print(f"Households: {len(self.households)}")
        print(f"Duration:   {self.config['simulation']['duration_days']} days")
        print(f"Season:     {self.config['simulation']['season']}")
        print(f"Strategy:   {self.config['energy_management']['strategy']}")
        print("-" * 70)
        print(f"{'ID':<12} {'Type':<15} {'Wealth':<10} {'Solar':>6} {'Inv':>5} {'Bat':>5}")
        print("-" * 70)
        for h in self.households:
            print(f"  {h['id']:<10} {h['household_type']:<15} {h['wealth_level']:<10} "
                  f"{h['solar_count']:>5}  {h['inverter_count']:>4}  {h['battery_count']:>4}")
        print("=" * 70)

    # ── HOUSEHOLD GENERATION ─────────────────────────────────────────────────

    def _generate_households(self):
        """
        Generate a list of household based of mode

        Returns:
            list: List of household dicts with id, type, wealth and system counts
        """
        mode = self.config['neighborhood']['mode']

        if mode == 'auto':
            households = self._generate_auto()
        elif mode == 'manual':
            households = self._generate_manual()
        else:
            raise ValueError(f"Invalid neighborhood mode: '{mode}'. Must be 'auto' or 'manual'.")
            
        #Apply averrides
        overrides = self.config['neighborhood'].get('overrides',{})
        for household in households:
            hid = household['id']
            if hid in overrides:
                household.update(overrides[hid])

        return households
        
    def _generate_auto(self):
        """
        Automatically generate households using probability distributions

        Returns:
            list: List of household dicts
        """

        cfg = self.config['neighborhood']['auto']
        total = cfg['total_households']

        types = list(cfg['type_distribution'].keys())
        t_probs = list(cfg['type_distribution'].values())
        wealths = list(cfg['wealth_distribution'].keys())
        w_probs = list(cfg['wealth_distribution'].values())

        households = []

        for i in range(total):
            htype  = random.choices(types, weights=t_probs)[0]
            wealth = random.choices(wealths, weights=w_probs)[0]
            system = self._get_template(htype, wealth)
            households.append({
                'id': f'house_{i+1:02d}',
                'household_type': htype,
                'wealth_level': wealth,
                **system
            })

        return households  

    def _generate_manual(self):
        """
        Generate households from exact counts per type+wealth combination.

        Returns:
            list: List of household dicts
        """
        cfg = self.config['neighborhood']['manual']['counts']
        households = []
        counter = 1

        for htype, wealth_counts in cfg.items():
            for wealth, count in wealth_counts.items():
                system = self._get_template(htype, wealth)
                for _ in range(count):
                    households.append({
                        'id': f'house_{counter:02d}',
                        'household_type': htype,
                        'wealth_level': wealth,
                        **system
                    })
                    counter += 1

        return households

    def _get_template(self, household_type, wealth_level):
        """
        Look up system sizing from household_templates in config.

        Args:
            household_type (str): Type of household
            wealth_level (str): Wealth level

        Returns:
            dict: System counts (solar_count, inverter_count, battery_count)
        """
        templates = self.config['household_templates']
        if household_type not in templates:
            raise ValueError(f"No template found for household_type: '{household_type}'")
        if wealth_level not in templates[household_type]:
            raise ValueError(f"No template found for wealth_level: '{wealth_level}' in '{household_type}'")

        return dict(templates[household_type][wealth_level])                            
        
     # ── SIMULATION RUNNER ────────────────────────────────────────────────────

    def run(self):
        """
        Run simulation for every household sequentially.

        Returns:
            list: List of result dicts, one per household
        """
        all_results = []
        total = len(self.households)

        for idx, household in enumerate(self.households):
            hid    = household['id']
            htype  = household['household_type']
            wealth = household['wealth_level']

            # Build per-household config from neighborhood_config
            household_config = self._build_household_config(household, idx)

            # Run simulation in silent mode
            sim = Simulation(config_path=household_config, verbose=False)
            results = sim.run()

            # Attach household metadata to results
            results['household'] = {
                'id':             hid,
                'household_type': htype,
                'wealth_level':   wealth,
                'solar_count':    household['solar_count'],
                'inverter_count': household['inverter_count'],
                'battery_count':  household['battery_count'],
            }
            results['household'].update(sim.load.get_profile_info())

            # Save per-household files
            house_dir = os.path.join(self.output_dir, hid)
            logger = DataLogger(results, household_config, output_dir=house_dir, use_subfolder=False)
            logger.save_all()

            all_results.append(results)

            # ── One line per household ────────────────────────────────────────
            ss   = results['summary']['self_sufficiency_percent']
            cost = results['financial']['net_cost']
            solar = results['summary']['total_solar_generated_kwh']
            load  = results['summary']['total_load_consumed_kwh']
            print(f"  [{idx+1:02d}/{total}] {hid} | {htype:<15} {wealth:<8} | "
                  f"SS: {ss:5.1f}% | Net: ${cost:6.2f} | "
                  f"Solar: {solar:7.1f} kWh | Load: {load:7.1f} kWh")

        print("=" * 70)
        print(f"ALL {total} HOUSEHOLDS COMPLETED")
        print("=" * 70)

        # Save neighborhood summary
        self._save_neighborhood_summary(all_results)

        return all_results
    
    # ── CONFIG BUILDER ───────────────────────────────────────────────────────

    def _build_household_config(self, household,idx=0):
        """
        Build a single-household config dict from neighborhood_config + household data.

        Args:
            household (dict): Household entry with id, type, wealth and system counts

        Returns:
            dict: Config compatible with Simulation.__init__
        """
        cfg = self.config
        inv_d = cfg['inverter_defaults']
        bat_d = cfg['battery_defaults']
        sol_d = cfg['solar_defaults']

        return {
            'simulation': {
                **cfg['simulation'],
                'random_seed': cfg['simulation']['random_seed'] + (idx%10000)
            },
            'solar': {
                'unit_peak_power_kw': household.get('unit_peak_power_kw', sol_d['unit_peak_power_kw']),
                'count': household['solar_count']
            },
            'inverter': {
                'unit_max_output_kw': household.get('unit_max_output_kw', inv_d['unit_max_output_kw']),
                'count': household['inverter_count'],
                'avr_days_in_failure': inv_d['avr_days_in_failure'],
                'min_failure_duration_hours': inv_d['min_failure_duration_hours'],
                'max_failure_duration_hours': inv_d['max_failure_duration_hours']
            },
            'battery': {
                'unit_capacity_kwh': household.get('unit_capacity_kwh', bat_d['unit_capacity_kwh']),
                'count': household['battery_count'],
                'efficiency': bat_d['efficiency'],
                'min_soc': bat_d['min_soc']
            },
            'load': {
                'household_type': household['household_type'],
                'wealth_level': household['wealth_level']
            },
            'grid': cfg['grid'],
            'energy_management': cfg['energy_management']
        }  

    # ── NEIGHBORHOOD SUMMARY ─────────────────────────────────────────────────  

    def _save_neighborhood_summary(self, all_results):
        """
        Save a neighborhood-level summary JSON aggregating all households.

        Args:
            all_results (list): List of per-household result dicts
        """
        summary = {
            'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'total_households': len(all_results),
            'season': self.config['simulation']['season'],
            'duration_days': self.config['simulation']['duration_days'],
            'households': []
        }

        for r in all_results:
            summary['households'].append({
                **r['household'],
                'total_solar_generated_kwh': r['summary']['total_solar_generated_kwh'],
                'total_load_consumed_kwh':   r['summary']['total_load_consumed_kwh'],
                'total_grid_imported_kwh':   r['summary']['total_grid_imported_kwh'],
                'total_grid_exported_kwh':   r['summary']['total_grid_exported_kwh'],
                'total_curtailed_kwh':        r['summary']['total_curtailed_kwh'],
                'self_sufficiency_percent':   r['summary']['self_sufficiency_percent'],
                'net_cost':                   r['financial']['net_cost'],
                'average_soc_percent':        r['battery']['average_soc_percent'],
                'inverter_failures':          r['reliability']['inverter_failures'],
            })

        path = os.path.join(self.output_dir, 'neighborhood_summary.json')
        with open(path, 'w') as f:
            json.dump(summary, f, indent=2)

        print(f"\n  Summary saved to: {path}")

