import json
from duckduckgo_search import DDGS

from app.chat.pdf import generate_pdf_report


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


GENERATE_PDF_SCHEMA = {
    "type": "function",
    "function": {
        "name": "generate_pdf",
        "description": "Create a PDF research report. Use this when you have completed your research and want to produce a downloadable report with structured sections.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Report title",
                },
                "sections": {
                    "type": "array",
                    "description": "Report sections with heading and content",
                    "items": {
                        "type": "object",
                        "properties": {
                            "heading": {"type": "string", "description": "Section heading"},
                            "content": {"type": "string", "description": "Section body text"},
                        },
                        "required": ["heading", "content"],
                    },
                },
                "sources": {
                    "type": "array",
                    "description": "List of source URLs or references",
                    "items": {"type": "string"},
                },
            },
            "required": ["title", "sections"],
        },
    },
}


import uuid
from pathlib import Path

PDF_DIR = Path(__file__).parent.parent.parent / "pdfs"
PDF_DIR.mkdir(exist_ok=True)


async def generate_pdf(title: str, sections: list[dict], sources: list[str] | None = None) -> str:
    try:
        pdf_bytes = generate_pdf_report(title, sections, sources)
        pdf_id = str(uuid.uuid4())
        (PDF_DIR / f"{pdf_id}.pdf").write_bytes(pdf_bytes)
        return json.dumps({
            "status": "ready",
            "pdf_id": pdf_id,
            "title": title,
            "size_bytes": len(pdf_bytes),
            "message": f"PDF report '{title}' generated. You can download it.",
        })
    except Exception as e:
        return json.dumps({"status": "error", "message": f"Failed to generate PDF: {e}"})
