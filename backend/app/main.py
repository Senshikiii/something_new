from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.auth.router import router as auth_router
from app.paywall.router import router as paywall_router
from app.paywall.stripe import router as stripe_router
from app.credits.router import router as credits_router
from app.chat.router import router as chat_router

app = FastAPI(title="MicroManus", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(paywall_router)
app.include_router(stripe_router)
app.include_router(credits_router)
app.include_router(chat_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
