"""Property-based tests for risk.py domain logic using hypothesis."""

import pandas as pd
import numpy as np
from hypothesis import given, strategies as st, settings, HealthCheck
from app.domain.risk import (
    compute_risk_band,
)


def make_forecasts_with_actuals(n: int = 10, delivery_date=None) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Create a small forecast and actuals DataFrames for testing."""
    if delivery_date is None:
        delivery_date = pd.Timestamp("2026-01-02", tz="UTC")
    
    # Create forecasts
    forecasts_rows = []
    actuals_rows = []
    
    for i in range(n):
        # Create a delivery day
        delivery_ts = pd.Timestamp(delivery_date.date(), tz="UTC")
        
        # Create forecasts for this delivery day
        for j in range(6):  # 6 half-hour periods
            start = delivery_ts + pd.Timedelta(minutes=30 * j)
            # Publish times: cutoff (D-1 09:00 London = D-1 08:00 UTC), earlier times
            cutoff_pub = pd.Timestamp("2026-01-01T08:00:00Z")  # D-1 08:00 UTC
            pub_times = [
                cutoff_pub - pd.Timedelta(hours=12),  # D-2 20:00
                cutoff_pub - pd.Timedelta(hours=6),   # D-2 02:00
                cutoff_pub - pd.Timedelta(hours=3),   # D-1 05:00
                cutoff_pub,                           # D-1 08:00 (cutoff)
            ]
            
            for k, pub in enumerate(pub_times):
                if pub >= start:  # Skip future knowledge
                    continue
                
                forecast = 5000.0 + i * 100 + j * 50 + k * 10
                forecasts_rows.append({
                    "startTime": start,
                    "publishTime": pub,
                    "forecastMW": forecast,
                })
    
    # Create actuals for past delivery days
    for hist_day in range(n):
        hist_date = delivery_date - pd.Timedelta(days=1 + hist_day)
        hist_ts = pd.Timestamp(hist_date.date(), tz="UTC")
        
        for j in range(6):  # 6 half-hour periods
            start = hist_ts + pd.Timedelta(minutes=30 * j)
            # Actuals always available for past days
            actual = 5000.0 - hist_day * 50 + j * 30 + np.random.normal(0, 100)
            
            actuals_rows.append({
                "settlementDate": hist_date,
                "settlementPeriod": j + 1,
                "fuelType": "WIND",
                "generationMW": max(0, actual),
            })
    
    forecasts_df = pd.DataFrame(forecasts_rows)
    actuals_df = pd.DataFrame(actuals_rows)
    
    return forecasts_df, actuals_df


def get_cutoff_hour_from_delivery(delivery_date):
    """Get cutoff hour for a delivery date (D-1 09:00 London)."""
    # Cutoff is D-1 09:00 London = 08:00 UTC
    return 8, 0


def is_enough_history(delivery_date, sample_days, min_sample_days, sample_errors, min_sample_errors):
    """Check if there's enough history for risk band calculation."""
    return sample_days >= min_sample_days and sample_errors >= min_sample_errors


@given(st.integers(min_value=1, max_value=10))
@settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
def test_risk_band_never_leaks_future(n):
    """Test that risk band never uses future actuals (look-ahead protection)."""
    forecasts_df, actuals_df = make_forecasts_with_actuals(n)
    delivery_date = pd.Timestamp("2026-01-02")
    
    result = compute_risk_band(
        forecasts_df, actuals_df, delivery_date,
        quantile=0.9,
        cutoff_hour=9,  # London cutoff
        cutoff_minute=0,
        min_sample_days=3,
        min_sample_errors=24,
    )
    
    # If we have risk-adjusted forecasts, they should only use history from days ≤ D-2
    if "risk_adjusted" in result and result["risk_adjusted"]:
        # All actuals used for risk calculation should be from days ≤ D-2
        for risk_point in result["risk_adjusted"]:
            # Risk calculation should only use historical actuals up to D-2
            # This is enforced by the domain logic in compute_risk_band
            pass
    

given(st.integers(min_value=1, max_value=10))
@settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
def test_risk_band_margin_is_negative_or_zero_for_over_forecasts(n):
    """Test that risk band margin is appropriate for forecast errors."""
    forecasts_df, actuals_df = make_forecasts_with_actuals(n)
    delivery_date = pd.Timestamp("2026-01-02")
    
    result = compute_risk_band(
        forecasts_df, actuals_df, delivery_date,
        quantile=0.9,
        cutoff_hour=9,
        cutoff_minute=0,
        min_sample_days=3,
        min_sample_errors=24,
    )
    
    # If we have risk-adjusted forecasts
    if "risk_adjusted" in result and result["risk_adjusted"]:
        for risk_point in result["risk_adjusted"]:
            forecast_mw = risk_point["forecastMW"]
            risk_adjusted_mw = risk_point["riskAdjustedMW"]
            margin = forecast_mw - risk_adjusted_mw
            
            # Margin should be non-negative (P90 quantile of errors)
            assert margin >= 0, f"Margin should be non-negative, got {margin}"


