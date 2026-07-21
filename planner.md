# MicroManus — Build Roadmap

Deep research AI agent with usage-based billing. Assignment for Dr Droid
(Product Engineer role — https://www.ycombinator.com/companies/drdroid).

Stack: Next.js 16 (Vercel) + FastAPI (Render, Docker) + Supabase (auth/DB) + DuckDuckGo (free) + BYO LLM API key.

---

## Current State (2026-07-21)

### What's Built & Working

**Auth + Paywall:**
- Supabase schema applied with security (SECURITY DEFINER, search_path, REVOKE/GRANT)
- Anonymous sign-in for guest access
- Coupon path: `SID_DRDROID` grants 5 credits (idempotent — one per user)
- Stripe path: test-mode checkout (button disabled in UI)
- Credit deduction: BEFORE agent run (atomic `deduct_credit_if_available` RPC with advisory lock)
- Auth: Supabase JWT tokens verified on every backend request via `auth.get_user()`

**Chat + Agent Loop:**
- Chat UI, thread management, message history
- Agent loop with 10-iteration cap + error feedback
- DuckDuckGo web search tool
- SSE streaming events (content, thinking, tool_call, tool_result, error, usage)
- Markdown rendering + code syntax highlighting
- Animated typing indicator with iteration counter
- Tool results displayed inline, error events visible

**PDF Report Generation:**
- WeasyPrint-based HTML-to-PDF
- `generate_pdf` tool in agent's toolset
- PDFs stored on filesystem, served via GET `/api/chat/pdf/{pdf_id}`
- Frontend download button
- HTML injection prevention (all user content escaped)

**Multi-Model Support (BYO Key):**
- User inputs API key in settings dialog (stored in localStorage)
- Presets for: Gemini 2.5 Flash, Gemini 2.5 Pro, Groq Llama 3.3 70B, OpenAI GPT-4o, OpenAI GPT-4o-mini, Kimi
- Backend never stores keys — sent per-request, used, discarded

**Cost Tracking Dashboard:**
- Modal in chat toolbar showing per-thread cost breakdown
- Backend endpoint: GET `/api/costs/summary`
- Per-model pricing: GPT-4o, GPT-4o-mini, Claude, Gemini, Groq, Kimi
- Shows: thread title, model, input/output/cache tokens, computed cost

**Security:**
- JWT verification on all routes
- No user_id from request bodies (derived from JWT)
- Atomic credit deduction with advisory lock
- PDF HTML injection prevention
- CORS from env var

**UI:**
- Gruvbox Dark theme (warm retro: amber, teal, red earth tones)
- Terminal aesthetic: `$`-prefixed input, flat scrolling message log
- Pixel art decorations (cat, whale, star)
- Walking cat animation
- Boot sequence with async terminal boot screen

**Deployment:**
- Backend: Render (Docker) — https://something-new-1-ywck.onrender.com
- Frontend: Vercel — https://something-new-five.vercel.app
- All env vars wired

### What's Not Done (Your Tasks)

**Must Do Before Submission:**

| # | Task | Why | How |
|---|------|-----|-----|
| 1 | **Enable GitHub OAuth** | Core requirement: "signs up" | Create OAuth App → Supabase Dashboard → Providers → GitHub |
| 2 | **Enable Google OAuth** | Core requirement: "signs up" | Create OAuth Client → Supabase Dashboard → Providers → Google |
| 3 | **Add redirect URLs** | OAuth callback needs to work | Supabase → URL Configuration → add `http://localhost:3000/auth/callback` + production URL |
| 4 | **Friend-test the full flow** | Verify everything works | Sign up → coupon → chat → tool call → PDF → costs |
| 5 | **Commit & push changes** | Deploy latest fixes | `git add -A && git commit -m "feat: cost tracking + OAuth + bug fixes" && git push` |

**Nice to Have (Post-Submission):**

| # | Task | Why |
|---|------|-----|
| 6 | Thread history sidebar | Users can't see past conversations |
| 7 | Stripe checkout live | Button is disabled in UI |
| 8 | Rate limiting | No protection against abuse |
| 9 | Structured logging | No logs anywhere in backend |
| 10 | Fix sync Supabase calls | `.execute()` blocks event loop |

---

## 1. Auth + Paywall

- [x] Supabase project set up, Postgres schema applied + security hardened
- [ ] Social login — GitHub OAuth via Supabase Auth (code done, needs dashboard setup)
- [ ] Social login — Google OAuth via Supabase Auth (code done, needs dashboard setup)
- [x] Anonymous sign-in for guest access
- [x] New user lands on paywall screen after first login
- [x] Coupon path: hardcoded code `SID_DRDROID` bypasses paywall instantly
- [x] Payment path: Stripe test-mode checkout (button disabled in UI)
- [x] Both paths grant exactly 5 credits on success
- [x] Credits stored per user in DB, atomic deduction before agent run

## 2. Chat Interface + Agent Loop

- [x] Web UI: chat window, message history, input box
- [x] "New chat" creates a new conversation thread
- [x] Each thread holds its own message history/context
- [x] Backend: hand-built agent loop (no framework) — think → tool call → observe → repeat
- [x] Tool: web search (DuckDuckGo — no API key needed)
- [x] Tool: PDF generation (WeasyPrint)
- [x] Loop termination: max iteration cap (10)
- [x] Failure handling: malformed tool call / tool failure fed back to model
- [x] UI: markdown rendering, code syntax highlighting, animated typing indicator
- [x] Credit deduction before agent run (atomic)
- [x] Token usage tracking (saved to DB)
- [x] Groq empty response fix (retry without tools)
- [x] Better error messages for API failures

## 3. PDF Artifact Generation

- [x] Agent can decide to generate a PDF report
- [x] PDF generation as a distinct tool/action
- [x] Generated PDF is downloadable from chat UI
- [x] HTML injection prevention (all content escaped)

## 4. Multi-Model Support (BYO Key)

- [x] User can input their own API key (stored in localStorage)
- [x] No key ever stored on the backend
- [x] Support 6 models: Gemini Flash/Pro, Groq Llama, OpenAI GPT-4o/mini, Kimi
- [x] Model selection in UI via presets
- [x] Per-model pricing for cost calculation

## 5. Cost Tracking Dashboard

- [x] Modal in chat toolbar (not separate page)
- [x] Lists past chats with per-chat cost
- [x] Cost broken down by input / output / cache tokens
- [x] Pricing calculated per the specific model used
- [x] Numbers update as new chats happen

---

## Deployment Status

| Service | URL | Status |
|---------|-----|--------|
| Backend | https://something-new-1-ywck.onrender.com | ✅ Running |
| Frontend | https://something-new-five.vercel.app | ✅ Running |
| Supabase | — | ✅ Connected |

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (App Router) |
| UI | Tailwind v4 + shadcn/ui + Gruvbox Dark |
| Backend | FastAPI (Python 3.12, Docker) |
| Auth + DB | Supabase (Postgres + Auth) |
| Agent tools | DuckDuckGo (free) |
| LLMs | BYO API key (OpenAI-compatible) |
| PDF | WeasyPrint |
| Payments | Stripe (test mode, disabled) |
