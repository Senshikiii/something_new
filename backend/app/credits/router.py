from fastapi import APIRouter, Depends
from pydantic import BaseModel

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


@router.get("/balance/{user_id}")
async def get_balance(user_id: str) -> CreditBalance:
    supabase = get_supabase()
    result = supabase.table("profiles").select("credits").eq("id", user_id).single().execute()
    return CreditBalance(credits=result.data.get("credits", 0))
