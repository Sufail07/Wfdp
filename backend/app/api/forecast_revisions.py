"""Forecast revisions endpoint - all vintages for a delivery date."""

from fastapi import APIRouter, HTTPException
from app.api.schemas import ForecastRevisionsResponse, ForecastRevisionPoint
from app.config import settings
import pandas as pd

router = APIRouter()


@router.get("/", response_model=ForecastRevisionsResponse)
async def get_forecast_revisions(
    delivery_date: str,
    max_vintages: int = 10,
):
    """Get all forecast vintages for a delivery date."""
    try:
        delivery_dt = pd.Timestamp(delivery_date)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid delivery_date format")

    from app.data.loader import load_snapshot
    from app.config import settings as cfg

    snapshot = load_snapshot(cfg.snapshot_path)
    df = snapshot.windfor.copy()
    df["startTime"] = pd.to_datetime(df["startTime"], utc=True)
    df["publishTime"] = pd.to_datetime(df["publishTime"], utc=True)

    # London day boundaries
    from zoneinfo import ZoneInfo
    london_tz = ZoneInfo(cfg.timezone)
    day_start = pd.Timestamp(delivery_dt.date(), tz=london_tz).astimezone(ZoneInfo("UTC"))
    day_end = pd.Timestamp(delivery_dt.date() + pd.Timedelta(days=1), tz=london_tz).astimezone(ZoneInfo("UTC"))

    mask = (df["startTime"] >= day_start) & (df["startTime"] < day_end)
    day_forecasts = df[mask].copy()

    if day_forecasts.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No forecasts found for {delivery_date}",
        )

    # Get cutoff
    from app.domain.asof import get_cutoff_utc
    cutoff_utc = get_cutoff_utc(delivery_dt, settings.cutoff_hour, settings.cutoff_minute)

    revisions = []
    for _, row in day_forecasts.iterrows():
        revisions.append(
            ForecastRevisionPoint(
                startTime=row["startTime"].isoformat(),
                publishTime=row["publishTime"].isoformat(),
                forecastMW=row["forecastMW"],
                cutoff_eligible=row["publishTime"] <= cutoff_utc,
            )
        )

    # Limit vintages
    if max_vintages:
        revisions = revisions[:max_vintages]

    return ForecastRevisionsResponse(
        delivery_date=delivery_dt.date(),
        vintages=revisions,
        max_vintages=max_vintages,
    )