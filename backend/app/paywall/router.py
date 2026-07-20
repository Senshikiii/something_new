from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.deps import get_current_user
from app.auth.supabase import get_supabase
from app.config import settings
from app.credits.router import grant_credits

router = APIRouter(prefix="/api/paywall", tags=["paywall"])


class CouponRedeem(BaseModel):
    code: str


@router.post("/redeem-coupon")
async def redeem_coupon(
    body: CouponRedeem,
    current_user: str = Depends(get_current_user),
):
    if body.code.strip().upper() != settings.coupon_code:
        raise HTTPException(status_code=400, detail="Invalid coupon code")

    supabase = get_supabase()
    existing = (
        supabase.table("credits_transactions")
        .select("id")
        .eq("user_id", current_user)
        .eq("reason", "coupon")
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="Coupon already redeemed")

    await grant_credits(current_user, settings.credit_grant_amount, "coupon")
    return {"credits": settings.credit_grant_amount, "reason": "coupon"}
