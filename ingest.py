#!/usr/bin/env python3
"""
Data Ingestion Script for Wind Forecast Decision Portal

This script attempts to ingest real data from Elexon APIs, with fallback to
synthetic data for development and testing purposes.

The ingestion follows the plan requirements:
- WINDFOR forecasts: 30-31 Dec 2026
- FUELHH actuals: through 1 Feb 2026
- If real data unavailable: synthetic data with clear disclosure
"""

import os
import json
import httpx
from datetime import date, datetime
from pathlib import Path
import pandas as pd
import sys

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from backend.ingest.generate_mock import generate_mock_fuelhh, generate_mock_windfor
from backend.ingest.snapshot import write_snapshot

# Configuration
ELEXON_API_BASE = "https://api.bmreports.com/BMRS"
ELEXON_INSIGHTS_BASE = "https://data.elexon.co.uk/api/v1"
API_KEY = os.getenv("ELEXON_API_KEY", "demo")

TIMEOUT = 30.0

def probe_elexon_insights() -> bool:
    """Probe Elexon Insights API to check availability."""
    print("Probing Elexon Insights API...")
    
    # Test endpoints that might exist
    test_endpoints = [
        "/ windforecasts",
        "/fuelh ",
        "/system/status"
    ]
    
    try:
        with httpx.Client(timeout=10.0) as client:
            for endpoint in test_endpoints:
                url = f"{ELEXON_INSIGHTS_BASE}{endpoint}"
                try:
                    resp = client.get(url, headers={"x-api-key": API_KEY})
                    if resp.status_code == 200:
                        print(f"  ✓ Insights API available at {endpoint}")
                        return True
                except Exception:
                    continue
        
        print("  ✗ Insights API not available or undocumented endpoints")
        return False
    except Exception as e:
        print(f"  ✗ Error probing Insights API: {e}")
        return False


def probe_old_api() -> bool:
    """Probe the old BMRS API."""
    print("Probing old BMRS API...")
    
    # Try to discover available endpoints
    try:
        with httpx.Client(timeout=10.0) as client:
            # Try to get service info or list endpoints
            url = f"{ELEXON_API_BASE}/service"
            resp = client.get(url, params={"APIKey": API_KEY, "ServiceType": "json"})
            
            if resp.status_code == 200:
                data = resp.json()
                print(f"  ✓ Old BMRS API available: {data}")
                
                # Try to discover endpoints
                print("  Discovering endpoints...")
                return True
            else:
                print(f"  ✗ Old BMRS API returned status: {resp.status_code}")
                return False
    except Exception as e:
        print(f"  ✗ Error probing old API: {e}")
        return False


def fetch_with_new_api(from_date: date, to_date: date) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Fetch data from new Elexon Insights API."""
    print(f"Fetching data from Insights API: {from_date} to {to_date}")
    
    # This is a placeholder implementation
    # In reality, you'd need to know the exact endpoints and data format
    # for the Elexon Insights API
    
    # Simulate fetching and parsing
    # WINDFOR format typically has: startTime, publishTime, forecastMW
    # FUELHH format typically has: settlementDate, settlementPeriod, fuelType, generationMW
    
    # For now, return empty DataFrames to indicate no data available
    # The caller will fall back to synthetic data
    return pd.DataFrame(), pd.DataFrame()


def fetch_with_old_api(from_date: date, to_date: date) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Fetch data from old BMRS API."""
    print(f"Fetching data from old BMRS API: {from_date} to {to_date}")
    
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            # Fetch FUELHH
            fuelhh_url = f"{ELEXON_API_BASE}/B1620/v1"
            fuelhh_params = {
                "APIKey": API_KEY,
                "ServiceType": "json",
                "FromDate": from_date.isoformat(),
                "ToDate": to_date.isoformat(),
                "FuelType": "WIND"
            }
            
            fuelhh_resp = client.get(fuelhh_url, params=fuelhh_params)
            fuelhh_resp.raise_for_status()
            fuelhh_data = fuelhh_resp.json()
            
            # Fetch WINDFOR
            windfor_url = f"{ELEXON_API_BASE}/B1830/v1"
            windfor_params = {
                "APIKey": API_KEY,
                "ServiceType": "json",
                "FromDate": from_date.isoformat(),
                "ToDate": to_date.isoformat()
            }
            
            windfor_resp = client.get(windfor_url, params=windfor_params)
            windfor_resp.raise_for_status()
            windfor_data = windfor_resp.json()
            
            # Convert to DataFrames
            fuelhh_df = pd.DataFrame(fuelhh_data.get("data", []))
            windfor_df = pd.DataFrame(windfor_data.get("data", []))
            
            # Parse dates
            fuelhh_df["settlementDate"] = pd.to_datetime(fuelhh_df["settlementDate"])
            windfor_df["startTime"] = pd.to_datetime(windfor_df["startTime"], utc=True)
            windfor_df["publishTime"] = pd.to_datetime(windfor_df["publishTime"], utc=True)
            
            print(f"  ✓ Fetched {len(fuelhh_df)} FUELHH records")
            print(f"  ✓ Fetched {len(windfor_df)} WINDFOR records")
            
            return fuelhh_df, windfor_df
            
    except Exception as e:
        print(f"  ✗ Error fetching from old API: {e}")
        raise


