from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth.supabase import get_supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SessionResponse(BaseModel):
    access_token: str
    user_id: str
    email: str | None = None


@router.post("/session")
async def exchange_code(code: str) -> SessionResponse:
    """Exchange an OAuth code for a session (PKCE flow)."""
    supabase = get_supabase()
    try:
        result = supabase.auth.exchange_code_for_session(auth_code=code)
        user = result.user
        return SessionResponse(
            access_token=result.session.access_token,
            user_id=user.id,
            email=user.email,
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(access_token: str):
    supabase = get_supabase()
    supabase.auth.admin.sign_out(access_token)
    return {"ok": True}
