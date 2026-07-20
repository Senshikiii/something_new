import httpx
from app.config import settings


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
    api_key = settings.brave_api_key
    if not api_key:
        return "Error: Brave Search API key not configured. Set BRAVE_API_KEY in backend .env"

    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": api_key,
    }
    params = {
        "q": query,
        "count": min(count, 10),
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("web", {}).get("results", []):
        title = item.get("title", "")
        snippet = item.get("description", "")
        url_result = item.get("url", "")
        results.append(f"• [{title}]({url_result})\n  {snippet}")

    if not results:
        return f"No results found for '{query}'."

    return f"Search results for '{query}':\n\n" + "\n\n".join(results)
