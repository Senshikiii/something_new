# AGENTS.md

## What this is

MicroManus — a deep research AI agent web app with usage-based billing. Assignment for Dr Droid.

## Stack

- **Frontend:** Next.js 16 (Vercel)
- **Backend:** FastAPI (Render, Docker)
- **Auth/DB:** Supabase (Postgres + Auth)
- **Payments:** Stripe test mode + coupon code `SID_DRDROID`
- **Agent tools:** DuckDuckGo (free, no API key)
- **LLMs:** BYO API key — OpenAI, Claude, Gemini, Kimi (Moonshot)
- **Font:** JetBrains Mono
- **CSS:** Tailwind v4, tw-animate-css, shadcn/ui v4 (Base UI)
- **Theme:** Gruvbox Dark (warm retro)

## Architecture

- Monorepo: `/frontend` + `/backend`
- Hand-built agent loop: think → tool call → observe → repeat (max 10 iterations)
- Error handling: malformed tool calls / tool failures fed back to model
- PDF generation: distinct `generate_pdf` tool, not a chat reply
- Credit system: both coupon and Stripe paths grant exactly 5 credits
- Credit deduction: BEFORE agent run (atomic `deduct_credit_if_available` RPC with advisory lock)
- Auth: Supabase JWT tokens verified on every backend request via `auth.get_user()`
- No user_id is ever trusted from request bodies — derived from JWT

## State as of 2026-07-21

### Completed

**Subsystem 1 — Auth + Paywall (partial):**
- Supabase schema applied with security (SECURITY DEFINER, search_path, REVOKE/GRANT)
- Coupon path: `SID_DRDROID` grants 5 credits (idempotent — one per user)
- Stripe path: test-mode checkout (button is disabled in UI)
- Credit deduction after successful agent run
- OAuth (GitHub/Google) — DEFERRED

**Subsystem 2 — Chat + Agent Loop:**
- Chat UI, thread management, message history
- Agent loop with 10-iteration cap + error feedback
- DuckDuckGo web search tool
- SSE streaming events (content, thinking, tool_call, tool_result, error)
- Markdown rendering + code syntax highlighting
- Animated typing indicator with iteration counter
- Tool results displayed inline, error events visible

**Subsystem 3 — PDF Report Generation:**
- WeasyPrint-based HTML-to-PDF
- `generate_pdf` tool in agent's toolset
- PDFs stored on filesystem, served via GET `/api/chat/pdf/{pdf_id}`
- Frontend download button

**Subsystem A — Auth & Security (new):**
- `backend/app/auth/deps.py`: FastAPI JWT verification via `supabase.auth.get_user()`
- All routes use `Depends(get_current_user)` — no user_id from request bodies
- `GET /api/credits/balance` (no path param — derives from JWT)
- Stripe webhook: signature verification via `construct_event()` with STRIPE_WEBHOOK_SECRET
- Coupon idempotency: checks `credits_transactions` for existing coupon grant
- Auth tokens moved from query params to request body
- Frontend: all `fetch()` calls send `Authorization: Bearer <token>`
- Frontend: `supabase.ts` guards missing env vars

**UI Whimsy:**
- `BootSequence` component: real async terminal boot screen on first visit with `[ OK ]` lines tied to actual operations (session, health check, init). Supports `minDurationMs` to prevent flash.
- `PixelCat`, `PixelWhale`, `PixelStar`, `WalkingCat` SVG components
- Walking cat: pixel cat that traverses viewport bottom (CSS `walk` keyframes)
- Floating pixel art at varied depths/speeds in background
- Pixel cat icon in terminal title bar
- Gruvbox Dark color scheme (warm retro: amber, teal, red earth tones)

### Remaining Work

**Core Bugs (Subsystem B):**
- ~~Race condition: credit check and deduction are non-atomic~~ → FIXED: atomic `deduct_credit_if_available` RPC with advisory lock
- ~~`use_credit` return value silently discarded~~ → FIXED: removed old deduct-after-run, replaced with atomic deduct-before-run
- `stream_llm()` in `llm.py` is defined but never used — user waits for full LLM response before any SSE events arrive
- Tool result truncation at 2000 chars (`agent.py:98`) can cut JSON mid-string (borks PDF generation tool result)
- `generate_pdf` in `tools.py` calls `write_pdf()` synchronously — blocks the entire FastAPI event loop
- All Supabase `.execute()` calls are sync in async handlers — event loop blocking

**Model Support (Subsystem D):**
- Add Gemini preview models (2.5-flash-preview, 2.5-pro-preview) as presets in settings dialog
- Verify Kimi K3 endpoint works with OpenAI-compatible shim
- No model validation — user can type any string

**UI Polish & Features (Subsystem E):**
- ~~`message.tsx` still has Catppuccin colors~~ → FIXED: replaced with Gruvbox equivalents
- ~~Invalid Tailwind classes `text-green`, `text-yellow`~~ → FIXED: replaced with hex colors
- ~~Sonner `<Toaster>` never mounted~~ → FIXED: mounted in layout.tsx
- `next-themes` dependency unused (no ThemeProvider)
- `shadcn` in `dependencies` instead of `devDependencies`
- No thread history sidebar (`listThreads()` function was removed)
- No cost tracking page
- Pay with card button disabled
- No mobile send button (keyboard Enter only)
- ~~PDF download endpoint has no auth~~ → FIXED: added `get_current_user` dependency
- PDF files not cleaned up / expired

**Deployment (Subsystem F):**
- ~~CORS origins hardcoded to `http://localhost:3000` in `.env`~~ → FIXED: reads from CORS_ORIGINS env var
- Stripe checkout URLs hardcoded to `http://localhost:3000`
- ~~No Dockerfile or deploy configuration~~ → FIXED: added `backend/Dockerfile` for Render
- No `pyproject.toml` (only requirements.txt)
- ~~`pdfs/` directory not in `.gitignore`~~ → FIXED: added to both root and backend .gitignore

**Planner Items:**
- OAuth (GitHub/Google) — deferred
- Cost tracking dashboard (separate page)
- Deployed URL for submission
- Friend-testing the full flow

### Known Issues (non-blocking)

- `get_supabase()` creates a new client on every call — no singleton
- No logging anywhere in the backend
- `import copy` is at module top but `import json` was duplicated (now fixed)
- No rate limiting on any endpoint
- No pagination on threads/messages
- Auth middleware uses `supabase.auth.get_user()` (HTTP call) instead of local JWT decode — slight latency per request

## Rules for next agent

- `SUPABASE_JWT_SECRET` must be set in backend `.env` (from Supabase Dashboard > Project Settings > API > JWT Secret)
- `STRIPE_WEBHOOK_SECRET` should be set for webhook verification to work
- Stripe checkout URLs are still hardcoded to localhost — fix before deploy
- Boot sequence `minDurationMs` prop ensures the screen is visible for a minimum time (currently 3500ms on landing page)
- Walking cat animation uses CSS `walk` and `walk-fade` keyframes in globals.css
