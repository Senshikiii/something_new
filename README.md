# MicroManus

Deep research AI agent with usage-based billing. Built for the Dr Droid Product Engineer assignment.

A web app where a user signs up, unlocks access via a coupon, then chats with an AI agent that can search the web, hold a conversation across multiple turns, produce a PDF report when asked, and see exactly what each conversation cost them — broken down by model and token type. The user brings their own API key.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 16** (App Router) | Vercel deployment, server components, built-in streaming support |
| UI | **Tailwind v4 + shadcn/ui + Base UI** | Gruvbox Dark theme (warm retro terminal aesthetic). shadcn provides accessible, unstyled primitives that we theme via CSS variables |
| Backend | **FastAPI** (Python 3.12) | Async-native, automatic OpenAPI docs, Render deployment. Handles auth, paywall, agent loop |
| Auth + Database | **Supabase** (Postgres + Auth) | Managed Postgres with built-in auth, RLS for row-level security |
| Payments | **Stripe** (test mode) | Coupon code `SID_DRDROID` bypasses payments during assignment review. Stripe checkout wired but disabled in UI |
| Agent tools | **DuckDuckGo** (free) | No API key required. Web search as the primary agent tool |
| LLMs | **BYO API key** (OpenAI-compatible) | User supplies their own key for OpenAI, Claude, Gemini, Groq, or Kimi. No keys stored on the backend |

---

## Architecture

### Monorepo Structure

```
/
├── frontend/            # Next.js 16 + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── app/         # App Router pages (landing, chat, paywall)
│   │   ├── components/  # UI components (shadcn + custom pixel art)
│   │   └── lib/         # Utilities, API client, Supabase config
│   └── .env.local
├── backend/             # FastAPI + Supabase SDK + Stripe
│   ├── app/
│   │   ├── auth/        # JWT verification
│   │   ├── paywall/     # Coupon redemption + Stripe checkout
│   │   ├── credits/     # Credit balance + grant/deduct
│   │   ├── chat/        # Threads, messages, agent loop, PDF generation
│   │   ├── costs/       # Cost tracking dashboard endpoint
│   │   └── db/          # SQL schema (migration)
│   ├── Dockerfile       # Render deployment
│   └── .env
├── planner.md           # Build roadmap (checklist)
├── AGENTS.md            # Instructions for coding agents
└── README.md            # This file
```

### Frontend

Next.js 16 with App Router. Pages are server components by default, with client islands for interactivity. Chat uses **Server-Sent Events (SSE)** streaming — the backend pushes agent progress (thinking, tool calls, tokens) as events, and the frontend renders them in real time in a terminal-like interface.

**Styling:** Gruvbox Dark (warm retro: amber, teal, red earth tones) via CSS custom properties. Monospace font throughout (JetBrains Mono). The UI mimics a terminal: `$`-prefixed input, flat scrolling message log with no chat bubbles, blinking cursor.

### Backend

FastAPI with async routes. No ORM — Supabase Python SDK talks directly to Postgres via REST. The agent loop is the centerpiece: a hand-built `think → tool call → observe → repeat` cycle with no LangChain or framework dependencies.

**Why no framework for the agent loop:**
1. The pattern is simple — a `while` loop with a max iteration counter
2. Framework abstractions (LangChain, Vercel AI SDK) add complexity for a linear loop that calls one LLM and one tool
3. Full control over error handling, token counting, and streaming format
4. Easier to debug — every step is explicit in one file

### Database (Supabase Postgres)

**Tables:**
- `profiles` — One row per user. Tracks `credits` count. Auto-created on signup via trigger.
- `credits_transactions` — Audit log for every credit grant or deduction.
- `threads` — Conversation threads, scoped to a user.
- `messages` — Individual messages within a thread. Records role, content, model, token usage (for cost tracking).

**Key decisions:**
- Credit mutations happen inside **Postgres functions** (`add_credits`, `use_credit`) to guarantee atomicity
- `use_credit` uses `UPDATE ... WHERE credits > 0 RETURNING credits` — a single atomic statement. No race condition between checking and deducting
- The functions are `SECURITY DEFINER` (run as the database owner) with `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` — only the backend's `service_role` key can call them
- Row-Level Security (RLS) ensures users only see their own data

### Security Model

```
[Browser] ─── anon key ───> [Supabase Auth] ───> [Postgres with RLS]
      │
      │  (user's API key in header)
      │
      └──> [FastAPI Backend] ─── service_role key ───> [Postgres bypasses RLS]
               │
               └──> [LLM API] (user's key)
               └──> [DuckDuckGo] (free, no key)
```

- The frontend uses the Supabase **anon key** (publishable key) for auth and direct DB reads via RLS
- All sensitive operations (credits, agent loop) go through the **FastAPI backend**
- The backend uses the Supabase **service_role key** (secret key) to bypass RLS for admin operations
- User LLM API keys are **never stored on the backend** — they're sent from the frontend with each request and used only for that request's LLM calls
- DuckDuckGo web search requires **no API key** — it's free and unlimited

---

## Agent Loop (The Core)

The agent loop is the heart of the application. It's a hand-built cycle with no framework dependency:

