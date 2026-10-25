"""Pydantic schemas for API request/response models."""

from datetime import date
from typing import Any

from pydantic import BaseModel, Field

# --- Input caps (security / DoS protection) ---
MAX_RANGE_DAYS = 92          # ~3 months max range
MAX_BINS = 200
MAX_VINTAGES = 50
MAX_CUTOFF_HOUR = 23
MAX_CUTOFF_MINUTE = 59

# --- /meta ---
class MetaResponse(BaseModel):
    coverage_start: date
    coverage_end: date
    default_cutoff_hour: int
    default_cutoff_minute: int
    timezone: str
    snapshot_id: str
    dataset_version: str | None = None
    data_source: str | None = None
    row_counts: dict[str, int]
    assumptions: list[str]
    caveats: list[str]
    freshness: str | None = None


# --- /decision-forecast ---
class DecisionForecastRequest(BaseModel):
    delivery_date: date
    cutoff_hour: int = Field(default=9, ge=0, le=23)
    cutoff_minute: int = Field(default=0, ge=0, le=59)


class DecisionForecastPoint(BaseModel):
    startTime: str
    publishTime: str
    forecastMW: float
    horizon_h: float


class DecisionForecastResponse(BaseModel):
    delivery_date: date
    cutoff_hour: int
    cutoff_minute: int
    cutoff_utc: str
    total_points: int
    forecasts: list[DecisionForecastPoint]
    total_expected_mwh: float | None = None
    peak_mw: float | None = None
    min_mw: float | None = None
    mean_mw: float | None = None
    forecast_published_at: str | None = None


# --- /forecast-revisions ---
class ForecastRevisionPoint(BaseModel):
    startTime: str
    publishTime: str
    forecastMW: float
    cutoff_eligible: bool


class ForecastRevisionsResponse(BaseModel):
    delivery_date: date
    vintages: list[ForecastRevisionPoint]
    max_vintages: int | None = None


# --- /accuracy/summary ---
class AccuracySummaryRequest(BaseModel):
    from_date: date
    to_date: date
    cutoff_hour: int = Field(default=9, ge=0, le=23)
    cutoff_minute: int = Field(default=0, ge=0, le=59)


class AccuracySummaryResponse(BaseModel):
    from_date: date
    to_date: date
    cutoff_hour: int
    cutoff_minute: int
    metrics: dict[str, Any]


# --- /accuracy/by-horizon ---
class AccuracyByHorizonResponse(BaseModel):
    from_date: date
    to_date: date
    results: list[dict[str, Any]]


# --- /accuracy/by-hour ---
class AccuracyByHourResponse(BaseModel):
    from_date: date
    to_date: date
    cutoff_hour: int | None = None
    cutoff_minute: int | None = None
    results: list[dict[str, Any]]


# --- /accuracy/by-wind-level ---
class AccuracyByWindLevelResponse(BaseModel):
    from_date: date
    to_date: date
    cutoff_hour: int | None = None
    cutoff_minute: int | None = None
    results: list[dict[str, Any]]
    tercile_lower: float | None = None
    tercile_upper: float | None = None


# --- /accuracy/daily ---
class AccuracyDailyResponse(BaseModel):
    from_date: date
    to_date: date
    cutoff_hour: int | None = None
    cutoff_minute: int | None = None
    results: list[dict[str, Any]]


# --- /accuracy/error-distribution ---
class AccuracyErrorDistributionResponse(BaseModel):
    from_date: date
    to_date: date
    cutoff_hour: int | None = None
    cutoff_minute: int | None = None
    bin_width: int | None = None
    distribution: dict[str, Any]


# --- /risk-band ---
class RiskBandRequest(BaseModel):
    delivery_date: date
    quantile: float = Field(default=0.9, ge=0.5, le=0.999)
    cutoff_hour: int = Field(default=9, ge=0, le=23)
    cutoff_minute: int = Field(default=0, ge=0, le=59)


class RiskBandPoint(BaseModel):
    startTime: str
    forecastMW: float
    riskAdjustedMW: float
    horizon_h: float


class RiskBandResponse(BaseModel):
    delivery_date: date
    quantile: float
    cutoff_hour: int
    cutoff_minute: int
    in_sample: bool
    sample_days: int
    sample_errors: int
    over_forecast_quantile: float | None = None
    risk_adjusted: list[RiskBandPoint]
