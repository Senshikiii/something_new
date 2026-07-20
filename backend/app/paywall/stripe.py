import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.auth.deps import get_current_user
from app.config import settings
from app.credits.router import grant_credits

router = APIRouter(prefix="/api/paywall", tags=["stripe"])

stripe.api_key = settings.stripe_secret_key


class CheckoutSession(BaseModel):
    user_id: str


@router.post("/create-checkout")
async def create_checkout(
    body: CheckoutSession,
    current_user: str = Depends(get_current_user),
):
    if body.user_id != current_user:
        raise HTTPException(status_code=403, detail="Cannot create checkout for another user")
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
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")

    session = event["data"]["object"]
    if event["type"] == "checkout.session.completed" and session.get("payment_status") == "paid":
        user_id = session.get("metadata", {}).get("user_id")
        if user_id:
            await grant_credits(user_id, settings.credit_grant_amount, "stripe")
            return {"ok": True}
    return {"ok": False}
