from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.auth.supabase import get_supabase

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header",
        )
    supabase = get_supabase()
    try:
        user = supabase.auth.get_user(credentials.credentials)
        return user.user.id
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {e}",
        )
