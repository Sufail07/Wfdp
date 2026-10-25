#!/usr/bin/env python3
"""
Wind Forecast Decision Portal - Ingestion Status

This script shows the current status of the ingestion system
and provides guidance for users.
"""

import json
import sys
from pathlib import Path

def check_ingestion_status():
    """Check the current ingestion status."""
    print("=" * 70)
    print("WIND FORECAST DECISION PORTAL - INGESTION STATUS")
    print("=" * 70)
    print()
    
    # Check if ingestion script exists
    ingest_script = Path(__file__).parent / "ingest.py"
    if not ingest_script.exists():
        print("❌ Ingestion script not found")
        return False
    
    print("✅ Ingestion script available:", ingest_script)
    
    # Check snapshot directory
    snapshot_dir = Path(__file__).parent / "backend" / "data" / "snapshot"
    if not snapshot_dir.exists():
        print("⚠️  Snapshot directory not found - will be created on first run")
    else:
        # Check manifest.json
        manifest_path = snapshot_dir / "manifest.json"
        if manifest_path.exists():
            with open(manifest_path, "r") as f:
                manifest = json.load(f)
            
            print(f"✅ Snapshot exists: {snapshot_dir}")
            print(f"   - Snapshot ID: {manifest.get('fetch_time', 'unknown')}")
            print(f"   - Dataset version: {manifest.get('dataset_version', 'unknown')}")
            print(f"   - Data source: {manifest.get('data_source', 'unknown')}")
            print(f"   - Ingested at: {manifest.get('ingested_at', 'unknown')}")
            print(f"   - FUELHH records: {manifest.get('row_counts', {}).get('fuelhh', 0)}")
            print(f"   - WINDFOR records: {manifest.get('row_counts', {}).get('windfor', 0)}")
        else:
            print("⚠️  Snapshot exists but manifest.json not found")
    
    # Check data source
    print()
    print("INGESTION SYSTEM STATUS:")
    print("-" * 70)
    
    # Check if old BMRS API client exists
    old_client_path = Path(__file__).parent / "backend" / "ingest" / "fetch.py"
    if old_client_path.exists():
        print("✅ Legacy BMRS API client available (deprecated)")
        print("   Uses: api.bmreports.com/BMRS")
        print("   Endpoints: B1620/v1 (FUELHH), B1830/v1 (WINDFOR)")
    else:
        print("❌ Legacy BMRS API client not found")
    
    # Check synthetic data generator
    synth_generator_path = Path(__file__).parent / "backend" / "ingest" / "generate_mock.py"
    if synth_generator_path.exists():
        print("✅ Synthetic data generator available (fallback)")
    else:
        print("❌ Synthetic data generator not found")
    
    # Check CLI
    cli_path = Path(__file__).parent / "backend" / "ingest" / "cli.py"
    if cli_path.exists():
        print("✅ Tyer CLI available for ingestion")
        print("   Commands: refresh, validate, status")
    else:
        print("❌ Tyer CLI not found")
    
    print()
    print("DATA STATUS:")
    print("-" * 70)
    
    # Read manifest to check data source
    if manifest_path.exists():
        with open(manifest_path, "r") as f:
            manifest = json.load(f)
        
        data_source = manifest.get("data_source", "synthetic")
        if data_source == "synthetic":
            print("⚠️  CURRENT DATA: Synthetic mock data")
            print("   - Used for demonstration and testing")
            print("   - Real Elexon API data not available")
            print("   - Clear disclaimers throughout the application")
            print()
            print("   To use real data:")
            print("   1. Obtain Elexon API credentials")
            print("   2. Set ELEXON_API_KEY environment variable")
            print("   3. Run ingestion script with real API")
        elif data_source == "elexon_api":
            print("✅ CURRENT DATA: Real Elexon API data")
            print("   - Live data from Elexon APIs")
            print("   - All calculations based on real forecasts")
        else:
            print(f"❓ UNKNOWN DATA SOURCE: {data_source}")
    else:
        print("❓ Data source unknown - manifest.json not found")
    
    print()
    print("QUICK ACTIONS:")
    print("-" * 70)
    
    print("1. Run ingestion (will use synthetic data as fallback):")
    print("   python ingest.py")
    print()
    
    print("2. Use CLI for more control:")
    print("   python -m backend.ingest.cli status")
    print("   python -m backend.ingest.cli refresh --from 2026-12-30 --to 2026-12-31")
    print()
    
    print("3. Check documentation:")
    print("   cat INGESTION.md")
    print()
    
    print("INGESTION SYSTEM CAPABILITIES:")
    print("-" * 70)
    print("✅ Attempts real API calls first")
    print("✅ Falls back to synthetic data if real API fails")
    print("✅ Updates manifest with data source information")
    print("✅ Validates data quality")
    print("✅ Writes snapshot with checksum verification")
    print()
    
    print("LIMITATIONS:")
    print("-" * 70)
    print("⚠️  Uses deprecated BMRS API (api.bmreports.com)")
    print("⚠️  Real Elexon Insights API endpoints undocumented")
    print("⚠️  0% test coverage (to be added)")
    print()
    
    print("FUTURE PLANS:")
    print("-" * 70)
    print("🔄 Document Elexon Insights API (data.elexon.co.uk)")
    print("🔄 Add tests for ingestion system")
    print("🔄 Migrate to real Elexon API when available")
    print("🔄 Add monitoring and health checks")
    
    return True

if __name__ == "__main__":
    try:
        success = check_ingestion_status()
        if not success:
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error checking ingestion status: {e}")
        sys.exit(1)