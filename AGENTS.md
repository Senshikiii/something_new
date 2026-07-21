# AGENTS.md

## What this is

MicroManus — a deep research AI agent web app with usage-based billing. Assignment for Dr Droid.

## Stack

- **Frontend:** Next.js 16 (Vercel)
- **Backend:** FastAPI (Render, Docker)
- **Auth/DB:** Supabase (Postgres + Auth)
- **Payments:** Stripe test mode + coupon code `SID_DRDROID`
- **Agent tools:** DuckDuckGo (free, no API key)
- **LLMs:** BYO API key — OpenAI, Gemini, Groq, Kimi (Moonshot)
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
- Cost tracking: per-model pricing (industry standard rates), modal in chat toolbar

## State as of 2026-07-21

### Completed

**Subsystem 1 — Auth + Paywall:**
- Supabase schema applied with security (SECURITY DEFINER, search_path, REVOKE/GRANT)
- Coupon path: `SID_DRDROID` grants 5 credits (idempotent — one per user)
- Stripe path: test-mode checkout (button is disabled in UI)
- Credit deduction: BEFORE agent run (atomic `deduct_credit_if_available` RPC with advisory lock)
- Anonymous sign-in for guest access
- OAuth (GitHub/Google) — code complete, needs dashboard setup

**Subsystem 2 — Chat + Agent Loop:**
- Chat UI, thread management, message history
- Agent loop with 10-iteration cap + error feedback
- DuckDuckGo web search tool
- SSE streaming events (content, thinking, tool_call, tool_result, error, usage)
- Markdown rendering + code syntax highlighting
- Animated typing indicator with iteration counter
- Tool results displayed inline, error events visible
- Token usage tracking (saved to DB)
- Groq empty response fix (retry without tools on empty content)
- Better error messages for API failures (tool_use_failed, rate limits)

**Subsystem 3 — PDF Report Generation:**
- WeasyPrint-based HTML-to-PDF
- `generate_pdf` tool in agent's toolset
- PDFs stored on filesystem, served via GET `/api/chat/pdf/{pdf_id}`
- Frontend download button
- HTML injection prevention (all content escaped)

**Subsystem 4 — Multi-Model Support (BYO Key):**
- User inputs API key in settings dialog (stored in localStorage)
- Presets for: Gemini 2.5 Flash, Gemini 2.5 Pro, Groq Llama 3.3 70B, OpenAI GPT-4o, OpenAI GPT-4o-mini, Kimi
- Backend never stores keys — sent per-request, used, discarded
- Per-model pricing for cost calculation

**Subsystem 5 — Cost Tracking Dashboard:**
- Modal in chat toolbar (not separate page)
- Backend endpoint: GET `/api/costs/summary`
- Per-model pricing: GPT-4o, GPT-4o-mini, Claude, Gemini, Groq, Kimi
- Shows: thread title, model, input/output/cache tokens, computed cost

**Subsystem A — Auth & Security:**
- `backend/app/auth/deps.py`: FastAPI JWT verification via `supabase.auth.get_user()`
- All routes use `Depends(get_current_user)` — no user_id from request bodies
- `GET /api/credits/balance` (no path param — derives from JWT)
- Stripe webhook: signature verification via `construct_event()` with STRIPE_WEBHOOK_SECRET
- Coupon idempotency: checks `credits_transactions` for existing coupon grant
- Frontend: all `fetch()` calls send `Authorization: Bearer <token>`
- Frontend: `supabase.ts` guards missing env vars
- PDF HTML injection prevention (all content escaped)

**UI Whimsy:**
- `BootSequence` component: real async terminal boot screen on first visit
- `PixelCat`, `PixelWhale`, `PixelStar`, `WalkingCat` SVG components
- Walking cat: pixel cat that traverses viewport bottom
- Floating pixel art at varied depths/speeds in background
- Pixel cat icon in terminal title bar
- Gruvbox Dark color scheme (warm retro: amber, teal, red earth tones)

**Deployment:**
- Backend: Render (Docker) — https://something-new-1-ywck.onrender.com
- Frontend: Vercel — https://something-new-five.vercel.app
- All env vars wired

### Remaining Work

**Must Do Before Submission:**
- [ ] Enable GitHub OAuth in Supabase Dashboard (code done, needs provider setup)
- [ ] Enable Google OAuth in Supabase Dashboard (code done, needs provider setup)
- [ ] Add redirect URLs to Supabase URL Configuration
- [ ] Friend-test the full flow end-to-end
- [ ] Commit & push latest changes

**Nice to Have (Post-Submission):**
- [ ] Thread history sidebar
- [ ] Stripe checkout live (button disabled in UI)
- [ ] Rate limiting on endpoints
- [ ] Structured logging in backend
- [ ] Fix sync Supabase calls (`.execute()` blocks event loop)
- [ ] `stream_llm()` defined but never used (UX: user waits for full response)
- [ ] Tool result truncation at 2000 chars can cut JSON mid-string
- [ ] `generate_pdf` calls `write_pdf()` synchronously — blocks event loop

### Known Issues (non-blocking)

- `get_supabase()` creates a new client on every call — no singleton
- No logging anywhere in the backend
- No rate limiting on any endpoint
- No pagination on threads/messages
- Auth middleware uses `supabase.auth.get_user()` (HTTP call) instead of local JWT decode — slight latency per request
- `next-themes` dependency unused (no ThemeProvider)
- `shadcn` in `dependencies` instead of `devDependencies`

## Rules for next agent

- `SUPABASE_JWT_SECRET` must be set in backend `.env` (from Supabase Dashboard > Project Settings > API > JWT Secret)
- `STRIPE_WEBHOOK_SECRET` should be set for webhook verification to work
- Stripe checkout URLs are still hardcoded to localhost — fix before deploy
- Boot sequence `minDurationMs` prop ensures the screen is visible for a minimum time (currently 3500ms on landing page)
- Walking cat animation uses CSS `walk` and `walk-fade` keyframes in globals.css
- OAuth code is complete but needs Supabase Dashboard configuration (GitHub/Google provider setup)
- Cost tracking uses industry standard pricing per 1M tokens (see `backend/app/config.py`)
- Groq Llama 3.3 70B has known issues with tool calling — agent retries without tools on empty response
