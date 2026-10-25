"""Accuracy metrics computation with block bootstrap confidence intervals."""

from typing import Any

import numpy as np
import pandas as pd


def _effective_sample_size(errors: np.ndarray, n_days: int) -> float:
    """Estimate effective sample size accounting for within-day autocorrelation.

    Half-hourly errors within a day are strongly autocorrelated, so the
    effective sample size is far smaller than the raw count of points.
    Uses a simple day-level adjustment: n_eff ≈ n_days * (n_points_per_day / (1 + 2*sum(rho_k)))
    where rho_k are lag autocorrelations pooled across days.
    """
    n = len(errors)
    if n == 0 or n_days == 0:
        return 0.0
    # Approximate autocorrelation at lag 1 (within-day, adjacent half-hours)
    if n < 2:
        return float(n)
    lag1 = np.corrcoef(errors[:-1], errors[1:])[0, 1]
    if np.isnan(lag1) or lag1 <= 0:
        return float(n)
    # Effective sample size for AR(1)-like process: n_eff = n * (1 - rho) / (1 + rho)
    n_eff = n * (1.0 - lag1) / (1.0 + lag1)
    # Cap at number of days (can't have more independent info than days)
    return min(n_eff, float(n_days) * 48.0)


def block_bootstrap_ci(
    aligned_pairs: pd.DataFrame,
    metric_fn,
    n_bootstrap: int = 1000,
    ci_level: float = 0.95,
    seed: int = 42,
) -> dict[str, Any]:
    """Day-level block bootstrap confidence interval for a headline metric.

    Resamples delivery days (blocks) rather than individual half-hourly points
    to preserve within-day autocorrelation. Returns the bootstrap distribution
    and percentile CI.
    """
    valid = aligned_pairs.dropna(subset=["actualMW"]).copy()
    if valid.empty:
        return {
            "n_bootstrap": n_bootstrap,
            "ci_level": ci_level,
            "ci_lower": None,
            "ci_upper": None,
            "bootstrap_mean": None,
            "bootstrap_std": None,
            "effective_sample_size": 0.0,
            "n_days": 0,
        }

    # Group by delivery date
    if "delivery_date" not in valid.columns:
        valid["delivery_date"] = valid["startTime"].dt.tz_convert("Europe/London").dt.date

    days = sorted(valid["delivery_date"].unique())
    n_days = len(days)
    if n_days == 0:
        return {
            "n_bootstrap": n_bootstrap,
            "ci_level": ci_level,
            "ci_lower": None,
            "ci_upper": None,
            "bootstrap_mean": None,
            "bootstrap_std": None,
            "effective_sample_size": 0.0,
            "n_days": 0,
        }

    day_groups = [g for _, g in valid.groupby("delivery_date")]
    rng = np.random.default_rng(seed)

    bootstrap_stats = []
    for _ in range(n_bootstrap):
        # Resample days with replacement
        sampled_indices = rng.integers(0, n_days, size=n_days)
        sampled_rows = pd.concat([day_groups[i] for i in sampled_indices], ignore_index=True)
        try:
            stat = metric_fn(sampled_rows)
            if stat is not None:
                bootstrap_stats.append(stat)
        except Exception:
            continue

    if not bootstrap_stats:
        return {
            "n_bootstrap": n_bootstrap,
            "ci_level": ci_level,
            "ci_lower": None,
            "ci_upper": None,
            "bootstrap_mean": None,
            "bootstrap_std": None,
            "effective_sample_size": 0.0,
            "n_days": n_days,
        }

    stats_array = np.array(bootstrap_stats)
    alpha = 1.0 - ci_level
    ci_lower = float(np.percentile(stats_array, 100 * alpha / 2))
    ci_upper = float(np.percentile(stats_array, 100 * (1 - alpha / 2)))

    errors = valid["errorMW"].values
    n_eff = _effective_sample_size(errors, n_days)

    return {
        "n_bootstrap": n_bootstrap,
        "ci_level": ci_level,
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "bootstrap_mean": float(np.mean(stats_array)),
        "bootstrap_std": float(np.std(stats_array)),
        "effective_sample_size": n_eff,
        "n_days": n_days,
    }


