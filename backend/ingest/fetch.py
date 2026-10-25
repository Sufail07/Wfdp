"""Fetch data from Elexon API with retries and pagination.

This module uses the old BMRS API (api.bmreports.com).
For real data ingestion, consider migrating to the Elexon Insights API.
"""

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from datetime import date, timedelta
from typing import Any
import pandas as pd
import logging

logger = logging.getLogger(__name__)

# Legacy API configuration - this is the old BMRS API
# The Elexon Insights API (data.elexon.co.uk) has superseded this API
API_BASE = "https://api.bmreports.com/BMRS"
API_KEY = "demo"  # In production, use environment variable


class ElexonClient:
    """Client for fetching data from the old BMRS API.
    
    This class uses the legacy BMRS API which has been superseded by the
    Elexon Insights API. For real data ingestion, migrate to the new API.
    """
    
    def __init__(self, api_key: str = API_KEY, timeout: float = 30.0):
        self.api_key = api_key
        self.timeout = timeout
        self.client = httpx.Client(timeout=timeout)
        
    def _log_unavailable(self, endpoint: str):
        """Log that an API endpoint is unavailable."""
        logger.warning(
            f"BMRS API endpoint {endpoint} may not be available. "
            f"The Elexon Insights API (data.elexon.co.uk) has superseded this API. "
            f"For real data ingestion, migrate to the new API."
        )
    
    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError)),
        reraise=True,
    )
    def _get(self, endpoint: str, params: dict[str, Any]) -> dict[str, Any]:
        """Make a request to the API."""
        url = f"{API_BASE}/{endpoint}"
        params["APIKey"] = self.api_key
        params["ServiceType"] = "json"
        
        logger.debug(f"Requesting {endpoint} with params: {params}")
        
        resp = self.client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()

    def fetch_fuelhh(self, from_date: date, to_date: date, fuel_type: str = "WIND") -> list[dict[str, Any]]:
        """Fetch FUELHH data for date range, chunked by day.
        
        This uses the legacy B1620 endpoint for FUELHH data.
        """
        logger.info(f"Fetching FUELHH from {from_date} to {to_date} via B1620/v1")
        
        all_data = []
        current = from_date
        while current <= to_date:
            next_day = min(current + timedelta(days=1), to_date)
            logger.debug(f"Fetching FUELHH for {current} to {next_day}")
            
            try:
                data = self._get("B1620/v1", {
                    "FromDate": current.isoformat(),
                    "ToDate": next_day.isoformat(),
                    "FuelType": fuel_type,
                })
                
                if data.get("data"):
                    all_data.extend(data["data"])
                    logger.debug(f"  Fetched {len(data['data'])} records")
                else:
                    logger.warning(f"No data returned for FUELHH {current} to {next_day}")
                    
            except Exception as e:
                logger.error(f"Failed to fetch FUELHH for {current} to {next_day}: {e}")
                raise
                
            current = next_day + timedelta(days=1)
            
        logger.info(f"Total FUELHH records: {len(all_data)}")
        return all_data

    def fetch_windfor(self, from_date: date, to_date: date) -> list[dict[str, Any]]:
        """Fetch WINDFOR data for date range, chunked by day.
        
        This uses the legacy B1830 endpoint for WINDFOR data.
        """
        logger.info(f"Fetching WINDFOR from {from_date} to {to_date} via B1830/v1")
        
        all_data = []
        current = from_date
        while current <= to_date:
            next_day = min(current + timedelta(days=1), to_date)
            logger.debug(f"Fetching WINDFOR for {current} to {next_day}")
            
            try:
                data = self._get("B1830/v1", {
                    "FromDate": current.isoformat(),
                    "ToDate": next_day.isoformat(),
                })
                
                if data.get("data"):
                    all_data.extend(data["data"])
                    logger.debug(f"  Fetched {len(data['data'])} records")
                else:
                    logger.warning(f"No data returned for WINDFOR {current} to {next_day}")
                    
            except Exception as e:
                logger.error(f"Failed to fetch WINDFOR for {current} to {next_day}: {e}")
                raise
                
            current = next_day + timedelta(days=1)
            
        logger.info(f"Total WINDFOR records: {len(all_data)}")
        return all_data

    def close(self):
        """Close the HTTP client."""
        self.client.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, *args):
        """Context manager exit."""
        self.close()