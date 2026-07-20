import stripe
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.credits.router import grant_credits

router = APIRouter(prefix="/api/paywall", tags=["stripe"])

stripe.api_key = settings.stripe_secret_key


class CheckoutSession(BaseModel):
    user_id: str


@router.post("/create-checkout")
async def create_checkout(body: CheckoutSession):
    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": "MicroManus Credits (5)"},
                    "unit_amount": 500,
                },
                "quantity": 1,
            }],
            metadata={"user_id": body.user_id},
            success_url="http://localhost:3000?checkout=success",
            cancel_url="http://localhost:3000?checkout=cancel",
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(payload: dict):
    session = payload.get("data", {}).get("object", {})
    if session.get("payment_status") == "paid":
        user_id = session.get("metadata", {}).get("user_id")
        if user_id:
            await grant_credits(user_id, settings.credit_grant_amount, "stripe")
            return {"ok": True}
    return {"ok": False}
