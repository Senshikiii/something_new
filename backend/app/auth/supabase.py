from supabase import create_client, Client

from app.config import settings


def get_supabase() -> Client:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise RuntimeError("Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.")
    return create_client(settings.supabase_url, settings.supabase_anon_key)
