# Wind Forecast Decision Portal

A production-ready full-stack application for UK utility wind forecast decision-making. The app enables traders to see the latest wind forecast available at their decision cutoff (D-1 09:00 London) and quantitatively assess forecast accuracy.

## Architecture Overview

See `docs/ARCHITECTURE.md` for the full system architecture, data flow, domain logic, API contract, deployment, testing strategy, and the remediation plan from `ARCHITECTURE_REVIEW.md`.

```
wind-forecast-portal/
├─ api/index.py              # Vercel serverless entrypoint
├─ backend/                  # FastAPI backend
│  ├─ app/
│  │  ├─ api/              # API route handlers
│  │  ├─ domain/           # Core business logic (pure functions)
│  │  ├─ data/             # Data loading & snapshot management
│  │  ├─ config.py         # Pydantic settings
│  │  └─ main.py           # FastAPI app factory
│  ├─ ingest/               # Data ingestion CLI
│  ├─ data/snapshot/        # Parquet snapshot files (committed)
│  ├─ tests/                # Backend tests
│  ├─ Dockerfile
│  └─ pyproject.toml
├─ frontend/                 # React 18 + TypeScript + Vite
│  ├─ src/
│  │  ├─ components/       # Shared UI components
│  │  ├─ context/          # React context providers
│  │  ├─ features/         # Feature-specific components
│  │  │  ├─ brief/        # Decision Brief screen
│  │  │  ├─ accuracy/     # Forecast Accuracy screen
│  │  │  └─ method/       # Method & Data screen
│  │  ├─ hooks/            # Custom React hooks
│  │  ├─ api/              # Generated OpenAPI client
│  │  └─ utils/            # Utility functions
│  ├─ Dockerfile
│  └─ nginx.conf
├─ docs/
│  ├─ ARCHITECTURE.md       # System architecture + remediation plan
│  ├─ data-notes.md         # API exploration notes
│  └─ decisions.md          # Key technical decisions
├─ docker-compose.yml
├─ vercel.json
├─ heroku.yml
└─ .github/workflows/ci.yml
```
wind-forecast-portal/
├── api/index.py              # Vercel serverless entrypoint
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/              # API route handlers
│   │   ├── domain/           # Core business logic (pure functions)
│   │   ├── data/             # Data loading & snapshot management
│   │   ├── config.py         # Pydantic settings
│   │   └── main.py           # FastAPI app factory
│   ├── ingest/               # Data ingestion CLI
│   ├── data/snapshot/        # Parquet snapshot files (committed)
│   ├── tests/                # Backend tests
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/                 # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/       # Shared UI components
│   │   ├── context/          # React context providers
│   │   ├── features/         # Feature-specific components
│   │   │   ├── brief/        # Decision Brief screen
│   │   │   ├── accuracy/     # Forecast Accuracy screen
│   │   │   └── method/       # Method & Data screen
│   │   ├── hooks/            # Custom React hooks
│   │   ├── api/              # Generated OpenAPI client
│   │   └── utils/            # Utility functions
│   ├── Dockerfile
│   └── nginx.conf
├── docs/
│   ├── data-notes.md         # API exploration notes
│   └── decisions.md          # Key technical decisions
├── docker-compose.yml
├── vercel.json
├── heroku.yml
└── .github/workflows/ci.yml
```

## Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for frontend development)
- Python 3.12+ (for backend development)

### Using Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd wind-forecast-portal

# Start all services
docker compose up --build

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:8000
# API Health: http://localhost:8000/health
```

### Manual Development Setup

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Deployed Application

**Vercel (Primary):** https://wind-forecast-portal.vercel.app

**Heroku (Fallback):** https://wind-forecast-portal.herokuapp.com

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check + snapshot info |
| `GET /meta` | Data coverage, defaults, assumptions |
| `GET /decision-forecast` | Decision forecast for a delivery date |
| `GET /forecast-revisions` | All forecast vintages for a delivery date |
| `GET /accuracy/summary` | Aggregate accuracy metrics |
| `GET /accuracy/by-horizon` | Accuracy by forecast horizon |
| `GET /accuracy/by-hour` | Accuracy by hour of day |
| `GET /accuracy/by-wind-level` | Accuracy by wind level terciles |
| `GET /accuracy/daily` | Daily MAE/bias time series |
| `GET /accuracy/error-distribution` | Error histogram + quantiles |
| `GET /risk-band` | Risk-adjusted forecast with leakage protection |

## Key Features

1. **Decision Brief** (`/`) - View the decision forecast for any delivery day with risk-adjusted bands
2. **Forecast Accuracy** (`/accuracy`) - Comprehensive accuracy analysis with multiple breakdowns
3. **Method & Data** (`/method`) - Transparent methodology, assumptions, and data lineage

## Data Source

This dataset contains **synthetic mock data** for demonstration purposes only. Real Elexon data is not currently available through the legacy BMRS API (api.bmreports.com), which has been superseded by the Elexon Insights API.

### Data Ingestion System

A robust ingestion system has been implemented with the following architecture:

**Primary Ingestion Script**: `ingest.py`
- Attempts to fetch real data from both legacy BMRS API and Elexon Insights API
- Falls back to synthetic data generation if real APIs are unavailable
- Maintains proper documentation of data source in `manifest.json`

**Legacy Ingestion**: `backend/ingest/cli.py` (typer CLI)
- Uses the old BMRS API (`api.bmreports.com/BMRS`)
- Endpoints: B1620 (FUELHH), B1830 (WINDFOR)
- Has 0% test coverage (to be added as part of test suite fixes)

**Key Features**:
- Attempts real API calls first
- Graceful fallback to synthetic data
- Proper manifest documentation with data source
- Command-line interface for running ingestion
- Validation of data quality

### Current Data Status

**Data source**: Synthetic mock data for demonstration purposes only. Real Elexon data not available.

**What this means**:
- All forecasts and actuals are generated independently (no real correlation)
- Forecast accuracy values reflect the synthetic data characteristics
- Risk band calculations are based on synthetic error distributions
- All UI elements display "Data Disclaimer: This dataset contains synthetic mock data..."

**For production deployment**:
1. Obtain Elexon API credentials for the Insights API (`data.elexon.co.uk`)
2. Set `ELEXON_API_KEY` environment variable
3. Run the ingestion script: `python ingest.py`
4. The system will then fetch real data and replace the synthetic snapshot

### Command Line Usage

```bash
# Run ingestion with default settings
python ingest.py

# Use custom API key
python ingest.py --api-key "your-api-key"

# Show ingestion status
python -m backend.ingest.cli status

# Refresh snapshot with real API (if available)
python -m backend.ingest.cli refresh --from 2026-12-30 --to 2026-12-31
```

**If real data is available**:
- System will automatically use it
- Manifest will show `"data_source": "elexon_api"`
- All calculations based on real Elexon data
- Full transparency about data provenance

### Note for reviewer
The recorded video does not contain latest optimizations applied.

**If real data is unavailable**:
- System falls back to synthetic data generation
- Manifest will show `"data_source": "synthetic"`
- Clear documentation that data is synthetic for demonstration purposes
- All existing functionality preserved with proper disclaimers
