"""Join forecasts with actuals and compute errors."""

import pandas as pd
import numpy as np


def _normalize_ts(series: pd.Series) -> pd.Series:
    """Normalize a datetime series to tz-naive UTC."""
    if series.dt.tz is not None:
        return series.dt.tz_convert("UTC").dt.tz_localize(None)
    return series


def join_forecast_actual(
    decision_fcst: pd.DataFrame,
    actuals_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Left join decision forecast with actuals on startTime.
    
    Error convention: positive = over-forecast = shortfall risk for buyer
    error_mw = forecast_mw - actual_mw
    
    Args:
        decision_fcst: DataFrame with startTime, publishTime, forecastMW, horizon_h
        actuals_df: DataFrame with settlementDate, settlementPeriod, generationMW
    
    Returns:
        DataFrame with forecast, actual, and error columns
    """
    if decision_fcst.empty:
        return pd.DataFrame(columns=[
            "startTime", "publishTime", "forecastMW", "horizon_h",
            "actualMW", "errorMW", "missing_actual"
        ])
    
    # Normalize timestamps to tz-naive UTC for consistent comparison
    df = decision_fcst.copy()
    df["startTime"] = _normalize_ts(df["startTime"])
    df["publishTime"] = _normalize_ts(df["publishTime"])
    
    # Prepare actuals - convert settlementDate + settlementPeriod to startTime
    actuals = actuals_df.copy()
    actuals["settlementDate"] = pd.to_datetime(actuals["settlementDate"])
    if actuals["settlementDate"].dt.tz is not None:
        actuals["settlementDate"] = actuals["settlementDate"].dt.tz_convert("UTC").dt.tz_localize(None)
    
    # Convert settlement period to timedelta (30 min periods)
    # Period 1 = 00:00-00:30, Period 48 = 23:30-00:00
    actuals["startTime"] = actuals["settlementDate"] + pd.to_timedelta(
        (actuals["settlementPeriod"] - 1) * 30, unit="m"
    )
    
    # Rename generationMW to actualMW
    actuals = actuals.rename(columns={"generationMW": "actualMW"})
    actuals = actuals[["startTime", "actualMW"]]
    
    # Left join on startTime
    merged = df.merge(actuals, on="startTime", how="left")
    
    # Compute error: positive = over-forecast = shortfall risk for buyer
    merged["errorMW"] = merged["forecastMW"] - merged["actualMW"]
    
    # Flag missing actuals
    merged["missing_actual"] = merged["actualMW"].isna()
    
    return merged