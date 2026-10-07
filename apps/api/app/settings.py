from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/land_intelligence"
    cors_origins: list[str] = ["http://localhost:5173"]
    government_api_base_url: str | None = None
    venture_service_base_url: str = "https://venture-flask-service.vercel.app"
    government_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
