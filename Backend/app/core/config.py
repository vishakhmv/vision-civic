import os
from typing import List, Optional, Union
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Info & Network Binding
    PROJECT_NAME: str = "Vision Civic"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    HOST: str = ""
    PORT: int = 8000

    # MongoDB Database (strictly loaded from environment / .env)
    MONGODB_URI: str = ""
    MONGODB_URL: Optional[str] = None
    MONGODB_DATABASE: str = ""

    # JWT Authentication (strictly loaded from environment / .env)
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    COOKIE_NAME: str = "vision_civic_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Cloudinary Credentials (strictly loaded from environment / .env)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    CLOUD_NAME: Optional[str] = None
    CLOUD_API_KEY: Optional[str] = None
    CLOUD_API_SECRET: Optional[str] = None

    # Detector & Incident Thresholds
    WASTE_BIN_CONFIDENCE_THRESHOLD: float = 0.50
    FIRE_CONFIDENCE_THRESHOLD: float = 0.60
    SMOKE_CONFIDENCE_THRESHOLD: float = 0.55
    INCIDENT_COOLDOWN_SECONDS: int = 10
    PRE_EVENT_SECONDS: int = 5
    POST_EVENT_SECONDS: int = 5

    # Storage dirs for temp clips
    TEMP_DIR: str = "temp_media"

    # CORS Allowed Origins (strictly loaded from environment / .env)
    CORS_ORIGINS: Union[List[str], str] = Field(default_factory=list)

    @model_validator(mode="after")
    def resolve_aliases_and_urls(self):
        # Resolve dynamic HOST and PORT from environment (.env or cloud PaaS)
        env_host = os.environ.get("HOST")
        if env_host:
            self.HOST = env_host.strip()
        elif not self.HOST:
            self.HOST = "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"

        env_port = os.environ.get("PORT")
        if env_port:
            try:
                self.PORT = int(env_port)
            except ValueError:
                pass

        # Parse comma-separated CORS_ORIGINS from environment / .env
        if isinstance(self.CORS_ORIGINS, str):
            self.CORS_ORIGINS = [orig.strip() for orig in self.CORS_ORIGINS.split(",") if orig.strip()]

        # Resolve MongoDB URI
        if self.MONGODB_URL and not self.MONGODB_URI:
            self.MONGODB_URI = self.MONGODB_URL

        # If MongoDB URI contains a database name in the URI path (e.g. mongodb+srv://.../Vision_Civic)
        if self.MONGODB_URI and "/" in self.MONGODB_URI and not self.MONGODB_DATABASE:
            path_part = self.MONGODB_URI.split("/")[-1].split("?")[0]
            if path_part and not path_part.startswith("?"):
                self.MONGODB_DATABASE = path_part

        # Resolve Cloudinary credentials aliases
        if self.CLOUD_NAME and not self.CLOUDINARY_CLOUD_NAME:
            self.CLOUDINARY_CLOUD_NAME = self.CLOUD_NAME
        if self.CLOUD_API_KEY and not self.CLOUDINARY_API_KEY:
            self.CLOUDINARY_API_KEY = self.CLOUD_API_KEY
        if self.CLOUD_API_SECRET and not self.CLOUDINARY_API_SECRET:
            self.CLOUDINARY_API_SECRET = self.CLOUD_API_SECRET

        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()
