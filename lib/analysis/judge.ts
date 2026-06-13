import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { ROUND_NAMES, Turn } from '@/lib/types';

// The judge is Gemini — deliberately a different model from the debaters (which
// run on OpenRouter). Its per-turn scores are blended with DistilBERT in the
// analyze route (the ensemble), and the fallacies it finds dock points off the
// final strength. Gemini's structured-output mode returns clean JSON to render.
//
// "Structured output" means: instead of asking the model for prose and parsing
// it with regexes and prayer, we hand it a schema (via zod) and the AI SDK
// guarantees the response matches that exact shape — or throws.

const judgeSchema = z.object({
  fallacies: z.array(
    z.object({
      side: z.enum(['A', 'B']),
      round: z.number().int().min(0).max(3),
      type: z.string().describe('Short fallacy name, e.g. "Straw Man", "Appeal to Emotion"'),
      quote: z.string().describe('The offending sentence, quoted verbatim from the transcript'),
      explanation: z.string().describe('One plain-English sentence explaining the error'),
    }),
  ),
  bestMoment: z.object({
    round: z.number().int().min(0).max(3),
    quoteA: z.string().describe("Debater A's line in the exchange, verbatim, max 25 words"),
    quoteB: z.string().describe("Debater B's line in the exchange, verbatim, max 25 words"),
    why: z.string().describe('One sentence on why this was the most dramatic clash'),
  }),
  // Fallback strength scores in case the dedicated ML model is unavailable.
  strengthA: z.number().min(0).max(100),
  strengthB: z.number().min(0).max(100),
  turnStrengths: z
    .array(
      z.object({
        side: z.enum(['A', 'B']),
        round: z.number().int().min(0).max(3),
        score: z.number().min(0).max(100),
      }),
    )
    .describe('A strength score for every single turn in the transcript — 8 entries total'),
});

export type JudgeResult = z.infer<typeof judgeSchema>;

export async function judgeDebate(topic: string, transcript: Turn[]): Promise<JudgeResult> {
  const rendered = transcript
    .map((t) => `[Round ${t.round} — ${ROUND_NAMES[t.round]} — Debater ${t.side}]: ${t.text}`)
    .join('\n\n');

  const { output } = await generateText({
    model: google('gemini-2.5-flash'),
    // Gemini's free tier throws transient 503s under load; retry harder
    // before giving up — a failed judge kills the whole verdict.
    maxRetries: 5,
    output: Output.object({ schema: judgeSchema }),
    system: [
      'You are a strict, impartial debate judge with expertise in informal logic.',
      'Only report real, defensible fallacies — a wrong label is worse than a missed one.',
      'Report at most 4 fallacies per side. Quotes must appear verbatim in the transcript.',
      'Per-turn strength scores must reward winning the clash: directly rebutting the opponent, evidence quality, and logical coherence — not merely sounding polished. Spread scores across the full 0-100 range; do not bunch everything near the middle.',
    ].join(' '),
    prompt: `Topic: "${topic}"\n\nFull debate transcript:\n\n${rendered}`,
  });

  return output;
}
