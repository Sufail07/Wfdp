"""Domain library - Core business logic for wind forecast decision-making."""

from app.domain.asof import (
    select_decision_forecast,
    get_cutoff_utc,
    london_to_utc,
    utc_to_london,
)
from app.domain.errors import join_forecast_actual
from app.domain.metrics import compute_metrics, compute_metrics_by_group
from app.domain.slices import (
    compute_by_horizon,
    compute_by_hour,
    compute_by_wind_level,
    compute_daily,
    compute_error_distribution,
    add_horizon_bucket,
    add_hour_of_day,
    add_wind_level_tercile,
    add_delivery_date,
)
from app.domain.risk import compute_risk_band

__all__ = [
    "select_decision_forecast",
    "get_cutoff_utc",
    "london_to_utc",
    "utc_to_london",
    "join_forecast_actual",
    "compute_metrics",
    "compute_metrics_by_group",
    "compute_by_horizon",
    "compute_by_hour",
    "compute_by_wind_level",
    "compute_daily",
    "compute_error_distribution",
    "add_horizon_bucket",
    "add_hour_of_day",
    "add_wind_level_tercile",
    "add_delivery_date",
    "compute_risk_band",
]