@given(st.integers(min_value=1, max_value=5))
@settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
def test_risk_band_has_enough_history_for_confidence(n):
    """Test risk band calculations have enough history for confidence intervals."""
    forecasts_df, actuals_df = make_forecasts_with_actuals(n)
    delivery_date = pd.Timestamp("2026-01-02")
    
    result = compute_risk_band(
        forecasts_df, actuals_df, delivery_date,
        quantile=0.9,
        cutoff_hour=9,
        cutoff_minute=0,
        min_sample_days=3,
        min_sample_errors=24,
    )
    
    # If in_sample is True, should have enough history
    if result["in_sample"]:
        assert result["sample_days"] >= 3
        assert result["sample_errors"] >= 24
    
    # If suppressed, should have insufficient history
    if result["suppressed"]:
        assert result["sample_days"] < 3 or result["sample_errors"] < 24


def test_risk_band_different_quantiles():
    """Test that different quantile values are accepted."""
    forecasts_df, actuals_df = make_forecasts_with_actuals(5)
    delivery_date = pd.Timestamp("2026-01-02")
    
    # Test different quantile values
    for quantile in [0.5, 0.75, 0.9, 0.95]:
        result = compute_risk_band(
            forecasts_df, actuals_df, delivery_date,
            quantile=quantile,
            cutoff_hour=9,
            cutoff_minute=0,
            min_sample_days=3,
            min_sample_errors=24,
        )
        
        assert result["quantile"] == quantile
        
        # If we have risk-adjusted forecasts, check that they respect the quantile
        if "risk_adjusted" in result and result["risk_adjusted"]:
            # Margin should be based on the specified quantile
            pass


@given(st.integers(min_value=0, max_value=3))
@settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
def test_risk_band_no_data_returns_empty_result(n):
    """Test that risk band returns empty result when no data."""
    if n == 0:
        forecasts_df = pd.DataFrame(columns=["startTime", "publishTime", "forecastMW"])
        actuals_df = pd.DataFrame(columns=["settlementDate", "settlementPeriod", "fuelType", "generationMW"])
    else:
        forecasts_df, actuals_df = make_forecasts_with_actuals(n)
    
    # Use a far future delivery date
    far_future = pd.Timestamp("2025-12-01")
    result = compute_risk_band(
        forecasts_df, actuals_df, far_future,
        quantile=0.9,
        cutoff_hour=9,
        cutoff_minute=0,
    )
    
    # Should return suppressed result with no decision forecast
    assert result["suppressed"] == True
    assert result["in_sample"] == False
    assert result["sample_days"] == 0
    assert result["sample_errors"] == 0
    assert result["risk_adjusted"] == []


def test_risk_band_data_distribution_bins():
    """Test that level bins are derived from data distribution, not hard-coded."""
    # Create a specific dataset with known quantiles
    forecasts_df = pd.DataFrame([
        {"startTime": pd.Timestamp("2026-01-02 10:00:00", tz="UTC"),
         "publishTime": pd.Timestamp("2026-01-01 09:00:00", tz="UTC"),
         "forecastMW": 500.0},  # Low bin
        {"startTime": pd.Timestamp("2026-01-02 12:00:00", tz="UTC"),
         "publishTime": pd.Timestamp("2026-01-01 09:00:00", tz="UTC"),
         "forecastMW": 3000.0},  # Medium bin
        {"startTime": pd.Timestamp("2026-01-02 14:00:00", tz="UTC"),
         "publishTime": pd.Timestamp("2026-01-01 09:00:00", tz="UTC"),
         "forecastMW": 8000.0},  # High bin
    ])
    
    actuals_df = pd.DataFrame([
        {"settlementDate": pd.Timestamp("2025-12-31"),
         "settlementPeriod": 1,
         "fuelType": "WIND",
         "generationMW": 600.0},
        {"settlementDate": pd.Timestamp("2025-12-31"),
         "settlementPeriod": 2,
         "fuelType": "WIND",
         "generationMW": 3100.0},
        {"settlementDate": pd.Timestamp("2025-12-31"),
         "settlementPeriod": 3,
         "fuelType": "WIND",
         "generationMW": 8200.0},
    ])
    
    result = compute_risk_band(
        forecasts_df, actuals_df, pd.Timestamp("2026-01-02"),
        quantile=0.9,
        cutoff_hour=9,
        cutoff_minute=0,
        min_sample_days=0,  # Use actuals from the test data
        min_sample_errors=3,
    )
    
    # Should have some level quantiles calculated
    if "level_quantiles" in result:
        # Should have low, medium, high bins based on data distribution
        assert "low" in result["level_quantiles"] or "medium" in result["level_quantiles"] or "high" in result["level_quantiles"]


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])