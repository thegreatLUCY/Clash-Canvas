# ClashCanvas ⚔️

Type any topic. Watch two AI models fight it out live. Get an ML-scored verdict
with fallacy counts and a shareable card.

- **Plan:** [docs/ClashCanvas_MVP_Plan.md](docs/ClashCanvas_MVP_Plan.md)
- **How it works:** [ARCHITECTURE.md](ARCHITECTURE.md)

## Run it locally

1. `cp .env.example .env.local`
2. Fill in the two free API keys (links in the file):
   - `GROQ_API_KEY` — powers both debaters + moderation
   - `GOOGLE_GENERATIVE_AI_API_KEY` — powers the judge
3. `npm install && npm run dev` → http://localhost:3000

The app works fully with just those two keys (strength scores fall back to the
judge). To enable real-ML strength scoring, deploy `ml-service/` to a free
HuggingFace Space and set `STRENGTH_API_URL`.

## Dev toggles

In `.env.local`: `ENABLE_MODERATION=false` / `ENABLE_RATE_LIMIT=false`.
