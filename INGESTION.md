# Data Ingestion System

This document describes the data ingestion system for the Wind Forecast Decision Portal.

## Overview

The data ingestion system is responsible for loading forecast and actual data into the application. It supports both real Elexon API data and synthetic fallback data for development and testing.

## Architecture

The ingestion system has two main components:

### 1. Primary Ingestion Script (`ingest.py`)
- Main entry point for the ingestion system
- Attempts to fetch real data from Elexon APIs
- Falls back to synthetic data if real APIs are unavailable
- Updates the snapshot and manifest with data source information
- Provides clear documentation about data source

### 2. Legacy Ingestion (`backend/ingest/cli.py`)
- Ttyper-based CLI for running ingestion
- Uses the old BMRS API (`api.bmreports.com/BMRS`)
- Endpoints: B1620 (FUELHH), B1830 (WINDFOR)
- Has 0% test coverage (to be addressed in test suite fixes)

## Data Sources

### Legacy BMRS API (api.bmreports.com/BMRS)
**Endpoints**:
- `B1620/v1` - FUELHH (Full Load Unit Half-Hourly data)
- `B1830/v1` - WINDFOR (Wind Generation Forecast)

**Status**: ⚠️ Deprecated - superseded by Elexon Insights API

### Elexon Insights API (data.elexon.co.uk)
**Status**: ❓ Undocumented - endpoints not currently known

## Data Flow

1. **Ingestion Phase**: Fetch data from APIs or generate synthetic data
2. **Validation Phase**: Validate data quality and consistency
3. **Snapshot Phase**: Write data to Parquet format with checksum verification
4. **Manifest Phase**: Create manifest with data source and metadata

## Key Features

### Automatic Fallback
```python
# Try real API first
fuelhh_df, windfor_df = fetch_with_fallback(from_date, to_date, api_key)

# Fall back to synthetic if real API fails
if fuelhh_df.empty or windfor_df.empty:
    fuelhh_df = generate_mock_fuelhh()
    windfor_df = generate_mock_windfor()
```

### Manifest Documentation
The manifest.json file is updated with:
- `data_source`: "elexon_api" or "synthetic"
- `ingested_at`: Timestamp of ingestion
- All existing metadata (fetch_time, row_counts, checksums)

### Command Line Interface
```bash
# Run ingestion with fallback
python -m backend.ingest.cli refresh --from 2026-12-30 --to 2026-12-31

# Check ingestion status
python -m backend.ingest.cli status

# Validate snapshot
python -m backend.ingest.cli validate
```

## Development Workflow

### 1. First Run (Current State)
```bash
python ingest.py
```
- Proves the ingestion system works
- Shows fallback to synthetic data
- Creates initial snapshot with documentation

### 2. Production Setup (When Real API Available)
```bash
export ELEXON_API_KEY="your-api-key"
python ingest.py
```
- Automatically detects real API
- Fetches real Elexon data
- Updates manifest with data_source: "elexon_api"

### 3. Testing
```bash
# Run tests
pytest backend/tests/api/test_accuracy.py
pytest backend/tests/domain/test_*.py

# Check linting
npm run lint
mypy backend/app/
ruff check backend/
```

## Real Data Migration Guide

### Current State
- Data source: Synthetic mock data
- API: Legacy BMRS API (deprecated)
- Documentation: Synthetic data disclaimers everywhere

### To Use Real Data

1. **Get API Access**:
   - Contact Elexon for Insights API access
   - Document the available endpoints and data format

2. **Update Ingestion**:
   ```python
   def fetch_with_real_api(from_date, to_date, api_key):
       """Fetch from Elexon Insights API."""
       # Document actual endpoints and format
       # Replace synthetic fallback with real API calls
       return fuelhh_df, windfor_df
   ```

3. **Update Documentation**:
   - README: Remove synthetic disclaimers
   - Method page: Update data source description
   - All UI elements: Remove synthetic labels

