"""
GreenGrid Simulation - Data Processor
======================================
Reads simulation results from 2 neighborhood scenarios and generates
consolidated JSON files ready for the D3.js dashboard.

Scenarios:
  - well_designed : properly sized solar systems
  - unadvised     : poorly sized solar systems
  - no_solar      : calculated baseline (no solar at all)

Usage:
  Edit DEFAULT_WELL, DEFAULT_UNADVISED and DEFAULT_OUT in main()
  and run the script directly.

References:
  Secretaria de Medio Ambiente y Recursos Naturales. (2025, February 28).
    Aviso: Factor de emision del Sistema Electrico Nacional 2024.
    Comision Reguladora de Energia. https://www.gob.mx/cms/uploads/attachment/file/981194/aviso_fesen_2024.pdf
"""

import json
import csv
import os
import argparse
from datetime import datetime, timedelta

# ── Constants ─────────────────────────────────────────────────────────────────

# Mexico national grid emission factor (kg CO2e per kWh)
CO2_FACTOR_KG_PER_KWH = 0.444

SCENARIO_LABELS = {
    'no_solar': 'No Solar',
    'unadvised': 'Unadvised System',
    'well_designed': 'Well Designed System',
}

# ── Utility Functions ─────────────────────────────────────────────────────────

def read_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def read_csv(path):
    with open(path, 'r') as f:
        reader = csv.DictReader(f)
        return list(reader)

def write_json(data, path):
    dir_name = os.path.dirname(path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"  + {path}")

def get_house_dirs(scenario_dir):
    """Return sorted list of (house_id, full_path) tuples."""
    dirs = []
    for name in sorted(os.listdir(scenario_dir)):
        full = os.path.join(scenario_dir, name)
        if os.path.isdir(full) and name.startswith('house_'):
            dirs.append((name, full))
    return dirs

# ── Scenario Loaders ──────────────────────────────────────────────────────────

def load_scenario(scenario_dir, scenario_key):
    """
    Load all data for a given scenario directory.

    Args:
        scenario_dir (str): Path to the neighborhood simulation output folder.
        scenario_key (str): Identifier string for this scenario.

    Returns:
        dict: Contains 'summary' (neighborhood_summary.json) and
              'households' (list of per-house dicts with daily and hourly data).
    """
    print(f"\n  Loading '{scenario_key}' from: {scenario_dir}")

    summary_path = os.path.join(scenario_dir, 'neighborhood_summary.json')
    summary = read_json(summary_path)

    house_dirs = get_house_dirs(scenario_dir)
    households = []

    for house_id, house_dir in house_dirs:
        daily_path = os.path.join(house_dir, 'daily_summaries.csv')
        hourly_path = os.path.join(house_dir, 'hourly_data.csv')
        config_path = os.path.join(house_dir, 'config.json')

        meta = next((h for h in summary['households'] if h['id'] == house_id), {})
        daily = read_csv(daily_path)  if os.path.exists(daily_path)  else []
        hourly = read_csv(hourly_path) if os.path.exists(hourly_path) else []
        config = read_json(config_path) if os.path.exists(config_path) else {}

        households.append({
            'id': house_id,
            'meta': meta,
            'config': config,
            'daily': daily,
            'hourly': hourly,
        })

    print(f"    Loaded {len(households)} households")
    return {'summary': summary, 'households': households}

def build_no_solar(well_data, grid_rates):
    """
    Calculate the 'no solar' baseline using consumption data from
    the well-designed scenario. Every kWh of load is assumed to
    be imported from the grid, with CO2 emissions calculated using
    the CFE national grid emission factor.

    Args:
        well_data (dict): Loaded data from the well_designed scenario.
        grid_rates (dict): Dict with 'import_cost' and 'export_revenue' keys.

    Returns:
        dict: Baseline households list and neighborhood totals.
    """
    households = []
    for h in well_data['households']:
        meta = h['meta']
        load = meta['total_load_consumed_kwh']
        cost = load * grid_rates['import_cost']
        co2  = load * CO2_FACTOR_KG_PER_KWH

        households.append({
            'id': meta['id'],
            'household_type': meta['household_type'],
            'wealth_level': meta['wealth_level'],
            # Keys use the same schema as build_per_house() output so that
            # D3 can read all three scenarios (no_solar, unadvised, well_designed)
            # with identical field names.
            'total_solar_kwh': 0.0,
            'total_load_kwh': round(load, 2),
            'total_imported_kwh': round(load, 2),
            'total_exported_kwh': 0.0,
            'total_curtailed_kwh': 0.0,
            'self_sufficiency_percent': 0.0,
            'net_cost': round(cost, 2),
            'co2_avoided_kg': 0.0,
            'co2_would_have_kg': round(co2, 2),
            'average_soc_percent': 0.0,
            'inverter_failures': 0,
            'solar_count': 0,
            'inverter_count': 0,
            'battery_count': 0,
            'scenario': 'no_solar',
        })

    total_load = sum(h['total_load_kwh'] for h in households)
    total_cost = sum(h['net_cost'] for h in households)
    total_co2  = sum(h['co2_would_have_kg'] for h in households)

    return {
        'households': households,
        'totals': {
            'total_load_kwh': total_load,
            'total_cost': total_cost,
            'total_co2_kg': total_co2,
            'total_solar_kwh': 0.0,
            'total_exported_kwh': 0.0,
            'avg_self_sufficiency': 0.0,
        }
    }

