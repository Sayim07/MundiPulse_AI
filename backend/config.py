"""
MandiPulse AI — Configuration
Loads environment variables from .env file.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API Keys
    GEMINI_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Agent config
    AGENT_TIMEOUT_SECONDS: int = 60
    CACHE_TTL_HOURS: int = 24

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"


settings = Settings()