```
User sends message
       │
       ▼
  ┌──────────────────┐
  │ Save to messages │  (thread_id, role='user', content)
  └──────┬───────────┘
         │
         ▼
  ┌──────────────────┐
  │ Load history     │  (all previous messages in this thread)
  └──────┬───────────┘
         │
         ▼
  ┌──────────────────┐
  │ Call LLM         │  POST /v1/chat/completions
  │ (with tool defs) │  Model: user's choice
  └──────┬───────────┘  Key: user's key
         │               Endpoint: user's provider
         ▼
    ┌──────────┐
    │ Parse     │
    │ response  │
    └────┬─────┘
         │
    ┌────┴─────┐
    │          │
  has        has
 text      tool_calls
    │          │
    │          ▼
    │   ┌──────────────────┐
    │   │ Execute tool     │  web_search(query)
    │   │ (max 10 iters)   │
    │   └──────┬───────────┘
    │          │
    │          ▼
    │   ┌──────────────────┐
    │   │ Feed result      │
    │   │ back to LLM      │  (role='tool')
    │   └──────┬───────────┘
    │          │
    │          └───────── loops back to "Call LLM"
    │
    ▼
  ┌──────────────────┐
  │ Stream tokens    │  SSE: event stream to frontend
  │ to frontend      │  {'event': 'token', 'data': '...'}
  └──────┬───────────┘
         │
         ▼
  ┌──────────────────┐
  │ Save assistant   │  (thread_id, role='assistant',
  │ message to DB    │   content, model, tokens_*)
  └──────┬───────────┘
         │
         ▼
  ┌──────────────────┐
  │ Deduct 1 credit  │  use_credit(user_id)
  └──────┬───────────┘
         │
         ▼
      done, stream 'event: done'
```

**Key properties of the loop:**

- **Max iteration cap:** Default 10 rounds. Prevents infinite loops if the LLM keeps making tool calls.
- **Failure handling:** If a tool call is malformed or the tool returns an error, the error text is fed back to the LLM as a tool result. The LLM can then decide to retry or respond gracefully. Nothing crashes.
- **No framework:** The entire loop is ~80 lines of Python with `httpx` for HTTP calls. No LangChain, no Vercel AI SDK. This gives full control over the streaming format, token counting, and iteration logic.
- **Tool registration:** Tools are defined as Python functions with JSON Schema definitions. Adding a new tool means: (1) write the function, (2) add its JSON Schema to the tools list sent to the LLM.

### SSE Streaming Format

The backend streams events as the agent works. The frontend renders each event type differently:

```
event: thinking        # Agent's internal reasoning (shown briefly)
data: {"text": "I'll search for recent AI news..."}

event: tool_call       # Agent is calling a tool
data: {"tool": "web_search", "query": "AI news 2026"}

event: tool_result     # Tool returned data (shown dimmed/collapsed)
data: {"text": "Found 5 results..."}

event: token           # Streaming text token (typed out in real time)
data: {"text": "Here's"}

event: token
data: {"text": " what I found:"}

event: usage           # Token counts for cost tracking
data: {"input": 450, "output": 120, "model": "gpt-4o"}

event: done            # Message complete
```

---

## BYO API Key Model

Users bring their own LLM API keys. The architecture handles this:

1. **From the UI:** A settings dialog lets users enter their API endpoint, key, and model name
2. **Storage:** Keys are stored in the browser's `localStorage` — never sent to our backend for storage
3. **Per-request:** Each chat request includes the key + endpoint in the request headers. The backend reads them, makes the LLM call, and discards them. No keys are logged or persisted.
4. **Supported providers:** Any OpenAI-compatible endpoint works. The UI provides presets for OpenAI, Claude, Gemini, Groq, and Kimi (Moonshot).

---

## Credit System

- New users land on a paywall screen after first login
- Two paths to get credits:
  1. **Coupon:** Enter `SID_DRDROID` → instantly grants **5 credits**
  2. **Stripe:** Pay $5.00 via test-mode checkout → also grants **5 credits**
- Each chat message costs **1 credit** (deducted atomically before the agent runs via `deduct_credit_if_available` RPC with advisory lock)
- The cost tracking dashboard shows per-conversation cost breakdown by model and token type

---

## Setup

### Prerequisites
- Node.js 20+, pnpm
- Python 3.12+
- Supabase project (free tier)
- DuckDuckGo (no API key needed)

### 1. Environment

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Fill in the values from Supabase (project URL, publishable key, secret key).

### 2. Database

Open `backend/app/db/schema.sql` in Supabase SQL Editor and run it. This creates all tables, functions, and security policies.

### 3. Frontend

```bash
cd frontend
pnpm install
pnpm dev        # → localhost:3000
```

### 4. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # → localhost:8000
```

### 5. Web Search

DuckDuckGo search is built-in and free — no API key required. The `web_search` tool is available to the agent by default.

---

## Roadmap

See `planner.md` for the full checklist. Current progress:

- **Subsystem 1 (Auth + Paywall):** Complete. Schema applied. Coupon + Stripe paths working. OAuth deferred.
- **Subsystem 2 (Chat + Agent Loop):** Complete. Hand-built agent loop, DuckDuckGo search, SSE streaming, markdown rendering.
- **Subsystem 3 (PDF Generation):** Complete. WeasyPrint-based HTML-to-PDF with security hardening.
- **Subsystem 4 (Multi-Model):** Complete. BYO API key with presets for 6 providers (OpenAI, Claude, Gemini, Groq, Kimi).
- **Subsystem 5 (Cost Dashboard):** Complete. Per-conversation cost breakdown by model and token type.
- **Subsystem A (Auth & Security):** Complete. JWT verification, atomic credit deduction, no user_id from request bodies.
- **Deployment:** Complete. Frontend on Vercel, backend on Render (Docker). All env vars wired.
