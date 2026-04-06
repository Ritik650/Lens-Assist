from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    anthropic_api_key: str = ""
    secret_key: str = "dev-secret-key-change-in-production"
    database_url: str = "sqlite:///./lensassist.db"
    access_token_expire_minutes: int = 10080  # 7 days
    algorithm: str = "HS256"
    app_name: str = "LensAssist"
    debug: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
