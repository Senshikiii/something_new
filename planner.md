# why do I wanna build this thing? and what even is it? 

I need to build this for a project, and essentially this is what i'm supposed to build but this time it's almost with the help of coding agents? it's my first time doing this cuz i'm really skeptical abt them? but let's see

this is what I’m building

A web app where someone signs up, unlocks access via a coupon, then chats with an AI agent that can search the web, hold a conversation across multiple turns, produce a PDF report when asked, and show the person exactly what each conversation cost them, broken down by model and token type. The user brings their own API key — you never store or use your own.

we're not gonna use the real payment thingy, we'll rely on coupons instead, it'll be a free bypass but i'm just gonna mention the detes down below

## MicroManus — Build Roadmap

Deep research AI agent with usage-based billing. Assignment for Dr Droid
(Product Engineer role — https://www.ycombinator.com/companies/drdroid).

Stack: Next.js (Vercel) + FastAPI (Railway) + Supabase (auth/DB) + Stripe
(test mode) + Brave Search/SerpAPI (agent's web tool).

Rule: after each subsystem below is working, stop and explain it back
before moving to the next — own every decision, don't just ship what
OpenCode wrote.

---

## 1. Auth + Paywall
- [x] Supabase project set up, Postgres schema started (SQL applied + security hardened)
- [ ] Social login only — GitHub OAuth via Supabase Auth
- [ ] Social login — Google OAuth via Supabase Auth
- [x] New user lands on paywall screen after first login, before any chat access
- [x] Coupon path: hardcoded code `SID_DRDROID` bypasses paywall instantly
- [x] Payment path: Stripe test-mode checkout, real card form (test card numbers)
- [x] Both paths grant exactly 5 credits on success
- [x] Credits stored per user in DB, decrement logic wired (even if usage deduction comes later)

## 2. Chat Interface + Agent Loop
- [x] Web UI: chat window, message history, input box
- [x] "New chat" creates a new conversation thread
- [x] Each thread holds its own message history/context — no bleed between threads
- [x] Backend: hand-built agent loop (no framework) — think → tool call → observe → repeat
- [x] Tool: web search (Brave Search API, coded but needs BRAVE_API_KEY to test)
- [x] Loop termination: max iteration cap (10), handles no-more-tool-calls-needed case
- [x] Failure handling: malformed tool call / tool failure fed back to model instead of crashing

## 3. PDF Artifact Generation
- [ ] Agent can decide, mid-conversation, that a PDF report is the right output for a research task
- [ ] PDF generation triggered as a distinct tool/action, separate from normal chat replies
- [ ] Generated PDF is downloadable/viewable from the chat UI

## 4. Multi-Model Support (BYO Key)
- [ ] User can input their own API key (OpenAI-compatible endpoint)
- [ ] No key ever hardcoded/stored on the backend beyond the user's session
- [ ] Support at least 3–4 models across Claude, OpenAI, Kimi (confirm exact Kimi K3 endpoint/model string from Moonshot docs before wiring)
- [ ] Model selection surfaced in the UI when adding a key

## 5. Cost Tracking Dashboard
- [ ] Separate page, not mixed into the chat UI
- [ ] Lists past chats with per-chat cost
- [ ] Cost broken down by input / output / cache tokens
- [ ] Pricing calculated per the specific model used for that chat/call
- [ ] Numbers update as new chats/calls happen

---

## Submission
- [ ] Deployed to a real web URL (no localhost, no bare GitHub repo)
- [ ] Friend-tested full flow end to end before sending
- [ ] Signup URL sent to Siddarth via email
- [ ] Stretch goal: fully working Stripe card-add-and-approve flow (the "great outcome" bar)





