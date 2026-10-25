"""Accuracy endpoints - summary, by-horizon, by-hour, by-wind-level, daily, error-distribution."""

import pandas as pd
from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    AccuracySummaryResponse,
    AccuracyByHorizonResponse,
    AccuracyByHourResponse,
    AccuracyByWindLevelResponse,
    AccuracyDailyResponse,
    AccuracyErrorDistributionResponse,
    MAX_RANGE_DAYS,
)
from app.config import settings
from app.data.loader import load_snapshot
from app.domain.asof import select_decision_forecast
from app.domain.errors import join_forecast_actual
from app.domain.slices import (
    compute_by_hour,
    compute_by_wind_level,
    compute_daily,
    compute_error_distribution,
    compute_wind_level_terciles,
)
from app.main import get_snapshot, get_precomputed_metrics, update_computed_metrics_cache

router = APIRouter()


def _validate_range(from_date: str, to_date: str) -> tuple[pd.Timestamp, pd.Timestamp]:
    """Validate date range caps; raise 422 on violations."""
    try:
        from_dt = pd.Timestamp(from_date)
        to_dt = pd.Timestamp(to_date)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid date format")

    if to_dt < from_dt:
        raise HTTPException(status_code=422, detail="to_date must be >= from_date")

    range_days = (to_dt - from_dt).days
    if range_days > MAX_RANGE_DAYS:
        raise HTTPException(
            status_code=422,
            detail=f"Date range exceeds {MAX_RANGE_DAYS} days (requested {range_days})",
        )

    return from_dt, to_dt


def _load_aligned_pairs(from_date: str, to_date: str, cutoff_hour: int, cutoff_minute: int) -> pd.DataFrame:
    """Load snapshot and compute aligned forecast-actual pairs for date range."""
    from app.config import settings as cfg
    from app.data.loader import load_snapshot

    snapshot = load_snapshot(cfg.snapshot_path)

    from_dt = pd.Timestamp(from_date)
    to_dt = pd.Timestamp(to_date)

    # Generate decision forecasts for each day in range
    all_days = pd.date_range(from_dt, to_dt, freq="D")
    all_aligned = []

    for day in all_days:
        fcst = select_decision_forecast(
            snapshot.windfor, day, cutoff_hour=cutoff_hour, cutoff_minute=cutoff_minute
        )
        if not fcst.empty:
            aligned = join_forecast_actual(fcst, snapshot.fuelhh)
            all_aligned.append(aligned)

    if not all_aligned:
        return pd.DataFrame()

    return pd.concat(all_aligned, ignore_index=True)


@router.get("/summary", response_model=AccuracySummaryResponse)
async def get_accuracy_summary(
    from_date: str,
    to_date: str,
    cutoff_hour: int = settings.cutoff_hour,
    cutoff_minute: int = settings.cutoff_minute,
):
    """Get aggregate accuracy metrics."""
    from app.domain.metrics import compute_metrics
    
    _validate_range(from_date, to_date)
    
    # Try to get cached aligned pairs or compute if not cached
    cache_key = f"summary_{from_date}_{to_date}_{cutoff_hour}_{cutoff_minute}"
    aligned = get_precomputed_metrics(cache_key)
    
    if aligned is None:
        snapshot = get_snapshot()
        
        # Generate decision forecasts for each day in range
        all_days = pd.date_range(from_date, to_date, freq="D")
        all_aligned = []
        
        for day in all_days:
            fcst = select_decision_forecast(
                snapshot.windfor, day, cutoff_hour=cutoff_hour, cutoff_minute=cutoff_minute
            )
            if not fcst.empty:
                aligned = join_forecast_actual(fcst, snapshot.fuelhh)
                all_aligned.append(aligned)
        
        if not all_aligned:
            raise HTTPException(status_code=404, detail="No data for date range")
        
        aligned = pd.concat(all_aligned, ignore_index=True)
        update_computed_metrics_cache(cache_key, aligned)
    
    if aligned.empty:
        raise HTTPException(status_code=404, detail="No data for date range")
    
    metrics = compute_metrics(aligned)
    
    return AccuracySummaryResponse(
        from_date=pd.Timestamp(from_date).date(),
        to_date=pd.Timestamp(to_date).date(),
        cutoff_hour=cutoff_hour,
        cutoff_minute=cutoff_minute,
        metrics=metrics,
    )


