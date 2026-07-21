from fastapi import APIRouter, Depends
from app.auth.deps import get_current_user
from app.db import get_supabase
from app.config import get_model_pricing

router = APIRouter(prefix="/api/costs", tags=["costs"])


@router.get("/summary")
async def get_cost_summary(user=Depends(get_current_user)):
    supabase = get_supabase()
    user_id = user.id

    threads_resp = (
        supabase.table("threads")
        .select("id, title")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    threads = {t["id"]: t["title"] for t in (threads_resp.data or [])}

    messages_resp = (
        supabase.table("messages")
        .select("thread_id, role, tokens_input, tokens_output, tokens_cache, model")
        .in_("thread_id", list(threads.keys()))
        .execute()
    )
    messages = messages_resp.data or []

    thread_costs: dict[str, dict] = {}
    for msg in messages:
        if msg["role"] != "assistant":
            continue
        tid = msg["thread_id"]
        if tid not in thread_costs:
            thread_costs[tid] = {
                "thread_id": tid,
                "title": threads.get(tid, "Untitled"),
                "model": msg.get("model") or "unknown",
                "tokens_input": 0,
                "tokens_output": 0,
                "tokens_cache": 0,
                "cost": 0.0,
            }
        tc = thread_costs[tid]
        tc["tokens_input"] += msg.get("tokens_input") or 0
        tc["tokens_output"] += msg.get("tokens_output") or 0
        tc["tokens_cache"] += msg.get("tokens_cache") or 0

    total_cost = 0.0
    total_input = 0
    total_output = 0
    total_cache = 0

    for tc in thread_costs.values():
        pricing = get_model_pricing(tc["model"])
        if pricing:
            tc["cost"] = round(
                (tc["tokens_input"] / 1_000_000) * pricing["input"]
                + (tc["tokens_output"] / 1_000_000) * pricing["output"]
                + (tc["tokens_cache"] / 1_000_000) * pricing["cache"],
                6,
            )
        total_cost += tc["cost"]
        total_input += tc["tokens_input"]
        total_output += tc["tokens_output"]
        total_cache += tc["tokens_cache"]

    return {
        "threads": list(thread_costs.values()),
        "totals": {
            "cost": round(total_cost, 6),
            "tokens_input": total_input,
            "tokens_output": total_output,
            "tokens_cache": total_cache,
        },
    }
