"""Fetch data from Elexon API with retries and pagination."""

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from datetime import date, timedelta
from typing import Any
import pandas as pd
import logging

logger = logging.getLogger(__name__)

API_BASE = "https://api.bmreports.com/BMRS"
API_KEY = "demo"  # In production, use environment variable


class ElexonClient:
    def __init__(self, api_key: str = API_KEY, timeout: float = 30.0):
        self.api_key = api_key
        self.timeout = timeout
        self.client = httpx.Client(timeout=timeout)

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError)),
        reraise=True,
    )
    def _get(self, endpoint: str, params: dict[str, Any]) -> dict[str, Any]:
        url = f"{API_BASE}/{endpoint}"
        params["APIKey"] = self.api_key
        params["ServiceType"] = "json"
        resp = self.client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()

    def fetch_fuelhh(self, from_date: date, to_date: date, fuel_type: str = "WIND") -> list[dict[str, Any]]:
        """Fetch FUELHH data for date range, chunked by day."""
        all_data = []
        current = from_date
        while current <= to_date:
            next_day = min(current + timedelta(days=1), to_date)
            logger.info(f"Fetching FUELHH for {current} to {next_day}")
            data = self._get("B1620/v1", {
                "FromDate": current.isoformat(),
                "ToDate": next_day.isoformat(),
                "FuelType": fuel_type,
            })
            if data.get("data"):
                all_data.extend(data["data"])
            current = next_day + timedelta(days=1)
        return all_data

    def fetch_windfor(self, from_date: date, to_date: date) -> list[dict[str, Any]]:
        """Fetch WINDFOR data for date range, chunked by day."""
        all_data = []
        current = from_date
        while current <= to_date:
            next_day = min(current + timedelta(days=1), to_date)
            logger.info(f"Fetching WINDFOR for {current} to {next_day}")
            data = self._get("B1830/v1", {
                "FromDate": current.isoformat(),
                "ToDate": next_day.isoformat(),
            })
            if data.get("data"):
                all_data.extend(data["data"])
            current = next_day + timedelta(days=1)
        return all_data

    def close(self):
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()