"""
feature_engineering.py
SG1_Team3 - GreenGrid Phase 3

Loads the Sacramento solar dataset, applies the fixes identified during EDA,
builds the final feature set, and saves a clean CSV ready for model training.

The full exploration process and the reasoning behind every decision here
is documented in eda.py. This file is the clean production version of those
findings.

Input files (ML/data/):
    151015_Actual_DPV_19MW_5m.csv   - actual production every 5 minutes (target)
    151015_DA_DPV_19MW_60m.csv      - day-ahead forecast, used as baseline
    151015_HA4_DPV_19MW_60m.csv     - 4-hour-ahead forecast, used as baseline
    151015_Weather_30m.csv          - NSRDB weather data every 30 minutes (features)

Output:
    ML/output/sacramento_clean.csv  - clean dataset ready for training

Feature set (8 features + 1 target):
    ghi, dni, dhi               - irradiance components (strongest predictors)
    solar_zenith                - sun angle, encodes time of day and season
    temperature                 - panels lose efficiency at high temperatures
    relative_humidity           - affects atmospheric transmission
    cloud_type                  - categorical, different cloud types block differently
    Cloud_Cover_Ratio           - engineered: GHI / Clearsky GHI, captures cloud attenuation
    Power_MW                    - actual production (target variable)
"""

import os
import numpy as np
import pandas as pd

DATA_DIR   = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

ACTUAL_FILE  = os.path.join(DATA_DIR, "151015_Actual_DPV_19MW_5m.csv")
DA_FILE      = os.path.join(DATA_DIR, "151015_DA_DPV_19MW_60m.csv")
HA4_FILE     = os.path.join(DATA_DIR, "151015_HA4_DPV_19MW_60m.csv")
WEATHER_FILE = os.path.join(DATA_DIR, "151015_Weather_30m.csv")

UTC_OFFSET_HOURS    = -8   # NSRDB stores in UTC, actual production is in local time (UTC-8)
ZENITH_NIGHT_CUTOFF = 90   # solar zenith >= 90 means no sun, production is always 0


# ── Loaders ───────────────────────────────────────────────────────────────

def load_weather():
    # The NSRDB file has two metadata rows before the actual column headers
    # (row 0 = label names, row 1 = values like lat/lon/units), so skiprows=2
    # is needed to get the real column names on the first read.
    # Timestamps come in UTC. Sacramento is UTC-8, and the production file
    # uses local time, so we shift the weather datetimes accordingly.
    df = pd.read_csv(WEATHER_FILE, skiprows=2, low_memory=False)

    df["datetime"] = pd.to_datetime(
        df["Year"].astype(str).str.zfill(4) + "-"
        + df["Month"].astype(str).str.zfill(2) + "-"
        + df["Day"].astype(str).str.zfill(2) + " "
        + df["Hour"].astype(str).str.zfill(2) + ":"
        + df["Minute"].astype(str).str.zfill(2)
    ) + pd.Timedelta(hours=UTC_OFFSET_HOURS)

    numeric_cols = [
        "Temperature", "GHI", "DHI", "DNI",
        "Clearsky GHI", "Cloud Type",
        "Solar Zenith Angle", "Relative Humidity",
    ]
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


def load_actual():
    df = pd.read_csv(ACTUAL_FILE)
    df["datetime"]  = pd.to_datetime(df["LocalTime"], format="%m/%d/%y %H:%M")
    df["Power(MW)"] = pd.to_numeric(df["Power(MW)"], errors="coerce")
    return df.rename(columns={"Power(MW)": "Power_MW"})


def load_forecast(filepath, label):
    df = pd.read_csv(filepath)
    df["datetime"]  = pd.to_datetime(df["LocalTime"], format="%m/%d/%y %H:%M")
    df["Power(MW)"] = pd.to_numeric(df["Power(MW)"], errors="coerce")
    return df.rename(columns={"Power(MW)": f"Power_MW_{label}"})


# ── Resample and merge ─────────────────────────────────────────────────────

def resample_actual_to_30min(actual):
    # The actual file records every 5 minutes. The weather file records every
    # 30 minutes. We average the production over each 30-minute window to get
    # a matching resolution. Mean preserves the MW (power) unit; sum would
    # convert it to MWh and mix units with the weather features.
    return (
        actual[["datetime", "Power_MW"]]
        .set_index("datetime")
        .resample("30min").mean()
        .reset_index()
    )


