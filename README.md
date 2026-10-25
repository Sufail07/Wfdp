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

**Vercel (Primary):** https://frontend-nine-amber-86.vercel.app


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

This dataset contains **real data** from the Elexon Insights API (`https://data.elexon.co.uk/bmrs/api/v1`).

### Data Ingestion System

A robust ingestion system fetches real data from the Elexon Insights API:

**Primary Ingestion Script**: `ingest.py`
- Fetches real data from the Elexon Insights API (no API key required)
- FUELHH: half-hourly wind generation actuals via `GET /datasets/FUELHH`
- WINDFOR: wind generation forecasts via `GET /datasets/WINDFOR`
- Maintains proper documentation of data source in `manifest.json`

**CLI Ingestion**: `backend/ingest/cli.py` (typer CLI)
- Uses the Elexon Insights API (`data.elexon.co.uk/bmrs/api/v1`)
- Datasets: FUELHH (actuals), WINDFOR (forecasts)
- Has fallback to synthetic data for development only

**Key Features**:
- Real API data ingestion
- Proper manifest documentation with data source
- Command-line interface for running ingestion
- Validation of data quality

### Current Data Status

**Data source**: Real Elexon Insights API data

**What this means**:
- All forecasts and actuals are from the Elexon Insights API
- Forecast accuracy values reflect real data characteristics
- Risk band calculations are based on real error distributions

### Command Line Usage

```bash
# Run ingestion with real Elexon data
python ingest.py --from 2026-01-01 --to 2026-01-31

# Use the CLI
python -m backend.ingest.cli refresh --from 2026-01-01 --to 2026-01-31

# Check ingestion status
python -m backend.ingest.cli status
```

### Note for reviewer
The recorded video does not contain latest optimizations applied.
