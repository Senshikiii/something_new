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

        if resp.status_code >= 400:
            try:
                error_body = resp.json()
                error_msg = error_body.get("error", {}).get("message", resp.text)
                error_code = error_body.get("error", {}).get("code", "")
            except Exception:
                error_msg = resp.text
                error_code = ""

            if error_code == "tool_use_failed":
                raise ValueError(
                    f"Model failed to generate a valid tool call. "
                    f"Try rephrasing your request or using a different model. "
                    f"Details: {error_msg}"
                )
            elif resp.status_code == 429:
                raise ValueError(
                    f"Rate limit exceeded. Please wait a moment and try again. "
                    f"Details: {error_msg}"
                )
            else:
                raise ValueError(
                    f"LLM API error ({resp.status_code}): {error_msg}"
                )

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
