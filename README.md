# GreenGrid Simulation — Team 3

A comprehensive energy management simulation system for solar-powered microgrids with battery storage. This digital twin simulates real-world energy dynamics, financial performance, and reliability metrics for residential solar installations — and presents the results through an interactive web dashboard.

**Project:** Phase 1 - Simulation & Data Generation / Phase 2 - Visualization  
**Course:** COM 139 - Simulation & Visualization  
**Institution:** Universidad Panamericana, Guadalajara  
**Team:** Team 3

---

## 📋 Table of Contents

- [Part 1 — Python Simulation (main.py)](#-part-1--python-simulation-mainpy)
  - [Features](#-features)
  - [Quick Start](#-quick-start)
  - [Installation](#-installation)
  - [Configuration](#-configuration)
  - [Usage](#-usage)
  - [Project Structure](#-project-structure)
  - [Output Files](#-output-files)
  - [Advanced Usage](#-advanced-usage)
  - [Troubleshooting](#-troubleshooting)


  - [Part 2 — Web Dashboard (index.html)](#-part-2--web-dashboard-indexhtml)
    - [Dashboard Overview](#-dashboard-overview)
    - [Sections & Visualizations](#-sections--visualizations)
    - [How to Run the Dashboard](#-how-to-run-the-dashboard)
    - [Script Load Order](#-script-load-order)
  - [Future Phases](#-future-phases)
  - [Authors](#-authors)

---

# Part 1 — Python Simulation (`main.py`)

## ✨ Features

### Core Simulation
- **Neighborhood Scaling**: Supports simulating a single household or an entire neighborhood of 24+ households.
- **Real-time energy flow modeling**: Solar generation, battery storage, load consumption, and grid interaction.
- **Multiple energy management strategies**: `LOAD_PRIORITY`, `CHARGE_PRIORITY`, `PRODUCE_PRIORITY`.
- **Reliability & Environment**: Realistic seasonal variations and inverter failure simulations.

### Advanced Features
- **Strategy comparison tool**: Automatically compare all three energy management strategies.
- **Seasonal comparison**: Evaluate system performance across all four seasons.
- **Scalable system sizing**: Configure multiple batteries, solar arrays, and inverters.
- **Reproducible results**: Optional random seed for consistent testing.
- **Comprehensive data export**: CSV, JSON, and text report formats.

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd greengrid-simulation

# 2. Run the simulation
python3 main.py

# 3. View results
cat results/answers.txt
```

The simulation will run with default settings and generate results in the `results/` folder.

---

## 💻 Installation

### Prerequisites

- **Python 3.8 or higher** (3.9+ recommended)
- No external libraries required — uses only the Python standard library.

### Verify Python Version

```bash
python3 --version
# Should show Python 3.8.0 or higher
```

### Clone the Repository

```bash
git clone <your-repo-url>
cd greengrid-simulation
```

### Verify Installation

```bash
python3 main.py
# If you see the GreenGrid header, you're ready to go!
```

---

## ⚙️ Configuration

The simulation uses `config.json` in the project root for all settings. A template with detailed explanations is provided in `config_template.json`.

**Option 1: Use the provided config.json** (recommended for first run)
```bash
# No action needed - default config is already included
python3 main.py
```

**Option 2: Customize your configuration**
```bash
  # Copy the template
  cp config_template.json config.json
  # Edit with your preferred editor
  nano config.json
  # or
  vim config.json
```

### Key Configuration Parameters

#### Simulation Settings
```json
{
  "simulation": {
    "duration_days": 30, // Simulation length (30 days = 1 month)
    "time_step_minutes": 60, // Time resolution (15, 30, or 60)
    "start_date": "2024-06-01", // Starting date (affects sun angle)
    "season": "summer", // Season: spring, summer, fall, winter
    "random_seed": 519425893 // For reproducible results (or null)
  }
}
```

#### System Components
```json
{
  "battery": {
    "unit_capacity_kwh": 13.5,// Capacity per battery (13.5 = Tesla Powerwall)
    "count": 1,                    // Number of batteries
    "efficiency": 0.9,             // Round-trip efficiency (90%)
    "min_soc": 0.05               // Minimum charge level (5%)
  },
  "solar": {
    "unit_peak_power_kw": 5.0,     // Peak power per array (5 kW)
    "count": 1                     // Number of solar arrays
  },
  "inverter": {
    "unit_max_output_kw": 4.0,     // Max output per inverter
    "count": 1,                    // Number of inverters
    "failure_rate": 0.005          // Daily failure probability (0.5%)
  }
}
```

#### Energy Management
```json
{
  "energy_management": {
    "strategy": "LOAD_PRIORITY" // LOAD_PRIORITY, CHARGE_PRIORITY, or PRODUCE_PRIORITY
  }
  }
```

### Energy Management Strategies

| Strategy | Priority Order | Best For |
|----------|----------------|----------|
| **LOAD_PRIORITY** | 1. Load → 2. Battery → 3. Grid Export | Maximizing self-consumption |
| **CHARGE_PRIORITY** | 1. Battery → 2. Load → 3. Grid Export | Backup power / time-of-use rates |
| **PRODUCE_PRIORITY** | 1. Grid Export → 2. Load → 3. Battery | Revenue maximization |

### Example Configurations

#### Small Residential (Default)
```json
{
  "battery": {"count": 1, "unit_capacity_kwh": 13.5},
  "solar":   {"count": 1, "unit_peak_power_kw": 5.0},
  "inverter":{"count": 1, "unit_max_output_kw": 4.0}
}
```

#### Medium Residential
```json
{
  "battery": {"count": 2, "unit_capacity_kwh": 13.5},
  "solar":   {"count": 3, "unit_peak_power_kw": 5.0},
  "inverter":{"count": 2, "unit_max_output_kw": 4.0}
}
```

#### Large Residential / Small Commercial
```json
{
  "battery": {"count": 4, "unit_capacity_kwh": 13.5},
  "solar":   {"count": 3, "unit_peak_power_kw": 10.0},
  "inverter":{"count": 2, "unit_max_output_kw": 10.0}
}
```

---

## 🎯 Usage

### Simulation Modes

When you run `python3 main.py`, you will be prompted to select a mode:

```
SELECT MODE:
  1. Single household (config.json)
  2. Neighborhood     (neighborhood_config.json)
```

**Mode 1 — Single Household**: Loads `config.json`, displays system parameters, runs the simulation, prints a results summary, and saves output files to `results/`.

**Mode 2 — Neighborhood**: Loads `neighborhood_config.json` and simulates all 24+ households in the configured neighborhood.

### Strategy & Season Comparison

```bash
python3 compare_strategies.py
```

Runs 7 total simulations (3 strategies + 4 seasons) using the same random seed for fair comparison and saves a comprehensive report to `results/comparison_report_TIMESTAMP.txt`.

---

## 📁 Project Structure

```
greengrid-simulation/
│
├── main.py                      # Main simulation entry point
├── compare_strategies.py        # Strategy/season comparison tool
├── config.json                  # Active configuration (edit this)
├── config_template.json         # Configuration template with help
├── neighborhood_config.json     # Neighborhood simulation config
│
├── src/                         # Source code modules
│   ├── Simulation.py            # Main simulation engine
│   ├── HouseholdSimulation.py   # Neighborhood simulation engine
│   ├── DataLogger.py            # Data export and logging
│   ├── SolarPanel.py            # Solar generation model
│   ├── Battery.py               # Battery storage model
│   ├── Inverter.py              # Inverter with failure simulation
│   ├── EnergyManager.py         # Energy management strategies
│   └── ...
│
├── results/                     # Generated output files (auto-created)
│   ├── hourly_data_TIMESTAMP.csv
│   ├── summary_TIMESTAMP.json
│   ├── answers_TIMESTAMP.txt
│   └── comparison_report_TIMESTAMP.txt
│
├── index.html                   # Web dashboard (Phase 2)
└── README.md                    # This file
```

---

## 📊 Output Files

### 1. `hourly_data_YYYYMMDD_HHMMSS.csv`
Detailed time-series data for every simulation step.

**Key columns:** `timestamp`, `solar_generated_kw`, `load_consumed_kw`, `battery_soc_percent`, `grid_import_kw`, `grid_export_kw`, `cloud_coverage`, `inverter_operational`.

**Use case:** Time-series analysis, visualization, debugging.

### 2. `summary_YYYYMMDD_HHMMSS.json`
High-level results in JSON format.

```json
{
  "summary": {
    "total_solar_generated_kwh": 1234.56,
    "self_sufficiency_percent": 65.4
  },
  "financial": {
    "total_import_cost": 12.34,
    "net_cost": -11.11
  },
  "battery": { "..." : "..." },
  "reliability": { "..." : "..." }
}
```

**Use case:** Quick overview, dashboard data source.

### 3. `answers_YYYYMMDD_HHMMSS.txt`
Comprehensive report with financial analysis, performance metrics, strategy evaluation, and recommendations.

### 4. `comparison_report_YYYYMMDD_HHMMSS.txt`
Generated by `compare_strategies.py` — includes strategy comparison tables, seasonal performance, and system sizing recommendations.

---

## 🔧 Advanced Usage

### Reproducible Simulations

```json
{
  "simulation": {
    "random_seed": 519425893
  }
}
```

Use a fixed seed when comparing configurations or debugging. Set to `null` for random behavior.

### Customizing Load Patterns

```json
{
  "load": {
    "base_load_kw": 0.5,
    "peak_hours_max_kw": 3.0,
    "peak_hours_start": 18,
    "peak_hours_end": 21
  }
}
```

### Time Resolution

```json
{
  "simulation": {
    "time_step_minutes": 15
  }
}
```

15 min = more detailed (4× data), 60 min = faster (default).

### Grid Rates

```json
{
  "grid": {
    "import_cost_per_kwh": 0.0075,
    "export_revenue_per_kwh": 0.009,
    "export_limit_kw": 20.0
  }
}
```

---

## 🐛 Troubleshooting

**`FileNotFoundError: config.json`** — Copy the template: `cp config_template.json config.json`

**`ModuleNotFoundError: No module named 'src'`** — Make sure you are running from the project root directory: `cd greengrid-simulation && python3 main.py`

**No `results/` folder** — Create it manually: `mkdir -p results`

**Low self-sufficiency (<20%)** — Increase `battery.count` or `solar.count`, or reduce `load.peak_hours_max_kw`.

**Results vary wildly between runs** — Set a fixed `random_seed` in `config.json`.

---

# 🌐 Part 2 — Web Dashboard (`index.html`)

## 📌 Dashboard Overview

`index.html` is the Phase 2 visualization layer of GreenGrid. It is a standalone, single-page web dashboard built with **D3.js v7** that reads the simulation output and presents the results as an interactive data story structured in three acts: the problem, the paradox, and the solution.

**Dependencies (loaded via CDN — no install needed):**
- [D3.js v7](https://d3js.org/) — all chart rendering
- Google Fonts: Poppins
- Google Material Icons

**External scripts (must be in the same folder as `index.html`):**

| File | Purpose |
|------|---------|
| `core.js` | Shared utilities and layout helpers |
| `charts-duck.js` | Duck Curve chart (paradox section) |
| `charts-household.js` | Household-level KPI and wealth charts |
| `charts-analysis.js` | Energy balance, scatter, bullet charts |
| `data.js` | Fetches simulation data and calls `initDashboard()` |
| `style.css` | All dashboard styles |

---

## 🗂 Sections & Visualizations

### Navbar & Hero
Fixed top navigation with anchor links to each act. Hero header displays the dashboard title and tagline.

---

### Simulation Overview
Three stat cards showing the scope of the simulation: 24 households, 360 days, 3 energy scenarios.

---

### Act 1 — The Problem (`#problem`)

Establishes the baseline cost of grid dependency for all household types.

**KPI Cards** — Aggregated neighborhood totals over 360 days:
- Annual grid cost
- CO₂ emissions (kg)
- Self-sufficiency (%)

**Cost by Household Type** (`#costByType`) — Bar chart showing annual grid cost broken down by household type (Studio, Small, Medium, Large Family, etc.).

**Wealth Lollipop Chart** (`#wealthLollipop`) — Lollipop chart mapping wealth levels to consumption multipliers and grid bills. Illustrates that higher wealth = higher consumption, but solar changes this equation for everyone.

> Grid rate: $0.0075/kWh · CO₂ factor: 0.444 kg/kWh (CFE Mexico)

---

### Act 1.5 — The Paradox (`#paradox`)

Explores the Duck Curve and the mismatch between solar generation and household demand.

**Duck Curve Chart** (`#paradoxDuckCurve`) — Average hourly power (kW) across all simulated days. Togglable between three scenarios:
- `No Solar` — pure grid dependency profile
- `Bad Design` — solar installed without storage or strategy
- `Optimized` — well-designed system with battery and management

**Paradox KPI Cards:**
- Peak solar hour
- Average peak solar output
- Evening demand peak
- Ramp rate between solar drop and demand peak
- Grid import cost during peak hours
- Curtailed energy from bad design

---

### Act 2 — The Mistake (`#mistake`)

Diagnoses what goes wrong when solar is installed without proper design.

**Time-Series Chart** (`#mistakeTimeseries`) — Neighborhood energy flows over time (import, export, generated, consumed), with time-filter buttons for Day / Week / Month / Quarter / Year.

**Energy Balance Grouped Bar Chart** (`#energyBalance`) — Generation, consumption, imports, and exports broken down by household type or wealth level, switchable between the `Well Designed` and `Unadvised` scenarios, in either Totals or Averages view.

**Household Scatter Plot** (`#houseScatter`) — Each dot is one household. Points above the break-even line are still net consumers of grid energy despite having solar panels. Filterable by scenario.

---

### Act 3 — The Solution (`#solution`)

Shows the measurable impact of a properly designed solar + storage system.

**Impact Cards:**
- Annual savings vs. no solar
- CO₂ avoided (kg)
- Energy self-sufficiency (%)

Toggle between **Neighborhood Total** and **Per Household Average** views.

**Net Cost Bullet Chart** (`#bulletChart`) — Compares net annual cost across all three scenarios against the break-even line. Only the optimized system crosses into profit.

**CO₂ Bullet Chart** (`#co2BulletChart`) — Carbon emissions comparison. The optimized system goes net-negative, exporting clean energy that displaces grid generation.

**CO₂ Equivalencies** (`#co2Equivalencies`) — Translates avoided emissions into relatable equivalents (trees planted, car km avoided, homes powered) using EPA and SEMARNAT reference factors.

> References: Nowak & Crane (2002), U.S. EPA Greenhouse Gas Equivalencies Calculator, SEMARNAT Factor de Emisión del SEN 2024.

---

## ▶️ How to Run the Dashboard

The dashboard reads local data files, so it must be served over HTTP (not opened directly as a `file://` URL).

**Option 1 — Python (simplest):**
```bash
cd greengrid-simulation
python3 -m http.server 8080
# Open http://localhost:8080/index.html
```

**Option 2 — VS Code Live Server:**
Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer), right-click `index.html`, and select **Open with Live Server**.

**Option 3 — Node.js:**
```bash
npx serve .
# Open the URL shown in the terminal
```

---

## 🔗 Script Load Order

The scripts must load in this exact order (already set in `index.html`):

```html
<script src="core.js" defer></script>
<script src="charts-duck.js" defer></script>
<script src="charts-household.js" defer></script>
<script src="charts-analysis.js" defer></script>
<script src="data.js" defer></script>
```

`data.js` runs last because it fetches the simulation output and calls `initDashboard()`, which triggers all chart-rendering functions defined in the earlier scripts.

---

# 🔮 Future Phases

### Phase 3: Machine Learning
- Predictive models for energy generation
- Load forecasting algorithms
- Anomaly detection for system failures
- Reinforcement learning for strategy selection

---

## 📚 Understanding the Metrics

**Self-Sufficiency (%)** — Percentage of load met by solar + battery without grid import. 100% = fully off-grid capable; 50–70% = typical residential system; <30% = undersized.

**Net Cost ($)** — Import cost minus export revenue. Negative = system earns money; positive = still paying the grid.

**Average Battery SoC (%)** — 70–80% = healthy system; 40–60% = battery could be larger; >90% = battery may be oversized.

**Curtailed Energy (kWh)** — Solar energy wasted because the battery was full, load was satisfied, and the export limit was reached. High curtailment = consider a larger battery.

---

## 🤝 Contributing

This is an academic project, but suggestions are welcome.

**Found a bug?** Note the exact error, share your `config.json`, and describe how to reproduce it.

**Have an improvement idea?** Describe the feature, the use case, and a suggested implementation approach.

---

## 📄 License

See the `LICENSE` file for details.

---

## 🎓 Authors

Team 3 — GreenGrid Project  
Course: COM 139 Simulation & Visualization  
Universidad Panamericana, Guadalajara

- Carlos Jimenez Zepeda  
- Andres Gonzalez Gomez  
- Martin Garcia Torres

---

**Happy Simulating! 🌱⚡**
