# AGENTS.md

## What this is

MicroManus — a deep research AI agent web app with usage-based billing. Currently pre-code; the roadmap is in `planner.md`.

## Planned stack

- **Frontend:** Next.js (deploy to Vercel)
- **Backend:** FastAPI (deploy to Railway)
- **Auth/DB:** Supabase (Postgres + Auth)
- **Payments:** Stripe test mode + coupon code `SID_DRDROID`
- **Agent tools:** DuckDuckGo (free, no API key) for web search
- **LLMs:** BYO API key — user supplies keys for OpenAI, Claude, Kimi (Moonshot)

## Architecture notes (from roadmap)

- Hand-built agent loop (no framework): think → tool call → observe → repeat
- Max iteration cap, failure handling via feeding errors back to model
- PDF generation is a distinct tool/action, not a chat reply
- Credits: both coupon and Stripe paths grant exactly 5 credits
- Cost tracking is a separate page from chat UI

## Rules

- After each subsystem works, explain it back before moving on — own every decision, don't just ship what the agent wrote.
- Do not store or use your own API keys; user brings their own.
- Confirm exact Kimi K3 endpoint/model string from Moonshot docs before wiring.
- Deployed URL required for submission — no localhost, no bare repo.
