from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.deps import get_current_user
from app.auth.supabase import get_supabase

router = APIRouter(prefix="/api/credits", tags=["credits"])


async def grant_credits(user_id: str, amount: int, reason: str):
    supabase = get_supabase()
    supabase.rpc("add_credits", {
        "p_user_id": user_id,
        "p_amount": amount,
        "p_reason": reason,
    }).execute()


class CreditBalance(BaseModel):
    credits: int


@router.get("/balance")
async def get_balance(current_user: str = Depends(get_current_user)) -> CreditBalance:
    supabase = get_supabase()
    result = supabase.table("profiles").select("credits").eq("id", current_user).single().execute()
    return CreditBalance(credits=result.data.get("credits", 0))
