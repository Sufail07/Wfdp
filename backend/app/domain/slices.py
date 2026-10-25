"""Accuracy breakdown slices."""

from typing import Dict, Any

import pandas as pd
import numpy as np
from app.domain.metrics import compute_metrics, compute_metrics_by_group


def add_horizon_bucket(df: pd.DataFrame) -> pd.DataFrame:
    """Add horizon bucket column."""
    df = df.copy()
    bins = [0, 6, 12, 24, 36, 48, np.inf]
    labels = ["0-6h", "6-12h", "12-24h", "24-36h", "36-48h", "48h+"]
    df["horizon_bucket"] = pd.cut(df["horizon_h"], bins=bins, labels=labels, right=False)
    return df


def add_hour_of_day(df: pd.DataFrame, tz: str = "Europe/London") -> pd.DataFrame:
    """Add hour of day in London time."""
    df = df.copy()
    df["hour_of_day"] = df["startTime"].dt.tz_convert(tz).dt.hour
    return df


def add_wind_level_tercile(df: pd.DataFrame, tercile_bounds: tuple[float, float] | None = None,
                           by_forecast: bool = False) -> pd.DataFrame:
    """Add wind level tercile column.

    Args:
        df: DataFrame with forecastMW and/or actualMW columns.
        tercile_bounds: (lower_bound, upper_bound) for tercile boundaries.
            If None, computed from the data.
        by_forecast: If True, bin by forecastMW (what trader knew); if False,
            bin by actualMW (what actually happened).
    """
    df = df.copy()
    value_col = "forecastMW" if by_forecast else "actualMW"
    valid = df.dropna(subset=[value_col])
    if len(valid) == 0:
        df["wind_level"] = "unknown"
        return df

    if tercile_bounds is not None:
        lower, upper = tercile_bounds
    else:
        lower = valid[value_col].quantile(1 / 3)
        upper = valid[value_col].quantile(2 / 3)

    bins = [-np.inf, lower, upper, np.inf]
    labels = ["low", "medium", "high"]
    df["wind_level"] = pd.cut(df[value_col], bins=bins, labels=labels)
    return df


def compute_wind_level_terciles(windfor_df: pd.DataFrame) -> tuple[float, float]:
    """Compute stable tercile boundaries from forecastMW across the full snapshot."""
    valid = windfor_df.dropna(subset=["forecastMW"])
    if len(valid) == 0:
        return (0.0, 0.0)
    lower = float(valid["forecastMW"].quantile(1 / 3))
    upper = float(valid["forecastMW"].quantile(2 / 3))
    return (lower, upper)


def compute_by_hour(aligned_pairs: pd.DataFrame, tz: str = "Europe/London") -> pd.DataFrame:
    """Compute accuracy by hour of day (London local)."""
    df = add_hour_of_day(aligned_pairs, tz)
    return compute_metrics_by_group(df, "hour_of_day")


def compute_by_wind_level(aligned_pairs: pd.DataFrame, tercile_bounds: tuple[float, float] | None = None,
                          by_forecast: bool = False) -> pd.DataFrame:
    """Compute accuracy by wind level terciles.

    Args:
        aligned_pairs: DataFrame with forecastMW, actualMW, errorMW.
        tercile_bounds: Stable (lower, upper) boundaries from full snapshot.
        by_forecast: If True, bin by forecastMW; if False, bin by actualMW.
    """
    df = add_wind_level_tercile(df=aligned_pairs, tercile_bounds=tercile_bounds, by_forecast=by_forecast)
    return compute_metrics_by_group(df, "wind_level")


def compute_by_horizon(aligned_pairs: pd.DataFrame) -> pd.DataFrame:
    """Compute accuracy by forecast horizon (decision forecast only)."""
    df = add_horizon_bucket(aligned_pairs)
    return compute_metrics_by_group(df, "horizon_bucket")


