from duckduckgo_search import DDGS


WEB_SEARCH_SCHEMA = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Search the web for current information. Use this for recent events, news, facts, or anything that needs up-to-date data.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query",
                },
                "count": {
                    "type": "integer",
                    "description": "Number of results (1-10)",
                    "default": 5,
                },
            },
            "required": ["query"],
        },
    },
}


async def web_search(query: str, count: int = 5) -> str:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=min(count, 10)))
    except Exception as e:
        return f"Search failed: {e}"

    if not results:
        return f"No results found for '{query}'."

    lines = []
    for item in results:
        title = item.get("title", "")
        snippet = item.get("body", "")
        url = item.get("href", "")
        lines.append(f"• [{title}]({url})\n  {snippet}")

    return f"Search results for '{query}':\n\n" + "\n\n".join(lines)
