from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Azure OpenAI – Chat / LLM
    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_API_VERSION: str = "2024-02-15-preview"
    AZURE_OPENAI_DEPLOYMENT_NAME: str

    # Azure OpenAI – Speech (STT / TTS)
    # These may live on a *different* Azure resource than the chat model,
    # so we support an independent endpoint, key, and API version.
    AZURE_OPENAI_SPEECH_API_KEY: str = ""       # falls back to AZURE_OPENAI_API_KEY
    AZURE_OPENAI_SPEECH_ENDPOINT: str = ""      # falls back to AZURE_OPENAI_ENDPOINT
    AZURE_OPENAI_SPEECH_API_VERSION: str = "2025-03-01-preview"
    AZURE_OPENAI_STT_DEPLOYMENT_NAME: str = "gpt-4o-transcribe"
    AZURE_OPENAI_TTS_DEPLOYMENT_NAME: str = "gpt-4o-mini-tts"

    # NewsAPI.org (Translation Practice – news fetching)
    # Free tier: 100 req/day.  Leave blank to use built-in fallback articles.
    # Get a key at https://newsapi.org/register
    NEWS_API_KEY: str = ""

    # Azure OpenAI – Embeddings (RAG pipeline)
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME: str = "text-embedding-3-small"

    # Database – set to Supabase PostgreSQL URI in production
    # e.g. postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
    DATABASE_URL: str = "sqlite:///./english_tutor.db"

    # ChromaDB – local persistent storage path
    CHROMA_DB_PATH: str = "./data/chroma_db"

    @property
    def speech_api_key(self) -> str:
        return self.AZURE_OPENAI_SPEECH_API_KEY or self.AZURE_OPENAI_API_KEY

    @property
    def speech_endpoint(self) -> str:
        return self.AZURE_OPENAI_SPEECH_ENDPOINT or self.AZURE_OPENAI_ENDPOINT

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()
