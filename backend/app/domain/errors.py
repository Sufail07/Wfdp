"""Join forecasts with actuals and compute errors."""

import pandas as pd
import numpy as np


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
    
    # Prepare actuals - convert settlementDate + settlementPeriod to startTime
    actuals = actuals_df.copy()
    actuals["settlementDate"] = pd.to_datetime(actuals["settlementDate"])
    
    # Convert settlement period to timedelta (30 min periods)
    # Period 1 = 00:00-00:30, Period 48 = 23:30-00:00
    actuals["startTime"] = actuals["settlementDate"] + pd.to_timedelta(
        (actuals["settlementPeriod"] - 1) * 30, unit="m"
    )
    actuals["startTime"] = actuals["startTime"].dt.tz_localize("UTC")
    
    # Rename generationMW to actualMW
    actuals = actuals.rename(columns={"generationMW": "actualMW"})
    actuals = actuals[["startTime", "actualMW"]]
    
    # Left join on startTime
    merged = decision_fcst.merge(actuals, on="startTime", how="left")
    
    # Compute error: positive = over-forecast = shortfall risk for buyer
    merged["errorMW"] = merged["forecastMW"] - merged["actualMW"]
    
    # Flag missing actuals
    merged["missing_actual"] = merged["actualMW"].isna()
    
    return merged