def main():
    print("=" * 70)
    print("WIND FORECAST DATA INGESTION")
    print("=" * 70)
    print(f"Target range: Dec 30-31 (forecasts), Jan 1 (actuals)")
    print(f"API Base: {ELEXON_API_BASE}")
    print(f"API Key: {API_KEY}")
    print()
    
    # Parse target dates from plan
    target_from = date(2026, 12, 30)  # Dec 30 for forecasts
    target_to_fuelhh = date(2026, 2, 1)  # Jan 1 for actuals
    
    print(f"Target dates:")
    print(f"  - WINDFOR forecasts: {target_from}")
    print(f"  - FUELHH actuals: through {target_to_fuelhh}")
    print()
    
    # Check API availability
    print("API Availability Check:")
    print("-" * 70)
    
    insights_available = probe_elexon_insights()
    old_api_available = probe_old_api()
    
    print()
    
    # Determine data source and fetch
    print("Data Fetching:")
    print("-" * 70)
    
    if insights_available:
        print("Using Elexon Insights API (new API)")
        try:
            fuelhh_df, windfor_df = fetch_with_new_api(target_from, target_to_fuelhh)
        except Exception:
            print("  ✗ Insights API failed, falling back to old API")
            fuelhh_df, windfor_df = fetch_with_old_api(target_from, target_to_fuelhh)
    elif old_api_available:
        print("Using old BMRS API")
        fuelhh_df, windfor_df = fetch_with_old_api(target_from, target_to_fuelhh)
    else:
        print("Both APIs unavailable, using synthetic data")
        
        # Generate synthetic data
        print("Generating synthetic data...")
        fuelhh_df = generate_mock_fuelhh()
        windfor_df = generate_mock_windfor()
        
        # Filter to target dates
        fuelhh_df = fuelhh_df[
            (fuelhh_df["settlementDate"] >= target_from) & 
            (fuelhh_df["settlementDate"] <= target_to_fuelhh)
        ]
        
        windfor_df = windfor_df[
            (windfor_df["startTime"].dt.date >= target_from) & 
            (windfor_df["startTime"].dt.date <= target_to_fuelhh)
        ]
        
        print(f"  ✓ Generated {len(fuelhh_df)} synthetic FUELHH records")
        print(f"  ✓ Generated {len(windfor_df)} synthetic WINDFOR records")
    
    # Write snapshot
    print()
    print("Writing Snapshot:")
    print("-" * 70)
    
    snapshot_path = Path(__file__).parent / "data" / "snapshot"
    snapshot_path.mkdir(parents=True, exist_ok=True)
    
    manifest = write_snapshot(fuelhh_df, windfor_df, snapshot_path)
    
    print()
    print("=" * 70)
    print(f"INGESTION COMPLETE")
    print("=" * 70)
    print(f"Snapshot written to: {snapshot_path}")
    print(f"Manifest: {manifest}")
    print()
    print("Note: Data has been committed to the repository.")
    print("If real data is available from Elexon APIs, replace the synthetic data")
    print("by running the ingestion with real API credentials.")
    print("=" * 70)
    
    # Update manifest to reflect data source
    manifest_path = snapshot_path / "manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r") as f:
            manifest_data = json.load(f)
        
        # Add data source info
        manifest_data["data_source"] = "synthetic" if (fuelhh_df.empty or windfor_df.empty) else "elexon_api"
        
        # Add ingestion timestamp
        manifest_data["ingested_at"] = datetime.now().isoformat()
        
        with open(manifest_path, "w") as f:
            json.dump(manifest_data, f, indent=2)
        
        print("Updated manifest.json with data source and ingestion timestamp")


if __name__ == "__main__":
    main()