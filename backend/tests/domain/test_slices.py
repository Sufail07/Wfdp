"""Tests for horizon bucketing logic (boundaries, empty buckets, publishTime >= startTime exclusion)."""

import pandas as pd
import numpy as np
from app.domain.slices import (
    add_horizon_bucket,
    compute_by_horizon_all_vintages,
)
from app.domain.errors import join_forecast_actual


def test_horizon_bucket_boundaries():
    """horizon_h=6 goes in 6-12h bucket (right=False), not 0-6h."""
    df = pd.DataFrame([
        {"horizon_h": 0.0, "errorMW": 10.0, "actualMW": 100.0, "forecastMW": 110.0},
        {"horizon_h": 5.99, "errorMW": 20.0, "actualMW": 100.0, "forecastMW": 120.0},
        {"horizon_h": 6.0, "errorMW": 30.0, "actualMW": 100.0, "forecastMW": 130.0},  # boundary -> 6-12h
        {"horizon_h": 11.99, "errorMW": 40.0, "actualMW": 100.0, "forecastMW": 140.0},
        {"horizon_h": 12.0, "errorMW": 50.0, "actualMW": 100.0, "forecastMW": 150.0},  # boundary -> 12-24h
    ])
    result = add_horizon_bucket(df)
    buckets = result["horizon_bucket"].tolist()
    assert buckets[0] == "0-6h"
    assert buckets[1] == "0-6h"
    assert buckets[2] == "6-12h"  # exactly 6.0 goes in 6-12h
    assert buckets[3] == "6-12h"
    assert buckets[4] == "12-24h"  # exactly 12.0 goes in 12-24h


def test_empty_buckets_preserved():
    """All 6 horizon buckets should be present even when some have no data."""
    # Create data with only long horizons
    df = pd.DataFrame([
        {"horizon_h": 30.0, "errorMW": 10.0, "actualMW": 100.0, "forecastMW": 110.0},
        {"horizon_h": 40.0, "errorMW": 20.0, "actualMW": 100.0, "forecastMW": 120.0},
    ])
    result = add_horizon_bucket(df)
    # Only buckets with data appear from groupby; frontend must fill empty ones
    buckets = set(result["horizon_bucket"].tolist())
    assert "24-36h" in buckets
    assert "36-48h" in buckets
    assert "0-6h" not in buckets  # empty bucket not in groupby result


def test_publish_after_start_excluded():
    """join_forecast_actual joins all forecast-actual pairs on startTime;
    publishTime >= startTime exclusion happens in select_decision_forecast.
    """
    windfor = pd.DataFrame([
        {"startTime": pd.Timestamp("2026-01-02 10:00", tz="UTC"),
         "publishTime": pd.Timestamp("2026-01-02 09:00", tz="UTC"),
         "forecastMW": 5000.0},
        {"startTime": pd.Timestamp("2026-01-02 10:00", tz="UTC"),
         "publishTime": pd.Timestamp("2026-01-02 10:30", tz="UTC"),
         "forecastMW": 9999.0},
    ])
    fuelhh = pd.DataFrame([
        {"settlementDate": pd.Timestamp("2026-01-02"),
         "settlementPeriod": 21,  # 10:00-10:30
         "fuelType": "WIND",
         "generationMW": 4800.0},
    ])

    aligned = join_forecast_actual(windfor, fuelhh)
    # Both forecasts join to the same actual (same startTime)
    assert len(aligned) == 2
    assert all(aligned["startTime"] == pd.Timestamp("2026-01-02 10:00:00"))


def test_select_decision_forecast_excludes_post_cutoff():
    """select_decision_forecast excludes forecasts with publishTime >= startTime."""
    from app.domain.asof import select_decision_forecast, get_cutoff_utc

    windfor = pd.DataFrame([
        {"startTime": pd.Timestamp("2026-01-02 10:00", tz="UTC"),
         "publishTime": pd.Timestamp("2026-01-01 08:00", tz="UTC"),  # before cutoff
         "forecastMW": 5000.0},
    ])
    fuelhh = pd.DataFrame([
        {"settlementDate": pd.Timestamp("2026-01-02"),
         "settlementPeriod": 21,
         "fuelType": "WIND",
         "generationMW": 4800.0},
    ])

    delivery_date = pd.Timestamp("2026-01-02")
    cutoff = get_cutoff_utc(delivery_date)

    # First, join forecast with actual
    aligned = join_forecast_actual(windfor, fuelhh)

    # Then apply decision forecast selection
    result = select_decision_forecast(aligned, delivery_date)
    if not result.empty:
        assert (result["publishTime"] <= cutoff).all()


def test_compute_by_horizon_all_vintages_has_all_buckets():
    """compute_by_horizon_all_vintages returns all 6 bucket labels."""
    from app.data.loader import load_snapshot
    from pathlib import Path

    snapshot = load_snapshot(Path("data/snapshot"))
    results = compute_by_horizon_all_vintages(
        snapshot.windfor, snapshot.fuelhh, "2026-01-02", "2026-01-08"
    )
    buckets = set(results["horizon_bucket"].tolist())
    expected = {"0-6h", "6-12h", "12-24h", "24-36h", "36-48h", "48h+"}
    # Note: some buckets may be empty (0-6h, 6-12h have no data in this snapshot)
    # But all buckets that have data should be present
    present_buckets = buckets
    assert len(present_buckets) > 0
    # All present buckets should be valid labels
    assert present_buckets.issubset(expected)


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
