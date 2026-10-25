"""Risk bands with leakage protection and level-dependent margins."""

from typing import Any

import numpy as np
import pandas as pd

from app.domain.asof import select_decision_forecast
from app.domain.errors import join_forecast_actual
from app.domain.slices import add_delivery_date


def _bin_forecast_level(forecast_mw: float) -> str:
    """Bin forecast MW into level buckets for level-dependent margin."""
    if forecast_mw < 1000:
        return "low"
    if forecast_mw < 5000:
        return "medium"
    return "high"


def _quantile_by_level(
    errors_df: pd.DataFrame,
    quantile: float,
    min_per_bin: int = 5,
) -> dict[str, float | None]:
    """Estimate over-forecast quantile per forecast-level bin."""
    if errors_df.empty:
        return {"low": None, "medium": None, "high": None, "pooled": None}

    errors_df = errors_df.copy()
    errors_df["level_bin"] = errors_df["forecastMW"].apply(_bin_forecast_level)

    result: dict[str, float | None] = {}
    for bin_name in ["low", "medium", "high"]:
        bin_errors = errors_df[errors_df["level_bin"] == bin_name]["errorMW"].values
        bin_errors = bin_errors[bin_errors > 0]  # over-forecast only
        if len(bin_errors) >= min_per_bin:
            result[bin_name] = float(np.percentile(bin_errors, quantile * 100))
        else:
            result[bin_name] = None

    all_over = errors_df["errorMW"].values
    all_over = all_over[all_over > 0]
    if len(all_over) > 0:
        result["pooled"] = float(np.percentile(all_over, quantile * 100))
    else:
        result["pooled"] = None

    return result


def compute_risk_band(
    forecasts_df: pd.DataFrame,
    actuals_df: pd.DataFrame,
    delivery_date: pd.Timestamp,
    quantile: float = 0.9,
    cutoff_hour: int = 9,
    cutoff_minute: int = 0,
    tz: str = "Europe/London",
    min_sample_days: int = 3,
    min_sample_errors: int = 24,
    availability_lag_minutes: int = 0,
) -> dict[str, Any]:
    """
    Compute risk-adjusted forecast band using expanding window to prevent leakage.

    Estimates quantiles ONLY from delivery days < D (expanding window).
    Falls back to pooled distribution if < min_sample_days sample.
    Suppresses the band (returns empty risk_adjusted) when sample is too small.

    Level-dependent margin: quantile estimated per forecast-level bin
    (low / medium / high), falling back to pooled when a bin has too few samples.

    Args:
        forecasts_df: All forecasts (WINDFOR)
        actuals_df: All actuals (FUELHH)
        delivery_date: Target delivery date
        quantile: Quantile for risk band (default 0.9)
        cutoff_hour: Cutoff hour in London time
        cutoff_minute: Cutoff minute in London time
        tz: Timezone
        min_sample_days: Minimum days needed for in-sample estimation
        min_sample_errors: Minimum errors needed for in-sample estimation

    Returns:
        Dictionary with risk-adjusted forecasts, quantiles, and in_sample flag
    """
    target_date = delivery_date.date()

    # Get decision forecast for target date
    decision_fcst = select_decision_forecast(
        forecasts_df, delivery_date, cutoff_hour, cutoff_minute, tz,
        availability_lag_minutes=availability_lag_minutes,
    )

    if decision_fcst.empty:
        return {
            "delivery_date": delivery_date.isoformat(),
            "quantile": quantile,
            "in_sample": False,
            "suppressed": True,
            "suppression_reason": "no_decision_forecast",
            "risk_adjusted": [],
            "level_quantiles": {},
        }

    # Get all historical delivery dates strictly before target
    all_delivery_dates = pd.to_datetime(actuals_df["settlementDate"]).dt.date.unique()
    all_delivery_dates = pd.Series(sorted(all_delivery_dates))
    historical_dates = all_delivery_dates[all_delivery_dates < target_date]

    # Collect errors from historical days using expanding window
    all_errors = []
    all_rows = []

    for hist_date in historical_dates:
        hist_ts = pd.Timestamp(hist_date)
        hist_fcst = select_decision_forecast(
            forecasts_df, hist_ts, cutoff_hour, cutoff_minute, tz,
            availability_lag_minutes=availability_lag_minutes,
        )
        if not hist_fcst.empty:
            aligned = join_forecast_actual(hist_fcst, actuals_df)
            valid = aligned.dropna(subset=["actualMW"]).copy()
            if not valid.empty:
                valid = add_delivery_date(valid, tz)
                all_rows.append(valid)
                all_errors.extend(valid["errorMW"].values)

    in_sample = len(historical_dates) >= min_sample_days and len(all_errors) >= min_sample_errors

    # Estimate level-dependent quantiles
    if all_rows:
        hist_errors_df = pd.concat(all_rows, ignore_index=True)
        level_quantiles = _quantile_by_level(hist_errors_df, quantile)
    else:
        level_quantiles = {"low": None, "medium": None, "high": None, "pooled": None}

    # Select quantile per bin, falling back to pooled
    def _select_margin(forecast_mw: float) -> float | None:
        bin_name = _bin_forecast_level(forecast_mw)
        bin_q = level_quantiles.get(bin_name)
        if bin_q is not None:
            return bin_q
        return level_quantiles.get("pooled")

    # Suppress band when sample too small
    suppressed = not in_sample
    suppression_reason = None
    if not in_sample:
        if len(historical_dates) < min_sample_days:
            suppression_reason = f"insufficient_history ({len(historical_dates)} days < {min_sample_days})"
        elif len(all_errors) < min_sample_errors:
            suppression_reason = f"insufficient_errors ({len(all_errors)} < {min_sample_errors})"

    risk_adjusted = []
    for _, row in decision_fcst.iterrows():
        margin = _select_margin(row["forecastMW"])
        if margin is None:
            # No quantile estimate available; skip this point
            continue
        risk_adjusted.append({
            "startTime": row["startTime"].isoformat(),
            "forecastMW": row["forecastMW"],
            "riskAdjustedMW": row["forecastMW"] - margin,
            "horizon_h": row["horizon_h"],
            "level_bin": _bin_forecast_level(row["forecastMW"]),
            "margin": margin,
        })

    return {
        "delivery_date": delivery_date.isoformat(),
        "quantile": quantile,
        "in_sample": in_sample,
        "suppressed": suppressed,
        "suppression_reason": suppression_reason,
        "sample_days": len(historical_dates),
        "sample_errors": len(all_errors),
        "level_quantiles": level_quantiles,
        "risk_adjusted": risk_adjusted,
    }
