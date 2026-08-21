"""
MandiPulse AI — Configuration
Loads environment variables from .env file using Pydantic Settings v2.
"""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_ENV_PATH = os.path.join(_REPO_ROOT, ".env")


class Settings(BaseSettings):
    # API Keys
    GEMINI_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_API_KEY: str = ""
    TWILIO_API_SECRET: str = ""
    TWILIO_FROM_NUMBER: str = ""
    TWILIO_WHATSAPP_FROM: str = ""
    FAST2SMS_API_KEY: str = ""

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Agent config
    AGENT_TIMEOUT_SECONDS: int = 60
    CACHE_TTL_HOURS: int = 24

    model_config = SettingsConfigDict(
        env_file=(_ENV_PATH, ".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
