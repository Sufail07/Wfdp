import hashlib
import json
from pathlib import Path

import pandas as pd
from pydantic import BaseModel


class Manifest(BaseModel):
    fetch_time: str
    dataset_version: str | None = None
    row_counts: dict[str, int]
    checksums: dict[str, str]


class SnapshotData(BaseModel):
    fuelhh: pd.DataFrame
    windfor: pd.DataFrame
    manifest: Manifest

    class Config:
        arbitrary_types_allowed = True


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


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

    # Verify checksums on load; fail loudly on mismatch
    expected_fuelhh = manifest.checksums.get("fuelhh")
    expected_windfor = manifest.checksums.get("windfor")
    if expected_fuelhh:
        actual_fuelhh = _sha256_file(fuelhh_path)
        if actual_fuelhh != expected_fuelhh:
            raise ValueError(
                f"Checksum mismatch for fuelhh.parquet: "
                f"expected {expected_fuelhh}, got {actual_fuelhh}"
            )
    if expected_windfor:
        actual_windfor = _sha256_file(windfor_path)
        if actual_windfor != expected_windfor:
            raise ValueError(
                f"Checksum mismatch for windfor.parquet: "
                f"expected {expected_windfor}, got {actual_windfor}"
            )

    return SnapshotData(fuelhh=fuelhh, windfor=windfor, manifest=manifest)
