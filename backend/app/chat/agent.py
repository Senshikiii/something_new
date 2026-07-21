import json
from typing import AsyncGenerator

from app.chat.llm import call_llm
from app.chat.tools import web_search, generate_pdf, WEB_SEARCH_SCHEMA, GENERATE_PDF_SCHEMA

TOOLS = [WEB_SEARCH_SCHEMA, GENERATE_PDF_SCHEMA]
MAX_ITERATIONS = 10

TOOL_MAP = {
    "web_search": web_search,
    "generate_pdf": generate_pdf,
}


async def run_agent(
    base_url: str,
    api_key: str,
    model: str,
    messages: list[dict],
) -> AsyncGenerator[dict, None]:
    iteration = 0

    while iteration < MAX_ITERATIONS:
        iteration += 1

        yield {"type": "thinking", "text": f"Iteration {iteration} — calling model..."}

        response = await call_llm(
            base_url=base_url,
            api_key=api_key,
            model=model,
            messages=messages,
            tools=TOOLS,
            stream=False,
        )

        choices = response.get("choices", [])
        if not choices:
            yield {"type": "content", "text": "Error: Model returned no choices. Please try again."}
            return

        message = choices[0].get("message", {})

        if not message.get("tool_calls"):
            content = message.get("content") or ""

            if not content.strip() and iteration == 1:
                yield {"type": "thinking", "text": "Model returned empty response, retrying without tools..."}
                response = await call_llm(
                    base_url=base_url,
                    api_key=api_key,
                    model=model,
                    messages=messages,
                    tools=None,
                    stream=False,
                )
                choices = response.get("choices", [])
                if choices:
                    message = choices[0].get("message", {})
                    content = message.get("content") or ""

            usage = response.get("usage", {})
            yield {
                "type": "save_msg",
                "role": "assistant",
                "content": content,
                "tokens_input": usage.get("prompt_tokens", 0),
                "tokens_output": usage.get("completion_tokens", 0),
                "tokens_cache": usage.get("cache_read_input_tokens", 0),
                "model": model,
            }
            yield {"type": "content", "text": content}
            yield {
                "type": "usage",
                "input": usage.get("prompt_tokens", 0),
                "output": usage.get("completion_tokens", 0),
                "cache": usage.get("cache_read_input_tokens", 0),
                "model": model,
            }
            return

        assistant_text = message.get("content") or ""
        tool_calls = message["tool_calls"]

        if assistant_text:
            yield {"type": "thinking", "text": assistant_text}

        # Tell the router to save this assistant message with its tool calls
        yield {
            "type": "save_msg",
            "role": "assistant",
            "content": assistant_text,
            "tool_calls": tool_calls,
        }

        messages.append({"role": "assistant", "content": assistant_text, "tool_calls": tool_calls})

        for tool_call in tool_calls:
            func = tool_call["function"]
            name = func["name"]
            try:
                args = json.loads(func["arguments"])
            except json.JSONDecodeError:
                args = {}

            yield {"type": "tool_call", "tool": name, "args": args}

            handler = TOOL_MAP.get(name)
            if handler is None:
                result = f"Error: Unknown tool '{name}'"
            else:
                try:
                    result = await handler(**args)
                except Exception as e:
                    result = f"Error executing {name}: {e}"

            yield {"type": "tool_result", "text": result[:2000]}

            # Tell the router to save this tool result
            yield {
                "type": "save_msg",
                "role": "tool",
                "content": result,
                "tool_call_id": tool_call["id"],
            }

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call["id"],
                "content": result,
            })

    yield {"type": "content", "text": "I've reached the maximum number of iterations. Please try a more specific query."}
