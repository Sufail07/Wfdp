from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.data.loader import load_snapshot, SnapshotData


snapshot_data: SnapshotData | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global snapshot_data
    snapshot_data = load_snapshot(settings.snapshot_path)
    yield
    snapshot_data = None


def create_app() -> FastAPI:
    app = FastAPI(
        title="Wind Forecast Decision Portal API",
        description="API for UK utility wind forecast decision-making",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        return {
            "status": "ok",
            "snapshot_id": snapshot_data.manifest.fetch_time if snapshot_data else None,
        }

    from app.api import decision_forecast, accuracy, risk_band, meta, forecast_revisions

    app.include_router(meta.router, prefix="/meta", tags=["meta"])
    app.include_router(decision_forecast.router, prefix="/decision-forecast", tags=["decision-forecast"])
    app.include_router(forecast_revisions.router, prefix="/forecast-revisions", tags=["forecast-revisions"])
    app.include_router(accuracy.router, prefix="/accuracy", tags=["accuracy"])
    app.include_router(risk_band.router, prefix="/risk-band", tags=["risk-band"])

    return app


app = create_app()