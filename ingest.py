#!/usr/bin/env python3
"""
Data Ingestion Script for Wind Forecast Decision Portal

Ingests real data from the Elexon Insights API (https://data.elexon.co.uk/bmrs/api/v1).
No API key required.

The ingestion fetches:
- FUELHH: half-hourly wind generation actuals
- WINDFOR: wind generation forecasts with multiple vintages

Run: python ingest.py --from 2026-12-30 --to 2026-02-01
"""

import sys
from datetime import date, datetime
from pathlib import Path

import pandas as pd

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from backend.ingest.insights import ElexonInsightsClient
from backend.ingest.snapshot import write_snapshot
from backend.ingest.validate import (
    validate_fuelhh,
    validate_windfor,
    validate_publish_before_start,
    validate_30min_grid,
)


def parse_date(date_str: str) -> date:
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Ingest real Elexon Insights data for the Wind Forecast Decision Portal"
    )
    parser.add_argument(
        "--from", dest="from_date", required=True,
        help="Start date (YYYY-MM-DD) - for WINDFOR forecasts",
    )
    parser.add_argument(
        "--to", dest="to_date", required=True,
        help="End date (YYYY-MM-DD) - for FUELHH actuals",
    )
    parser.add_argument(
        "--snapshot-path",
        type=Path,
        default=Path(__file__).parent / "backend" / "data" / "snapshot",
        help="Path to snapshot directory",
    )
    args = parser.parse_args()

    from_d = parse_date(args.from_date)
    to_d = parse_date(args.to_date)

    if from_d > to_d:
        parser.error("--from must be before --to")

    print("=" * 70)
    print("WIND FORECAST DATA INGESTION - ELEXON INSIGHTS API")
    print("=" * 70)
    print(f"API Base: https://data.elexon.co.uk/bmrs/api/v1")
    print(f"WINDFOR forecasts: {from_d} to {to_d}")
    print(f"FUELHH actuals: {from_d} to {to_d}")
    print()

    # Fetch data
    print("Fetching from Elexon Insights API...")
    print("-" * 70)

    with ElexonInsightsClient() as client:
        fuelhh_raw = client.fetch_fuelhh(from_d, to_d)
        windfor_raw = client.fetch_windfor(from_d, to_d)

    if not fuelhh_raw:
        raise SystemExit("ERROR: No FUELHH data fetched from Elexon Insights API")
    if not windfor_raw:
        raise SystemExit("ERROR: No WINDFOR data fetched from Elexon Insights API")

    print(f"  Fetched {len(fuelhh_raw)} FUELHH records")
    print(f"  Fetched {len(windfor_raw)} WINDFOR records")
    print()

    # Convert to DataFrames
    fuelhh_df = pd.DataFrame(fuelhh_raw)
    windfor_df = pd.DataFrame(windfor_raw)

    # Map Elexon API field names to internal schema names
    fuelhh_df = fuelhh_df.rename(columns={"generation": "generationMW"})
    windfor_df = windfor_df.rename(columns={"generation": "forecastMW"})

    # Drop metadata columns not in schema
    fuelhh_df = fuelhh_df[["settlementDate", "settlementPeriod", "fuelType", "generationMW"]]
    windfor_df = windfor_df[["startTime", "publishTime", "forecastMW"]]

# Parse dates - Elexon API returns UTC timestamps
    # Keep settlementDate as UTC midnight for consistency with domain logic
    fuelhh_df["settlementDate"] = pd.to_datetime(
        fuelhh_df["settlementDate"]
    ).dt.tz_localize("UTC")
    windfor_df["startTime"] = pd.to_datetime(windfor_df["startTime"], utc=True)
    windfor_df["publishTime"] = pd.to_datetime(windfor_df["publishTime"], utc=True)

    # Validate
    print("Validating...")
    print("-" * 70)

    fuelhh_df = validate_fuelhh(fuelhh_df)
    print(f"  FUELHH validation passed ({len(fuelhh_df)} rows)")

    windfor_df = validate_windfor(windfor_df)
    windfor_df = validate_publish_before_start(windfor_df)
    windfor_df = validate_30min_grid(windfor_df, "startTime")
    print(f"  WINDFOR validation passed ({len(windfor_df)} rows)")
    print()

    # Write snapshot
    print("Writing snapshot...")
    print("-" * 70)

    args.snapshot_path.mkdir(parents=True, exist_ok=True)

    dataset_version = f"elexon-insights-{from_d.isoformat()}-to-{to_d.isoformat()}"
    manifest = write_snapshot(
        fuelhh_df, windfor_df, args.snapshot_path,
        data_source="elexon_insights",
        dataset_version=dataset_version,
    )

    print(f"  Snapshot written to: {args.snapshot_path}")
    print(f"  Manifest: {manifest}")
    print()

    print("=" * 70)
    print("INGESTION COMPLETE")
    print("=" * 70)
    print(f"Data source: Elexon Insights API (real data)")
    print(f"FUELHH rows: {len(fuelhh_df)}")
    print(f"WINDFOR rows: {len(windfor_df)}")


if __name__ == "__main__":
    main()