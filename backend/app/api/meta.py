"""Meta endpoint - coverage, defaults, assumptions, caveats."""

from fastapi import APIRouter
from datetime import date
from app.api.schemas import MetaResponse
from app.config import settings

router = APIRouter()

ASSUMPTIONS = [
    "A1: Decision cutoff is D-1 09:00 Europe/London",
    "A2: Delivery day D runs 00:00-23:30 London time (48 half-hour periods)",
    "A3: Only metered wind (FUELHH fuelType=WIND) used as actuals",
    "A4: WINDFOR provides all forecast vintages; latest published at/before cutoff is decision forecast",
    "A5: Forecasts with publishTime >= startTime are invalid (future knowledge)",
    "A6: Data covers January 2026 only (delivery dates 2026-01-02 to 2026-02-01)",
]

CAVEATS = [
    "Metered wind only (excludes embedded wind)",
    "Single month of data (January 2026)",
    "Cutoff time assumption may differ from actual trader workflows",
    "No database - uses Parquet snapshots loaded in memory",
    "Forecast accuracy improves as publish time approaches start time",
]


@router.get("", response_model=MetaResponse)
async def get_meta():
    """Get data coverage, defaults, assumptions, and caveats."""
    return MetaResponse(
        coverage_start=date(2026, 1, 1),
        coverage_end=date(2026, 2, 1),
        default_cutoff_hour=settings.cutoff_hour,
        default_cutoff_minute=settings.cutoff_minute,
        timezone=settings.timezone,
        snapshot_id="mock-snapshot-2026-01",
        row_counts={"fuelhh": 1488, "windfor": 10416},
        assumptions=ASSUMPTIONS,
        caveats=CAVEATS,
    )