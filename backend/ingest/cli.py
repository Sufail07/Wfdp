"""CLI entrypoint for data ingestion."""

import typer
from datetime import date, datetime
from pathlib import Path
import pandas as pd
import logging

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
    """Fetch, validate, and snapshot data for date range."""
    from_d = parse_date(from_date)
    to_d = parse_date(to_date)

    if from_d > to_d:
        raise typer.BadParameter("--from must be before --to")

    logger.info(f"Refreshing data from {from_d} to {to_d}")

    # Fetch data
    with ElexonClient(api_key=api_key) as client:
        logger.info("Fetching FUELHH...")
        fuelhh_raw = client.fetch_fuelhh(from_d, to_d)
        logger.info(f"Fetched {len(fuelhh_raw)} FUELHH records")

        logger.info("Fetching WINDFOR...")
        windfor_raw = client.fetch_windfor(from_d, to_d)
        logger.info(f"Fetched {len(windfor_raw)} WINDFOR records")

    # Convert to DataFrames
    fuelhh_df = pd.DataFrame(fuelhh_raw)
    windfor_df = pd.DataFrame(windfor_raw)

    if fuelhh_df.empty:
        raise typer.Exit("No FUELHH data fetched")
    if windfor_df.empty:
        raise typer.Exit("No WINDFOR data fetched")

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


if __name__ == "__main__":
    app()