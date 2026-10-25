"""FastAPI app factory with security headers, structured logging, and lazy snapshot cache."""

import logging
import sys
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.data.loader import SnapshotData, load_snapshot
from app.repository.interface import PandasForecastRepository

# Module-level lazy cache (one per serverless instance)
_snapshot_data: SnapshotData | None = None
_repository: PandasForecastRepository | None = None


class StructuredLogFilter:
    """Adds request_id to every log record."""

    def filter(self, record):
        record.request_id = getattr(record, "request_id", "-")
        return True


class JsonFormatter(logging.Formatter):
    """Minimal JSON log formatter."""

    def format(self, record):
        import json as _json
        payload = {
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return _json.dumps(payload)


_handler = logging.StreamHandler(sys.stdout)
_handler.setFormatter(JsonFormatter())
_handler.addFilter(StructuredLogFilter())

logger = logging.getLogger("wind-forecast")
logger.handlers = [_handler]
logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
logger.propagate = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _snapshot_data, _repository
    _snapshot_data = load_snapshot(settings.snapshot_path)
    _repository = PandasForecastRepository(_snapshot_data.windfor, _snapshot_data.fuelhh)
    logger.info(
        "snapshot_loaded",
        extra={"request_id": "system"},
    )
    yield
    _snapshot_data = None
    _repository = None


def get_snapshot() -> SnapshotData:
    if _snapshot_data is None:
        raise RuntimeError("Snapshot not loaded")
    return _snapshot_data


def get_repository() -> PandasForecastRepository:
    if _repository is None:
        raise RuntimeError("Repository not initialized")
    return _repository


def create_app() -> FastAPI:
    app = FastAPI(
        title="Wind Forecast Decision Portal API",
        description="API for UK utility wind forecast decision-making",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS: restrict to configured origins (no wildcard in production)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["*"],
    )

    # Security headers + request ID + structured logging middleware
    @app.middleware("http")
    async def security_and_logging(request: Request, call_next):
        request_id = str(uuid.uuid4())
        # Bind request_id to log records for this request
        old_factory = logging.getLogRecordFactory()

        def record_factory(*args, **kwargs):
            record = old_factory(*args, **kwargs)
            record.request_id = request_id
            return record

        logging.setLogRecordFactory(record_factory)
        try:
            response = await call_next(request)
        finally:
            logging.setLogRecordFactory(old_factory)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Request-ID"] = request_id

        # Cache-Control + ETag keyed on snapshot ID for immutable snapshot data
        snapshot = get_snapshot()
        etag = f'"{snapshot.manifest.fetch_time}"'
        response.headers["ETag"] = etag
        response.headers["Cache-Control"] = "public, max-age=300, must-revalidate"

        return response

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.error("unhandled_error", extra={"request_id": "-"}, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    from app.api import accuracy, decision_forecast, forecast_revisions, meta, risk_band

    app.include_router(meta.router, prefix="/meta", tags=["meta"])
    app.include_router(decision_forecast.router, prefix="/decision-forecast", tags=["decision-forecast"])
    app.include_router(forecast_revisions.router, prefix="/forecast-revisions", tags=["forecast-revisions"])
    app.include_router(accuracy.router, prefix="/accuracy", tags=["accuracy"])
    app.include_router(risk_band.router, prefix="/risk-band", tags=["risk-band"])

    @app.get("/health")
    async def health():
        snapshot = get_snapshot()
        return {
            "status": "ok",
            "snapshot_id": snapshot.manifest.fetch_time,
        }

    return app


app = create_app()
