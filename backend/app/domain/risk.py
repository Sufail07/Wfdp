"""Risk bands with leakage protection."""

import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple


def compute_risk_band(
    forecasts_df: pd.DataFrame,
    actuals_df: pd.DataFrame,
    delivery_date: pd.Timestamp,
    quantile: float = 0.9,
    cutoff_hour: int = 9,
    cutoff_minute: int = 0,
    tz: str = "Europe/London",
    min_sample_days: int = 3,
) -> Dict[str, Any]:
    """
    Compute risk-adjusted forecast band using expanding window to prevent leakage.
    
    Estimates quantiles ONLY from delivery days < D (expanding window).
    Falls back to pooled distribution if < min_sample_days sample.
    
    Args:
        forecasts_df: All forecasts (WINDFOR)
        actuals_df: All actuals (FUELHH)
        delivery_date: Target delivery date
        quantile: Quantile for risk band (default 0.9)
        cutoff_hour: Cutoff hour in London time
        cutoff_minute: Cutoff minute in London time
        tz: Timezone
        min_sample_days: Minimum days needed for in-sample estimation
    
    Returns:
        Dictionary with risk-adjusted forecasts, quantiles, and in_sample flag
    """
    from app.domain.asof import select_decision_forecast, get_cutoff_utc
    from app.domain.errors import join_forecast_actual
    from app.domain.slices import add_delivery_date
    
    # Get decision forecast for target date
    decision_fcst = select_decision_forecast(
        forecasts_df, delivery_date, cutoff_hour, cutoff_minute, tz
    )
    
    if decision_fcst.empty:
        return {
            "delivery_date": delivery_date.isoformat(),
            "quantile": quantile,
            "in_sample": False,
            "risk_adjusted": [],
            "over_forecast_quantile": None,
        }
    
    # Get all historical decision forecasts and actuals
    # We need to compute decision forecasts for ALL delivery dates before the target
    all_delivery_dates = pd.to_datetime(actuals_df["settlementDate"]).dt.date.unique()
    all_delivery_dates = pd.Series(all_delivery_dates).sort_values()
    
    # Filter to dates strictly before target delivery date
    target_date = delivery_date.date()
    historical_dates = all_delivery_dates[all_delivery_dates < target_date]
    
    # Collect errors from historical days using expanding window
    all_errors = []
    
    for hist_date in historical_dates:
        hist_ts = pd.Timestamp(hist_date)
        hist_fcst = select_decision_forecast(
            forecasts_df, hist_ts, cutoff_hour, cutoff_minute, tz
        )
        if not hist_fcst.empty:
            aligned = join_forecast_actual(hist_fcst, actuals_df)
            valid = aligned.dropna(subset=["actualMW"])
            if not valid.empty:
                all_errors.extend(valid["errorMW"].values)
    
    # Determine if we have enough in-sample data
    in_sample = len(historical_dates) >= min_sample_days and len(all_errors) >= min_sample_days * 24
    
    if in_sample:
        # Use historical errors to estimate quantile
        over_forecast_quantile = float(np.percentile(all_errors, quantile * 100))
    else:
        # Fallback: use all available errors (pooled)
        if len(all_errors) > 0:
            over_forecast_quantile = float(np.percentile(all_errors, quantile * 100))
        else:
            # Ultimate fallback: use a reasonable default
            over_forecast_quantile = 500.0  # MW
        in_sample = False
    
    # Compute risk-adjusted forecast: forecast - q_over
    risk_adjusted = []
    for _, row in decision_fcst.iterrows():
        risk_adjusted.append({
            "startTime": row["startTime"].isoformat(),
            "forecastMW": row["forecastMW"],
            "riskAdjustedMW": row["forecastMW"] - over_forecast_quantile,
            "horizon_h": row["horizon_h"],
        })
    
    return {
        "delivery_date": delivery_date.isoformat(),
        "quantile": quantile,
        "in_sample": in_sample,
        "sample_days": len(historical_dates),
        "sample_errors": len(all_errors),
        "over_forecast_quantile": over_forecast_quantile,
        "risk_adjusted": risk_adjusted,
    }