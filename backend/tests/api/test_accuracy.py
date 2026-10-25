"""API tests for accuracy endpoints."""

from fastapi.testclient import TestClient
from app.main import create_app
from app.data.loader import load_snapshot
from pathlib import Path
import app.main as main_module

app = create_app()
# Load snapshot into module-level cache so endpoints can access it
main_module._snapshot_data = load_snapshot(Path("data/snapshot"))

client = TestClient(app)


def test_decision_forecast_2026_01_02():
    """Response for 2026-01-02 has cutoff_utc of 2026-01-01T09:00:00Z, points in range."""
    resp = client.get("/api/decision-forecast?delivery_date=2026-01-02")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["delivery_date"] == "2026-01-02"
    assert data["cutoff_utc"] == "2026-01-01T09:00:00+00:00"
    assert data["total_points"] > 0
    for f in data["forecasts"]:
        assert 0 <= f["forecastMW"] <= 30000, f"forecastMW {f['forecastMW']} out of plausibility range"


def test_decision_forecast_out_of_range_returns_404():
    """Out-of-range delivery_date returns 404."""
    resp = client.get("/api/decision-forecast?delivery_date=2025-12-31")
    assert resp.status_code == 404, resp.text


def test_decision_forecast_malformed_date_returns_422():
    """Malformed dates return 422."""
    resp = client.get("/api/decision-forecast?delivery_date=not-a-date")
    assert resp.status_code == 422, resp.text


def test_accuracy_summary_returns_200():
    """Accuracy summary for valid range returns 200 with metrics."""
    resp = client.get("/api/accuracy/summary?from_date=2026-01-02&to_date=2026-01-08")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "metrics" in data
    metrics = data["metrics"]
    assert "bias" in metrics
    assert "mae" in metrics
    assert "rmse" in metrics
    assert "nmae" in metrics
    assert "n" in metrics
    assert "n_days" in metrics


def test_accuracy_by_horizon_returns_200():
    """Accuracy by horizon returns 200 with bucketed results."""
    resp = client.get("/api/accuracy/by-horizon?from_date=2026-01-02&to_date=2026-01-08")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "results" in data
    assert len(data["results"]) > 0
    for r in data["results"]:
        assert "horizon_bucket" in r
        assert "mae" in r
        assert "n" in r


def test_accuracy_out_of_range_returns_404():
    """Out-of-range dates return 404."""
    resp = client.get("/api/accuracy/summary?from_date=2025-12-01&to_date=2025-12-05")
    assert resp.status_code == 404, resp.text


def test_accuracy_malformed_date_returns_422():
    """Malformed dates return 422."""
    resp = client.get("/api/accuracy/summary?from_date=bad&to_date=also-bad")
    assert resp.status_code == 422, resp.text


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
