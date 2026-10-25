"""Risk band endpoint with leakage protection."""

import pandas as pd
from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    RiskBandPoint,
    RiskBandResponse,
)
from app.config import settings
from app.domain.risk import compute_risk_band

router = APIRouter()


@router.get("", response_model=RiskBandResponse)
async def get_risk_band(
    delivery_date: str,
    quantile: float = 0.9,
    cutoff_hour: int = settings.cutoff_hour,
    cutoff_minute: int = settings.cutoff_minute,
):
    """Get risk-adjusted forecast with leakage protection."""
    try:
        delivery_dt = pd.Timestamp(delivery_date)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid delivery_date format")

    from app.config import settings as cfg
    from app.data.loader import load_snapshot

    snapshot = load_snapshot(cfg.snapshot_path)

    result = compute_risk_band(
        snapshot.windfor,
        snapshot.fuelhh,
        delivery_dt,
        quantile=quantile,
        cutoff_hour=cutoff_hour,
        cutoff_minute=cutoff_minute,
        availability_lag_minutes=settings.availability_lag_minutes,
    )

    if not result["risk_adjusted"]:
        raise HTTPException(
            status_code=404,
            detail=f"No risk band data for {delivery_date}",
        )

    risk_adjusted = [
        RiskBandPoint(
            startTime=item["startTime"],
            forecastMW=item["forecastMW"],
            riskAdjustedMW=item["riskAdjustedMW"],
            horizon_h=item["horizon_h"],
        )
        for item in result["risk_adjusted"]
    ]

    return RiskBandResponse(
        delivery_date=delivery_dt.date(),
        quantile=quantile,
        cutoff_hour=cutoff_hour,
        cutoff_minute=cutoff_minute,
        in_sample=result["in_sample"],
        sample_days=result.get("sample_days", 0),
        sample_errors=result.get("sample_errors", 0),
        over_forecast_quantile=result.get("over_forecast_quantile"),
        risk_adjusted=risk_adjusted,
    )
