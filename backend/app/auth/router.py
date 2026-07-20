from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth.supabase import get_supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])


class ExchangeCodeBody(BaseModel):
    code: str


class LogoutBody(BaseModel):
    access_token: str


class SessionResponse(BaseModel):
    access_token: str
    user_id: str
    email: str | None = None


@router.post("/session")
async def exchange_code(body: ExchangeCodeBody) -> SessionResponse:
    """Exchange an OAuth code for a session (PKCE flow)."""
    supabase = get_supabase()
    try:
        result = supabase.auth.exchange_code_for_session(auth_code=body.code)
        user = result.user
        return SessionResponse(
            access_token=result.session.access_token,
            user_id=user.id,
            email=user.email,
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(body: LogoutBody):
    supabase = get_supabase()
    supabase.auth.admin.sign_out(body.access_token)
    return {"ok": True}
