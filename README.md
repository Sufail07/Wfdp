# Wind Forecast Decision Portal

A production-ready full-stack application for UK utility wind forecast decision-making. The app enables traders to see the latest wind forecast available at their decision cutoff (D-1 09:00 London) and quantitatively assess forecast accuracy.

## Architecture Overview

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

## Assumptions & Caveats

- **A1**: Decision cutoff is D-1 09:00 Europe/London
- **A2**: Delivery day D runs 00:00-23:30 London time (48 half-hour periods)
- **A3**: Only metered wind (FUELHH fuelType=WIND) used as actuals
- **A4**: WINDFOR provides all forecast vintages; latest published at/before cutoff is decision forecast
- **A5**: Forecasts with publishTime > startTime are invalid (future knowledge)
- **A6**: Data covers January 2026 only (delivery dates 2026-01-02 to 2026-02-01)

**Caveats:**
- Metered wind only (excludes embedded wind)
- Single month of data (January 2026)
- Cutoff time assumption may differ from actual trader workflows
- No database - uses Parquet snapshots loaded in memory

## AI Tools Disclosure

This project was developed with assistance from AI tools including:
- GitHub Copilot for code completion and scaffolding
- Kilo Code for architecture planning and implementation guidance
- General LLM assistance for boilerplate generation and documentation

All code was reviewed and validated by human developers.

## License

MIT License - see LICENSE file for details.