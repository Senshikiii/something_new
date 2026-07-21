# MicroManus — Technical Documentation

## Architecture Decisions & Trade-offs

### 1. Hand-built Agent Loop vs LangChain/Vercel AI SDK

**Decision:** Built the agent loop from scratch (~80 lines of Python).

**Why:**
- The pattern is simple: `while` loop with max iteration counter
- Framework abstractions add complexity for a linear loop that calls one LLM and one tool
- Full control over error handling, token counting, and streaming format
- Easier to debug — every step is explicit in one file
- No dependency on framework updates or breaking changes

**Trade-off:** More boilerplate code, but the loop is simple enough that this doesn't matter. If we needed complex multi-agent orchestration, a framework would make sense.

### 2. DuckDuckGo vs Brave Search API

**Decision:** Switched from Brave Search API to DuckDuckGo.

**Why:**
- DuckDuckGo is completely free with no API key required
- No rate limits for reasonable usage
- Simpler setup — no environment variable needed
- Good enough for research queries

**Trade-off:** Brave Search has better structured results and more metadata. DuckDuckGo results are less structured but sufficient for our use case.

### 3. Atomic Credit Deduction

**Decision:** Used Postgres advisory locks for atomic credit check+deduct.

**Why:**
- Original implementation had race condition: check balance → deduct credits (two separate operations)
- Could grant credits to user who already spent them between check and deduct
- Advisory lock ensures only one transaction can run per user at a time
- Single Postgres function `deduct_credit_if_available` does both operations atomically

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.deduct_credit_if_available(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  granted boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(('x' || substr(uid::text, 1, 8))::bit(32)::int);
  UPDATE profiles SET credits = credits - 1 WHERE id = uid AND credits > 0;
  granted := FOUND;
  IF granted THEN
    INSERT INTO credits_transactions (user_id, amount, reason) VALUES (uid, -1, 'agent_run');
  END IF;
  RETURN granted;
END;
$function$;
```

### 4. PDF Generation with WeasyPrint

**Decision:** Used WeasyPrint for HTML-to-PDF conversion.

**Why:**
- Python-native, no external dependencies like wkhtmltopdf
- Good CSS support (flexbox, grid, custom fonts)
- Can generate PDFs from HTML strings directly
- Docker-friendly (system deps: pango, cairo, gdk-pixbuf)

**Security:** All user content is escaped with `html.escape()` before HTML insertion to prevent injection attacks.

### 5. SSE Streaming Architecture

**Decision:** Server-Sent Events for real-time agent progress.

**Why:**
- Simpler than WebSockets for one-way communication
- Built-in browser support (EventSource API)
- Works with FastAPI's async generators
- Automatic reconnection if connection drops

**Event types:**
- `thinking` — Agent's internal reasoning
- `tool_call` — Agent is calling a tool
- `tool_result` — Tool returned data
- `content` — Streaming text token
- `usage` — Token counts for cost tracking
- `error` — Something went wrong

### 6. BYO API Key Architecture

**Decision:** User supplies their own LLM API keys, never stored on backend.

**Why:**
- No LLM costs for us
- User controls their own usage
- No rate limiting on our end
- Supports any OpenAI-compatible endpoint

**Implementation:**
- Keys stored in browser's `localStorage`
- Sent with each request in headers
- Backend reads, uses for LLM call, discards
- Never logged or persisted

### 7. Cost Tracking with Per-Model Pricing

**Decision:** Industry standard pricing per 1M tokens.

**Why:**
- Shows actual cost to user, not just token counts
- Uses published API pricing from each provider
- Allows meaningful cost comparison across models
- Transparent about what each conversation costs

**Pricing table:**
| Model | Input | Output | Cache |
|---|---|---|---|
| GPT-4o | $2.50 | $10.00 | $1.25 |
| GPT-4o-mini | $0.15 | $0.60 | $0.075 |
| Claude 3.5 Sonnet | $3.00 | $15.00 | $0.30 |
| Gemini 2.5 Flash | $0.15 | $0.60 | $0.0375 |
| Gemini 2.5 Pro | $1.25 | $10.00 | $0.3125 |
| Groq Llama 3.3 70B | $0.59 | $0.79 | — |
| Kimi K3 | $0.70 | $2.80 | — |

## Key Implementation Details

### Database Schema

```sql
-- User profiles with credit balance
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit transaction audit log
CREATE TABLE credits_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversation threads
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Individual messages with token tracking
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tool_calls JSONB,
  tool_call_id TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_cache INTEGER,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Security Model

1. **JWT Verification:** Every backend request verifies the Supabase JWT token
2. **No User ID from Request Bodies:** User ID always derived from JWT, never trusted from client
3. **Atomic Credit Deduction:** Advisory lock prevents race conditions
4. **PDF Injection Prevention:** All user content escaped before HTML insertion
5. **RLS Policies:** Users can only read their own data

### Agent Loop Flow

```
User message
    ↓
Save to messages table (role='user')
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

### Cost Calculation

```python
cost = (tokens_input / 1_000_000) * input_price
      + (tokens_output / 1_000_000) * output_price
      + (tokens_cache / 1_000_000) * cache_price
```

## Deployment

### Frontend (Vercel)
- Automatic deployments from `main` branch
- Environment variables configured in Vercel dashboard
- `BACKEND_URL` points to Render deployment

### Backend (Render)
- Docker-based deployment
- `Dockerfile` installs WeasyPrint system dependencies
- Environment variables configured in Render dashboard
- `CORS_ORIGINS` allows frontend domain

## Known Limitations

1. **No OAuth:** Social login deferred (email/password only)
2. **No Thread History:** Users can't see past conversations (sidebar not built)
3. **No Rate Limiting:** Any authenticated user can make unlimited requests
4. **Sync Supabase Calls:** Some `.execute()` calls are sync in async handlers (event loop blocking)
5. **No Logging:** Backend has no structured logging
6. **Stripe Checkout URLs:** Still hardcoded to localhost (disabled in UI)

## Interview Talking Points

1. **Why hand-built the agent loop?** Simplicity, control, no framework overhead for a linear pattern
2. **How did you handle the race condition?** Postgres advisory locks in a single atomic function
3. **Why DuckDuckGo over Brave?** Free, no API key, sufficient for research queries
4. **How does BYO key work?** Keys in localStorage, sent per-request, never stored on backend
5. **How do you calculate costs?** Industry standard pricing per 1M tokens, aggregated per thread
6. **What security measures did you take?** JWT verification, no user_id from request bodies, atomic credit deduction, PDF injection prevention
