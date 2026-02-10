"""
Application configuration — loads all settings from environment variables.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (management-discussion-and-analysis/)
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)


class Settings:
    # MongoDB
    MONGO_DB_URL: str = os.getenv("MONGO_DB_URL", "")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "mda_service")
    MDA_COLLECTION: str = "mda_extractions"

    # Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Base data directory (relative to project root)
    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = PROJECT_ROOT / "data" / "md&a_extractor"

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    def validate(self) -> list[str]:
        """Return list of missing-config warnings (non-fatal)."""
        warnings: list[str] = []
        if not self.MONGO_DB_URL:
            warnings.append("MONGO_DB_URL is not set — MongoDB will not connect.")
        if not self.GEMINI_API_KEY:
            warnings.append(
                "GEMINI_API_KEY is not set — Gemini formatting will be skipped; "
                "rule-based fallback will be used."
            )
        return warnings


settings = Settings()
