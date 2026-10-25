"""Point-in-time forecast selection logic."""

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

import pandas as pd


def london_to_utc(dt: datetime, tz: str = "Europe/London") -> datetime:
    """Convert London time to UTC."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo(tz))
    return dt.astimezone(ZoneInfo("UTC"))


def utc_to_london(dt: datetime) -> datetime:
    """Convert UTC to London time."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=ZoneInfo("UTC"))
    return dt.astimezone(ZoneInfo("Europe/London"))


def get_cutoff_utc(
    delivery_date: pd.Timestamp,
    cutoff_hour: int = 9,
    cutoff_minute: int = 0,
    tz: str = "Europe/London",
    availability_lag_minutes: int = 0,
) -> pd.Timestamp:
    """
    Get the cutoff timestamp in UTC (tz-naive for consistent comparison).

    The cutoff is (delivery_date - 1 day) at cutoff_hour:cutoff_minute in London time,
    minus availability_lag_minutes to account for ingestion/publication lag.
    """
    london_tz = ZoneInfo(tz)
    delivery_day = delivery_date.date() if hasattr(delivery_date, 'date') else delivery_date

    cutoff_london = datetime.combine(
        delivery_day - timedelta(days=1),
        time(cutoff_hour, cutoff_minute),
    ).replace(tzinfo=london_tz)

    cutoff_utc = cutoff_london.astimezone(ZoneInfo("UTC"))

    if availability_lag_minutes > 0:
        cutoff_utc = cutoff_utc - pd.Timedelta(minutes=availability_lag_minutes)

    # Return tz-naive for consistent comparison with stored data
    return pd.Timestamp(cutoff_utc).tz_localize(None)


def select_decision_forecast(
    forecasts_df: pd.DataFrame,
    delivery_date: pd.Timestamp,
    cutoff_hour: int = 9,
    cutoff_minute: int = 0,
    tz: str = "Europe/London",
    availability_lag_minutes: int = 0,
) -> pd.DataFrame:
    """
    Select the decision forecast for a delivery date.
    
    Logic:
    1. Cutoff = (delivery_date - 1 day) at cutoff_hour:cutoff_minute in London -> UTC
    2. Filter: startTime on delivery_date (London day) 
       AND publishTime <= cutoff_utc 
       AND publishTime < startTime
    3. Per startTime, take row with max(publishTime)
    4. Add horizon_h = (startTime - publishTime) in hours
    
    Args:
        forecasts_df: DataFrame with startTime, publishTime, forecastMW
        delivery_date: Delivery date (pandas Timestamp)
        cutoff_hour: Cutoff hour in London time (default 9)
        cutoff_minute: Cutoff minute in London time (default 0)
        tz: Timezone for cutoff (default Europe/London)
    
    Returns:
        DataFrame with decision forecast rows, including horizon_h column
    """
    if forecasts_df.empty:
        return pd.DataFrame(columns=["startTime", "publishTime", "forecastMW", "horizon_h"])

    # Ensure datetime columns - normalize to tz-naive UTC for consistent comparison
    df = forecasts_df.copy()
    if df["startTime"].dt.tz is not None:
        df["startTime"] = df["startTime"].dt.tz_convert("UTC").dt.tz_localize(None)
    if df["publishTime"].dt.tz is not None:
        df["publishTime"] = df["publishTime"].dt.tz_convert("UTC").dt.tz_localize(None)

    # Get cutoff in UTC (naive)
    cutoff_utc = get_cutoff_utc(
        delivery_date, cutoff_hour, cutoff_minute, tz, availability_lag_minutes
    )
    if cutoff_utc.tzinfo is not None:
        cutoff_utc = cutoff_utc.tz_localize(None)

    # Get London day boundaries for the delivery date
    london_tz = ZoneInfo(tz)
    delivery_day = delivery_date.date() if hasattr(delivery_date, 'date') else delivery_date
    
    delivery_day_start_london = pd.Timestamp(
        datetime.combine(delivery_day, time(0, 0)), tz=london_tz
    )
    delivery_day_end_london = pd.Timestamp(
        datetime.combine(delivery_day, time(23, 59, 59)), tz=london_tz
    )

    # Convert to UTC naive for comparison
    day_start_utc = delivery_day_start_london.astimezone(ZoneInfo("UTC")).tz_localize(None)
    day_end_utc = delivery_day_end_london.astimezone(ZoneInfo("UTC")).tz_localize(None)

    # Filter: startTime on delivery_date (London day) AND publishTime <= cutoff_utc AND publishTime < startTime
    mask = (
        (df["startTime"] >= day_start_utc) &
        (df["startTime"] <= day_end_utc) &
        (df["publishTime"] <= cutoff_utc) &
        (df["publishTime"] < df["startTime"])
    )
    eligible = df[mask].copy()

    if eligible.empty:
        return pd.DataFrame(columns=["startTime", "publishTime", "forecastMW", "horizon_h"])

    # Per startTime, take row with max(publishTime)
    idx = eligible.groupby("startTime")["publishTime"].idxmax()
    decision = eligible.loc[idx].copy()

    # Add horizon in hours
    decision["horizon_h"] = (decision["startTime"] - decision["publishTime"]).dt.total_seconds() / 3600

    # Sort by startTime
    decision = decision.sort_values("startTime").reset_index(drop=True)

    return decision[["startTime", "publishTime", "forecastMW", "horizon_h"]]
