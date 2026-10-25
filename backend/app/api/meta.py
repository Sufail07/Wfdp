"""Meta endpoint - coverage, defaults, assumptions, caveats."""

from datetime import date

from fastapi import APIRouter

from app.api.schemas import MetaResponse
from app.config import settings
from app.data.loader import load_snapshot

router = APIRouter()

ASSUMPTIONS = [
    "A1: Decision cutoff is D-1 09:00 Europe/London",
    "A2: Delivery day D runs 00:00-23:30 London time (48 half-hour periods)",
    "A3: Only metered wind (FUELHH fuelType=WIND) used as actuals",
    "A4: WINDFOR provides all forecast vintages; latest published at/before cutoff is decision forecast",
    "A5: Forecasts with publishTime >= startTime are invalid (future knowledge)",
    "A6: Data covers January 2026 only (delivery dates 2026-01-02 to 2026-02-01)",
    f"A7: availability_lag_minutes = {settings.availability_lag_minutes} (forecast availability lag beyond publishTime)",
]

CAVEATS = [
    "Metered wind only (excludes embedded wind)",
    "Single month of data (January 2026)",
    "Cutoff time assumption may differ from actual trader workflows",
    "No database - uses Parquet snapshots loaded in memory",
    "Forecast accuracy improves as publish time approaches start time",
    "Calendar bias: one month of winter wind says little about other seasons; do not extrapolate",
    "Actuals are not final: FUELHH values can be revised in later settlement runs; accuracy is versus actuals as of fetch time",
    "No authentication or roles - public demo; production needs SSO + RBAC + audit logging",
]


@router.get("", response_model=MetaResponse)
async def get_meta():
    """Get data coverage, defaults, assumptions, and caveats."""
    snapshot_path = settings.snapshot_path
    snapshot = load_snapshot(snapshot_path)

    # Derive coverage from actual data
    fuelhh_min = snapshot.fuelhh["settlementDate"].min()
    fuelhh_max = snapshot.fuelhh["settlementDate"].max()
    coverage_start = fuelhh_min.date() if hasattr(fuelhh_min, "date") else fuelhh_min
    coverage_end = fuelhh_max.date() if hasattr(fuelhh_max, "date") else fuelhh_max

    return MetaResponse(
        coverage_start=coverage_start,
        coverage_end=coverage_end,
        default_cutoff_hour=settings.cutoff_hour,
        default_cutoff_minute=settings.cutoff_minute,
        timezone=settings.timezone,
        snapshot_id=snapshot.manifest.fetch_time,
        dataset_version=snapshot.manifest.dataset_version,
        data_source=snapshot.manifest.data_source,
        row_counts=snapshot.manifest.row_counts,
        assumptions=ASSUMPTIONS,
        caveats=CAVEATS,
        freshness="snapshot",
    )
