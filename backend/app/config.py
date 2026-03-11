"""Application configuration using pydantic-settings."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    app_name: str = "Know Your Coin History"
    debug: bool = False
    
    # Bitcoin Core RPC (Signet)
    bitcoin_rpc_host: str = "127.0.0.1"
    bitcoin_rpc_port: int = 38332
    bitcoin_rpc_user: str = "lightning"
    bitcoin_rpc_password: str = "lightning"
    
    # Graph settings
    max_traversal_depth: int = 10
    max_inputs_per_tx: int = 100
    
    # CORS (for frontend)
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    cors_origin_regex: str = r"https://.*\.vercel\.app"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
