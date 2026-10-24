"""Accuracy metrics computation."""

import pandas as pd
import numpy as np
from typing import Dict, Any


def compute_metrics(aligned_pairs: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute accuracy metrics from aligned forecast-actual pairs.
    
    Args:
        aligned_pairs: DataFrame with forecastMW, actualMW, errorMW columns
    
    Returns:
        Dictionary with metrics and count
    """
    # Filter out missing actuals
    valid = aligned_pairs.dropna(subset=["actualMW"]).copy()
    n = len(valid)
    
    if n == 0:
        return {
            "n": 0,
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
    
    return {
        "n": n,
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