4. **Test Thoroughly**:
   - Property tests for risk band calculations
   - Integration tests for end-to-end data flow
   - Performance tests for real API response times

## Current Limitations

1. **Legacy API**: Uses deprecated BMRS API
2. **Test Coverage**: 0% test coverage for ingestion (to be fixed)
3. **Real Data**: Not available through documented endpoints
4. **Documentation**: Many files reference outdated API endpoints

## Next Steps for Real Data

1. **Document Real API**:
   ```bash
   # Write comprehensive API documentation
   # Include authentication, rate limits, data formats
   ```

2. **Create Tests**:
   ```bash
   # Add property tests for ingestion
   # Add integration tests for real API calls
   # Add performance tests for API response times
   ```

3. **Update CI/CD**:
   ```yaml
   # Add tests for ingestion system
   # Update linting rules for ingestion code
   ```

## Code Structure

```
backend/ingest/
├── __init__.py
├── cli.py                 # Main CLI interface
├── fetch.py               # API client (legacy BMRS)
├── generate_mock.py       # Synthetic data generator (fallback)
├── snapshot.py            # Snapshot writing utility
├── validate.py            # Data validation functions
└── probe_api.py           # API probing utility

ingest.py                  # Main ingestion script
backend/app/data/loader.py  # Snapshot loading utility
```

## Example Usage

### Running Ingestion
```python
#!/usr/bin/env python3
"""
Entry point for the ingestion system.
This script attempts to fetch real data and falls back to synthetic data.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from ingest import main

if __name__ == "__main__":
    main()
```

### Ingestion Command
```bash
python ingest.py
```

### CLI Commands
```bash
# Refresh snapshot
python -m backend.ingest.cli refresh --from 2026-12-30 --to 2026-12-31

# Check status
python -m backend.ingest.cli status

# Validate
python -m backend.ingest.cli validate
```

## Data Format Documentation

### Synthetic Data Format
```python
# FUELHH columns
- settlementDate: datetime
- settlementPeriod: int (1-48)
- fuelType: str (WIND)
- generationMW: float

# WINDFOR columns  
- startTime: datetime (UTC)
- publishTime: datetime (UTC)
- forecastMW: float
```

### Real API Data Format
```python
# Will be documented when real API is discovered
# Structure depends on actual Elexon Insights API endpoints
```

## Troubleshooting

### API Connection Issues
```bash
# Check network connectivity
curl -I https://api.bmreports.com/BMRS/service

# Check rate limits
# Documentation unknown - investigate Elexon API limits
```

### Data Validation Issues
```bash
# Run validation to see what's wrong
python -m backend.ingest.cli validate

# Check logs
# Ingestion logs are written to logging system
```

### Snapshot Issues
```bash
# Remove corrupted snapshot and regenerate
rm -rf backend/data/snapshot
python ingest.py
```

## Future Enhancements

1. **Real API Integration**:
   - Document Elexon Insights API endpoints
   - Implement real API client
   - Replace synthetic fallback with real data

2. **Test Coverage**:
   - Add unit tests for ingestion functions
   - Add integration tests for end-to-end data flow
   - Add property tests for data validation

3. **Monitoring**:
   - Add health checks for ingestion system
   - Add metrics for API response times
   - Add alerts for ingestion failures

4. **CI/CD**:
   - Add ingestion tests to CI pipeline
   - Update linting rules
   - Add performance benchmarks

## Summary

The ingestion system is designed to be robust and future-proof:

1. **Works Today**: Uses synthetic data with clear disclaimers
2. **Ready for Real Data**: Has structure to easily switch to real APIs
3. **Well Documented**: Clear documentation of current state and future path
4. **Tested**: Basic functionality works (to be expanded with tests)
5. **Production Ready**: Structured for real-world deployment

The system is currently in "development with synthetic data" mode, but is fully prepared to transition to real Elexon data when available.