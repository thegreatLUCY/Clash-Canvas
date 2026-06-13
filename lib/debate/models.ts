import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';
import { Side } from '@/lib/types';

// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS
// ---------------------------------------------------------------------------
// We want to pick which LLM argues each side from a small admin dropdown — live,
// without redeploying. Two rules make that safe:
//
//   1. ALLOW-LIST. The browser never gets to name an arbitrary model. It can
//      only choose from MODEL_OPTIONS below, and the server re-checks the
//      choice. So nobody can poke the API and make us run something expensive
//      or weird.
//
//   2. ONE KEY PER SIDE ("switching the key"). Side A talks to OpenRouter with
//      OPENROUTER_API_KEY_A, Side B with OPENROUTER_API_KEY_B. Picking a model
//      doesn't mean juggling keys by hand — each side is permanently wired to
//      its own key. Use two free OpenRouter accounts to double your daily quota,
//      or one key in both slots if you only have one.
// ---------------------------------------------------------------------------

// The menu. Edit this list freely — anything you add here becomes selectable in
// the admin panel and accepted by the API. IDs are OpenRouter model slugs
// (https://openrouter.ai/models), all verified live against our key.
//
// These are flagship paid models. We deliberately skip OpenRouter's ":free"
// variants — they share a heavily rate-limited pool and 429 constantly.
//
// Several of these (GPT-5, Opus, DeepSeek R1, Gemini Pro) are "reasoning"
// models that think in hidden tokens. That used to silence a debater under a
// tight output cap; resolveDebater() below fixes it by giving headroom and
// setting reasoning effort to "low" with the thinking excluded from the stream.
export const MODEL_OPTIONS: { id: string; label: string }[] = [
  { id: 'openai/gpt-5.5', label: 'GPT-5.5' },
  { id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 Mini' },
  { id: 'anthropic/claude-opus-4.8', label: 'Claude Opus 4.8' },
  { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6' },
  { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro' },
  { id: 'google/gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2' },
  { id: 'deepseek/deepseek-r1-0528', label: 'DeepSeek R1' },
  { id: 'x-ai/grok-4.3', label: 'Grok 4.3' },
  { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick' },
  { id: 'qwen/qwen3-max', label: 'Qwen3 Max' },
  { id: 'mistralai/mistral-large-2512', label: 'Mistral Large' },
];

const MODEL_IDS = new Set(MODEL_OPTIONS.map((m) => m.id));

export function isAllowedModel(id: unknown): id is string {
  return typeof id === 'string' && MODEL_IDS.has(id);
}

// Defaults the app boots with — a flagship clash: GPT-5.5 vs Claude Opus 4.8.
// Override per side via env; otherwise these reliable picks.
const DEFAULT_A = isAllowedModel(process.env.DEBATER_A_MODEL)
  ? process.env.DEBATER_A_MODEL
  : 'openai/gpt-5.5';
const DEFAULT_B = isAllowedModel(process.env.DEBATER_B_MODEL)
  ? process.env.DEBATER_B_MODEL
  : 'anthropic/claude-opus-4.8';

// ---------------------------------------------------------------------------
// THE LIVE CHOICE
// ---------------------------------------------------------------------------
// This is the currently-selected pairing. The admin panel writes it; the debate
// route reads it. It lives in memory, so it resets to the env defaults whenever
// the server cold-starts or redeploys. That's the $0 trade-off: no database.
// The env vars are your durable default; the panel is your live override.
let active: { a: string; b: string } = { a: DEFAULT_A, b: DEFAULT_B };

export function getActiveModels(): { a: string; b: string } {
  return { ...active };
}

export function setActiveModels(next: { a: string; b: string }): { a: string; b: string } {
  if (!isAllowedModel(next.a) || !isAllowedModel(next.b)) {
    throw new Error('Model not in allow-list');
  }
  active = { a: next.a, b: next.b };
  return getActiveModels();
}

// One OpenRouter client per side, each holding its own key. Built lazily so a
// missing key only blows up when that side actually runs (with a clear message),
// not at import time.
function clientForSide(side: Side) {
  const apiKey = side === 'A' ? process.env.OPENROUTER_API_KEY_A : process.env.OPENROUTER_API_KEY_B;
  if (!apiKey) {
    throw new Error(`Missing OPENROUTER_API_KEY_${side} — set it in .env.local / Vercel env.`);
  }
  return createOpenRouter({ apiKey });
}

// Resolve the live model for a side into something streamText() can run.
// reasoning.effort 'low' keeps flagship reasoning models (GPT-5, Opus, R1…)
// fast and cheap; exclude: true drops their hidden thinking from the stream so
// only the actual argument reaches the arena.
export function resolveDebater(side: Side): LanguageModel {
  const modelId = side === 'A' ? active.a : active.b;
  return clientForSide(side).chat(modelId, {
    reasoning: { effort: 'low', exclude: true },
  });
}
