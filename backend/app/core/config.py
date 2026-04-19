from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://taal_user:taal_secret@postgres:5432/taal_db"
    DATABASE_SYNC_URL: str = "postgresql://taal_user:taal_secret@postgres:5432/taal_db"
    REDIS_URL: str = "redis://:taal_redis_secret@redis:6379/0"

    SECRET_KEY: str = "dev-secret"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"
    LOG_LEVEL: str = "info"


settings = Settings()
