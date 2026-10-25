"""Snapshot writing and manifest generation."""

import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone
import pandas as pd
from typing import Any


def compute_checksum(filepath: Path) -> str:
    """Compute SHA256 checksum of a file."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def write_snapshot(
    fuelhh: pd.DataFrame,
    windfor: pd.DataFrame,
    snapshot_path: Path,
    data_source: str = "elexon_insights",
    dataset_version: str | None = None,
) -> dict[str, Any]:
    """Write Parquet files and generate manifest."""
    snapshot_path.mkdir(parents=True, exist_ok=True)

    fuelhh_path = snapshot_path / "fuelhh.parquet"
    windfor_path = snapshot_path / "windfor.parquet"
    manifest_path = snapshot_path / "manifest.json"

    # Write Parquet files
    fuelhh.to_parquet(fuelhh_path, index=False, compression="snappy")
    windfor.to_parquet(windfor_path, index=False, compression="snappy")

    # Generate manifest
    manifest = {
        "fetch_time": datetime.now(timezone.utc).isoformat(),
        "dataset_version": dataset_version,
        "data_source": data_source,
        "ingested_at": datetime.now(timezone.utc).isoformat(),
        "row_counts": {
            "fuelhh": len(fuelhh),
            "windfor": len(windfor),
        },
        "checksums": {
            "fuelhh": compute_checksum(fuelhh_path),
            "windfor": compute_checksum(windfor_path),
        },
        "date_ranges": {
            "fuelhh": {
                "min": fuelhh["settlementDate"].min().isoformat() if not fuelhh.empty else None,
                "max": fuelhh["settlementDate"].max().isoformat() if not fuelhh.empty else None,
            },
            "windfor": {
                "min": windfor["startTime"].min().isoformat() if not windfor.empty else None,
                "max": windfor["startTime"].max().isoformat() if not windfor.empty else None,
            },
        },
    }

    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    return manifest