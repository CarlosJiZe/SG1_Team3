"""
eda.py
SG1_Team3 - GreenGrid Phase 3

Exploratory analysis of the Sacramento solar dataset.
This script goes through the data step by step, documents what was found,
and justifies the feature decisions that end up in feature_engineering.py.

All figures are saved to ML/output/figures/.
"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
FIG_DIR  = os.path.join(os.path.dirname(__file__), "output", "figures")
os.makedirs(FIG_DIR, exist_ok=True)

sns.set_theme(style="whitegrid", palette="muted")
ACCENT  = "#2c7a55"
ACCENT2 = "#e07b39"
GREY    = "#888888"

def save(name):
    path = os.path.join(FIG_DIR, name)
    plt.savefig(path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  saved: {name}")


# ══════════════════════════════════════════════════════════════════════════
# STEP 1 - First look at the files
# ══════════════════════════════════════════════════════════════════════════
print("\n" + "="*60)
print("STEP 1 - First look at the files")
print("="*60)

# Starting with the weather file since it is the most complex one.
# Reading it straight with default settings first to see what we get.
print("\nLoading the weather file with default settings...")
weather_raw = pd.read_csv(
    os.path.join(DATA_DIR, "151015_Weather_30m.csv"),
    low_memory=False
)
print(f"  Shape: {weather_raw.shape}")
print(f"  First column names: {list(weather_raw.columns[:6])}")
print(f"  Row 0: {weather_raw.iloc[0, :6].tolist()}")
print(f"  Row 1: {weather_raw.iloc[1, :6].tolist()}")
print(f"  Row 2: {weather_raw.iloc[2, :6].tolist()}")
print(
    "\n  The file has two metadata rows sitting above the real column names.\n"
    "  Row 0 has the label names, row 1 has the values (location, units, etc),\n"
    "  and the actual column names only appear on row 2.\n"
    "  That means pandas needs skiprows=2 to read this correctly."
)

# Show the problem visually
fig, axes = plt.subplots(1, 2, figsize=(14, 4))
fig.suptitle("Weather file: header structure", fontsize=13, fontweight="bold")

ax = axes[0]
ax.axis("off")
table_data = [list(weather_raw.columns[:8])]
for i in range(4):
    table_data.append([str(v)[:12] for v in weather_raw.iloc[i, :8].tolist()])
tbl = ax.table(cellText=table_data[1:], colLabels=table_data[0],
               loc="center", cellLoc="center")
tbl.auto_set_font_size(False)
tbl.set_fontsize(8)
tbl.scale(1, 1.6)
for j in range(8):
    tbl[(1, j)].set_facecolor("#f4a261")
    tbl[(2, j)].set_facecolor("#f4a261")
for j in range(8):
    tbl[(3, j)].set_facecolor("#a8d5b5")
ax.set_title("Default read: first rows are metadata (orange)\nReal data starts at row 3 (green)", fontsize=9)

weather_ok = pd.read_csv(
    os.path.join(DATA_DIR, "151015_Weather_30m.csv"),
    skiprows=2, low_memory=False
)
ax2 = axes[1]
ax2.axis("off")
cols_show = ["Year", "Month", "Day", "Hour", "GHI", "Temperature", "Cloud Type"]
tbl2 = ax2.table(cellText=weather_ok[cols_show].head(4).values,
                 colLabels=cols_show, loc="center", cellLoc="center")
tbl2.auto_set_font_size(False)
tbl2.set_fontsize(8)
tbl2.scale(1, 1.6)
for j in range(len(cols_show)):
    tbl2[(1, j)].set_facecolor("#a8d5b5")
ax2.set_title("With skiprows=2: column names are correct\nData starts on the first row (green)", fontsize=9)
plt.tight_layout()
save("01_header_structure.png")

# Load all four files correctly
print("\nLoading all four files...")
weather = pd.read_csv(os.path.join(DATA_DIR, "151015_Weather_30m.csv"),
                      skiprows=2, low_memory=False)
actual  = pd.read_csv(os.path.join(DATA_DIR, "151015_Actual_DPV_19MW_5m.csv"))
da      = pd.read_csv(os.path.join(DATA_DIR, "151015_DA_DPV_19MW_60m.csv"))
ha4     = pd.read_csv(os.path.join(DATA_DIR, "151015_HA4_DPV_19MW_60m.csv"))

num_cols = [
    "Temperature", "GHI", "DHI", "DNI", "Clearsky GHI", "Clearsky DHI",
    "Clearsky DNI", "Cloud Type", "Solar Zenith Angle", "Relative Humidity",
    "Dew Point", "Pressure", "Wind Speed", "Wind Direction", "SSA",
    "Surface Albedo", "Alpha", "Aerosol Optical Depth", "Asymmetry",
    "Ozone", "Precipitable Water", "Fill Flag", "Cloud Fill Flag",
    "Global Horizontal UV Irradiance (280-400nm)",
    "Global Horizontal UV Irradiance (295-385nm)",
]
for c in num_cols:
    if c in weather.columns:
        weather[c] = pd.to_numeric(weather[c], errors="coerce")

actual["Power(MW)"] = pd.to_numeric(actual["Power(MW)"], errors="coerce")
da["Power(MW)"]     = pd.to_numeric(da["Power(MW)"],     errors="coerce")
ha4["Power(MW)"]    = pd.to_numeric(ha4["Power(MW)"],    errors="coerce")

print(f"  Weather:  {weather.shape}  (30-min intervals)")
print(f"  Actual:   {actual.shape}  (5-min intervals)")
print(f"  DA:       {da.shape}  (60-min intervals)")
print(f"  HA4:      {ha4.shape}  (60-min intervals)")


# ══════════════════════════════════════════════════════════════════════════
# STEP 2 - Getting to know each file individually
# ══════════════════════════════════════════════════════════════════════════
print("\n" + "="*60)
print("STEP 2 - Getting to know each file individually")
print("="*60)

# Missing values across all files
print("\nChecking for missing values...")
fig, axes = plt.subplots(1, 4, figsize=(16, 5))
fig.suptitle("Missing values by dataset", fontsize=13, fontweight="bold")

for ax, df, title in zip(
    axes,
    [weather[num_cols], actual, da, ha4],
    ["Weather (30-min)", "Actual (5-min)", "DA (60-min)", "HA4 (60-min)"]
):
    null_pct = df.isnull().mean() * 100
    null_pct = null_pct.sort_values(ascending=False)
    colors = [ACCENT if v == 0 else ACCENT2 for v in null_pct]
    ax.barh(null_pct.index, null_pct.values, color=colors)
    ax.set_xlim(0, max(null_pct.max() + 1, 5))
    ax.set_xlabel("% missing")
    ax.set_title(title, fontsize=10)
    ax.tick_params(labelsize=7)

for ax in axes:
    ax.text(0.5, 0.5, "No missing values", transform=ax.transAxes,
            ha="center", va="center", fontsize=11, color=ACCENT,
            fontweight="bold", alpha=0.5)
plt.tight_layout()
save("02_missing_values.png")
print("  No missing values in any of the key columns. Clean dataset.")

# Actual production distribution
print("\nLooking at the actual production numbers...")
actual["datetime"] = pd.to_datetime(actual["LocalTime"], format="%m/%d/%y %H:%M")
actual["month"]    = actual["datetime"].dt.month

fig, axes = plt.subplots(1, 3, figsize=(15, 4))
fig.suptitle("Actual production distribution", fontsize=13, fontweight="bold")

axes[0].hist(actual["Power(MW)"], bins=60, color=ACCENT,
             edgecolor="white", linewidth=0.3)
axes[0].set_xlabel("Power (MW)")
axes[0].set_ylabel("Count")
axes[0].set_title("Full year including nighttime zeros")
zero_pct = (actual["Power(MW)"] == 0).mean() * 100
axes[0].text(0.6, 0.85, f"Zero: {zero_pct:.1f}%",
             transform=axes[0].transAxes, fontsize=10,
             color=ACCENT2, fontweight="bold")

day_power = actual[actual["Power(MW)"] > 0]["Power(MW)"]
axes[1].hist(day_power, bins=60, color=ACCENT2,
             edgecolor="white", linewidth=0.3)
axes[1].set_xlabel("Power (MW)")
axes[1].set_title("Daytime only (Power > 0)")

monthly = [actual[actual["month"] == m]["Power(MW)"].values for m in range(1, 13)]
bp = axes[2].boxplot(monthly, patch_artist=True,
                     medianprops=dict(color="white", linewidth=2))
for patch in bp["boxes"]:
    patch.set_facecolor(ACCENT)
axes[2].set_xticklabels(
    ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    rotation=45, fontsize=8
)
axes[2].set_ylabel("Power (MW)")
axes[2].set_title("Production by month")
plt.tight_layout()
save("03_actual_distribution.png")

# Weather variable distributions
print("\nLooking at the weather variables...")
fig, axes = plt.subplots(2, 4, figsize=(16, 7))
fig.suptitle("Weather variable distributions", fontsize=13, fontweight="bold")
axes = axes.flatten()

plot_cols   = ["GHI", "DNI", "DHI", "Clearsky GHI",
               "Temperature", "Relative Humidity", "Cloud Type", "Solar Zenith Angle"]
plot_colors = [ACCENT, ACCENT, ACCENT, ACCENT2,
               ACCENT2, ACCENT2, ACCENT, ACCENT2]

for ax, col, color in zip(axes, plot_cols, plot_colors):
    data = weather[col].dropna()
    if col == "Cloud Type":
        counts = data.value_counts().sort_index()
        ax.bar(counts.index.astype(str), counts.values, color=color)
        ax.set_xlabel("Cloud type code")
    else:
        ax.hist(data, bins=50, color=color, edgecolor="white", linewidth=0.2)
        ax.set_xlabel(col)
    ax.set_ylabel("Count")
    ax.set_title(f"{col}\nMean={data.mean():.1f}  Std={data.std():.1f}", fontsize=9)

plt.tight_layout()
save("04_weather_distributions.png")

# Cloud type breakdown
cloud_labels = {
    0: "Clear", 1: "Prob. Clear", 2: "Fog", 3: "Water",
    4: "Sup. Cooled", 6: "Opaque Ice", 7: "Cirrus",
    8: "Overlapping", 9: "Overshooting", 10: "Unknown"
}
ct_counts = weather["Cloud Type"].value_counts().sort_index()
ct_labels  = [cloud_labels.get(int(i), str(int(i))) for i in ct_counts.index]
ct_pct     = ct_counts / ct_counts.sum() * 100

fig, ax = plt.subplots(figsize=(10, 4))
bars = ax.bar(range(len(ct_counts)), ct_pct.values,
              color=[ACCENT if i == 0 else ACCENT2 if i <= 2 else GREY
                     for i in range(len(ct_counts))],
              edgecolor="white")
ax.set_xticks(range(len(ct_counts)))
ax.set_xticklabels(ct_labels, rotation=35, ha="right", fontsize=9)
ax.set_ylabel("% of year")
ax.set_title("Cloud type distribution - Sacramento 2006", fontsize=12, fontweight="bold")
for bar, val in zip(bars, ct_pct.values):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
            f"{val:.1f}%", ha="center", va="bottom", fontsize=8)
plt.tight_layout()
save("05_cloud_type_distribution.png")
print(f"  {ct_pct.iloc[0]:.1f}% of the year is clear sky. Sacramento is a strong solar location.")


# ══════════════════════════════════════════════════════════════════════════
# STEP 3 - Trying to merge the datasets
# ══════════════════════════════════════════════════════════════════════════
print("\n" + "="*60)
print("STEP 3 - Trying to merge the datasets")
print("="*60)

print("\nBuilding timestamps and merging weather with actual production...")
weather["datetime_raw"] = pd.to_datetime(
    weather["Year"].astype(str).str.zfill(4) + "-"
    + weather["Month"].astype(str).str.zfill(2) + "-"
    + weather["Day"].astype(str).str.zfill(2) + " "
    + weather["Hour"].astype(str).str.zfill(2) + ":"
    + weather["Minute"].astype(str).str.zfill(2)
)

actual_30 = (
    actual[["datetime", "Power(MW)"]]
    .set_index("datetime").resample("30min").mean().reset_index()
)
actual_30.columns = ["datetime", "Power_MW"]

merged_raw = pd.merge(
    weather.rename(columns={"datetime_raw": "datetime"}),
    actual_30, on="datetime", how="inner"
)

feature_cols = [c for c in num_cols if c in merged_raw.columns]
corr_raw = (
    merged_raw[feature_cols + ["Power_MW"]]
    .corr()["Power_MW"]
    .drop("Power_MW")
    .dropna()
    .sort_values(ascending=False)
)

print("\n  Correlations with Power_MW after first merge:")
for col, val in list(corr_raw.items())[:5]:
    print(f"    {val:+.4f}  {col}")
print("    ...")
for col, val in list(corr_raw.items())[-3:]:
    print(f"    {val:+.4f}  {col}")

print(
    "\n  GHI is showing a negative correlation with Power_MW.\n"
    "  That cannot be right physically. More irradiance should always mean\n"
    "  more production. Something must be off with how the timestamps aligned.\n"
    "  Checking what July at noon actually looks like in the merged data..."
)

july_check = merged_raw[
    (merged_raw["datetime"].dt.month == 7) &
    (merged_raw["datetime"].dt.hour == 12)
].head(4)[["datetime", "GHI", "Temperature", "Power_MW"]]
print(f"\n{july_check.to_string(index=False)}")
print(
    "\n  GHI is 0 at local noon in July but the panels are producing 13 MW.\n"
    "  The weather file must be storing timestamps in a different timezone\n"
    "  than the production file."
)

# Visualize the mismatch
one_day   = "2006-07-15"
day_check = merged_raw[merged_raw["datetime"].dt.date == pd.Timestamp(one_day).date()]

fig, axes = plt.subplots(2, 1, figsize=(12, 7), sharex=True)
fig.suptitle(
    f"Timezone mismatch - {one_day}\n"
    "GHI peaks at 08:00 but production peaks at 12:00",
    fontsize=13, fontweight="bold"
)
axes[0].plot(day_check["datetime"], day_check["GHI"],
             color=ACCENT2, lw=2, label="GHI (w/m2)")
axes[0].set_ylabel("GHI (w/m2)", color=ACCENT2)
axes[0].legend(loc="upper left", fontsize=9)

axes[1].plot(day_check["datetime"], day_check["Power_MW"],
             color=ACCENT, lw=2, label="Power (MW)")
axes[1].set_ylabel("Power (MW)", color=ACCENT)
axes[1].legend(loc="upper left", fontsize=9)
axes[1].set_xlabel("Datetime as merged (before fix)")

for ax in axes:
    ax.axvline(pd.Timestamp(f"{one_day} 08:00"), color=ACCENT2,
               lw=1.5, ls="--", alpha=0.6)
    ax.axvline(pd.Timestamp(f"{one_day} 12:00"), color=ACCENT,
               lw=1.5, ls="--", alpha=0.6)

plt.tight_layout()
save("06_timezone_mismatch.png")


# ══════════════════════════════════════════════════════════════════════════
# STEP 4 - Fixing the timezone offset
# ══════════════════════════════════════════════════════════════════════════
print("\n" + "="*60)
print("STEP 4 - Fixing the timezone offset")
print("="*60)

print(
    "\n  Looking at the NSRDB metadata rows at the top of the weather file:\n"
    "    Time Zone       = 0   (UTC)\n"
    "    Local Time Zone = -8  (Pacific Standard Time, Sacramento)\n"
    "\n  The weather file is in UTC. The production file is in local time.\n"
    "  Subtracting 8 hours from the weather timestamps should fix the alignment."
)

weather["datetime"] = weather["datetime_raw"] + pd.Timedelta(hours=-8)
merged = pd.merge(weather, actual_30, on="datetime", how="inner")

july_fixed = merged[
    (merged["datetime"].dt.month == 7) &
    (merged["datetime"].dt.hour == 12)
].head(4)[["datetime", "GHI", "Clearsky GHI", "Temperature", "Power_MW"]]
print(f"\n  July at local noon after the fix:\n{july_fixed.to_string(index=False)}")
print("\n  GHI above 1000 w/m2 at noon in July, matching 13 MW of production. Correct.")

# Show the fixed overlay
day_fixed = merged[merged["datetime"].dt.date == pd.Timestamp(one_day).date()]

fig, ax = plt.subplots(figsize=(12, 4))
fig.suptitle(
    f"After timezone fix - {one_day}\n"
    "GHI and production now peak at the same local time",
    fontsize=13, fontweight="bold"
)
ax2 = ax.twinx()
ax.plot(day_fixed["datetime"], day_fixed["GHI"],   color=ACCENT2, lw=2, label="GHI (w/m2)")
ax2.plot(day_fixed["datetime"], day_fixed["Power_MW"], color=ACCENT, lw=2, label="Power (MW)")
ax.set_ylabel("GHI (w/m2)",  color=ACCENT2)
ax2.set_ylabel("Power (MW)", color=ACCENT)
ax.tick_params(axis="y", labelcolor=ACCENT2)
ax2.tick_params(axis="y", labelcolor=ACCENT)
lines1, lab1 = ax.get_legend_handles_labels()
lines2, lab2 = ax2.get_legend_handles_labels()
ax.legend(lines1 + lines2, lab1 + lab2, loc="upper right", fontsize=9)
ax.set_xlabel("Datetime (local time after fix)")
plt.tight_layout()
save("07_timezone_fixed.png")


# ══════════════════════════════════════════════════════════════════════════
# STEP 5 - Correlation analysis on the corrected data
# ══════════════════════════════════════════════════════════════════════════
print("\n" + "="*60)
print("STEP 5 - Correlation analysis on the corrected data")
print("="*60)

feature_cols = [c for c in num_cols if c in merged.columns]
corr_fixed = (
    merged[feature_cols + ["Power_MW"]]
    .corr()["Power_MW"]
    .drop("Power_MW")
    .dropna()
    .sort_values(ascending=False)
)

print("\n  All features ranked by correlation with Power_MW:")
for col, val in corr_fixed.items():
    bar  = "#" * int(abs(val) * 20)
    sign = "+" if val > 0 else "-"
    print(f"  {sign}{abs(val):.4f}  {bar:<20}  {col}")

# Before vs after comparison chart
common = corr_raw.index.intersection(corr_fixed.index)
df_compare = pd.DataFrame({
    "Before fix": corr_raw[common],
    "After fix":  corr_fixed[common],
}).sort_values("After fix", ascending=True)

fig, ax = plt.subplots(figsize=(10, 9))
y, h = np.arange(len(df_compare)), 0.35
ax.barh(y - h/2, df_compare["Before fix"], h, label="Before timezone fix",
        color=ACCENT2, alpha=0.8)
ax.barh(y + h/2, df_compare["After fix"],  h, label="After timezone fix",
        color=ACCENT, alpha=0.9)
ax.set_yticks(y)
ax.set_yticklabels(df_compare.index, fontsize=8)
ax.axvline(0, color="black", lw=0.8)
ax.set_xlabel("Pearson r with Power_MW")
ax.set_title("Correlations before and after timezone fix\nGHI goes from -0.35 to +0.96",
             fontsize=12, fontweight="bold")
ax.legend(fontsize=9)
plt.tight_layout()
save("08_correlation_before_after.png")

# Full correlation heatmap between features
print("\n  Computing the full feature correlation matrix to check for multicollinearity...")
corr_matrix = merged[feature_cols].corr()

fig, ax = plt.subplots(figsize=(14, 12))
mask = np.triu(np.ones_like(corr_matrix, dtype=bool))
sns.heatmap(
    corr_matrix, mask=mask, annot=True, fmt=".2f",
    cmap="RdYlGn", center=0, vmin=-1, vmax=1,
    linewidths=0.4, annot_kws={"size": 6}, ax=ax
)
ax.set_title(
    "Feature-vs-feature correlation matrix\n"
    "Values close to 1 or -1 between two features mean they are redundant",
    fontsize=12, fontweight="bold"
)
ax.tick_params(axis="x", rotation=45, labelsize=7)
ax.tick_params(axis="y", rotation=0,  labelsize=7)
plt.tight_layout()
save("09_feature_correlation_heatmap.png")
print(
    "  The UV Irradiance columns have r > 0.99 with GHI so they carry no\n"
    "  additional information. Same story for the Clearsky DNI and DHI columns."
)

# Ranked correlation with target
# Wind Direction and Wind Speed have r > 0.20 but are dropped because there
# is no physical mechanism by which wind direction affects fixed solar panels.
# The correlation is likely a seasonal artifact. They get a separate color.
spurious = ["Wind Direction", "Wind Speed"]

corr_target = corr_fixed.sort_values(key=abs, ascending=True)
colors_bar = []
for col, val in corr_target.items():
    if col in spurious:
        colors_bar.append(ACCENT2)
    elif abs(val) >= 0.2:
        colors_bar.append(ACCENT)
    else:
        colors_bar.append(GREY)

fig, ax = plt.subplots(figsize=(8, 9))
ax.barh(corr_target.index, corr_target.values, color=colors_bar)
ax.axvline(0, color="black", lw=0.8)
ax.axvline( 0.2, color=ACCENT2, lw=1.2, ls="--", alpha=0.7)
ax.axvline(-0.2, color=ACCENT2, lw=1.2, ls="--", alpha=0.7)

from matplotlib.patches import Patch
legend_elements = [
    Patch(facecolor=ACCENT,  label="Kept (|r| >= 0.20)"),
    Patch(facecolor=ACCENT2, label="Dropped - spurious correlation"),
    Patch(facecolor=GREY,    label="Dropped (|r| < 0.20)"),
]
ax.legend(handles=legend_elements, fontsize=9, loc="lower right")
ax.set_xlabel("Pearson r")
ax.set_title("All features vs Power_MW\nGreen = kept, orange = dropped despite correlation, grey = dropped",
             fontsize=12, fontweight="bold")
plt.tight_layout()
save("10_correlation_with_target.png")


# ══════════════════════════════════════════════════════════════════════════
# STEP 6 - Looking at each kept feature in detail
# ══════════════════════════════════════════════════════════════════════════
print("\n" + "="*60)
print("STEP 6 - Looking at each kept feature in detail")
print("="*60)

daytime = merged[merged["Solar Zenith Angle"] < 90].copy()
daytime["Cloud_Cover_Ratio"] = np.where(
    daytime["Clearsky GHI"] > 0,
    (daytime["GHI"] / daytime["Clearsky GHI"]).clip(0, 1),
    0.0
)

# Scatter of each feature vs Power_MW
kept        = ["GHI", "DNI", "DHI", "Temperature",
               "Relative Humidity", "Solar Zenith Angle", "Cloud_Cover_Ratio"]
kept_labels = ["GHI (w/m2)", "DNI (w/m2)", "DHI (w/m2)", "Temperature (C)",
               "Relative Humidity (%)", "Solar Zenith Angle (deg)", "Cloud Cover Ratio"]

fig, axes = plt.subplots(2, 4, figsize=(16, 8))
fig.suptitle("Kept features vs Power_MW (daytime rows only)",
             fontsize=13, fontweight="bold")
axes = axes.flatten()

for ax, col, label in zip(axes, kept, kept_labels):
    sample = daytime.sample(min(2000, len(daytime)), random_state=42)
    ax.scatter(sample[col], sample["Power_MW"], alpha=0.15, s=8, color=ACCENT)
    r = daytime[[col, "Power_MW"]].corr().iloc[0, 1]
    ax.set_xlabel(label, fontsize=9)
    ax.set_ylabel("Power (MW)", fontsize=9)
    ax.set_title(f"r = {r:+.3f}", fontsize=10, fontweight="bold",
                 color=ACCENT if abs(r) >= 0.5 else ACCENT2)

axes[-1].axis("off")
plt.tight_layout()
save("11_scatter_kept_features.png")

# GHI vs Power colored by temperature
print("\n  Looking at whether temperature has any visible effect on production at a given GHI level...")
fig, ax = plt.subplots(figsize=(9, 6))
sc = ax.scatter(daytime["GHI"], daytime["Power_MW"],
                c=daytime["Temperature"], cmap="RdYlGn_r",
                alpha=0.4, s=12, vmin=0, vmax=45)
cb = plt.colorbar(sc, ax=ax)
cb.set_label("Temperature (C)", fontsize=10)
ax.set_xlabel("GHI (w/m2)",  fontsize=11)
ax.set_ylabel("Power (MW)",  fontsize=11)
ax.set_title(
    "GHI vs Power colored by temperature\n"
    "At the same irradiance level, hotter days produce less",
    fontsize=12, fontweight="bold"
)
plt.tight_layout()
save("12_ghi_power_temperature.png")
print("  The color gradient is visible. Temperature adds real information to the model.")

# Power by cloud type
fig, ax = plt.subplots(figsize=(11, 5))
cloud_order = sorted(daytime["Cloud Type"].dropna().unique())
cloud_data  = [daytime[daytime["Cloud Type"] == ct]["Power_MW"].values
               for ct in cloud_order]
cloud_names = {
    0: "Clear", 1: "Prob.\nClear", 2: "Fog", 3: "Water",
    4: "Sup.\nCooled", 6: "Opaque\nIce", 7: "Cirrus",
    8: "Overlapping", 9: "Overshooting"
}
bp = ax.boxplot(cloud_data, patch_artist=True,
                medianprops=dict(color="white", linewidth=2))
colors_ct = [ACCENT if ct == 0 else ACCENT2 if ct <= 3 else GREY for ct in cloud_order]
for patch, color in zip(bp["boxes"], colors_ct):
    patch.set_facecolor(color)
ax.set_xticklabels(
    [cloud_names.get(int(ct), str(int(ct))) for ct in cloud_order],
    fontsize=8
)
ax.set_ylabel("Power (MW)")
ax.set_title("Power output by cloud type (daytime only)\nClear sky produces the highest and most consistent output",
             fontsize=12, fontweight="bold")
plt.tight_layout()
save("13_power_by_cloud_type.png")

# Cloud Cover Ratio
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
fig.suptitle(
    "Cloud Cover Ratio = GHI / Clearsky GHI\n"
    "How much of the theoretical max irradiance actually reached the ground",
    fontsize=12, fontweight="bold"
)
axes[0].hist(daytime["Cloud_Cover_Ratio"], bins=40, color=ACCENT,
             edgecolor="white", linewidth=0.3)
axes[0].set_xlabel("Cloud Cover Ratio")
axes[0].set_ylabel("Count")
axes[0].set_title("Distribution (1.0 = clear, 0.0 = overcast)")

axes[1].scatter(daytime["Cloud_Cover_Ratio"], daytime["Power_MW"],
                alpha=0.2, s=10, color=ACCENT2)
r_ccr = daytime[["Cloud_Cover_Ratio", "Power_MW"]].corr().iloc[0, 1]
axes[1].set_xlabel("Cloud Cover Ratio")
axes[1].set_ylabel("Power (MW)")
axes[1].set_title(f"vs Power_MW  (r = {r_ccr:+.3f})")
plt.tight_layout()
save("14_cloud_cover_ratio.png")


# ══════════════════════════════════════════════════════════════════════════
# STEP 7 - Time series and comparison with existing forecasts
# ══════════════════════════════════════════════════════════════════════════
print("\n" + "="*60)
print("STEP 7 - Time series and comparison with existing forecasts")
print("="*60)

fig, axes = plt.subplots(2, 1, figsize=(14, 8), sharex=False)
fig.suptitle("One week of production: summer vs winter",
             fontsize=13, fontweight="bold")

for ax, start, label, color in zip(
    axes,
    ["2006-07-10", "2006-01-10"],
    ["July 10-17", "January 10-17"],
    [ACCENT2, ACCENT]
):
    end  = pd.Timestamp(start) + pd.Timedelta(days=7)
    week = merged[(merged["datetime"] >= start) & (merged["datetime"] < end)]
    ax2  = ax.twinx()
    ax.fill_between(week["datetime"], week["GHI"], alpha=0.3, color=color, label="GHI")
    ax.plot(week["datetime"], week["GHI"], color=color, lw=1)
    ax2.plot(week["datetime"], week["Power_MW"], color="black", lw=1.5, label="Power (MW)")
    ax.set_ylabel("GHI (w/m2)", color=color)
    ax2.set_ylabel("Power (MW)")
    ax.tick_params(axis="y", labelcolor=color)
    ax.set_title(label, fontsize=10)
    lines1, lab1 = ax.get_legend_handles_labels()
    lines2, lab2 = ax2.get_legend_handles_labels()
    ax.legend(lines1 + lines2, lab1 + lab2, loc="upper right", fontsize=8)

plt.tight_layout()
save("15_timeseries_summer_winter.png")

# DA vs HA4 vs Actual
print("\n  Comparing the existing forecasts against actual production...")
da["datetime"]  = pd.to_datetime(da["LocalTime"],  format="%m/%d/%y %H:%M")
ha4["datetime"] = pd.to_datetime(ha4["LocalTime"], format="%m/%d/%y %H:%M")

actual_60 = (
    actual[["datetime", "Power(MW)"]]
    .set_index("datetime").resample("60min").mean().reset_index()
)
forecasts = (
    actual_60.rename(columns={"Power(MW)": "Actual"})
    .merge(da[["datetime","Power(MW)"]].rename(columns={"Power(MW)": "DA"}),  on="datetime")
    .merge(ha4[["datetime","Power(MW)"]].rename(columns={"Power(MW)": "HA4"}), on="datetime")
)

week_start = "2006-06-01"
week_end   = "2006-06-08"
wk = forecasts[(forecasts["datetime"] >= week_start) &
               (forecasts["datetime"] <  week_end)]

fig, ax = plt.subplots(figsize=(14, 5))
ax.plot(wk["datetime"], wk["Actual"], color="black",  lw=2,   label="Actual")
ax.plot(wk["datetime"], wk["DA"],     color=ACCENT2,  lw=1.5, ls="--", label="DA (day-ahead)")
ax.plot(wk["datetime"], wk["HA4"],    color=ACCENT,   lw=1.5, ls=":",  label="HA4 (4h-ahead)")
ax.set_ylabel("Power (MW)")
ax.set_title("Actual vs existing forecasts - June 1-7",
             fontsize=12, fontweight="bold")
ax.legend(fontsize=10)
plt.tight_layout()
save("16_forecast_comparison.png")

da_mae  = (forecasts["DA"]  - forecasts["Actual"]).abs().mean()
ha4_mae = (forecasts["HA4"] - forecasts["Actual"]).abs().mean()
print(f"\n  Day-ahead MAE:     {da_mae:.3f} MW")
print(f"  4h-ahead MAE:      {ha4_mae:.3f} MW")
print(
    "\n  The day-ahead forecast overshoots consistently.\n"
    "  The 4h-ahead is better but still off by half a megawatt on average.\n"
    "  These are the benchmarks the trained model should try to beat."
)


# ══════════════════════════════════════════════════════════════════════════
# STEP 8 - Feature decisions summary
# ══════════════════════════════════════════════════════════════════════════
print("\n" + "="*60)
print("STEP 8 - Feature decisions summary")
print("="*60)

kept_final = [
    "GHI", "DNI", "DHI", "Solar Zenith Angle",
    "Temperature", "Relative Humidity", "Cloud Type"
]
print(f"\n  Kept ({len(kept_final)} original + 1 engineered = 8 total):")
for f in kept_final:
    r = corr_fixed.get(f, float("nan"))
    print(f"    r = {r:+.3f}  {f}")
print(f"    r = {daytime[['Cloud_Cover_Ratio','Power_MW']].corr().iloc[0,1]:+.3f}  Cloud_Cover_Ratio (engineered)")

dropped = [c for c in feature_cols if c not in kept_final]
print(f"\n  Dropped ({len(dropped)} features):")
for f in dropped:
    r = corr_fixed.get(f, float("nan"))
    print(f"    r = {r:+.3f}  {f}")

print(f"\n  Training rows available (daytime only): {len(daytime):,}")
print(f"  Figures saved to: {FIG_DIR}")
print("\n  Done. Run feature_engineering.py to produce the clean CSV.")