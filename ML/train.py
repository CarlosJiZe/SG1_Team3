"""
train.py
SG1_Team3 - GreenGrid Phase 3

Trains a linear regression model from scratch to predict solar energy
production for Sacramento, CA. No ML libraries used - only numpy.

The script runs 29 feature combination experiments across 4 groups,
selects the best model by test RMSE, and saves the weights to
model_weights.json for use in the simulator.

Following the gradient descent approach from the course guide, with
z-score normalization and vectorized gradient computation.
"""

import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec

DATA_PATH   = os.path.join(os.path.dirname(__file__), "output", "sacramento_clean.csv")
OUTPUT_DIR  = os.path.join(os.path.dirname(__file__), "output")
FIG_DIR     = os.path.join(os.path.dirname(__file__), "output", "figures")
WEIGHTS_OUT = os.path.join(OUTPUT_DIR, "model_weights.json")
os.makedirs(FIG_DIR, exist_ok=True)

ACCENT  = "#2c7a55"
ACCENT2 = "#e07b39"
GREY    = "#888888"

def save(name):
    plt.savefig(os.path.join(FIG_DIR, name), dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  saved: {name}")


# ══════════════════════════════════════════════════════════════════════════
# 1. LOAD AND SPLIT
# ══════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("Loading data and splitting train/test")
print("="*60)

df = pd.read_csv(DATA_PATH, parse_dates=["datetime"])

# Temporal split: first 10 months train, last 2 months test.
# Random splits don't make sense for time series data because you would
# be using future information to predict the past.
train = df[df["datetime"].dt.month <= 10].copy()
test  = df[df["datetime"].dt.month >  10].copy()

FEATURE_COLS = ["ghi", "dni", "dhi", "solar_zenith", "temperature",
                "relative_humidity", "cloud_type", "Cloud_Cover_Ratio"]
TARGET = "Power_MW"

X_train_raw = train[FEATURE_COLS].values
y_train     = train[TARGET].values
X_test_raw  = test[FEATURE_COLS].values
y_test      = test[TARGET].values

print(f"  Train: {len(train):,} rows  ({train['datetime'].dt.month.min()}-"
      f"{train['datetime'].dt.month.max()} months)")
print(f"  Test:  {len(test):,} rows  ({test['datetime'].dt.month.min()}-"
      f"{test['datetime'].dt.month.max()} months)")


# ══════════════════════════════════════════════════════════════════════════
# 2. MODEL FUNCTIONS (from scratch, following course guide)
# ══════════════════════════════════════════════════════════════════════════

def zscore_normalize(X, mu=None, sigma=None):
    """
    Z-score normalization: x_norm = (x - mu) / sigma
    If mu and sigma are not provided, compute them from X (training set).
    When normalizing test data, pass the mu and sigma from train to avoid
    data leakage.
    """
    if mu is None:
        mu    = np.mean(X, axis=0)
        sigma = np.std(X, axis=0)
    # Avoid division by zero for constant features
    sigma_safe = np.where(sigma == 0, 1, sigma)
    X_norm = (X - mu) / sigma_safe
    return X_norm, mu, sigma


def predict(X, w, b):
    """
    Linear regression prediction: f(X) = X @ w + b
    Args:
        X (ndarray m,n): input features
        w (ndarray n,) : weights
        b (scalar)     : bias
    Returns:
        y_hat (ndarray m,): predictions
    """
    return np.dot(X, w) + b


def compute_cost(X, y, w, b):
    """
    Mean squared error cost:
    J(w,b) = 1/(2m) * sum((f(x_i) - y_i)^2)
    """
    m = X.shape[0]
    err = predict(X, w, b) - y
    return np.sum(err ** 2) / (2 * m)


def compute_gradient(X, y, w, b):
    """
    Vectorized gradient computation:
    dJ/dw = (1/m) * X^T @ (f(X) - y)
    dJ/db = (1/m) * sum(f(X) - y)
    """
    m = X.shape[0]
    err    = predict(X, w, b) - y
    dj_dw  = np.dot(X.T, err) / m
    dj_db  = np.sum(err) / m
    return dj_dw, dj_db


def gradient_descent(X, y, w_in, b_in, alpha, num_iters):
    """
    Batch gradient descent.
    Repeats until num_iters:
        w = w - alpha * dJ/dw
        b = b - alpha * dJ/db

    Returns w, b, and the cost history for convergence plotting.
    """
    w          = w_in.copy()
    b          = b_in
    cost_hist  = []

    for i in range(num_iters):
        dj_dw, dj_db = compute_gradient(X, y, w, b)
        w = w - alpha * dj_dw
        b = b - alpha * dj_db

        # Record cost every 100 iterations to keep history manageable
        if i % 100 == 0:
            cost_hist.append(compute_cost(X, y, w, b))

    return w, b, cost_hist


# ══════════════════════════════════════════════════════════════════════════
# 3. METRICS
# ══════════════════════════════════════════════════════════════════════════

def metrics(y_true, y_pred):
    """Compute MSE, RMSE, MAE and R² from scratch."""
    m      = len(y_true)
    err    = y_pred - y_true
    mse    = np.sum(err ** 2) / m
    rmse   = np.sqrt(mse)
    mae    = np.sum(np.abs(err)) / m
    ss_res = np.sum(err ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    r2     = 1 - ss_res / ss_tot
    return {"MSE": mse, "RMSE": rmse, "MAE": mae, "R2": r2}


# ══════════════════════════════════════════════════════════════════════════
# 4. HYPERPARAMETER SEARCH - learning rate
# ══════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("Hyperparameter search - finding a good learning rate")
print("="*60)

# Normalize all 8 features for the search
X_tr_norm, mu_all, sigma_all = zscore_normalize(X_train_raw)
X_te_norm, _, _              = zscore_normalize(X_test_raw, mu_all, sigma_all)

alphas    = [1e-1, 1e-2, 5e-3, 1e-3]
iters     = 2000
alpha_res = {}

fig, axes = plt.subplots(1, len(alphas), figsize=(16, 4))
fig.suptitle("Cost convergence for different learning rates (all 8 features)",
             fontsize=13, fontweight="bold")

for ax, alpha in zip(axes, alphas):
    w0 = np.zeros(X_tr_norm.shape[1])
    b0 = 0.0
    w, b, cost_h = gradient_descent(X_tr_norm, y_train, w0, b0, alpha, iters)
    m_tr = metrics(y_train, predict(X_tr_norm, w, b))
    m_te = metrics(y_test,  predict(X_te_norm, w, b))
    alpha_res[alpha] = {"w": w, "b": b, "train": m_tr, "test": m_te}

    ax.plot(range(0, iters, 100), cost_h, color=ACCENT, lw=2)
    ax.set_title(f"alpha = {alpha}\nTest RMSE = {m_te['RMSE']:.3f}", fontsize=9)
    ax.set_xlabel("Iterations (x100)")
    ax.set_ylabel("Cost")
    print(f"  alpha={alpha}  train RMSE={m_tr['RMSE']:.3f}  test RMSE={m_te['RMSE']:.3f}")

plt.tight_layout()
save("17_learning_rate_search.png")

# Pick the alpha with lowest test RMSE
best_alpha = min(alpha_res, key=lambda a: alpha_res[a]["test"]["RMSE"])
print(f"\n  Best alpha: {best_alpha}")
ALPHA      = best_alpha
NUM_ITERS  = 3000


# ══════════════════════════════════════════════════════════════════════════
# 5. FEATURE COMBINATION EXPERIMENTS
# ══════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("Feature combination experiments (29 models)")
print("="*60)

F = FEATURE_COLS  # shorthand

experiments = {
    # ── Group 1: Single features ──────────────────────────────────────────
    "G1_ghi_only":         ["ghi"],
    "G1_dni_only":         ["dni"],
    "G1_dhi_only":         ["dhi"],
    "G1_solar_zenith":     ["solar_zenith"],
    "G1_temperature":      ["temperature"],
    "G1_humidity":         ["relative_humidity"],
    "G1_cloud_type":       ["cloud_type"],
    "G1_ccr":              ["Cloud_Cover_Ratio"],

    # ── Group 2: Domain groupings ─────────────────────────────────────────
    "G2_irradiance":       ["ghi", "dni", "dhi"],
    "G2_sky_conditions":   ["ghi", "solar_zenith", "cloud_type", "Cloud_Cover_Ratio"],
    "G2_weather_only":     ["temperature", "relative_humidity", "cloud_type"],
    "G2_irr_position":     ["ghi", "dni", "dhi", "solar_zenith"],
    "G2_irr_weather":      ["ghi", "dni", "dhi", "temperature", "relative_humidity"],
    "G2_no_ccr":           ["ghi", "dni", "dhi", "solar_zenith", "temperature",
                            "relative_humidity", "cloud_type"],

    # ── Group 3: Progressive addition by correlation rank ─────────────────
    # Order by |r| with target: ghi, solar_zenith, dhi, temperature, humidity, cloud_type, ccr
    "G3_step1":            ["ghi"],
    "G3_step2":            ["ghi", "solar_zenith"],
    "G3_step3":            ["ghi", "solar_zenith", "dhi"],
    "G3_step4":            ["ghi", "solar_zenith", "dhi", "temperature"],
    "G3_step5":            ["ghi", "solar_zenith", "dhi", "temperature", "relative_humidity"],
    "G3_step6":            ["ghi", "solar_zenith", "dhi", "temperature",
                            "relative_humidity", "cloud_type"],
    "G3_step7":            ["ghi", "solar_zenith", "dhi", "temperature",
                            "relative_humidity", "cloud_type", "Cloud_Cover_Ratio"],

    # ── Group 4: Leave-one-out from full model ────────────────────────────
    "G4_drop_ghi":         ["dni", "dhi", "solar_zenith", "temperature",
                            "relative_humidity", "cloud_type", "Cloud_Cover_Ratio"],
    "G4_drop_dni":         ["ghi", "dhi", "solar_zenith", "temperature",
                            "relative_humidity", "cloud_type", "Cloud_Cover_Ratio"],
    "G4_drop_dhi":         ["ghi", "dni", "solar_zenith", "temperature",
                            "relative_humidity", "cloud_type", "Cloud_Cover_Ratio"],
    "G4_drop_zenith":      ["ghi", "dni", "dhi", "temperature",
                            "relative_humidity", "cloud_type", "Cloud_Cover_Ratio"],
    "G4_drop_temp":        ["ghi", "dni", "dhi", "solar_zenith",
                            "relative_humidity", "cloud_type", "Cloud_Cover_Ratio"],
    "G4_drop_humidity":    ["ghi", "dni", "dhi", "solar_zenith",
                            "temperature", "cloud_type", "Cloud_Cover_Ratio"],
    "G4_drop_cloud_type":  ["ghi", "dni", "dhi", "solar_zenith",
                            "temperature", "relative_humidity", "Cloud_Cover_Ratio"],
    "G4_drop_ccr":         ["ghi", "dni", "dhi", "solar_zenith",
                            "temperature", "relative_humidity", "cloud_type"],
    # Full model
    "G4_full":             F,
}

results = {}

for name, feats in experiments.items():
    idx_tr  = [F.index(f) for f in feats]
    Xtr     = X_tr_norm[:, idx_tr]
    Xte     = X_te_norm[:, idx_tr]

    w0 = np.zeros(len(feats))
    b0 = 0.0
    w, b, cost_h = gradient_descent(Xtr, y_train, w0, b0, ALPHA, NUM_ITERS)

    m_tr = metrics(y_train, predict(Xtr, w, b))
    m_te = metrics(y_test,  predict(Xte, w, b))

    results[name] = {
        "features":    feats,
        "n_features":  len(feats),
        "w":           w.tolist(),
        "b":           b,
        "cost_hist":   cost_h,
        "train":       m_tr,
        "test":        m_te,
    }
    print(f"  {name:<28}  n={len(feats)}  "
          f"train RMSE={m_tr['RMSE']:.3f}  test RMSE={m_te['RMSE']:.3f}  "
          f"R2={m_te['R2']:.3f}")


# ══════════════════════════════════════════════════════════════════════════
# 6. RESULTS TABLE AND BEST MODEL
# ══════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("Results ranked by test RMSE")
print("="*60)

sorted_res = sorted(results.items(), key=lambda x: x[1]["test"]["RMSE"])

print(f"\n  {'Model':<28} {'Features':>3}  "
      f"{'Train RMSE':>11}  {'Test RMSE':>10}  {'Test MAE':>9}  {'Test R2':>8}")
print("  " + "-"*75)
for name, r in sorted_res:
    print(f"  {name:<28} {r['n_features']:>3}  "
          f"{r['train']['RMSE']:>11.4f}  {r['test']['RMSE']:>10.4f}  "
          f"{r['test']['MAE']:>9.4f}  {r['test']['R2']:>8.4f}")

# Best model: lowest test RMSE
best_name, best = sorted_res[0]
print(f"\n  Best model: {best_name}")
print(f"  Features:   {best['features']}")
print(f"  Test RMSE:  {best['test']['RMSE']:.4f} MW")
print(f"  Test MAE:   {best['test']['MAE']:.4f} MW")
print(f"  Test R2:    {best['test']['R2']:.4f}")

# Baseline comparison
idx_best    = [F.index(f) for f in best["features"]]
y_pred_best = predict(X_te_norm[:, idx_best],
                      np.array(best["w"]), best["b"])
y_pred_best = np.clip(y_pred_best, 0, None)

DA_MAE  = 0.984
HA4_MAE = 0.532
print(f"\n  Baseline comparison (MAE on test period):")
print(f"    Day-Ahead forecast:    {DA_MAE:.3f} MW")
print(f"    4h-Ahead forecast:     {HA4_MAE:.3f} MW")
print(f"    Our model ({best_name}): {best['test']['MAE']:.3f} MW")


# ══════════════════════════════════════════════════════════════════════════
# 7. VISUALIZATIONS
# ══════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("Generating visualizations")
print("="*60)

# ── 7a. All models: test RMSE ranked bar chart ────────────────────────────
names_sorted  = [n for n, _ in sorted_res]
rmse_tr_sorted = [r["train"]["RMSE"] for _, r in sorted_res]
rmse_te_sorted = [r["test"]["RMSE"]  for _, r in sorted_res]
n_feats_sorted = [r["n_features"]    for _, r in sorted_res]

fig, ax = plt.subplots(figsize=(14, 8))
y_pos = np.arange(len(names_sorted))
h = 0.35
bars_te = ax.barh(y_pos - h/2, rmse_te_sorted, h,
                  color=[ACCENT if n == best_name else GREY for n in names_sorted],
                  label="Test RMSE")
bars_tr = ax.barh(y_pos + h/2, rmse_tr_sorted, h,
                  color=[ACCENT2 if n == best_name else "#cccccc" for n in names_sorted],
                  alpha=0.7, label="Train RMSE")
ax.set_yticks(y_pos)
ax.set_yticklabels(names_sorted, fontsize=8)
ax.set_xlabel("RMSE (MW)")
ax.set_title("All 29 models ranked by test RMSE\nGreen = best model",
             fontsize=13, fontweight="bold")
ax.axvline(DA_MAE,  color="red",    lw=1.5, ls="--", label=f"DA baseline ({DA_MAE:.3f})")
ax.axvline(HA4_MAE, color="purple", lw=1.5, ls="--", label=f"HA4 baseline ({HA4_MAE:.3f})")
ax.legend(fontsize=9)
plt.tight_layout()
save("18_all_models_ranked.png")

# ── 7b. Progressive addition (Group 3) ───────────────────────────────────
g3_names = [n for n in names_sorted if n.startswith("G3")]
g3_names_sorted = sorted(g3_names, key=lambda n: results[n]["test"]["RMSE"])
g3_order = sorted([n for n in results if n.startswith("G3")],
                   key=lambda n: results[n]["n_features"])

fig, ax = plt.subplots(figsize=(10, 5))
nf   = [results[n]["n_features"]    for n in g3_order]
rmte = [results[n]["test"]["RMSE"]  for n in g3_order]
rmtr = [results[n]["train"]["RMSE"] for n in g3_order]
feat_added = ["ghi", "+solar_zenith", "+dhi", "+temperature",
              "+humidity", "+cloud_type", "+CCR"]

ax.plot(nf, rmte, color=ACCENT,  marker="o", lw=2, ms=8, label="Test RMSE")
ax.plot(nf, rmtr, color=ACCENT2, marker="s", lw=2, ms=8, label="Train RMSE",
        linestyle="--")
ax.axhline(DA_MAE,  color="red",    lw=1.2, ls=":",  label=f"DA ({DA_MAE:.3f})")
ax.axhline(HA4_MAE, color="purple", lw=1.2, ls=":",  label=f"HA4 ({HA4_MAE:.3f})")
ax.set_xticks(nf)
ax.set_xticklabels(feat_added, rotation=30, ha="right", fontsize=9)
ax.set_ylabel("RMSE (MW)")
ax.set_xlabel("Features added (in order of correlation with target)")
ax.set_title("Progressive feature addition - Group 3\nWhere does adding more features stop helping?",
             fontsize=12, fontweight="bold")
ax.legend(fontsize=9)
plt.tight_layout()
save("19_progressive_addition.png")

# ── 7c. Leave-one-out impact (Group 4) ───────────────────────────────────
g4_names  = [n for n in results if n.startswith("G4")]
g4_rmse   = {n: results[n]["test"]["RMSE"] for n in g4_names}
full_rmse = g4_rmse.get("G4_full", 0)
g4_names_sorted = sorted(g4_names, key=lambda n: g4_rmse[n], reverse=True)

impact = {n: g4_rmse[n] - full_rmse for n in g4_names_sorted if n != "G4_full"}
imp_names  = list(impact.keys())
imp_values = list(impact.values())

colors_imp = [ACCENT2 if v > 0.005 else ACCENT for v in imp_values]

fig, ax = plt.subplots(figsize=(10, 5))
ax.barh(imp_names, imp_values, color=colors_imp)
ax.axvline(0, color="black", lw=0.8)
ax.set_xlabel("Change in test RMSE vs full model (MW)\nPositive = feature was useful, negative = feature added noise")
ax.set_title("Leave-one-out analysis - Group 4\nHow much does each feature contribute to the full model?",
             fontsize=12, fontweight="bold")
plt.tight_layout()
save("20_leave_one_out.png")

# ── 7d. Best model: predictions vs actual scatter ─────────────────────────
fig, ax = plt.subplots(figsize=(8, 7))
ax.scatter(y_test, y_pred_best, alpha=0.25, s=10, color=ACCENT)
max_val = max(y_test.max(), y_pred_best.max())
ax.plot([0, max_val], [0, max_val], color="black", lw=1.5,
        ls="--", label="Perfect prediction")
ax.set_xlabel("Actual Power (MW)")
ax.set_ylabel("Predicted Power (MW)")
ax.set_title(f"Best model: predicted vs actual\n"
             f"{best_name}  |  R² = {best['test']['R2']:.4f}  |  "
             f"RMSE = {best['test']['RMSE']:.3f} MW",
             fontsize=11, fontweight="bold")
ax.legend(fontsize=9)
plt.tight_layout()
save("21_best_model_scatter.png")

# ── 7e. Best model: one week of predictions vs actual ─────────────────────
test_df = test.copy().reset_index(drop=True)
test_df["predicted"] = np.clip(y_pred_best, 0, None)

week_start = "2006-11-06"
week_end   = "2006-11-13"
wk = test_df[(test_df["datetime"] >= week_start) &
             (test_df["datetime"] <  week_end)]

fig, ax = plt.subplots(figsize=(14, 5))
ax.plot(wk["datetime"], wk["Power_MW"],  color="black",  lw=2,   label="Actual")
ax.plot(wk["datetime"], wk["predicted"], color=ACCENT,   lw=1.8,
        ls="--", label=f"Predicted ({best_name})")
ax.set_ylabel("Power (MW)")
ax.set_title("One week of predictions vs actual - November 2006 (test set)",
             fontsize=12, fontweight="bold")
ax.legend(fontsize=10)
plt.tight_layout()
save("22_best_model_week.png")

# ── 7f. Residuals over time ───────────────────────────────────────────────
residuals = y_pred_best - y_test

fig, axes = plt.subplots(2, 1, figsize=(14, 7), sharex=False)
fig.suptitle("Residual analysis - best model", fontsize=13, fontweight="bold")

axes[0].scatter(range(len(residuals)), residuals,
                alpha=0.2, s=6, color=ACCENT)
axes[0].axhline(0, color="black", lw=1)
axes[0].set_ylabel("Residual (MW)")
axes[0].set_title("Residuals over test set (should be centered at 0, no pattern)")

axes[1].hist(residuals, bins=60, color=ACCENT2, edgecolor="white", lw=0.3)
axes[1].axvline(0,              color="black", lw=1.5)
axes[1].axvline(np.mean(residuals), color=ACCENT, lw=2,
                label=f"Mean = {np.mean(residuals):.3f}")
axes[1].set_xlabel("Residual (MW)")
axes[1].set_ylabel("Count")
axes[1].set_title("Residual distribution (should be roughly normal, centered at 0)")
axes[1].legend(fontsize=9)

plt.tight_layout()
save("23_residuals.png")

# ── 7g. Coefficient importance (best model) ───────────────────────────────
w_arr   = np.array(best["w"])
feat_lb = best["features"]

order   = np.argsort(np.abs(w_arr))[::-1]
colors_coef = [ACCENT if w_arr[i] > 0 else ACCENT2 for i in order]

fig, ax = plt.subplots(figsize=(9, 5))
ax.bar(range(len(w_arr)), w_arr[order], color=colors_coef)
ax.set_xticks(range(len(w_arr)))
ax.set_xticklabels([feat_lb[i] for i in order], rotation=35, ha="right", fontsize=9)
ax.axhline(0, color="black", lw=0.8)
ax.set_ylabel("Coefficient value (normalized scale)")
ax.set_title("Feature coefficients - best model\n"
             "Larger absolute value = stronger effect on prediction",
             fontsize=12, fontweight="bold")
plt.tight_layout()
save("24_coefficients.png")

# ── 7h. Final comparison: our model vs baselines ──────────────────────────
compare_labels = ["DA\n(day-ahead)", "HA4\n(4h-ahead)", f"Our model\n({best_name})"]
compare_mae    = [DA_MAE, HA4_MAE, best["test"]["MAE"]]
compare_colors = [GREY, GREY, ACCENT]

fig, ax = plt.subplots(figsize=(8, 5))
bars = ax.bar(compare_labels, compare_mae, color=compare_colors,
              edgecolor="white", width=0.5)
for bar, val in zip(bars, compare_mae):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
            f"{val:.3f} MW", ha="center", va="bottom",
            fontsize=11, fontweight="bold")
ax.set_ylabel("MAE (MW)")
ax.set_title("Our model vs existing forecasts\nTest period: November-December 2006",
             fontsize=12, fontweight="bold")
ax.set_ylim(0, max(compare_mae) * 1.25)
plt.tight_layout()
save("25_model_vs_baselines.png")


# ══════════════════════════════════════════════════════════════════════════
# 8. SAVE BEST MODEL WEIGHTS
# ══════════════════════════════════════════════════════════════════════════

print("\n" + "="*60)
print("Saving best model weights")
print("="*60)

# Save the feature indices so the simulator knows which columns to use
best_feat_idx = [F.index(f) for f in best["features"]]

model_weights = {
    "model_name":     best_name,
    "features":       best["features"],
    "feature_index":  best_feat_idx,
    "all_features":   F,
    "w":              best["w"],
    "b":              best["b"],
    "mu":             mu_all[best_feat_idx].tolist(),
    "sigma":          sigma_all[best_feat_idx].tolist(),
    "metrics": {
        "train_RMSE": round(best["train"]["RMSE"], 4),
        "train_MAE":  round(best["train"]["MAE"],  4),
        "train_R2":   round(best["train"]["R2"],   4),
        "test_RMSE":  round(best["test"]["RMSE"],  4),
        "test_MAE":   round(best["test"]["MAE"],   4),
        "test_R2":    round(best["test"]["R2"],    4),
    },
    "baselines": {
        "DA_MAE":  DA_MAE,
        "HA4_MAE": HA4_MAE,
    }
}

with open(WEIGHTS_OUT, "w") as f:
    json.dump(model_weights, f, indent=2)

print(f"  Weights saved to {WEIGHTS_OUT}")
print(f"\n  Model summary:")
print(f"    Features:  {best['features']}")
print(f"    Test RMSE: {best['test']['RMSE']:.4f} MW")
print(f"    Test MAE:  {best['test']['MAE']:.4f} MW")
print(f"    Test R2:   {best['test']['R2']:.4f}")
print(f"\n  Done. Figures saved to {FIG_DIR}")