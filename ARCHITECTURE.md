# ClashCanvas Architecture — Plain English Edition

*The goal of this doc: you should be able to close it and sketch the whole system on paper.*

## The 30-second sketch

```
 Browser                      Next.js server (Vercel)              Outside world
┌─────────────────┐   POST   ┌──────────────────────┐
│ TopicForm        │ ───────▶ │ /api/debate          │ ──▶ Groq: Llama 3.3 (Side A)
│ DebateStage      │ ◀─SSE─── │  rate limit ✓        │ ──▶ Groq: Llama 4 Scout (Side B)
│ EndCard + share  │          │  moderation ✓        │ ──▶ Groq: 8B classifier (topic check)
└─────────────────┘   POST   ├──────────────────────┤
        ▲          ───────▶  │ /api/analyze         │ ──▶ Gemini 2.5 Flash (judge)
        └──verdict JSON────── │  runs both in        │ ──▶ HF Space (strength model)
                              │  parallel            │
                              └──────────────────────┘
```

One page, two API routes, four AI calls total per debate. That's the whole system.

## The pieces, file by file

### Frontend (what the user sees)

- **`app/page.tsx`** — the only page. It renders one of four "faces" depending on
  where we are in the lifecycle: topic form → live arena → verdict card → (or error).
- **`lib/client/useDebate.ts`** — the frontend's brain. A custom React hook that
  owns the state machine (`idle → debating → analyzing → done`), reads the debate
  stream, and fetches the verdict. Components never touch the network themselves —
  they just render whatever this hook says. That separation is why each component
  file stays readable.
- **`components/TopicForm.tsx`** — landing view. One input, one button.
- **`components/DebateStage.tsx`** — the arena. Renders the transcript as it grows;
  the last turn shows a blinking caret while text streams in.
- **`components/EndCard.tsx`** — the verdict poster + share buttons. Uses
  `html-to-image` to turn the card's exact DOM node into a PNG in the browser —
  no server, no Puppeteer.

### Backend (the two API routes)

- **`app/api/debate/route.ts`** — the debate orchestrator. It loops through
  4 rounds × 2 sides = 8 turns. For each turn it calls the right Groq model and
  forwards every text fragment to the browser the moment it arrives.
- **`app/api/analyze/route.ts`** — takes the finished transcript and runs the
  two analyses *in parallel* (the judge and the strength model don't need each
  other), then merges them into one Verdict JSON.

### The thinking parts

- **`lib/debate/prompts.ts`** — the debaters' "scripts." Each debater gets a fixed
  persona (system prompt) and, every turn, the transcript so far plus round-specific
  instructions. Feeding each side the other's words is what makes them clash
  instead of monologue.
- **`lib/analysis/judge.ts`** — Gemini as an impartial judge. Uses *structured
  output*: we hand it a schema (via zod) and the AI SDK guarantees the response is
  exactly that JSON shape — fallacies, best moment, fallback strength scores.
  Deliberately a different model than the debaters so the verdict isn't self-graded.
- **`lib/analysis/strength.ts`** — calls the real ML model (see below) and falls
  back to the judge's scores if it's unreachable. The product never breaks because
  the ML service is napping.
- **`lib/guardrails/moderation.ts`** — a fast classifier model checks the topic
  before any debate starts. Toggle: `ENABLE_MODERATION=false`.
- **`lib/guardrails/rateLimit.ts`** — N debates per IP per hour, in memory.
  Toggle: `ENABLE_RATE_LIMIT=false`.

### The ML service (`ml-service/`)

A tiny Python FastAPI app meant to run as a **free HuggingFace Space**. It loads
`webis/argument-quality-ibm-reproduced` — a BERT model reproducing IBM Project
Debater's argument-quality research — once at boot, and exposes `POST /score`:
send `{ topic, texts }`, get back a 0–1 quality score per argument. The Next.js
app finds it via the `STRENGTH_API_URL` env var.

Why a separate service at all? Because a ~400MB PyTorch model can't live inside a
Vercel serverless function. Free Spaces give us a always-on-ish CPU box for exactly
this job. (Free Spaces *sleep* when idle — the first request after a nap is slow,
which is why `strength.ts` has a 25s timeout and a fallback.)

## Concepts worth knowing by name

- **SSE (Server-Sent Events)** — a one-way stream from server to browser over a
  plain HTTP response. Each message is a line starting `data: ...` followed by a
  blank line. We chose it over WebSockets because the user only *watches*; nothing
  needs to flow upstream mid-debate. `useDebate.ts` parses it by hand (~15 lines)
  so you can see there's no magic.
- **Streaming LLM output** — `streamText()` from the AI SDK gives us an async
  iterable of text fragments as the model generates them. We forward each fragment
  straight into the SSE stream. That's the entire "live" effect.
- **Structured output** — `generateText()` + `Output.object({ schema })` makes the
  model return validated JSON instead of prose we'd have to parse with regexes.
- **Hybrid scoring** — fallacy detection comes from an LLM judge (accuracy matters,
  small HF fallacy models are unreliable); strength scoring comes from a real
  pre-trained HF model (defensible, numeric, portfolio-worthy), with the judge as
  fallback.

## Where the money doesn't go

| Thing | Runs on | Cost |
|---|---|---|
| Web app + API routes | Vercel free tier | $0 |
| Both debaters + moderation | Groq free tier | $0 |
| Judge | Gemini free tier | $0 |
| Strength model | HF Spaces free CPU | $0 |
| Share image | The user's own browser | $0 |
