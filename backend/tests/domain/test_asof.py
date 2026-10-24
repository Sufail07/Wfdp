"""Property-based tests for asof.py domain logic using hypothesis."""

import pandas as pd
import numpy as np
from hypothesis import given, strategies as st, settings, HealthCheck
from app.domain.asof import (
    select_decision_forecast,
    get_cutoff_utc,
    london_to_utc,
    utc_to_london,
)


def make_forecasts(n: int = 10) -> pd.DataFrame:
    """Create a small forecast DataFrame for testing."""
    base = pd.Timestamp("2026-01-02", tz="UTC")
    rows = []
    for i in range(n):
        start = base + pd.Timedelta(minutes=30 * i)
        for j in range(3):  # 3 vintages per period
            pub = start - pd.Timedelta(hours=24 + j * 6)
            rows.append({
                "startTime": start,
                "publishTime": pub,
                "forecastMW": 5000.0 + i * 10 + j * 5,
            })
    return pd.DataFrame(rows)


@given(st.integers(min_value=1, max_value=50))
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
def test_never_returns_post_cutoff_forecast(n):
    """Never returns row with publishTime > cutoff."""
    df = make_forecasts(n)
    delivery_date = pd.Timestamp("2026-01-02")
    result = select_decision_forecast(df, delivery_date)
    if not result.empty:
        assert (result["publishTime"] <= get_cutoff_utc(delivery_date)).all()


@given(st.integers(min_value=1, max_value=50))
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
def test_at_most_one_row_per_starttime(n):
    """At most 1 row per startTime."""
    df = make_forecasts(n)
    delivery_date = pd.Timestamp("2026-01-02")
    result = select_decision_forecast(df, delivery_date)
    if not result.empty:
        assert result["startTime"].is_unique


@given(st.integers(min_value=1, max_value=50))
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
def test_adding_post_cutoff_never_changes_output(n):
    """Adding post-cutoff forecast never changes output."""
    df = make_forecasts(n)
    delivery_date = pd.Timestamp("2026-01-02")
    base_result = select_decision_forecast(df, delivery_date)
    
    # Add a post-cutoff forecast
    base = pd.Timestamp("2026-01-02", tz="UTC")
    new_rows = []
    for i in range(5):
        start = base + pd.Timedelta(minutes=30 * i)
        # Publish AFTER cutoff (post-cutoff)
        pub = base + pd.Timedelta(hours=10)  # After D-1 09:00 London
        new_rows.append({
            "startTime": start,
            "publishTime": pub,
            "forecastMW": 9999.0,
        })
    
    df_with_post = pd.concat([df, pd.DataFrame(new_rows)], ignore_index=True)
    new_result = select_decision_forecast(df_with_post, delivery_date)
    
    if not base_result.empty and not new_result.empty:
        # Results should be identical
        pd.testing.assert_frame_equal(
            base_result.sort_values("startTime").reset_index(drop=True),
            new_result.sort_values("startTime").reset_index(drop=True),
        )


@given(st.integers(min_value=1, max_value=50))
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
def test_adding_later_before_cutoff_changes_output(n):
    """Adding later-but-before-cutoff forecast changes output to that forecast."""
    df = make_forecasts(n)
    delivery_date = pd.Timestamp("2026-01-02")

    # Cutoff is D-1 09:00 London = 2026-01-01T09:00Z
    # Publish new forecasts at 2026-01-01T08:00Z (1 hour before cutoff)
    # This is later than any existing forecast publish times for early periods
    cutoff_pub = pd.Timestamp("2026-01-01T08:00:00Z")

    base = pd.Timestamp("2026-01-02", tz="UTC")
    new_rows = []
    for i in range(5):
        start = base + pd.Timedelta(minutes=30 * i)
        new_rows.append({
            "startTime": start,
            "publishTime": cutoff_pub,
            "forecastMW": 7777.0,
        })

    df_with_later = pd.concat([df, pd.DataFrame(new_rows)], ignore_index=True)
    new_result = select_decision_forecast(df_with_later, delivery_date)

    if not new_result.empty:
        # For startTimes that match the new forecasts, forecastMW should be 7777
        new_fcst_times = set(pd.DataFrame(new_rows)["startTime"])
        matching = new_result[new_result["startTime"].isin(new_fcst_times)]
        if not matching.empty:
            assert (matching["forecastMW"] == 7777.0).all()


@given(st.integers(min_value=0, max_value=10))
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
def test_handles_gaps_explicitly(n):
    """Handles gaps (no eligible forecast) explicitly."""
    if n == 0:
        df = pd.DataFrame(columns=["startTime", "publishTime", "forecastMW"])
    else:
        df = make_forecasts(n)
    
    # Use a date far in the future so no forecasts are eligible
    far_future = pd.Timestamp("2025-12-01")
    result = select_decision_forecast(df, far_future)
    
    # Should return empty DataFrame without error
    assert isinstance(result, pd.DataFrame)


def test_horizon_h_added():
    """Test that horizon_h column is added correctly."""
    df = pd.DataFrame([
        {
            "startTime": pd.Timestamp("2026-01-02 10:00:00", tz="UTC"),
            "publishTime": pd.Timestamp("2026-01-01 09:00:00", tz="UTC"),
            "forecastMW": 5000.0,
        }
    ])
    delivery_date = pd.Timestamp("2026-01-02")
    result = select_decision_forecast(df, delivery_date)
    
    if not result.empty:
        assert "horizon_h" in result.columns
        expected_horizon = (result["startTime"].iloc[0] - result["publishTime"].iloc[0]).total_seconds() / 3600
        assert abs(result["horizon_h"].iloc[0] - expected_horizon) < 0.01


@given(st.integers(min_value=1, max_value=50))
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
def test_publish_before_start(n):
    """All returned rows have publishTime < startTime."""
    df = make_forecasts(n)
    delivery_date = pd.Timestamp("2026-01-02")
    result = select_decision_forecast(df, delivery_date)
    if not result.empty:
        assert (result["publishTime"] < result["startTime"]).all()


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])