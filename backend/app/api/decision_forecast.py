"""Decision forecast endpoint."""

import pandas as pd
from fastapi import APIRouter, HTTPException

from app.api.schemas import DecisionForecastPoint, DecisionForecastResponse
from app.config import settings
from app.domain.asof import get_cutoff_utc, select_decision_forecast

router = APIRouter()


@router.get("", response_model=DecisionForecastResponse)
async def get_decision_forecast(
    delivery_date: str,
    cutoff_hour: int = settings.cutoff_hour,
    cutoff_minute: int = settings.cutoff_minute,
):
    """Get decision forecast for a delivery date."""
    try:
        delivery_dt = pd.Timestamp(delivery_date)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid delivery_date format")

    # Load snapshot
    from app.config import settings as cfg
    from app.data.loader import load_snapshot

    snapshot_path = cfg.snapshot_path
    snapshot = load_snapshot(snapshot_path)

    # Select decision forecast
    result = select_decision_forecast(
        snapshot.windfor,
        delivery_dt,
        cutoff_hour=cutoff_hour,
        cutoff_minute=cutoff_minute,
        availability_lag_minutes=settings.availability_lag_minutes,
    )

    if result.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No decision forecast found for {delivery_date}",
        )

    cutoff_utc = get_cutoff_utc(delivery_dt, cutoff_hour, cutoff_minute)

    forecasts = [
        DecisionForecastPoint(
            startTime=row["startTime"].isoformat(),
            publishTime=row["publishTime"].isoformat(),
            forecastMW=row["forecastMW"],
            horizon_h=row["horizon_h"],
        )
        for _, row in result.iterrows()
    ]

    forecast_mws = [f.forecastMW for f in forecasts]

    return DecisionForecastResponse(
        delivery_date=delivery_dt.date(),
        cutoff_hour=cutoff_hour,
        cutoff_minute=cutoff_minute,
        cutoff_utc=cutoff_utc.isoformat(),
        total_points=len(forecasts),
        forecasts=forecasts,
        total_expected_mwh=sum(forecast_mws) * 0.5 if forecast_mws else None,
        peak_mw=max(forecast_mws) if forecast_mws else None,
        min_mw=min(forecast_mws) if forecast_mws else None,
        mean_mw=sum(forecast_mws) / len(forecast_mws) if forecast_mws else None,
        forecast_published_at=forecasts[0].publishTime if forecasts else None,
    )
