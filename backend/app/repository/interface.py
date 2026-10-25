"""Repository interface for storage abstraction.

Defines a thin interface (get_forecasts, get_actuals) so the storage engine
can change (pandas -> polars -> DuckDB -> Postgres) without touching the
metrics logic in domain/.
"""

from abc import ABC, abstractmethod
from datetime import date

import pandas as pd


class ForecastRepository(ABC):
    """Abstract repository for forecast and actual data access."""

    @abstractmethod
    def get_forecasts(self, from_date: date, to_date: date) -> pd.DataFrame:
        """Return forecast vintages for delivery dates in [from_date, to_date]."""

    @abstractmethod
    def get_actuals(self, from_date: date, to_date: date) -> pd.DataFrame:
        """Return actuals for delivery dates in [from_date, to_date]."""


class PandasForecastRepository(ForecastRepository):
    """Pandas-backed repository reading from in-memory snapshot DataFrames."""

    def __init__(self, windfor: pd.DataFrame, fuelhh: pd.DataFrame):
        self._windfor = windfor
        self._fuelhh = fuelhh

    def get_forecasts(self, from_date: date, to_date: date) -> pd.DataFrame:
        df = self._windfor.copy()
        df["startTime"] = pd.to_datetime(df["startTime"], utc=True)
        from_ts = pd.Timestamp(from_date, tz="UTC")
        to_ts = pd.Timestamp(to_date, tz="UTC") + pd.Timedelta(days=1)
        mask = (df["startTime"] >= from_ts) & (df["startTime"] < to_ts)
        return df[mask].sort_values("startTime").reset_index(drop=True)

    def get_actuals(self, from_date: date, to_date: date) -> pd.DataFrame:
        df = self._fuelhh.copy()
        df["settlementDate"] = pd.to_datetime(df["settlementDate"])
        from_ts = pd.Timestamp(from_date)
        to_ts = pd.Timestamp(to_date)
        mask = (df["settlementDate"] >= from_ts) & (df["settlementDate"] <= to_ts)
        return df[mask].sort_values(["settlementDate", "settlementPeriod"]).reset_index(drop=True)
