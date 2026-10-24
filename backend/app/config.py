from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API Settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    # Timezone & Cutoff
    cutoff_hour: int = 9
    cutoff_minute: int = 0
    timezone: str = "Europe/London"

    # Snapshot Path
    snapshot_path: Path = Path(__file__).parent.parent / "data" / "snapshot"

    # Data Coverage (for validation)
    data_start_date: str = "2026-01-01"
    data_end_date: str = "2026-02-01"

    # Logging
    log_level: str = "INFO"


settings = Settings()