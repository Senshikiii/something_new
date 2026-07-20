from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.credits.router import grant_credits

router = APIRouter(prefix="/api/paywall", tags=["paywall"])


class CouponRedeem(BaseModel):
    user_id: str
    code: str


@router.post("/redeem-coupon")
async def redeem_coupon(body: CouponRedeem):
    if body.code.strip().upper() != settings.coupon_code:
        raise HTTPException(status_code=400, detail="Invalid coupon code")
    await grant_credits(body.user_id, settings.credit_grant_amount, "coupon")
    return {"credits": settings.credit_grant_amount, "reason": "coupon"}