# ── Aggregation Helpers ───────────────────────────────────────────────────────

def aggregate_daily_neighborhood(households, start_date_str='2024-01-01'):
    """
    Combine daily_summaries from all houses into neighborhood-level daily totals.

    Args:
        households (list): List of household dicts with 'daily' CSV rows.
        start_date_str (str): Simulation start date in YYYY-MM-DD format.

    Returns:
        list: One dict per day with aggregated energy values.
    """
    start = datetime.strptime(start_date_str, '%Y-%m-%d')
    day_map = {}

    for h in households:
        for row in h['daily']:
            day = int(float(row['day']))
            if day not in day_map:
                day_map[day] = {
                    'day': day,
                    'date': (start + timedelta(days=day - 1)).strftime('%Y-%m-%d'),
                    'solar_generated_kwh': 0.0,
                    'load_consumed_kwh': 0.0,
                    'grid_imported_kwh': 0.0,
                    'grid_exported_kwh': 0.0,
                    'curtailed_kwh': 0.0,
                    'self_sufficiency_avg': 0.0,
                    '_ss_count': 0,
                }
            d = day_map[day]
            d['solar_generated_kwh'] += float(row['solar_generated_kwh'])
            d['load_consumed_kwh'] += float(row['load_consumed_kwh'])
            d['grid_imported_kwh'] += float(row['grid_imported_kwh'])
            d['grid_exported_kwh'] += float(row['grid_exported_kwh'])
            d['curtailed_kwh'] += float(row['curtailed_kwh'])
            d['self_sufficiency_avg'] += float(row['self_sufficiency_percent'])
            d['_ss_count'] += 1

    result = []
    for day in sorted(day_map.keys()):
        d = day_map[day]
        count = d.pop('_ss_count')
        d['self_sufficiency_avg'] = round(d['self_sufficiency_avg'] / count, 2) if count else 0
        for k in ['solar_generated_kwh', 'load_consumed_kwh', 'grid_imported_kwh',
                  'grid_exported_kwh', 'curtailed_kwh']:
            d[k] = round(d[k], 4)
        result.append(d)

    return result

