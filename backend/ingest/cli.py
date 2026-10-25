"""CLI entrypoint for data ingestion."""

import typer
from datetime import date, datetime
from pathlib import Path
import pandas as pd
import logging
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from ingest.fetch import ElexonClient
from ingest.validate import (
    validate_fuelhh,
    validate_windfor,
    validate_no_future_publish,
    validate_publish_before_start,
    validate_30min_grid,
)
from ingest.snapshot import write_snapshot

app = typer.Typer(help="Wind Forecast Data Ingestion CLI")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def parse_date(date_str: str) -> date:
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def fetch_with_fallback(from_date: date, to_date: date, api_key: str = "demo") -> tuple[pd.DataFrame, pd.DataFrame]:
    """Fetch data with fallback from old API to synthetic if needed."""
    try:
        # Try old BMRS API first
        logger.info("Attempting to fetch from old BMRS API...")
        with ElexonClient(api_key=api_key) as client:
            fuelhh_raw = client.fetch_fuelhh(from_date, to_date)
            windfor_raw = client.fetch_windfor(from_date, to_date)
            
            if fuelhh_raw and windfor_raw:
                logger.info(f"Successfully fetched {len(fuelhh_raw)} FUELHH and {len(windfor_raw)} WINDFOR records")
                
                fuelhh_df = pd.DataFrame(fuelhh_raw)
                windfor_df = pd.DataFrame(windfor_raw)
                
                return fuelhh_df, windfor_df
                
    except Exception as e:
        logger.warning(f"Old BMRS API failed: {e}")
        logger.info("Falling back to synthetic data generation...")
    
    # Fallback to synthetic data
    logger.info("Using synthetic data as fallback")
    from ingest.generate_mock import generate_mock_fuelhh, generate_mock_windfor
    
    fuelhh_df = generate_mock_fuelhh()
    windfor_df = generate_mock_windfor()
    
    # Filter to target date range
    fuelhh_df = fuelhh_df[
        (fuelhh_df["settlementDate"] >= from_date) & 
        (fuelhh_df["settlementDate"] <= to_date)
    ]
    
    windfor_df = windfor_df[
        (windfor_df["startTime"].dt.date >= from_date) & 
        (windfor_df["startTime"].dt.date <= to_date)
    ]
    
    return fuelhh_df, windfor_df


@app.command()
def refresh(
    from_date: str = typer.Option(..., "--from", help="Start date (YYYY-MM-DD)"),
    to_date: str = typer.Option(..., "--to", help="End date (YYYY-MM-DD)"),
    snapshot_path: Path = typer.Option(
        Path(__file__).parent.parent / "data" / "snapshot",
        "--snapshot-path",
        help="Path to snapshot directory",
    ),
    api_key: str = typer.Option("demo", "--api-key", help="Elexon API key"),
):
    """Fetch, validate, and snapshot data for date range.

    This command attempts to fetch real data from Elexon APIs. If real data
    is unavailable, it falls back to synthetic data for development and testing.
    """
    from_d = parse_date(from_date)
    to_d = parse_date(to_date)

    if from_d > to_d:
        raise typer.BadParameter("--from must be before --to")

    logger.info(f"Refreshing data from {from_d} to {to_d}")

    # Fetch data with fallback
    fuelhh_df, windfor_df = fetch_with_fallback(from_d, to_d, api_key)

    if fuelhh_df.empty:
        raise typer.Exit("No FUELHH data fetched (even from synthetic fallback)")
    if windfor_df.empty:
        raise typer.Exit("No WINDFOR data fetched (even from synthetic fallback)")

    logger.info(f"Final data: {len(fuelhh_df)} FUELHH records, {len(windfor_df)} WINDFOR records")

    # Parse dates
    fuelhh_df["settlementDate"] = pd.to_datetime(fuelhh_df["settlementDate"])
    windfor_df["startTime"] = pd.to_datetime(windfor_df["startTime"], utc=True)
    windfor_df["publishTime"] = pd.to_datetime(windfor_df["publishTime"], utc=True)

    # Validate
    logger.info("Validating FUELHH...")
    fuelhh_df = validate_fuelhh(fuelhh_df)
    logger.info("FUELHH validation passed")

    logger.info("Validating WINDFOR...")
    windfor_df = validate_windfor(windfor_df)
    windfor_df = validate_publish_before_start(windfor_df)
    windfor_df = validate_30min_grid(windfor_df, "startTime")
    logger.info("WINDFOR validation passed")

    # Write snapshot
    logger.info("Writing snapshot...")
    manifest = write_snapshot(fuelhh_df, windfor_df, snapshot_path)
    logger.info(f"Snapshot written to {snapshot_path}")
    logger.info(f"Manifest: {manifest}")


@app.command()
def validate(
    snapshot_path: Path = typer.Option(
        Path(__file__).parent.parent / "data" / "snapshot",
        "--snapshot-path",
        help="Path to snapshot directory",
    ),
):
    """Validate existing snapshot."""
    from app.data.loader import load_snapshot

    logger.info(f"Loading snapshot from {snapshot_path}")
    snapshot = load_snapshot(snapshot_path)

    logger.info("Validating FUELHH...")
    from ingest.validate import validate_fuelhh as v_fuelhh, validate_30min_grid
    v_fuelhh(snapshot.fuelhh)
    validate_30min_grid(snapshot.fuelhh, "settlementDate")

    logger.info("Validating WINDFOR...")
    from ingest.validate import validate_windfor as v_windfor, validate_publish_before_start
    v_windfor(snapshot.windfor)
    validate_publish_before_start(snapshot.windfor)
    validate_30min_grid(snapshot.windfor, "startTime")

    logger.info("All validations passed!")


@app.command()
def status(
    snapshot_path: Path = typer.Option(
        Path(__file__).parent.parent / "data" / "snapshot",
        "--snapshot-path",
        help="Path to snapshot directory",
    ),
):
    """Check ingestion status and data source."""
    from app.data.loader import load_snapshot
    import json

    logger.info(f"Checking snapshot status from {snapshot_path}")
    
    try:
        snapshot = load_snapshot(snapshot_path)
        
        logger.info(f"Snapshot ID: {snapshot.manifest.fetch_time}")
        logger.info(f"Dataset version: {snapshot.manifest.dataset_version}")
        logger.info(f"FUELHH rows: {len(snapshot.fuelhh)}")
        logger.info(f"WINDFOR rows: {len(snapshot.windfor)}")
        
        # Check data source
        manifest_path = snapshot_path / "manifest.json"
        if manifest_path.exists():
            with open(manifest_path, "r") as f:
                manifest_data = json.load(f)
            
            data_source = manifest_data.get("data_source", "unknown")
            ingested_at = manifest_data.get("ingested_at", "unknown")
            
            logger.info(f"Data source: {data_source}")
            logger.info(f"Ingested at: {ingested_at}")
            
            if data_source == "synthetic":
                logger.warning("Using synthetic mock data - real Elexon data not available")
                logger.info("To use real data, set ELEXON_API_KEY environment variable")
            elif data_source == "elexon_api":
                logger.info("Using real Elexon API data")
                
    except Exception as e:
        logger.error(f"Error checking snapshot status: {e}")


if __name__ == "__main__":
    app()