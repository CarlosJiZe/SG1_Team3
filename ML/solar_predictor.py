"""
solar_predictor.py
SG1_Team3 - GreenGrid Phase 3

Bridges the trained linear regression model with the simulator.
Replaces math.sin() solar generation with ML-based predictions
using real Sacramento weather data.

Usage:
    predictor = SolarPredictor()
    factor = predictor.get_capacity_factor(hour_of_day=12.0, day_of_year=180)
    generation_kw = factor * n_panels * peak_power_kw
"""

import os
import json
import numpy as np
import pandas as pd

# Path relative to this file (ML/)
_ML_DIR     = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_PATH = os.path.join(_ML_DIR, "output", "model_weights.json")
DATA_PATH    = os.path.join(_ML_DIR, "output", "sacramento_clean.csv")

# Sacramento nameplate capacity used to train the model
SACRAMENTO_CAPACITY_MW = 19.0


class SolarPredictor:
    """
    Loads the trained linear regression model and Sacramento weather data.

    For each simulation step, looks up the real weather conditions
    that occurred in Sacramento at that month/hour combination,
    passes them through the model, and returns a capacity factor (0-1)
    that scales to any household's panel configuration.

    Capacity factor = predicted_MW / SACRAMENTO_CAPACITY_MW
    Household generation = capacity_factor * n_panels * peak_power_kw
    """

    def __init__(self):
        self._load_model()
        self._load_weather()

    # ── Model loading ─────────────────────────────────────────────────────────

    def _load_model(self):
        """Load weights, bias, normalization params and feature list."""
        with open(WEIGHTS_PATH, "r") as f:
            weights = json.load(f)

        self.features   = weights["features"]
        self.w          = np.array(weights["w"])
        self.b          = weights["b"]
        self.mu         = np.array(weights["mu"])
        self.sigma      = np.array(weights["sigma"])

        print(f"[SolarPredictor] Model loaded: {weights['model_name']}")
        print(f"  Features: {self.features}")
        print(f"  Test RMSE: {weights['metrics']['test_RMSE']} MW  "
              f"R2: {weights['metrics']['test_R2']}")

    # ── Weather data loading ──────────────────────────────────────────────────

    def _load_weather(self):
        """
        Load the clean Sacramento weather dataset and build a lookup table
        indexed by (month, hour) for fast access during simulation.

        For each (month, hour) combination we average all observations
        across the full year. This gives a typical weather profile for
        that hour in that month, which is what the simulator needs to
        look up for any given simulation step.
        """
        df = pd.read_csv(DATA_PATH, parse_dates=["datetime"])
        df["month"] = df["datetime"].dt.month
        df["hour"]  = df["datetime"].dt.hour

        # Average weather by (month, hour)
        self._weather_lookup = (
            df.groupby(["month", "hour"])[self.features]
            .mean()
        )

        # Also keep a full lookup by (month, hour, 30min_slot) for more
        # granular access when the simulator runs at 30-min resolution
        df["minute"] = df["datetime"].dt.minute
        self._weather_lookup_30 = (
            df.groupby(["month", "hour", "minute"])[self.features]
            .mean()
        )

        print(f"[SolarPredictor] Weather lookup built: "
              f"{len(self._weather_lookup)} (month, hour) combinations")

    # ── Prediction ────────────────────────────────────────────────────────────

    def _normalize(self, x):
        """Z-score normalization using training mu and sigma."""
        sigma_safe = np.where(self.sigma == 0, 1, self.sigma)
        return (x - self.mu) / sigma_safe

    def _predict_mw(self, features_row):
        """
        Run the linear regression model on one feature vector.

        Args:
            features_row (ndarray): raw (unscaled) feature values

        Returns:
            float: predicted Power_MW, clipped to [0, SACRAMENTO_CAPACITY_MW]
        """
        x_norm = self._normalize(features_row)
        pred   = np.dot(x_norm, self.w) + self.b
        return float(np.clip(pred, 0, SACRAMENTO_CAPACITY_MW))

    def get_capacity_factor(self, hour_of_day: float, day_of_year: int) -> float:
        """
        Get the solar capacity factor for a given simulation step.

        Looks up real Sacramento weather for the corresponding month/hour,
        predicts Power_MW using the trained model, and returns the fraction
        of nameplate capacity being generated.

        Args:
            hour_of_day (float): Current hour (0-23.9), can be fractional
            day_of_year (int):   Day of year (1-365), used to derive month

        Returns:
            float: Capacity factor in [0, 1].
                   Multiply by (n_panels * peak_power_kw) to get household kW.
        """
        # Nighttime: no generation
        if hour_of_day < 5 or hour_of_day >= 20:
            return 0.0

        hour  = int(hour_of_day)
        month = self._day_of_year_to_month(day_of_year)

        # Look up weather features for this month/hour
        try:
            features_row = self._weather_lookup.loc[(month, hour)].values
        except KeyError:
            # No daytime data for this hour in this month (e.g., winter dawn)
            return 0.0

        predicted_mw     = self._predict_mw(features_row)
        capacity_factor  = predicted_mw / SACRAMENTO_CAPACITY_MW

        return float(np.clip(capacity_factor, 0.0, 1.0))

    def get_generation_kw(self, hour_of_day: float, day_of_year: int,
                          n_panels: int, peak_power_kw: float) -> float:
        """
        Get solar generation in kW for a specific household configuration.

        Args:
            hour_of_day (float):  Current hour (0-23.9)
            day_of_year (int):    Day of year (1-365)
            n_panels (int):       Number of solar panels in the household
            peak_power_kw (float): Peak power per panel in kW

        Returns:
            float: Solar generation in kW
        """
        factor = self.get_capacity_factor(hour_of_day, day_of_year)
        return factor * n_panels * peak_power_kw

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _day_of_year_to_month(day_of_year: int) -> int:
        """
        Convert day of year (1-365) to calendar month (1-12).
        Uses a simple fixed-month boundary table.
        """
        # Cumulative days per month (non-leap year)
        boundaries = [0, 31, 59, 90, 120, 151, 181,
                      212, 243, 273, 304, 334, 365]
        day = max(1, min(365, day_of_year))
        for m in range(1, 13):
            if day <= boundaries[m]:
                return m
        return 12

    def describe(self):
        """Print a summary of the predictor's configuration."""
        print("\n" + "="*50)
        print("SolarPredictor Summary")
        print("="*50)
        print(f"  Features:    {self.features}")
        print(f"  Sacramento capacity: {SACRAMENTO_CAPACITY_MW} MW")
        print(f"  Weather months available: "
              f"{sorted(self._weather_lookup.index.get_level_values('month').unique().tolist())}")
        print()

        # Show sample predictions for a July noon and January noon
        for month, hour, label in [(7, 12, "July noon"), (1, 12, "January noon"),
                                    (7, 6, "July dawn"), (7, 18, "July dusk")]:
            doy = [31,59,90,120,151,181,212,243,273,304,334,365][month-1]
            factor = self.get_capacity_factor(float(hour), doy)
            print(f"  {label:<15} factor={factor:.3f}  "
                  f"(1 panel × 5kW = {factor*5:.2f} kW)")


if __name__ == "__main__":
    predictor = SolarPredictor()
    predictor.describe()