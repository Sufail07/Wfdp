"""Property-based tests for cutoff date logic across all delivery dates."""

import pandas as pd
from hypothesis import given, strategies as st, settings as hyp_settings, HealthCheck
from app.domain.asof import get_cutoff_utc, utc_to_london
from app.config import settings as app_settings


@given(st.dates(
    min_value=pd.Timestamp("2026-01-02").date(),
    max_value=pd.Timestamp("2026-02-01").date(),
))
@hyp_settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
def test_cutoff_london_date_is_d_minus_1(delivery_date):
    """For every delivery date D, cutoff_utc's London-local date is D-1, never D."""
    delivery_ts = pd.Timestamp(delivery_date)
    cutoff_utc = get_cutoff_utc(delivery_ts)
    cutoff_london = utc_to_london(cutoff_utc)
    assert cutoff_london.date() == delivery_ts.date() - pd.Timedelta(days=1)
    assert cutoff_london.hour == app_settings.cutoff_hour
    assert cutoff_london.minute == app_settings.cutoff_minute


@given(st.dates(
    min_value=pd.Timestamp("2026-01-02").date(),
    max_value=pd.Timestamp("2026-02-01").date(),
))
@hyp_settings(max_examples=50, suppress_health_check=[HealthCheck.too_slow])
def test_no_forecast_publish_after_cutoff(delivery_date):
    """No returned forecast has publishTime greater than cutoff_utc."""
    from app.domain.asof import select_decision_forecast
    from app.data.loader import load_snapshot
    from pathlib import Path

    snapshot = load_snapshot(Path("data/snapshot"))
    result = select_decision_forecast(
        snapshot.windfor,
        delivery_ts := pd.Timestamp(delivery_date),
    )
    cutoff = get_cutoff_utc(delivery_ts)
    if not result.empty:
        assert (result["publishTime"] <= cutoff).all(), (
            f"Found publishTime after cutoff for {delivery_date}"
        )


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
