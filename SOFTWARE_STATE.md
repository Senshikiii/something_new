# MicroManus — Software State Report

**Date:** 2026-07-21
**Purpose:** Comprehensive overview for assessment and next steps

---

## Table of Contents

1. [The Idea](#the-idea)
2. [What It Does](#what-it-does)
3. [How It Works](#how-it-works)
4. [Architecture](#architecture)
5. [User Flow](#user-flow)
6. [Features](#features)
7. [UI/UX](#uiux)
8. [Security](#security)
9. [Deployment](#deployment)
10. [Known Limitations](#known-limitations)
11. [What's Next](#whats-next)

---

## The Idea

MicroManus is a deep research AI agent with usage-based billing. It was built for the Dr Droid Product Engineer assignment.

**Core concept:** A web app where someone signs up, unlocks access via a coupon, then chats with an AI agent that can search the web, hold a conversation across multiple turns, produce a PDF report when asked, and show the person exactly what each conversation cost them — broken down by model and token type. The user brings their own API key.

**Key insight:** The user pays for the LLM usage directly (BYO key), while we handle the infrastructure, agent loop, and billing via credits. This means we never have LLM costs, but we do need a credit system to gate access.

---

## What It Does

### For the User

1. **Sign up** — via GitHub, Google, or anonymous guest access
2. **Get credits** — enter coupon `SID_DRDROID` to get 5 credits (or pay via Stripe, currently disabled)
3. **Chat with an AI agent** — ask research questions, the agent searches the web and responds
4. **Generate PDF reports** — the agent can produce downloadable PDF reports for research tasks
5. **See costs** — a dashboard shows exactly what each conversation cost, broken down by model and token type
6. **BYO API key** — user provides their own LLM API key (OpenAI, Gemini, Groq, Kimi)

### For the Operator (You)

1. **No LLM costs** — users pay for their own API usage
2. **Credit-based billing** — users need credits to use the agent
3. **Coupon system** — distribute credits via coupon codes
4. **Stripe integration** — ready for real payments (currently disabled)
5. **Full audit trail** — every credit transaction logged in Postgres

---

## How It Works

### The Agent Loop

The agent is the core of the application. It's a hand-built cycle with no framework dependency:

```
User sends message
    ↓
Save to messages table
    ↓
Load full thread history
    ↓
Call LLM with tool definitions
    ↓
Parse response
    ├─ Has text → Stream to frontend, save to DB
    ├─ Has tool_calls → Execute tools, feed results back, loop
    └─ Done → Deduct 1 credit, return
```

**Key properties:**
- Max 10 iterations per turn (prevents infinite loops)
- Tool failures fed back to model (no crashes)
- Empty response detection + retry without tools (Groq fix)
- Atomic credit deduction (advisory lock)

### Tools Available

1. **web_search** — Searches the web via DuckDuckGo (free, no API key)
2. **generate_pdf** — Creates a PDF report from structured content (WeasyPrint)

### SSE Streaming

The backend streams events as the agent works:

- `thinking` — Agent's internal reasoning
- `tool_call` — Agent is calling a tool
- `tool_result` — Tool returned data
- `content` — Streaming text token
- `usage` — Token counts for cost tracking
- `error` — Something went wrong

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│                    (Next.js on Vercel)                      │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Landing   │  │    Chat     │  │   Settings  │        │
│  │   Page      │  │   Interface │  │   Dialog    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │   Backend   │
                    │ (FastAPI)   │
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────┴────┐      ┌────┴────┐      ┌────┴────┐
    │Supabase │      │  LLM    │      │DuckDuck │
    │ (Auth + │      │ (BYO    │      │  Go     │
    │  DB)    │      │  Key)   │      │ (Free)  │
    └─────────┘      └─────────┘      └─────────┘
```

### Database Schema

```sql
profiles        — One row per user, tracks credits
threads         — Conversation threads, scoped to user
messages        — Individual messages with token tracking
credits_transactions — Audit log for every credit grant/deduction
```

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/session` | Exchange OAuth code for session |
| POST | `/api/paywall/redeem-coupon` | Redeem coupon for credits |
| POST | `/api/paywall/create-checkout` | Create Stripe checkout session |
| POST | `/api/paywall/webhook` | Handle Stripe webhooks |
| GET | `/api/credits/balance` | Get user's credit balance |
| POST | `/api/chat/threads` | Create new thread |
| GET | `/api/chat/threads/{id}/messages` | Get messages in thread |
| POST | `/api/chat/send` | Send message (SSE stream) |
| GET | `/api/chat/pdf/{id}` | Download PDF |
| GET | `/api/costs/summary` | Get cost breakdown |
| GET | `/api/health` | Health check |

---

## User Flow

### 1. First Visit

```
Landing Page
    ↓
Boot Sequence (terminal animation)
    ↓
Sign In Options:
    ├─ Sign in with GitHub (OAuth)
    ├─ Sign in with Google (OAuth)
    └─ Continue as guest (anonymous)
    ↓
Paywall Screen
    ↓
Enter Coupon: SID_DRDROID
    ↓
5 Credits Granted
    ↓
Redirect to /chat
```

### 2. Chat Flow

```
Chat Interface
    ↓
Type message + Enter
    ↓
Agent Loop:
    ├─ Thinking indicator
    ├─ Tool call (web search)
    ├─ Tool result
    ├─ More thinking
    ├─ Final response (streamed)
    └─ Credit deducted
    ↓
Message saved to DB
```

### 3. PDF Generation

```
User asks for PDF report
    ↓
Agent decides to use generate_pdf tool
    ↓
Agent calls tool with:
    ├─ title
    ├─ sections (heading + content)
    └─ sources (optional)
    ↓
WeasyPrint generates PDF
    ↓
PDF saved to filesystem
    ↓
Download button appears in chat
```

### 4. Cost Tracking

```
User clicks "costs" button in toolbar
    ↓
Modal opens
    ↓
Backend aggregates:
    ├─ All threads by user
    ├─ Token usage per thread
    └─ Cost per model (industry pricing)
    ↓
Table shows:
    ├─ Thread title
    ├─ Model used
    ├─ Input/Output/Cache tokens
    └─ Cost ($)
    ↓
Total row at bottom
```

---

## Features

### Auth & Paywall

| Feature | Status | Notes |
|---------|--------|-------|
| Anonymous sign-in | ✅ Working | Guest access for testing |
| GitHub OAuth | 🔧 Code done | Needs Supabase Dashboard setup |
| Google OAuth | 🔧 Code done | Needs Supabase Dashboard setup |
| Coupon redemption | ✅ Working | `SID_DRDROID` grants 5 credits |
| Stripe checkout | ⚠️ Disabled | Button disabled in UI, code ready |
| Credit balance | ✅ Working | Atomic deduction with advisory lock |

### Chat & Agent

| Feature | Status | Notes |
|---------|--------|-------|
| Chat UI | ✅ Working | Terminal aesthetic, Gruvbox theme |
| Thread management | ✅ Working | New chat, thread isolation |
| Message history | ✅ Working | Loaded from DB |
| Agent loop | ✅ Working | Max 10 iterations |
| Web search | ✅ Working | DuckDuckGo (free) |
| SSE streaming | ✅ Working | Real-time events |
| Markdown rendering | ✅ Working | Code highlighting included |
| Error handling | ✅ Working | Tool failures fed back to model |
| Empty response fix | ✅ Working | Retries without tools |
| Token tracking | ✅ Working | Saved to DB per message |

### PDF Generation

| Feature | Status | Notes |
|---------|--------|-------|
| PDF tool | ✅ Working | Agent decides when to use |
| WeasyPrint | ✅ Working | HTML-to-PDF conversion |
| Download | ✅ Working | Button in chat UI |
| Security | ✅ Working | HTML injection prevention |

### Multi-Model Support

| Feature | Status | Notes |
|---------|--------|-------|
| BYO API key | ✅ Working | Stored in localStorage |
| Gemini Flash | ✅ Working | Free tier, good default |
| Gemini Pro | ✅ Working | Free tier, best reasoning |
| Groq Llama 3.3 70B | ✅ Working | Free tier, fast |
| OpenAI GPT-4o | ✅ Working | Paid, most users have key |
| OpenAI GPT-4o-mini | ✅ Working | Paid, cheaper |
| Kimi | ✅ Working | Paid, cheaper |
| Claude | ❌ Removed | Not OpenAI-compatible |

### Cost Tracking

| Feature | Status | Notes |
|---------|--------|-------|
| Modal in toolbar | ✅ Working | Next to credit balance |
| Per-thread breakdown | ✅ Working | Title, model, tokens, cost |
| Per-model pricing | ✅ Working | Industry standard rates |
| Token categories | ✅ Working | Input/output/cache |
| Totals | ✅ Working | Summary row |

---

## UI/UX

### Design Language

- **Theme:** Gruvbox Dark (warm retro: amber, teal, red earth tones)
- **Font:** JetBrains Mono (monospace throughout)
- **Layout:** Terminal aesthetic with `$`-prefixed input
- **Animations:** Floating pixel art, walking cat, typing indicator

### Pages

1. **Landing Page** (`/`)
   - ASCII art logo
   - OAuth sign-in buttons (GitHub, Google)
   - Guest sign-in fallback
   - Boot sequence animation

2. **Paywall** (`/` after sign-in)
   - Credit balance display
   - Coupon input
   - Stripe button (disabled)

3. **Chat** (`/chat`)
   - Terminal-style title bar
   - Toolbar: credit balance, costs button, new chat, settings
   - Message list with markdown rendering
   - Input with `$` prefix
   - Floating pixel art background

4. **Settings Dialog**
   - Provider presets (6 options)
   - API endpoint input
   - Model input
   - API key input (password field)

### Components

- `BootSequence` — Terminal boot animation on first visit
- `PixelCat`, `PixelWhale`, `PixelStar` — Floating decorations
- `WalkingCat` — CSS animation traversing viewport
- `TerminalMessage` — Chat message with markdown
- `TypingIndicator` — Animated thinking indicator
- `CostDashboard` — Modal for cost breakdown
- `SettingsDialog` — LLM configuration

---

## Security

### What We Protect

1. **JWT verification** — Every backend request verified
2. **No user_id from request bodies** — Always derived from JWT
3. **Atomic credit deduction** — Advisory lock prevents race conditions
4. **PDF injection prevention** — All content escaped with `html.escape()`
5. **CORS from env var** — Not hardcoded
6. **Stripe webhook verification** — Signature check with secret

### What We Don't Store

1. **LLM API keys** — User's key, sent per-request, discarded
2. **OAuth tokens** — Managed by Supabase
3. **Passwords** — Supabase handles auth

### Known Security Limitations

1. **No rate limiting** — Any authenticated user can make unlimited requests
2. **No input validation** — User can send any text as API key/model
3. **No CSRF protection** — Relies on SameSite cookies
4. **Auth middleware uses HTTP call** — Slight latency per request

---

## Deployment

### Current URLs

| Service | URL | Status |
|---------|-----|--------|
| Frontend | https://something-new-five.vercel.app | ✅ Running |
| Backend | https://something-new-1-ywck.onrender.com | ✅ Running |
| Supabase | (hidden) | ✅ Connected |

### Environment Variables

**Frontend (Vercel):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `BACKEND_URL`

**Backend (Render):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CORS_ORIGINS`

### Docker

Backend runs in Docker with:
- Python 3.12 slim
- WeasyPrint system deps (pango, cairo, gdk-pixbuf)
- FastAPI via uvicorn

---

## Known Limitations

### Bugs

1. **No thread history** — Users can't see past conversations
2. **Sync Supabase calls** — `.execute()` blocks event loop
3. **No logging** — No structured logging anywhere
4. **No rate limiting** — No protection against abuse
5. **Stripe URLs hardcoded** — Still pointing to localhost

### Missing Features

1. **OAuth** — Code done, needs dashboard setup
2. **Thread sidebar** — Not implemented
3. **Pagination** — No pagination on threads/messages
4. **Search** — Can't search past conversations
5. **Export** — Can't export chat history

### Technical Debt

1. **`stream_llm()` unused** — Defined but never called (UX: user waits for full response)
2. **Tool result truncation** — 2000 char limit can cut JSON mid-string
3. **No `pyproject.toml`** — Only requirements.txt
4. **`next-themes` unused** — Dependency installed but not used
5. **`shadcn` in dependencies** — Should be in devDependencies

---

## What's Next

### Before Submission (Must Do)

| # | Task | Effort |
|---|------|--------|
| 1 | Enable GitHub OAuth in Supabase Dashboard | 15 min |
| 2 | Enable Google OAuth in Supabase Dashboard | 15 min |
| 3 | Add redirect URLs to Supabase | 5 min |
| 4 | Friend-test the full flow | 30 min |
| 5 | Commit & push changes | 5 min |

### After Submission (Nice to Have)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Thread history sidebar | 2-3 hours | High — users can see past conversations |
| 2 | Enable Stripe checkout | 1 hour | Medium — real payments |
| 3 | Rate limiting | 1-2 hours | Medium — abuse protection |
| 4 | Structured logging | 2-3 hours | Medium — debugging |
| 5 | Streaming LLM responses | 3-4 hours | High — better UX |
| 6 | Thread search | 2-3 hours | Medium — find past conversations |
| 7 | Chat export | 1-2 hours | Low — export as markdown/JSON |

### Long-term (If Product Continues)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Multi-agent orchestration | 1-2 weeks | High — parallel research |
| 2 | Custom tools | 1 week | High — domain-specific research |
| 3 | Team features | 2-3 weeks | High — shared credits, threads |
| 4 | Analytics dashboard | 1-2 weeks | Medium — usage insights |
| 5 | API access | 1 week | Medium — programmatic access |

---

## Summary

MicroManus is a functional deep research AI agent with:

- ✅ Working auth (anonymous + OAuth ready)
- ✅ Working agent loop with web search
- ✅ Working PDF generation
- ✅ Working cost tracking
- ✅ Deployed to production
- ✅ Security hardened

**Ready for submission** after:
1. Enabling OAuth in Supabase Dashboard
2. Friend-testing the full flow
3. Committing and pushing changes

**Total development time:** ~2 days
**Lines of code:** ~2,500 (frontend + backend)
**Dependencies:** Minimal (no LangChain, no heavy frameworks)
