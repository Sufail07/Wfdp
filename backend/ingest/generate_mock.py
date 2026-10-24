"""Generate mock snapshot data for development/testing."""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from ingest.snapshot import write_snapshot


def generate_mock_fuelhh() -> pd.DataFrame:
    """Generate mock FUELHH data for January 2026."""
    np.random.seed(42)
    
    dates = pd.date_range("2026-01-01", "2026-01-31", freq="D")
    periods = range(1, 49)
    
    rows = []
    for d in dates:
        # Daily wind pattern - higher at night, lower during day
        base_wind = np.random.normal(6000, 1500)
        base_wind = max(500, min(base_wind, 14000))
        
        for p in periods:
            # Add half-hourly variation
            hour = (p - 1) * 0.5
            # Sinusoidal daily pattern
            daily_factor = 1 + 0.3 * np.sin(2 * np.pi * (hour - 6) / 24)
            # Random noise
            noise = np.random.normal(1, 0.1)
            
            mw = base_wind * daily_factor * noise
            mw = max(0, min(mw, 15000))
            
            rows.append({
                "settlementDate": d,
                "settlementPeriod": p,
                "fuelType": "WIND",
                "generationMW": round(mw, 2),
            })
    
    return pd.DataFrame(rows)


def generate_mock_windfor() -> pd.DataFrame:
    """Generate mock WINDFOR data for January 2026."""
    np.random.seed(43)
    
    # Delivery dates: 2026-01-02 to 2026-02-01 (D-1 09:00 cutoff)
    delivery_dates = pd.date_range("2026-01-02", "2026-02-01", freq="D", tz="UTC")
    periods = pd.timedelta_range("0H", "23H30min", freq="30min")
    
    rows = []
    for delivery_date in delivery_dates:
        # Cutoff is D-1 09:00 London = D-1 08:00 or 09:00 UTC
        cutoff = delivery_date - timedelta(days=1)
        cutoff = cutoff.replace(hour=9, minute=0, second=0, microsecond=0)  # 09:00 UTC
        
        # Generate forecasts at different publish times
        # Typical forecast publish times: 00:00, 06:00, 12:00, 18:00 UTC
        publish_times = [
            cutoff - timedelta(hours=33),  # D-2 00:00
            cutoff - timedelta(hours=27),  # D-2 06:00
            cutoff - timedelta(hours=21),  # D-2 12:00
            cutoff - timedelta(hours=15),  # D-2 18:00
            cutoff - timedelta(hours=9),   # D-1 00:00
            cutoff - timedelta(hours=3),   # D-1 06:00
            cutoff,                         # D-1 09:00 (cutoff)
        ]
        
        for period_start in periods:
            start_time = delivery_date + period_start
            
            # Base actual wind for this period (from fuelhh pattern)
            hour = period_start.total_seconds() / 3600
            daily_factor = 1 + 0.3 * np.sin(2 * np.pi * (hour - 6) / 24)
            base_actual = 6000 * daily_factor
            
            for i, pub_time in enumerate(publish_times):
                if pub_time >= start_time:
                    continue  # Skip future knowledge
                
                # Forecast accuracy improves as publish time approaches start time
                horizon_hours = (start_time - pub_time).total_seconds() / 3600
                # Error decreases with shorter horizon
                error_std = max(50, 500 * (horizon_hours / 48) ** 0.5)
                error = np.random.normal(0, error_std)
                
                forecast = base_actual + error
                forecast = max(0, min(forecast, 15000))
                
                rows.append({
                    "startTime": start_time,
                    "publishTime": pub_time,
                    "forecastMW": round(forecast, 2),
                })
    
    return pd.DataFrame(rows)


def main():
    print("Generating mock snapshot data for January 2026...")
    
    fuelhh = generate_mock_fuelhh()
    windfor = generate_mock_windfor()
    
    print(f"FUELHH rows: {len(fuelhh)}")
    print(f"WINDFOR rows: {len(windfor)}")
    
    snapshot_path = Path(__file__).parent.parent / "data" / "snapshot"
    manifest = write_snapshot(fuelhh, windfor, snapshot_path)
    
    print(f"Snapshot written to {snapshot_path}")
    print(f"Manifest: {manifest}")


if __name__ == "__main__":
    main()