@router.get("/by-horizon", response_model=AccuracyByHorizonResponse)
async def get_accuracy_by_horizon(
    from_date: str,
    to_date: str,
):
    """Get accuracy by horizon using ALL forecast vintages."""
    _validate_range(from_date, to_date)
    
    # Try to get cached data or compute if not cached
    cache_key = f"by_horizon_{from_date}_{to_date}"
    results = get_precomputed_metrics(cache_key)
    
    if results is None:
        snapshot = get_snapshot()
        
        results = compute_by_horizon_all_vintages(
            snapshot.windfor, snapshot.fuelhh, from_date, to_date
        )
        update_computed_metrics_cache(cache_key, results)
    
    if results.empty:
        raise HTTPException(status_code=404, detail="No data for date range")
    
    results_list = results.to_dict("records")
    
    return AccuracyByHorizonResponse(
        from_date=pd.Timestamp(from_date).date(),
        to_date=pd.Timestamp(to_date).date(),
        results=results_list,
    )

    if results.empty:
        raise HTTPException(status_code=404, detail="No data for date range")

    results_list = results.to_dict("records")

    return AccuracyByHorizonResponse(
        from_date=pd.Timestamp(from_date).date(),
        to_date=pd.Timestamp(to_date).date(),
        results=results_list,
    )


@router.get("/by-hour", response_model=AccuracyByHourResponse)
async def get_accuracy_by_hour(
    from_date: str,
    to_date: str,
    cutoff_hour: int = None,
    cutoff_minute: int = None,
):
    """Get accuracy by hour of day."""
    _validate_range(from_date, to_date)
    
    ch = cutoff_hour if cutoff_hour is not None else settings.cutoff_hour
    cm = cutoff_minute if cutoff_minute is not None else settings.cutoff_minute
    
    # Try to get cached aligned pairs or compute if not cached
    cache_key = f"by_hour_{from_date}_{to_date}_{ch}_{cm}"
    aligned = get_precomputed_metrics(cache_key)
    
    if aligned is None:
        snapshot = get_snapshot()
        
        all_days = pd.date_range(from_date, to_date, freq="D")
        all_aligned = []
        
        for day in all_days:
            fcst = select_decision_forecast(
                snapshot.windfor, day, cutoff_hour=ch, cutoff_minute=cm
            )
            if not fcst.empty:
                aligned = join_forecast_actual(fcst, snapshot.fuelhh)
                all_aligned.append(aligned)
        
        if not all_aligned:
            raise HTTPException(status_code=404, detail="No data for date range")
        
        aligned = pd.concat(all_aligned, ignore_index=True)
        update_computed_metrics_cache(cache_key, aligned)
    
    if aligned.empty:
        raise HTTPException(status_code=404, detail="No data for date range")
    
    results = compute_by_hour(aligned)
    results_list = results.to_dict("records")
    
    return AccuracyByHourResponse(
        from_date=pd.Timestamp(from_date).date(),
        to_date=pd.Timestamp(to_date).date(),
        cutoff_hour=ch,
        cutoff_minute=cm,
        results=results_list,
    )


@router.get("/by-wind-level", response_model=AccuracyByWindLevelResponse)
async def get_accuracy_by_wind_level(
    from_date: str,
    to_date: str,
    cutoff_hour: int = None,
    cutoff_minute: int = None,
):
    """Get accuracy by forecast wind level terciles (what trader knew).

    Bins by forecastMW (decision forecast), not actualMW, to avoid selection effect.
    Tercile boundaries are computed from the full snapshot for stability.
    """
    _validate_range(from_date, to_date)
    
    snapshot = get_snapshot()
    
    # Stable tercile boundaries from full snapshot (cached in main.py)
    cache_key = "tercile_bounds"
    tercile_bounds = get_precomputed_metrics(cache_key)
    if tercile_bounds is None:
        tercile_lower, tercile_upper = compute_wind_level_terciles(snapshot.windfor)
        tercile_bounds = (tercile_lower, tercile_upper)
        update_computed_metrics_cache(cache_key, tercile_bounds)
    
    ch = cutoff_hour if cutoff_hour is not None else settings.cutoff_hour
    cm = cutoff_minute if cutoff_minute is not None else settings.cutoff_minute
    
    # Try to get cached aligned pairs or compute if not cached
    cache_key = f"by_wind_level_{from_date}_{to_date}_{ch}_{cm}"
    aligned = get_precomputed_metrics(cache_key)
    
    if aligned is None:
        all_days = pd.date_range(from_date, to_date, freq="D")
        all_aligned = []
        
        for day in all_days:
            fcst = select_decision_forecast(
                snapshot.windfor, day, cutoff_hour=ch, cutoff_minute=cm
            )
            if not fcst.empty:
                aligned = join_forecast_actual(fcst, snapshot.fuelhh)
                all_aligned.append(aligned)
        
        if not all_aligned:
            raise HTTPException(status_code=404, detail="No data for date range")
        
        aligned = pd.concat(all_aligned, ignore_index=True)
        update_computed_metrics_cache(cache_key, aligned)
    
    if aligned.empty:
        raise HTTPException(status_code=404, detail="No data for date range")
    
    results = compute_by_wind_level(
        aligned, tercile_bounds=tercile_bounds, by_forecast=True
    )
    results_list = results.to_dict("records")
    
    return AccuracyByWindLevelResponse(
        from_date=pd.Timestamp(from_date).date(),
        to_date=pd.Timestamp(to_date).date(),
        cutoff_hour=ch,
        cutoff_minute=cm,
        results=results_list,
        tercile_lower=tercile_bounds[0],
        tercile_upper=tercile_bounds[1],
    )


