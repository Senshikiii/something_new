import copy
import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

from app.auth.deps import get_current_user
from app.auth.supabase import get_supabase
from app.chat.agent import run_agent
from app.chat.pdf import generate_pdf_report

PDF_DIR = Path(__file__).parent.parent.parent / "pdfs"

router = APIRouter(prefix="/api/chat", tags=["chat"])


class CreateThread(BaseModel):
    pass


class SendMessage(BaseModel):
    thread_id: str
    content: str
    api_key: str
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o"


class ThreadOut(BaseModel):
    id: str
    title: str | None
    created_at: str
    updated_at: str


@router.get("/threads")
async def list_threads(current_user: str = Depends(get_current_user)) -> list[ThreadOut]:
    supabase = get_supabase()
    result = (
        supabase.table("threads")
        .select("id, title, created_at, updated_at")
        .eq("user_id", current_user)
        .order("updated_at", desc=True)
        .execute()
    )
    return [ThreadOut(**row) for row in result.data]


@router.post("/threads")
async def create_thread(
    body: CreateThread,
    current_user: str = Depends(get_current_user),
) -> ThreadOut:
    supabase = get_supabase()
    result = (
        supabase.table("threads")
        .insert({"user_id": current_user})
        .execute()
    )
    row = result.data[0]
    return ThreadOut(**row)


@router.get("/threads/{thread_id}/messages")
async def list_messages(
    thread_id: str,
    current_user: str = Depends(get_current_user),
):
    supabase = get_supabase()
    thread = supabase.table("threads").select("user_id").eq("id", thread_id).single().execute()
    if not thread.data or thread.data["user_id"] != current_user:
        raise HTTPException(status_code=404, detail="Thread not found")
    result = (
        supabase.table("messages")
        .select("*")
        .eq("thread_id", thread_id)
        .order("created_at")
        .execute()
    )
    return result.data


@router.post("/send")
async def send_message(
    body: SendMessage,
    current_user: str = Depends(get_current_user),
):
    supabase = get_supabase()

    profile = supabase.table("profiles").select("credits").eq("id", current_user).single().execute()
    if not profile.data or profile.data["credits"] < 1:
        raise HTTPException(status_code=402, detail="Insufficient credits.")

    supabase.table("messages").insert({
        "thread_id": body.thread_id,
        "role": "user",
        "content": body.content,
    }).execute()

    existing = supabase.table("messages").select("id").eq("thread_id", body.thread_id).execute()
    if len(existing.data) == 1:
        title = body.content[:80] + ("..." if len(body.content) > 80 else "")
        supabase.table("threads").update({"title": title}).eq("id", body.thread_id).execute()

    history = supabase.table("messages").select("*").eq("thread_id", body.thread_id).order("created_at").execute()

    messages = []
    for msg in history.data:
        role = msg["role"]
        entry = {"role": role, "content": msg["content"]}
        if role == "assistant" and msg.get("tool_calls"):
            entry["tool_calls"] = msg["tool_calls"]
        if role == "tool":
            entry["tool_call_id"] = msg.get("tool_call_id", "")
        messages.append(entry)

    system_prompt = {
        "role": "system",
        "content": (
            "You are a research assistant. You have access to web_search to find current information. "
            "When asked about recent events, data, or anything requiring up-to-date knowledge, use web_search. "
            "Present information clearly and cite your sources. "
            "You can make multiple search calls if needed. "
            "If a search returns no results, try reformulating your query. "
            "When you've gathered enough information and the user asks for a report, "
            "use generate_pdf to create a downloadable PDF research report with well-structured sections."
        ),
    }

    agent_messages = [system_prompt] + messages

    async def event_stream():
        try:
            async for event in run_agent(
                base_url=body.base_url,
                api_key=body.api_key,
                model=body.model,
                messages=agent_messages,
            ):
                if event["type"] == "save_msg":
                    row = {
                        "thread_id": body.thread_id,
                        "role": event["role"],
                        "content": event.get("content", ""),
                    }
                    if event["role"] == "assistant" and "tool_calls" in event:
                        row["tool_calls"] = copy.deepcopy(event["tool_calls"])
                    if event["role"] == "tool" and "tool_call_id" in event:
                        row["tool_call_id"] = event["tool_call_id"]
                    supabase.table("messages").insert(row).execute()
                    continue

                yield f"event: {event['type']}\ndata: {json.dumps(event)}\n\n"

            supabase.rpc("use_credit", {"p_user_id": current_user}).execute()
            yield "event: done\ndata: {}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'text': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/pdf/{pdf_id}")
async def download_pdf(pdf_id: str):
    pdf_path = PDF_DIR / f"{pdf_id}.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"micromanus-report-{pdf_id[:8]}.pdf",
    )
