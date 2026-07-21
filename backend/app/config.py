from pydantic_settings import BaseSettings

MODEL_PRICING: dict[str, dict[str, float]] = {
    "gpt-4o": {"input": 2.50, "output": 10.00, "cache": 1.25},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60, "cache": 0.075},
    "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00, "cache": 0.30},
    "claude-3-haiku-20240307": {"input": 0.25, "output": 1.25, "cache": 0.03},
    "gemini-2.5-flash-preview-05-20": {"input": 0.15, "output": 0.60, "cache": 0.0375},
    "gemini-2.5-pro-preview-06-05": {"input": 1.25, "output": 10.00, "cache": 0.3125},
    "llama-3.3-70b-versatile": {"input": 0.59, "output": 0.79, "cache": 0.0},
    "moonshot-v1-auto": {"input": 0.70, "output": 2.80, "cache": 0.0},
}


def get_model_pricing(model: str) -> dict[str, float] | None:
    if model in MODEL_PRICING:
        return MODEL_PRICING[model]
    for key in MODEL_PRICING:
        if key in model or model in key:
            return MODEL_PRICING[key]
    return None


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    cors_origins: str = "http://localhost:3000"
    coupon_code: str = "SID_DRDROID"
    credit_grant_amount: int = 5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