@router.get("/daily", response_model=AccuracyDailyResponse)
async def get_accuracy_daily(
    from_date: str,
    to_date: str,
    cutoff_hour: int = None,
    cutoff_minute: int = None,
):
    """Get daily MAE/bias time series."""
    _validate_range(from_date, to_date)
    
    ch = cutoff_hour if cutoff_hour is not None else settings.cutoff_hour
    cm = cutoff_minute if cutoff_minute is not None else settings.cutoff_minute
    
    # Try to get cached aligned pairs or compute if not cached
    cache_key = f"daily_{from_date}_{to_date}_{ch}_{cm}"
    aligned = get_precomputed_metrics(cache_key)
    
    if aligned is None:
        snapshot = get_snapshot()
        
        all_days = pd.date_range(from_date, to_date, freq="D")
        all_aligned = []
        
        for day in all_days:
            fcst = select_decision_forecast(
                snapshot.windfor, day, cutoff_hour=ch, cutoff_minute=cm
            )
            if not fcst.empty:
                aligned = join_forecast_actual(fcst, snapshot.fuelhh)
                all_aligned.append(aligned)
        
        if not all_aligned:
            raise HTTPException(status_code=404, detail="No data for date range")
        
        aligned = pd.concat(all_aligned, ignore_index=True)
        update_computed_metrics_cache(cache_key, aligned)
    
    if aligned.empty:
        raise HTTPException(status_code=404, detail="No data for date range")
    
    results = compute_daily(aligned)
    results_list = results.to_dict("records")
    
    return AccuracyDailyResponse(
        from_date=pd.Timestamp(from_date).date(),
        to_date=pd.Timestamp(to_date).date(),
        cutoff_hour=ch,
        cutoff_minute=cm,
        results=results_list,
    )


@router.get("/error-distribution", response_model=AccuracyErrorDistributionResponse)
async def get_accuracy_error_distribution(
    from_date: str,
    to_date: str,
    cutoff_hour: int = None,
    cutoff_minute: int = None,
    bin_width: int = Query(default=250, ge=50, le=1000),
):
    """Get error distribution histogram and quantiles."""
    _validate_range(from_date, to_date)
    
    ch = cutoff_hour if cutoff_hour is not None else settings.cutoff_hour
    cm = cutoff_minute if cutoff_minute is not None else settings.cutoff_minute
    
    # Try to get cached aligned pairs or compute if not cached
    cache_key = f"error_distribution_{from_date}_{to_date}_{ch}_{cm}_{bin_width}"
    aligned = get_precomputed_metrics(cache_key)
    
    if aligned is None:
        snapshot = get_snapshot()
        
        all_days = pd.date_range(from_date, to_date, freq="D")
        all_aligned = []
        
        for day in all_days:
            fcst = select_decision_forecast(
                snapshot.windfor, day, cutoff_hour=ch, cutoff_minute=cm
            )
            if not fcst.empty:
                aligned = join_forecast_actual(fcst, snapshot.fuelhh)
                all_aligned.append(aligned)
        
        if not all_aligned:
            raise HTTPException(status_code=404, detail="No data for date range")
        
        aligned = pd.concat(all_aligned, ignore_index=True)
        update_computed_metrics_cache(cache_key, aligned)
    
    if aligned.empty:
        raise HTTPException(status_code=404, detail="No data for date range")
    
    dist = compute_error_distribution(aligned, bin_width=bin_width)
    
    return AccuracyErrorDistributionResponse(
        from_date=pd.Timestamp(from_date).date(),
        to_date=pd.Timestamp(to_date).date(),
        cutoff_hour=ch,
        cutoff_minute=cm,
        bins=bin_width,
        distribution=dist,
    )
