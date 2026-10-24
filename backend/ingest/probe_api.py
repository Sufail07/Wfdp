#!/usr/bin/env python3
"""
Elexon API Probe Script - Simplified with shorter timeout
"""

import os
import json
import httpx
from datetime import datetime

API_BASE = "https://api.bmreports.com/BMRS"
API_KEY = os.getenv("ELEXON_API_KEY", "demo")

def probe_endpoint(endpoint: str, params: dict) -> dict:
    """Probe an API endpoint and return response info."""
    url = f"{API_BASE}/{endpoint}"
    params["APIKey"] = API_KEY
    params["ServiceType"] = "json"
    
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(url, params=params)
            print(f"\n{'='*60}")
            print(f"URL: {resp.url}")
            print(f"Status: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                print(f"Response type: {type(data)}")
                if isinstance(data, dict):
                    print(f"Keys: {list(data.keys())}")
                    if "data" in data and isinstance(data["data"], list):
                        print(f"Records: {len(data['data'])}")
                        if data["data"]:
                            print(f"Sample keys: {list(data['data'][0].keys())}")
                            print(f"Sample: {json.dumps(data['data'][0], indent=2, default=str)[:500]}")
                elif isinstance(data, list):
                    print(f"Records: {len(data)}")
                    if data:
                        print(f"Sample keys: {list(data[0].keys())}")
                        print(f"Sample: {json.dumps(data[0], indent=2, default=str)[:500]}")
                return data
            else:
                print(f"Error: {resp.text[:500]}")
                return {}
    except httpx.TimeoutException:
        print(f"TIMEOUT for {endpoint}")
        return {}
    except Exception as e:
        print(f"Exception: {type(e).__name__}: {e}")
        return {}

def main():
    print("="*60)
    print("ELEXON API PROBE")
    print("="*60)
    
    from_date = "2026-01-01"
    to_date = "2026-01-02"
    
    # FUELHH - B1620
    print("\n>>> B1620/v1 (FUELHH) <<<")
    probe_endpoint("B1620/v1", {"FromDate": from_date, "ToDate": to_date, "FuelType": "WIND"})
    
    # WINDFOR - B1830
    print("\n>>> B1830/v1 (WINDFOR) <<<")
    probe_endpoint("B1830/v1", {"FromDate": from_date, "ToDate": to_date})
    
    # B1840
    print("\n>>> B1840/v1 <<<")
    probe_endpoint("B1840/v1", {"FromDate": from_date, "ToDate": to_date})
    
    # B1610
    print("\n>>> B1610/v1 <<<")
    probe_endpoint("B1610/v1", {"FromDate": from_date, "ToDate": to_date})
    
    # Data Push
    print("\n>>> B1770/v1 (Data Push FUELHH) <<<")
    probe_endpoint("B1770/v1", {"FromDate": from_date, "ToDate": to_date})
    
    print("\n>>> B1780/v1 (Data Push WINDFOR) <<<")
    probe_endpoint("B1780/v1", {"FromDate": from_date, "ToDate": to_date})

if __name__ == "__main__":
    main()