def compute_by_horizon_all_vintages(windfor_df: pd.DataFrame, fuelhh_df: pd.DataFrame,
                                     from_date: str, to_date: str) -> pd.DataFrame:
    """Compute accuracy by horizon using ALL forecast vintages (not just decision forecast).

    Loads every WINDFOR publish whose startTime falls in the date range, keeps only
    publishTime < startTime (no future knowledge), joins with actuals, and buckets by
    horizon_h = startTime - publishTime.
    """
    from app.domain.errors import join_forecast_actual

    from_dt = pd.Timestamp(from_date).tz_localize("UTC")
    to_dt = pd.Timestamp(to_date).tz_localize("UTC")

    # All vintages whose startTime falls in the date range
    mask = (
        (windfor_df['startTime'] >= from_dt) &
        (windfor_df['startTime'] <= to_dt + pd.Timedelta(days=1)) &
        (windfor_df['publishTime'] < windfor_df['startTime'])
    )
    vintages = windfor_df[mask].copy()

    if vintages.empty:
        return pd.DataFrame()

    # Join with actuals
    aligned = join_forecast_actual(vintages, fuelhh_df)

    if aligned.empty:
        return pd.DataFrame()

    # Compute horizon_h
    aligned['horizon_h'] = (aligned['startTime'] - aligned['publishTime']).dt.total_seconds() / 3600

    # Bucket and compute metrics
    df = add_horizon_bucket(aligned)
    return compute_metrics_by_group(df, "horizon_bucket")


def add_delivery_date(df: pd.DataFrame, tz: str = "Europe/London") -> pd.DataFrame:
    """Add delivery date in London time."""
    df = df.copy()
    df["delivery_date"] = df["startTime"].dt.tz_convert(tz).dt.date
    return df


def compute_daily(aligned_pairs: pd.DataFrame, tz: str = "Europe/London") -> pd.DataFrame:
    """Compute daily MAE/bias time series."""
    df = add_delivery_date(aligned_pairs, tz)
    return compute_metrics_by_group(df, "delivery_date")


def compute_error_distribution(
    aligned_pairs: pd.DataFrame,
    bin_width: int = 250,
) -> Dict[str, Any]:
    """
    Compute error distribution histogram and quantiles using fixed-width bins.
    
    Bin edges are at multiples of bin_width. If fewer than 20 bins have data
    with the default width, falls back to 500 MW width.
    
    Returns:
        Dictionary with histogram bins, counts, and quantiles
    """
    valid = aligned_pairs.dropna(subset=["actualMW"])
    if len(valid) == 0:
        return {
            "histogram": {"bins": [], "counts": []},
            "quantiles": {},
            "bin_width": bin_width,
        }

    errors = valid["errorMW"].values

    def _histogram_with_width(bw: int) -> tuple:
        start = np.floor(errors.min() / bw) * bw
        end = np.ceil(errors.max() / bw) * bw
        edges = np.arange(start, end + bw, bw)
        hist, _ = np.histogram(errors, bins=edges)
        return edges, hist, int((hist > 0).sum())

    bin_edges, hist, non_empty = _histogram_with_width(bin_width)

    # Fall back to 500 MW if too few non-empty bins
    if non_empty < 20 and bin_width == 250:
        bin_edges, hist, non_empty = _histogram_with_width(500)
        bin_width = 500

    # Quantiles
    quantiles = {
        "p1": float(np.percentile(errors, 1)),
        "p5": float(np.percentile(errors, 5)),
        "p10": float(np.percentile(errors, 10)),
        "p25": float(np.percentile(errors, 25)),
        "p50": float(np.percentile(errors, 50)),
        "p75": float(np.percentile(errors, 75)),
        "p90": float(np.percentile(errors, 90)),
        "p95": float(np.percentile(errors, 95)),
        "p99": float(np.percentile(errors, 99)),
    }

    return {
        "histogram": {
            "bins": bin_edges.tolist(),
            "counts": hist.tolist(),
        },
        "quantiles": quantiles,
        "bin_width": bin_width,
    }