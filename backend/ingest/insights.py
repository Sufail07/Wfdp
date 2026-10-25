"""Elexon Insights API client for real data ingestion.

Uses the modern Elexon Insights API at https://data.elexon.co.uk/bmrs/api/v1.
No API key required. Uses non-stream dataset endpoints that support
date filtering via settlementDateFrom/To (FUELHH) and publishDateTimeFrom/To (WINDFOR).
"""

import logging
from datetime import date, datetime, timedelta
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = logging.getLogger(__name__)

API_BASE = "https://data.elexon.co.uk/bmrs/api/v1"


class ElexonInsightsClient:
    """Client for the Elexon Insights API."""

    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout
        self.client = httpx.Client(timeout=timeout)

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type(
            (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError)
        ),
        reraise=True,
    )
    def _get(self, endpoint: str, params: dict[str, Any]) -> dict[str, Any]:
        """Make a GET request to the Insights API."""
        url = f"{API_BASE}/{endpoint}"
        logger.debug(f"Requesting {endpoint} with params: {params}")

        resp = self.client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()

    def fetch_fuelhh(
        self, from_date: date, to_date: date, fuel_type: str = "WIND"
    ) -> list[dict[str, Any]]:
        """Fetch FUELHH actuals for a date range.

        Uses the non-stream endpoint with settlementDateFrom/To filters.
        Returns records with: dataset, publishTime, startTime, settlementDate,
        settlementPeriod, fuelType, generation.
        """
        logger.info(f"Fetching FUELHH from {from_date} to {to_date} via Insights API")

        all_data: list[dict[str, Any]] = []
        current = from_date
        while current <= to_date:
            next_day = min(current + timedelta(days=1), to_date)
            logger.debug(f"Fetching FUELHH for {current} to {next_day}")

            try:
                data = self._get("datasets/FUELHH", {
                    "format": "json",
                    "settlementDateFrom": current.isoformat(),
                    "settlementDateTo": next_day.isoformat(),
                    "fuelType": fuel_type,
                })

                records = data.get("data", [])
                all_data.extend(records)
                logger.debug(f"  Fetched {len(records)} records")
            except Exception as e:
                logger.error(
                    f"Failed to fetch FUELHH for {current} to {next_day}: {e}"
                )
                raise

            current = next_day + timedelta(days=1)

        logger.info(f"Total FUELHH records: {len(all_data)}")
        return all_data

    def fetch_windfor(
        self, from_date: date, to_date: date
    ) -> list[dict[str, Any]]:
        """Fetch WINDFOR forecasts for a date range.

        Uses the non-stream endpoint with publishDateTimeFrom/To filters
        to retrieve forecast vintages published within the window.
        Returns records with: dataset, publishTime, startTime, generation.
        """
        logger.info(f"Fetching WINDFOR from {from_date} to {to_date} via Insights API")

        all_data: list[dict[str, Any]] = []
        current = from_date
        while current <= to_date:
            # publishDateTimeTo is exclusive - use next day's start
            fetch_to = current + timedelta(days=1)
            logger.debug(f"Fetching WINDFOR publishDateTime {current} to {fetch_to}")

            try:
                data = self._get("datasets/WINDFOR", {
                    "format": "json",
                    "publishDateTimeFrom": datetime.combine(
                        current, datetime.min.time()
                    ).strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "publishDateTimeTo": datetime.combine(
                        fetch_to, datetime.min.time()
                    ).strftime("%Y-%m-%dT%H:%M:%SZ"),
                })

                records = data.get("data", [])
                all_data.extend(records)
                logger.debug(f"  Fetched {len(records)} records")
            except Exception as e:
                logger.error(
                    f"Failed to fetch WINDFOR for {current}: {e}"
                )
                raise

            current = fetch_to

        logger.info(f"Total WINDFOR records: {len(all_data)}")
        return all_data

    def close(self) -> None:
        """Close the HTTP client."""
        self.client.close()

    def __enter__(self) -> "ElexonInsightsClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
