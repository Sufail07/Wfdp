from pathlib import Path
from typing import Any
import json
import pandas as pd
from pydantic import BaseModel


class Manifest(BaseModel):
    fetch_time: str
    row_counts: dict[str, int]
    checksums: dict[str, str]


class SnapshotData(BaseModel):
    fuelhh: pd.DataFrame
    windfor: pd.DataFrame
    manifest: Manifest

    class Config:
        arbitrary_types_allowed = True


def load_snapshot(snapshot_path: Path) -> SnapshotData:
    fuelhh_path = snapshot_path / "fuelhh.parquet"
    windfor_path = snapshot_path / "windfor.parquet"
    manifest_path = snapshot_path / "manifest.json"

    if not fuelhh_path.exists():
        raise FileNotFoundError(f"Snapshot not found: {fuelhh_path}")
    if not windfor_path.exists():
        raise FileNotFoundError(f"Snapshot not found: {windfor_path}")
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    fuelhh = pd.read_parquet(fuelhh_path)
    windfor = pd.read_parquet(windfor_path)

    with open(manifest_path) as f:
        manifest_data = json.load(f)
    manifest = Manifest(**manifest_data)

    return SnapshotData(fuelhh=fuelhh, windfor=windfor, manifest=manifest)