def compute_metrics(aligned_pairs: pd.DataFrame) -> dict[str, Any]:
    """
    Compute accuracy metrics from aligned forecast-actual pairs.

    Args:
        aligned_pairs: DataFrame with forecastMW, actualMW, errorMW columns

    Returns:
        Dictionary with metrics, count, effective sample size, and bootstrap CI
    """
    valid = aligned_pairs.dropna(subset=["actualMW"]).copy()
    n = len(valid)

    if n == 0:
        return {
            "n": 0,
            "effective_sample_size": 0.0,
            "n_days": 0,
            "bias": None,
            "mae": None,
            "rmse": None,
            "nmae": None,
            "p5": None,
            "p50": None,
            "p90": None,
            "p95": None,
            "p99": None,
            "over_forecast_share": None,
            "tail_risk_p95_over_mw": None,
            "bias_ci": None,
            "mae_ci": None,
        }

    error = valid["errorMW"].values
    actual = valid["actualMW"].values
    forecast = valid["forecastMW"].values

    # Bias (mean error) - positive = over-forecast
    bias = float(np.mean(error))

    # MAE
    mae = float(np.mean(np.abs(error)))

    # RMSE
    rmse = float(np.sqrt(np.mean(error ** 2)))

    # nMAE (normalized by mean actual) - avoids division by near-zero
    mean_actual = np.mean(actual)
    nmae = float(mae / mean_actual) if mean_actual > 0 else None

    # Percentiles of error
    p5 = float(np.percentile(error, 5))
    p50 = float(np.percentile(error, 50))
    p90 = float(np.percentile(error, 90))
    p95 = float(np.percentile(error, 95))
    p99 = float(np.percentile(error, 99))

    # Over-forecast share (error > 0)
    over_forecast_share = float(np.mean(error > 0))

    # Tail risk: P95 of over-forecast errors (only positive errors)
    over_errors = error[error > 0]
    tail_risk_p95_over_mw = float(np.percentile(over_errors, 95)) if len(over_errors) > 0 else 0.0

    # Day-level block bootstrap CI on headline metrics
    n_days = 0
    if "delivery_date" in aligned_pairs.columns:
        n_days = aligned_pairs["delivery_date"].nunique()
    else:
        valid_copy = valid.copy()
        valid_copy["delivery_date"] = valid_copy["startTime"].dt.tz_convert("Europe/London").dt.date
        n_days = valid_copy["delivery_date"].nunique()

    bias_ci = block_bootstrap_ci(valid, lambda df: float(np.mean(df["errorMW"])))
    mae_ci = block_bootstrap_ci(valid, lambda df: float(np.mean(np.abs(df["errorMW"]))))

    errors_arr = valid["errorMW"].values
    n_eff = _effective_sample_size(errors_arr, n_days)

    return {
        "n": n,
        "effective_sample_size": n_eff,
        "n_days": n_days,
        "bias": bias,
        "mae": mae,
        "rmse": rmse,
        "nmae": nmae,
        "p5": p5,
        "p50": p50,
        "p90": p90,
        "p95": p95,
        "p99": p99,
        "over_forecast_share": over_forecast_share,
        "tail_risk_p95_over_mw": tail_risk_p95_over_mw,
        "bias_ci": {
            "ci_lower": bias_ci["ci_lower"],
            "ci_upper": bias_ci["ci_upper"],
            "bootstrap_mean": bias_ci["bootstrap_mean"],
            "bootstrap_std": bias_ci["bootstrap_std"],
        },
        "mae_ci": {
            "ci_lower": mae_ci["ci_lower"],
            "ci_upper": mae_ci["ci_upper"],
            "bootstrap_mean": mae_ci["bootstrap_mean"],
            "bootstrap_std": mae_ci["bootstrap_std"],
        },
    }


def compute_metrics_by_group(
    aligned_pairs: pd.DataFrame,
    group_col: str,
) -> pd.DataFrame:
    """Compute metrics grouped by a column."""
    results = []
    for group_val, group_df in aligned_pairs.groupby(group_col):
        metrics = compute_metrics(group_df)
        metrics[group_col] = group_val
        results.append(metrics)
    return pd.DataFrame(results)
