from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    cors_origins: str = "http://localhost:3000"
    brave_api_key: str = ""
    coupon_code: str = "SID_DRDROID"
    credit_grant_amount: int = 5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
