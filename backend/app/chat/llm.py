import httpx
from typing import AsyncGenerator


async def call_llm(
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict],
    tools: list[dict] | None = None,
    stream: bool = False,
) -> dict:
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "messages": messages,
        "stream": stream,
    }
    if tools:
        body["tools"] = tools

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=body, timeout=120)
        resp.raise_for_status()
        return resp.json()


async def stream_llm(
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict],
    tools: list[dict] | None = None,
) -> AsyncGenerator[dict, None]:
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "messages": messages,
        "stream": True,
    }
    if tools:
        body["tools"] = tools

    async with httpx.AsyncClient() as client:
        async with client.stream("POST", url, headers=headers, json=body, timeout=120) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                payload = line.removeprefix("data: ").strip()
                if payload == "[DONE]":
                    break
                import json
                yield json.loads(payload)
