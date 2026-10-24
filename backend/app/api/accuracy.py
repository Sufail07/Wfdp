"""Accuracy endpoints - summary, by-horizon, by-hour, by-wind-level, daily, error-distribution."""

from fastapi import APIRouter, HTTPException, Query
from app.api.schemas import (
    AccuracySummaryResponse,
    AccuracyByHorizonResponse,
    AccuracyByHourResponse,
    AccuracyByWindLevelResponse,
    AccuracyDailyResponse,
    AccuracyErrorDistributionResponse,
)
from app.domain.asof import select_decision_forecast
from app.domain.errors import join_forecast_actual
from app.domain.slices import (
    compute_by_horizon,
    compute_by_hour,
    compute_by_wind_level,
    compute_daily,
    compute_error_distribution,
)
from app.config import settings
import pandas as pd

router = APIRouter()


def _load_aligned_pairs(from_date: str, to_date: str, cutoff_hour: int, cutoff_minute: int) -> pd.DataFrame:
    """Load snapshot and compute aligned forecast-actual pairs for date range."""
    from app.data.loader import load_snapshot
    from app.config import settings as cfg

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

    aligned = _load_aligned_pairs(from_date, to_date, cutoff_hour, cutoff_minute)
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
    """Get accuracy by forecast horizon."""
    aligned = _load_aligned_pairs(from_date, to_date, settings.cutoff_hour, settings.cutoff_minute)
    if aligned.empty:
        raise HTTPException(status_code=404, detail="No data for date range")

    results = compute_by_horizon(aligned)
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
    ch = cutoff_hour if cutoff_hour is not None else settings.cutoff_hour
    cm = cutoff_minute if cutoff_minute is not None else settings.cutoff_minute

    aligned = _load_aligned_pairs(from_date, to_date, ch, cm)
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
    """Get accuracy by actual wind level."""
    ch = cutoff_hour if cutoff_hour is not None else settings.cutoff_hour
    cm = cutoff_minute if cutoff_minute is not None else settings.cutoff_minute

    aligned = _load_aligned_pairs(from_date, to_date, ch, cm)
    if aligned.empty:
        raise HTTPException(status_code=404, detail="No data for date range")

    results = compute_by_wind_level(aligned)
    results_list = results.to_dict("records")

    return AccuracyByWindLevelResponse(
        from_date=pd.Timestamp(from_date).date(),
        to_date=pd.Timestamp(to_date).date(),
        cutoff_hour=ch,
        cutoff_minute=cm,
        results=results_list,
    )


@router.get("/daily", response_model=AccuracyDailyResponse)
async def get_accuracy_daily(
    from_date: str,
    to_date: str,
    cutoff_hour: int = None,
    cutoff_minute: int = None,
):
    """Get daily MAE/bias time series."""
    ch = cutoff_hour if cutoff_hour is not None else settings.cutoff_hour
    cm = cutoff_minute if cutoff_minute is not None else settings.cutoff_minute

    aligned = _load_aligned_pairs(from_date, to_date, ch, cm)
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
    bins: int = Query(default=50, ge=10, le=200),
):
    """Get error distribution histogram and quantiles."""
    ch = cutoff_hour if cutoff_hour is not None else settings.cutoff_hour
    cm = cutoff_minute if cutoff_minute is not None else settings.cutoff_minute

    aligned = _load_aligned_pairs(from_date, to_date, ch, cm)
    if aligned.empty:
        raise HTTPException(status_code=404, detail="No data for date range")

    dist = compute_error_distribution(aligned, bins=bins)

    return AccuracyErrorDistributionResponse(
        from_date=pd.Timestamp(from_date).date(),
        to_date=pd.Timestamp(to_date).date(),
        cutoff_hour=ch,
        cutoff_minute=cm,
        bins=bins,
        distribution=dist,
    )