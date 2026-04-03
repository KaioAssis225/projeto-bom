import json
from pathlib import Path
from functools import lru_cache
from typing import Any

from pydantic import computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BASE_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_PATH,
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    APP_NAME: str = "BOM Multilevel System"
    APP_VERSION: str = "0.1.0"
    APP_DESCRIPTION: str = "Sistema BOM multinível para explosão de estrutura, cálculo de custos e auditoria de preços."
    APP_ENV: str = "development"
    APP_TIMEZONE: str = "America/Sao_Paulo"
    DB_HOST: str = "db"
    DB_PORT: int = 5432
    DB_NAME: str = "bom_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    ALLOWED_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("ALLOWED_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_cors_origins(cls, value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]

        if isinstance(value, str):
            stripped_value = value.strip()
            if not stripped_value:
                return []

            if stripped_value.startswith("["):
                parsed_value = json.loads(stripped_value)
                if isinstance(parsed_value, list):
                    return [str(item).strip() for item in parsed_value if str(item).strip()]

            return [stripped_value]

        return []

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        return URL.create(
            drivername="postgresql+psycopg2",
            username=self.DB_USER,
            password=self.DB_PASSWORD,
            host=self.DB_HOST,
            port=self.DB_PORT,
            database=self.DB_NAME,
        ).render_as_string(hide_password=False)

    @computed_field
    @property
    def DOCS_ENABLED(self) -> bool:
        return self.APP_ENV != "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