def merge_datasets(weather, actual_30):
    return pd.merge(weather, actual_30, on="datetime", how="inner")


# ── Feature engineering ────────────────────────────────────────────────────

def engineer_features(df):
    # Cloud Cover Ratio = GHI / Clearsky GHI.
    # Clearsky GHI is what the irradiance would be on a perfectly clear day
    # at the same time and location. Dividing actual GHI by that gives a
    # normalized value of how much cloud cover attenuated the solar resource.
    # 1.0 means a perfectly clear sky, 0.0 means fully blocked.
    # At night Clearsky GHI is 0, so we set the ratio to 0 to avoid division by zero.
    df = df.copy()
    df["Cloud_Cover_Ratio"] = np.where(
        df["Clearsky GHI"] > 0,
        (df["GHI"] / df["Clearsky GHI"]).clip(0.0, 1.0),
        0.0
    )

    df = df.rename(columns={
        "GHI":                "ghi",
        "DNI":                "dni",
        "DHI":                "dhi",
        "Solar Zenith Angle": "solar_zenith",
        "Temperature":        "temperature",
        "Relative Humidity":  "relative_humidity",
        "Cloud Type":         "cloud_type",
    })

    return df[[
        "datetime", "ghi", "dni", "dhi",
        "solar_zenith", "temperature", "relative_humidity",
        "cloud_type", "Cloud_Cover_Ratio", "Power_MW"
    ]]


# ── Cleaning ───────────────────────────────────────────────────────────────

def clean(df):
    # Drop nighttime rows where Solar Zenith >= 90 degrees.
    # When the sun is at or below the horizon, production is always 0.
    # Keeping those rows would make the model's metrics look better than
    # they really are without teaching it anything useful about solar behavior.
    # After removing night, we drop any NaN rows that could appear at year
    # boundaries from the resample merge, and clip any negative power values
    # that come from sensor noise.
    df = df[df["solar_zenith"] < ZENITH_NIGHT_CUTOFF].copy()
    df = df.dropna()
    df["Power_MW"] = df["Power_MW"].clip(lower=0)
    return df


# ── Data dictionary ────────────────────────────────────────────────────────

def print_data_dictionary(df):
    meta = {
        "ghi":               ("w/m2",  "Global Horizontal Irradiance"),
        "dni":               ("w/m2",  "Direct Normal Irradiance"),
        "dhi":               ("w/m2",  "Diffuse Horizontal Irradiance"),
        "solar_zenith":      ("deg",   "Solar Zenith Angle"),
        "temperature":       ("C",     "Ambient air temperature"),
        "relative_humidity": ("%",     "Relative humidity"),
        "cloud_type":        ("int",   "Cloud type code (0 = clear)"),
        "Cloud_Cover_Ratio": ("ratio", "GHI / Clearsky GHI"),
        "Power_MW":          ("MW",    "Actual DPV production (target)"),
    }

    print("\n" + "="*65)
    print("Data Dictionary")
    print("="*65)
    print(f"{'Column':<22} {'Unit':<8} {'Min':>7} {'Max':>7} {'Mean':>7} {'Std':>7}  Description")
    print("-"*65)
    for col, (unit, desc) in meta.items():
        s = df[col].describe()
        print(f"{col:<22} {unit:<8} {s['min']:>7.2f} {s['max']:>7.2f} {s['mean']:>7.2f} {s['std']:>7.2f}  {desc}")
    print("="*65)
    print(f"Rows: {len(df):,}  |  Date range: {df['datetime'].min().date()} to {df['datetime'].max().date()}")


# ── Pipeline ───────────────────────────────────────────────────────────────

def run_pipeline():
    weather   = load_weather()
    actual    = load_actual()
    actual_30 = resample_actual_to_30min(actual)
    merged    = merge_datasets(weather, actual_30)
    featured  = engineer_features(merged)
    clean_df  = clean(featured)

    print_data_dictionary(clean_df)

    out_path = os.path.join(OUTPUT_DIR, "sacramento_clean.csv")
    clean_df.to_csv(out_path, index=False)
    print(f"\nClean dataset saved to {out_path}")

    return clean_df


if __name__ == "__main__":
    run_pipeline()