# Elexon API Data Notes

## API Endpoints

### FUELHH - Fuel Type Generation Half Hourly (B1620)
- **Endpoint**: `https://api.bmreports.com/BMRS/B1620/v1`
- **Parameters**:
  - `APIKey`: API key (required)
  - `ServiceType`: `json` (required)
  - `FromDate`: Start date in YYYY-MM-DD format
  - `ToDate`: End date in YYYY-MM-DD format
  - `FuelType`: Fuel type filter (e.g., "WIND", "CCGT", "NUCLEAR", etc.)
- **Response Format**:
  ```json
  {
    "data": [
      {
        "settlementDate": "2026-01-01",
        "settlementPeriod": 1,
        "fuelType": "WIND",
        "generationMW": 5432.10
      }
    ]
  }
  ```
- **Fields**:
  - `settlementDate`: Date string (YYYY-MM-DD)
  - `settlementPeriod`: Integer (1-48, each = 30 min)
  - `fuelType`: String
  - `generationMW`: Float (MW)

### WINDFOR - Wind Generation Forecast (B1830)
- **Endpoint**: `https://api.bmreports.com/BMRS/B1830/v1`
- **Parameters**:
  - `APIKey`: API key (required)
  - `ServiceType`: `json` (required)
  - `FromDate`: Start date in YYYY-MM-DD format
  - `ToDate`: End date in YYYY-MM-DD format
- **Response Format**:
  ```json
  {
    "data": [
      {
        "startTime": "2026-01-01T00:00:00Z",
        "publishTime": "2025-12-31T09:00:00Z",
        "forecastMW": 5432.10
      }
    ]
  }
  ```
- **Fields**:
  - `startTime`: ISO8601 UTC timestamp (forecast delivery period start)
  - `publishTime`: ISO8601 UTC timestamp (when forecast was created/published)
  - `forecastMW`: Float (MW)

## WP0 Probe Findings (Sprint 1)

### Availability / publication lag (Finding 1.2 🔴)
The Elexon/BMRS API exposes `publishTime` as when the forecast was *created*, not when it became *available to the trader*. There can be an ingestion lag between publication and availability on BMRS.

- **No availability timestamp field** exists in the API response.
- **Configurable `availability_lag_minutes`** added (default 0) to `backend/app/config.py` and `backend/app/domain/asof.py`. The cutoff is shifted earlier by this many minutes.
- **Assumption stated**: README, Method page, and video must disclose that `availability_lag_minutes=0` means we assume `publishTime` == availability time.

### Data volume (Finding 1.5 🔴)
- **FUELHH (WIND only)**: 31 days × 48 periods = 1,488 rows expected for January 2026
- **WINDFOR**: Multiple vintages per delivery period; actual count to be confirmed by ingestion
- **Snapshot Parquet size**: To be measured after first ingestion; if large, revisit DuckDB

### Elexon rate limits (Finding 2.4 🟠)
- Rate limits not yet confirmed from live API
- Ingestion is chunked by day with exponential backoff (tenacity retries)
- Ingestion is idempotent and resumable

### Data licence (Finding 4.7 🔴)
- Elexon/BMRS data is governed by BMRS licence terms
- **Must verify** redistribution terms before committing data to a public repo
- If restrictive: commit only ingestion tooling + small sample; add attribution/licence text to README and Method page

## Data Characteristics (Expected for January 2026)

### FUELHH (WIND only)
- **Frequency**: Half-hourly (48 periods per day)
- **Days in Jan 2026**: 31 days
- **Expected rows**: 31 * 48 = 1,488 rows
- **Unique key**: (settlementDate, settlementPeriod, fuelType)
- **Value range**: 0 - ~15,000 MW (UK wind capacity ~30GW, but metered wind is lower)

### WINDFOR
- **Frequency**: Multiple forecasts per delivery period (different publish times)
- **Forecast horizons**: Typically 0-48 hours ahead, published every few hours
- **Expected rows**: ~3,000-5,000 rows for January 2026
- **Unique key**: (startTime, publishTime)
- **Value range**: 0 - ~15,000 MW

## Assumptions (A1-A7 from Architecture Plan)

- **A1**: Decision cutoff is D-1 09:00 Europe/London (08:00 or 09:00 UTC depending on DST)
- **A2**: Delivery day D runs 00:00-23:30 London time (48 half-hour periods)
- **A3**: Only "metered wind" (FUELHH with fuelType=WIND) used as actuals
- **A4**: WINDFOR provides all forecast vintages; we select the latest published at or before cutoff
- **A5**: Forecasts with publishTime > startTime are invalid (future knowledge)
- **A6**: January 2026 data only (delivery dates 2026-01-02 to 2026-02-01)
- **A7**: `availability_lag_minutes` = 0 (publishTime assumed to equal availability time; configurable)

## Sample Fixtures

See `backend/tests/fixtures/` for sample JSON payloads.

## Duplicate/Missing Behavior

- **FUELHH**: Should be complete for each day (48 periods). Missing periods = data gap.
- **WINDFOR**: Multiple rows per startTime (different publishTimes). Latest publishTime before cutoff = decision forecast.
- **Duplicates**: If duplicate (settlementDate, settlementPeriod, fuelType) in FUELHH, keep first. If duplicate (startTime, publishTime) in WINDFOR, keep first.
