import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./grind.db")
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://localhost:4173"
        ).split(",")
        if origin.strip()
    ]

    @property
    def allow_all_origins(self) -> bool:
        # A bare "*" means "any origin". The CORS spec forbids combining a
        # wildcard with credentials, so main.py turns credentials off then.
        return "*" in self.cors_origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
