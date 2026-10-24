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
  - `publishTime`: ISO8601 UTC timestamp (when forecast was published)
  - `forecastMW`: Float (MW)

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

## Assumptions (A1-A6 from Architecture Plan)

- **A1**: Decision cutoff is D-1 09:00 Europe/London (08:00 or 09:00 UTC depending on DST)
- **A2**: Delivery day D runs 00:00-23:30 London time (48 half-hour periods)
- **A3**: Only "metered wind" (FUELHH with fuelType=WIND) used as actuals
- **A4**: WINDFOR provides all forecast vintages; we select the latest published at or before cutoff
- **A5**: Forecasts with publishTime > startTime are invalid (future knowledge)
- **A6**: January 2026 data only (delivery dates 2026-01-02 to 2026-02-01)

## Sample Fixtures

See `backend/tests/fixtures/` for sample JSON payloads.

## Duplicate/Missing Behavior

- **FUELHH**: Should be complete for each day (48 periods). Missing periods = data gap.
- **WINDFOR**: Multiple rows per startTime (different publishTimes). Latest publishTime before cutoff = decision forecast.
- **Duplicates**: If duplicate (settlementDate, settlementPeriod, fuelType) in FUELHH, keep first. If duplicate (startTime, publishTime) in WINDFOR, keep first.