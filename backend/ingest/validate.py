"""Pandera schemas for data validation."""

import pandera.pandas as pa
from pandera.pandas import Column, Check, DataFrameSchema
from datetime import datetime
import pandas as pd


# FUELHH Schema
fuelhh_schema = DataFrameSchema(
    {
        "settlementDate": Column(
            pa.DateTime,
            nullable=False,
            coerce=True,
        ),
        "settlementPeriod": Column(
            pa.Int,
            Check.in_range(1, 48),
            nullable=False,
            coerce=True,
        ),
        "fuelType": Column(
            pa.String,
            Check.isin(["WIND"]),
            nullable=False,
        ),
        "generationMW": Column(
            pa.Float,
            Check.greater_than_or_equal_to(0),
            nullable=False,
            coerce=True,
        ),
    },
    unique=["settlementDate", "settlementPeriod", "fuelType"],
    strict=True,
    coerce=True,
)


# WINDFOR Schema
windfor_schema = DataFrameSchema(
    {
        "startTime": Column(
            pa.DateTime,
            nullable=False,
            coerce=True,
        ),
        "publishTime": Column(
            pa.DateTime,
            nullable=False,
            coerce=True,
        ),
        "forecastMW": Column(
            pa.Float,
            Check.greater_than_or_equal_to(0),
            nullable=False,
            coerce=True,
        ),
    },
    unique=["startTime", "publishTime"],
    strict=True,
    coerce=True,
)


def validate_fuelhh(df: pd.DataFrame) -> pd.DataFrame:
    """Validate FUELHH DataFrame."""
    return fuelhh_schema.validate(df, lazy=True)


def validate_windfor(df: pd.DataFrame) -> pd.DataFrame:
    """Validate WINDFOR DataFrame."""
    return windfor_schema.validate(df, lazy=True)


def validate_no_future_publish(df: pd.DataFrame, cutoff_date: pd.Timestamp) -> pd.DataFrame:
    """Ensure no publishTime is in the future relative to cutoff."""
    future = df[df["publishTime"] > cutoff_date]
    if not future.empty:
        raise ValueError(f"Found {len(future)} rows with publishTime > cutoff_date")
    return df


def validate_publish_before_start(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure publishTime < startTime (no future knowledge)."""
    invalid = df[df["publishTime"] >= df["startTime"]]
    if not invalid.empty:
        raise ValueError(f"Found {len(invalid)} rows with publishTime >= startTime")
    return df


def validate_30min_grid(df: pd.DataFrame, time_col: str = "startTime") -> pd.DataFrame:
    """Validate timestamps are on 30-minute grid."""
    minutes = df[time_col].dt.minute
    invalid = minutes[~minutes.isin([0, 30])]
    if not invalid.empty:
        raise ValueError(f"Found {len(invalid)} timestamps not on 30-min grid")
    return df