def aggregate_weekly(daily_rows):
    """
    Group daily rows into weekly totals (7-day weeks).

    Args:
        daily_rows (list): Output from aggregate_daily_neighborhood.

    Returns:
        list: One dict per week with aggregated energy values.
    """
    weeks = {}
    for row in daily_rows:
        week = ((row['day'] - 1) // 7) + 1
        if week not in weeks:
            weeks[week] = {
                'week': week,
                'solar_generated_kwh': 0.0,
                'load_consumed_kwh': 0.0,
                'grid_imported_kwh': 0.0,
                'grid_exported_kwh': 0.0,
                'curtailed_kwh': 0.0,
                'self_sufficiency_avg': 0.0,
                '_count': 0,
            }
        w = weeks[week]
        w['solar_generated_kwh'] += row['solar_generated_kwh']
        w['load_consumed_kwh'] += row['load_consumed_kwh']
        w['grid_imported_kwh'] += row['grid_imported_kwh']
        w['grid_exported_kwh'] += row['grid_exported_kwh']
        w['curtailed_kwh'] += row['curtailed_kwh']
        w['self_sufficiency_avg'] += row['self_sufficiency_avg']
        w['_count'] += 1

    result = []
    for week in sorted(weeks.keys()):
        w = weeks[week]
        count = w.pop('_count')
        w['self_sufficiency_avg'] = round(w['self_sufficiency_avg'] / count, 2)
        for k in ['solar_generated_kwh', 'load_consumed_kwh', 'grid_imported_kwh',
                  'grid_exported_kwh', 'curtailed_kwh']:
            w[k] = round(w[k], 4)
        result.append(w)
    return result

def aggregate_monthly(daily_rows):
    """
    Group daily rows into monthly totals using real calendar months derived
    from the 'date' field (YYYY-MM-DD). This ensures correct month labels
    regardless of which month/season the simulation started in.

    Args:
        daily_rows (list): Output from aggregate_daily_neighborhood.

    Returns:
        list: One dict per calendar month with aggregated energy values,
              sorted chronologically.
    """
    months = {}
    for row in daily_rows:
        date_obj = datetime.strptime(row['date'], '%Y-%m-%d')
        month_key   = date_obj.strftime('%Y-%m') # e.g. '2024-07'
        month_label = date_obj.strftime('%b %Y') # e.g. 'Jul 2024'
        month_num   = int(date_obj.strftime('%m')) # 1-12 (for ordering)

        if month_key not in months:
            months[month_key] = {
                'month_key': month_key,
                'month_name': month_label,
                'month_num': month_num,
                'solar_generated_kwh': 0.0,
                'load_consumed_kwh': 0.0,
                'grid_imported_kwh': 0.0,
                'grid_exported_kwh': 0.0,
                'curtailed_kwh': 0.0,
                'self_sufficiency_avg': 0.0,
                '_count': 0,
            }
        m = months[month_key]
        m['solar_generated_kwh'] += row['solar_generated_kwh']
        m['load_consumed_kwh'] += row['load_consumed_kwh']
        m['grid_imported_kwh'] += row['grid_imported_kwh']
        m['grid_exported_kwh'] += row['grid_exported_kwh']
        m['curtailed_kwh'] += row['curtailed_kwh']
        m['self_sufficiency_avg']+= row['self_sufficiency_avg']
        m['_count'] += 1

    result = []
    for key in sorted(months.keys()):
        m = months[key]
        count = m.pop('_count')
        m['self_sufficiency_avg'] = round(m['self_sufficiency_avg'] / count, 2)
        for k in ['solar_generated_kwh', 'load_consumed_kwh', 'grid_imported_kwh',
                  'grid_exported_kwh', 'curtailed_kwh']:
            m[k] = round(m[k], 4)
        result.append(m)
    return result

def aggregate_quarterly(daily_rows):
    """
    Group daily rows into quarterly totals using real calendar quarters
    derived from the 'date' field (YYYY-MM-DD).

    Args:
        daily_rows (list): Output from aggregate_daily_neighborhood.

    Returns:
        list: One dict per calendar quarter with aggregated energy values.
    """
    quarter_label = {1: 'Q1 (Jan-Mar)', 2: 'Q2 (Apr-Jun)',
                     3: 'Q3 (Jul-Sep)', 4: 'Q4 (Oct-Dec)'}
    quarters = {}
    for row in daily_rows:
        date_obj = datetime.strptime(row['date'], '%Y-%m-%d')
        year     = date_obj.year
        q_num    = (date_obj.month - 1) // 3 + 1  # 1-4
        q_key    = f"{year}-Q{q_num}" # e.g. '2024-Q3'

        if q_key not in quarters:
            quarters[q_key] = {
                'quarter_key': q_key,
                'quarter_name': f"{quarter_label[q_num]} {year}",
                'quarter_num': q_num,
                'solar_generated_kwh': 0.0,
                'load_consumed_kwh': 0.0,
                'grid_imported_kwh': 0.0,
                'grid_exported_kwh': 0.0,
                'curtailed_kwh': 0.0,
                'self_sufficiency_avg': 0.0,
                '_count': 0,
            }
        q = quarters[q_key]
        q['solar_generated_kwh'] += row['solar_generated_kwh']
        q['load_consumed_kwh'] += row['load_consumed_kwh']
        q['grid_imported_kwh'] += row['grid_imported_kwh']
        q['grid_exported_kwh'] += row['grid_exported_kwh']
        q['curtailed_kwh'] += row['curtailed_kwh']
        q['self_sufficiency_avg']+= row['self_sufficiency_avg']
        q['_count'] += 1

    result = []
    for key in sorted(quarters.keys()):
        q = quarters[key]
        count = q.pop('_count')
        q['self_sufficiency_avg'] = round(q['self_sufficiency_avg'] / count, 2)
        for k in ['solar_generated_kwh', 'load_consumed_kwh', 'grid_imported_kwh',
                  'grid_exported_kwh', 'curtailed_kwh']:
            q[k] = round(q[k], 4)
        result.append(q)
    return result

def build_duck_curve(households, start_date_str='2024-01-01'):
    """
    Build Duck Curve data: average hourly load vs solar for the neighborhood,
    averaged across all houses and all days of the simulation.

    Args:
        households (list): List of household dicts with 'hourly' CSV rows.
        start_date_str (str): Simulation start date (reserved for future use).

    Returns:
        list: 24 dicts, one per hour of the day, with avg kW values.
    """
    hour_buckets = {h: {'load': [], 'solar': [], 'net_load': [], 'battery_soc': []}
                    for h in range(24)}

    for h in households:
        for row in h['hourly']:
            # 'hour' in hourly_data.csv is the absolute simulation hour (0, 1, 2 ... N*24).
            # We use % 24 to map it to the hour-of-day bucket (0–23).
            # If the CSV ever stores a full timestamp string this will raise a ValueError,
            # which makes the bug immediately visible rather than silently producing wrong data.
            hour = int(float(row['hour'])) % 24
            hour_buckets[hour]['load'].append(float(row['load_demand_kw']))
            hour_buckets[hour]['solar'].append(float(row['solar_generated_kw']))
            hour_buckets[hour]['net_load'].append(
                float(row['load_demand_kw']) - float(row['solar_generated_kw'])
            )
            hour_buckets[hour]['battery_soc'].append(float(row['battery_soc']))

    result = []
    for hour in range(24):
        b = hour_buckets[hour]
        result.append({
            'hour': hour,
            'avg_load_kw': round(sum(b['load']) / len(b['load']) if b['load'] else 0, 4),
            'avg_solar_kw': round(sum(b['solar']) / len(b['solar']) if b['solar'] else 0, 4),
            'avg_net_load_kw': round(sum(b['net_load']) / len(b['net_load']) if b['net_load'] else 0, 4),
            'avg_battery_soc': round(sum(b['battery_soc']) / len(b['battery_soc']) if b['battery_soc'] else 0, 2),
        })
    return result

def build_by_group(households_meta):
    """
    Aggregate metrics grouped by household_type and wealth_level.

    Args:
        households_meta (list): Household metadata list from neighborhood_summary.json.

    Returns:
        dict: 'by_type' and 'by_wealth' lists with aggregated metrics.
    """
    type_groups = {}
    wealth_groups = {}

    for h in households_meta:
        htype  = h.get('household_type', 'unknown')
        wealth = h.get('wealth_level', 'unknown')

        if htype not in type_groups:
            type_groups[htype] = {
                'household_type': htype,
                'count': 0,
                'total_solar_kwh': 0.0,
                'total_load_kwh': 0.0,
                'total_imported_kwh': 0.0,
                'total_exported_kwh': 0.0,
                'total_curtailed_kwh': 0.0,
                'avg_self_sufficiency': 0.0,
                'total_net_cost': 0.0,
                'avg_battery_soc': 0.0,
                'total_inverter_failures': 0,
                'total_co2_avoided_kg': 0.0,
            }
        t = type_groups[htype]
        t['count'] += 1
        t['total_solar_kwh'] += h.get('total_solar_generated_kwh', 0)
        t['total_load_kwh'] += h.get('total_load_consumed_kwh', 0)
        t['total_imported_kwh'] += h.get('total_grid_imported_kwh', 0)
        t['total_exported_kwh'] += h.get('total_grid_exported_kwh', 0)
        t['total_curtailed_kwh'] += h.get('total_curtailed_kwh', 0)
        t['avg_self_sufficiency'] += h.get('self_sufficiency_percent', 0)
        t['total_net_cost'] += h.get('net_cost', 0)
        t['avg_battery_soc'] += h.get('average_soc_percent', 0)
        t['total_inverter_failures']+= h.get('inverter_failures', 0)

        if wealth not in wealth_groups:
            wealth_groups[wealth] = {
                'wealth_level': wealth,
                'count': 0,
                'total_solar_kwh': 0.0,
                'total_load_kwh': 0.0,
                'total_imported_kwh': 0.0,
                'total_exported_kwh': 0.0,
                'total_curtailed_kwh': 0.0,
                'avg_self_sufficiency': 0.0,
                'total_net_cost': 0.0,
                'avg_battery_soc': 0.0,
                'total_inverter_failures': 0,
            }
        w = wealth_groups[wealth]
        w['count'] += 1
        w['total_solar_kwh'] += h.get('total_solar_generated_kwh', 0)
        w['total_load_kwh'] += h.get('total_load_consumed_kwh', 0)
        w['total_imported_kwh'] += h.get('total_grid_imported_kwh', 0)
        w['total_exported_kwh'] += h.get('total_grid_exported_kwh', 0)
        w['total_curtailed_kwh'] += h.get('total_curtailed_kwh', 0)
        w['avg_self_sufficiency'] += h.get('self_sufficiency_percent', 0)
        w['total_net_cost'] += h.get('net_cost', 0)
        w['avg_battery_soc'] += h.get('average_soc_percent', 0)
        w['total_inverter_failures']+= h.get('inverter_failures', 0)

    for t in type_groups.values():
        n = t['count']
        t['avg_self_sufficiency'] = round(t['avg_self_sufficiency'] / n, 2)
        t['avg_battery_soc'] = round(t['avg_battery_soc'] / n, 2)
        t['total_co2_avoided_kg'] = round(t['total_solar_kwh'] * CO2_FACTOR_KG_PER_KWH, 2)
        for k in ['total_solar_kwh', 'total_load_kwh', 'total_imported_kwh',
                  'total_exported_kwh', 'total_curtailed_kwh', 'total_net_cost']:
            t[k] = round(t[k], 4)

    for w in wealth_groups.values():
        n = w['count']
        w['avg_self_sufficiency'] = round(w['avg_self_sufficiency'] / n, 2)
        w['avg_battery_soc'] = round(w['avg_battery_soc'] / n, 2)
        w['total_co2_avoided_kg'] = round(w['total_solar_kwh'] * CO2_FACTOR_KG_PER_KWH, 2)
        for k in ['total_solar_kwh', 'total_load_kwh', 'total_imported_kwh',
                  'total_exported_kwh', 'total_curtailed_kwh', 'total_net_cost']:
            w[k] = round(w[k], 4)

    return {
        'by_type': list(type_groups.values()),
        'by_wealth': list(wealth_groups.values()),
    }

def build_per_house(households_meta, scenario_key):
    """
    Build a flat list of per-house summaries with all filterable fields
    for scatter plots, tables, and detailed views.

    Args:
        households_meta (list): Household metadata from neighborhood_summary.json.
        scenario_key (str): Scenario identifier to tag each record.

    Returns:
        list: One dict per house with all relevant metrics.
    """
    result = []
    for h in households_meta:
        solar = h.get('total_solar_generated_kwh', 0)
        load  = h.get('total_load_consumed_kwh', 0)

        result.append({
            'id': h.get('id'),
            'household_type': h.get('household_type'),
            'wealth_level': h.get('wealth_level'),
            'solar_count': h.get('solar_count', 0),
            'inverter_count': h.get('inverter_count', 0),
            'battery_count': h.get('battery_count', 0),
            'total_solar_kwh': round(solar, 2),
            'total_load_kwh': round(load, 2),
            'total_imported_kwh': round(h.get('total_grid_imported_kwh', 0), 2),
            'total_exported_kwh': round(h.get('total_grid_exported_kwh', 0), 2),
            'total_curtailed_kwh': round(h.get('total_curtailed_kwh', 0), 2),
            'self_sufficiency_percent': round(h.get('self_sufficiency_percent', 0), 2),
            'net_cost': round(h.get('net_cost', 0), 2),
            'average_soc_percent': round(h.get('average_soc_percent', 0), 2),
            'inverter_failures': h.get('inverter_failures', 0),
            'co2_avoided_kg': round(solar * CO2_FACTOR_KG_PER_KWH, 2),
            'co2_would_have_kg': round(load  * CO2_FACTOR_KG_PER_KWH, 2),
            'scenario': scenario_key,
        })
    return result

# ── Overview Builder ──────────────────────────────────────────────────────────

def build_overview(well_data, unadvised_data, no_solar_data, grid_rates):
    """
    Build high-level scenario comparison for the dashboard narrative section.
    Includes energy totals, cost, CO2, and self-sufficiency for all 3 scenarios.

    Args:
        well_data (dict): Loaded well_designed scenario.
        unadvised_data (dict): Loaded unadvised scenario.
        no_solar_data (dict): Calculated no-solar baseline.
        grid_rates (dict): Dict with 'import_cost' and 'export_revenue' keys.

    Returns:
        dict: Overview with all 3 scenarios and metadata.
    """
    def scenario_totals(households_meta, label):
        total_solar = sum(h.get('total_solar_generated_kwh', 0) for h in households_meta)
        total_load = sum(h.get('total_load_consumed_kwh', 0) for h in households_meta)
        total_import = sum(h.get('total_grid_imported_kwh', 0) for h in households_meta)
        total_export = sum(h.get('total_grid_exported_kwh', 0) for h in households_meta)
        total_curtailed = sum(h.get('total_curtailed_kwh', 0) for h in households_meta)
        total_cost = sum(h.get('net_cost', 0) for h in households_meta)
        # Load-weighted self-sufficiency: more accurate than simple average
        # because large-family houses consume far more than studio units.
        avg_ss = ((1 - total_import / total_load) * 100) if total_load else 0
        co2_avoided = total_solar * CO2_FACTOR_KG_PER_KWH
        co2_baseline = total_load  * CO2_FACTOR_KG_PER_KWH

        return {
            'scenario': label,
            'scenario_label': SCENARIO_LABELS[label],
            'total_solar_kwh': round(total_solar, 2),
            'total_load_kwh': round(total_load, 2),
            'total_imported_kwh': round(total_import, 2),
            'total_exported_kwh': round(total_export, 2),
            'total_curtailed_kwh': round(total_curtailed, 2),
            'total_net_cost': round(total_cost, 2),
            'avg_self_sufficiency': round(avg_ss, 2),
            'co2_avoided_kg': round(co2_avoided, 2),
            'co2_baseline_kg': round(co2_baseline, 2),
            'co2_reduction_percent': round((co2_avoided / co2_baseline * 100) if co2_baseline else 0, 2),
        }

    well_totals = scenario_totals(well_data['summary']['households'], 'well_designed')
    unadvised_totals = scenario_totals(unadvised_data['summary']['households'], 'unadvised')

    no_solar_totals = {
        'scenario': 'no_solar',
        'scenario_label': SCENARIO_LABELS['no_solar'],
        'total_solar_kwh': 0.0,
        'total_load_kwh': round(no_solar_data['totals']['total_load_kwh'], 2),
        'total_imported_kwh': round(no_solar_data['totals']['total_load_kwh'], 2),
        'total_exported_kwh': 0.0,
        'total_curtailed_kwh': 0.0,
        'total_net_cost': round(no_solar_data['totals']['total_cost'], 2),
        'avg_self_sufficiency': 0.0,
        'co2_avoided_kg': 0.0,
        'co2_baseline_kg': round(no_solar_data['totals']['total_co2_kg'], 2),
        'co2_reduction_percent': 0.0,
    }

    well_totals['cost_savings_vs_no_solar'] = round(
        no_solar_totals['total_net_cost'] - well_totals['total_net_cost'], 2)
    unadvised_totals['cost_savings_vs_no_solar'] = round(
        no_solar_totals['total_net_cost'] - unadvised_totals['total_net_cost'], 2)

    return {
        'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'scenarios': [no_solar_totals, unadvised_totals, well_totals],
        'co2_factor_kg_per_kwh': CO2_FACTOR_KG_PER_KWH,
        'co2_reference': (
            'Secretaria de Medio Ambiente y Recursos Naturales. (2025, February 28). '
            'Aviso: Factor de emision del Sistema Electrico Nacional 2024. '
            'Comision Reguladora de Energia. https://www.gob.mx/cms/uploads/attachment/file/981194/aviso_fesen_2024.pdf'
        ),
    }

# ── Entry Point ───────────────────────────────────────────────────────────────

def main():
    # ── Default paths (edit these to match your results folders) ──────────
    DEFAULT_WELL = 'results/neighborhood/sim_20260306_182527_LOAD_PRIORITY_summer_360d'
    DEFAULT_UNADVISED = 'results/neighborhood/sim_20260306_182811_LOAD_PRIORITY_summer_360d'
    DEFAULT_OUT  = '../Dashboard/data'
    # ───────────────────────────────────────────────────────────────────────

    parser = argparse.ArgumentParser(description='GreenGrid Data Processor')
    parser.add_argument('--well', default=DEFAULT_WELL, help='Path to well_designed scenario folder')
    parser.add_argument('--unadvised', default=DEFAULT_UNADVISED, help='Path to unadvised scenario folder')
    parser.add_argument('--out',  default=DEFAULT_OUT,  help='Output folder for dashboard JSON files')
    args = parser.parse_args()

    print("\n" + "=" * 70)
    print("  GREENGRID DATA PROCESSOR")
    print("=" * 70)

    # ── Load raw data ──────────────────────────────────────────────────────
    print("\n[1/5] Loading simulation data...")
    well_data = load_scenario(args.well, 'well_designed')
    unadvised_data = load_scenario(args.unadvised, 'unadvised')

    # Read grid rates from config.json — single source of truth
    sim_config = well_data['households'][0]['config']
    grid_rates = {
        'import_cost':    sim_config['grid']['import_cost_per_kwh'],
        'export_revenue': sim_config['grid']['export_revenue_per_kwh'],
    }
    print(f"  Grid rates loaded from config: import={grid_rates['import_cost']} $/kWh, "
          f"export={grid_rates['export_revenue']} $/kWh")

    no_solar_data = build_no_solar(well_data, grid_rates)
    print(f"  No-solar baseline calculated from well_designed consumption data")

    # ── Overview ───────────────────────────────────────────────────────────
    print("\n[2/5] Building scenario overview...")
    overview = build_overview(well_data, unadvised_data, no_solar_data, grid_rates)
    write_json(overview, os.path.join(args.out, 'overview.json'))

    # ── Per-house data ─────────────────────────────────────────────────────
    print("\n[3/5] Building per-house data...")
    per_house_well = build_per_house(well_data['summary']['households'], 'well_designed')
    per_house_unadvised = build_per_house(unadvised_data['summary']['households'], 'unadvised')
    per_house_sin  = no_solar_data['households']

    write_json({
        'well_designed': per_house_well,
        'unadvised': per_house_unadvised,
        'no_solar': per_house_sin,
    }, os.path.join(args.out, 'per_house.json'))

    write_json({
        'well_designed': build_by_group(well_data['summary']['households']),
        'unadvised': build_by_group(unadvised_data['summary']['households']),
    }, os.path.join(args.out, 'by_group.json'))

    # ── Timeseries ─────────────────────────────────────────────────────────
    print("\n[4/5] Building timeseries (daily / weekly / monthly / quarterly)...")
    start_date = (
        well_data['households'][0]['config']
        .get('simulation', {})
        .get('start_date', '2024-01-01')
    )

    daily_well = aggregate_daily_neighborhood(well_data['households'], start_date)
    daily_unadvised = aggregate_daily_neighborhood(unadvised_data['households'], start_date)

    write_json({
        'well_designed': {
            'daily': daily_well,
            'weekly': aggregate_weekly(daily_well),
            'monthly': aggregate_monthly(daily_well),
            'quarterly': aggregate_quarterly(daily_well),
        },
        'unadvised': {
            'daily': daily_unadvised,
            'weekly': aggregate_weekly(daily_unadvised),
            'monthly': aggregate_monthly(daily_unadvised),
            'quarterly': aggregate_quarterly(daily_unadvised),
        },
    }, os.path.join(args.out, 'timeseries.json'))

    # ── Duck Curve ─────────────────────────────────────────────────────────
    print("\n[5/5] Building Duck Curve data...")
    write_json({
        'well_designed': build_duck_curve(well_data['households'], start_date),
        'unadvised': build_duck_curve(unadvised_data['households'], start_date),
    }, os.path.join(args.out, 'duck_curve.json'))

    # ── Done ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  DATA PROCESSING COMPLETE")
    print("=" * 70)
    print(f"\n  Output folder : {args.out}")
    print(f"\n  Files generated:")
    print(f"    overview.json    - Scenario comparison (narrative/hero section)")
    print(f"    per_house.json   - Per-house filterable data")
    print(f"    by_group.json    - Grouped by household type and wealth level")
    print(f"    timeseries.json  - Daily / weekly / monthly / quarterly trends")
    print(f"    duck_curve.json  - Hourly neighborhood Duck Curve")
    print(f"\n  Dashboard data is ready.\n")

if __name__ == '__main__':
    main()