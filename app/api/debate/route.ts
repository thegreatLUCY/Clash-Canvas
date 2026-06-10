import { streamText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { systemPrompt, turnPrompt } from '@/lib/debate/prompts';
import { isTopicAllowed } from '@/lib/guardrails/moderation';
import { checkRateLimit, ipFromRequest } from '@/lib/guardrails/rateLimit';
import { DebateEvent, ROUND_NAMES, Side, Turn } from '@/lib/types';

// Allow up to 5 minutes — a full 8-turn debate takes a while even on Groq.
export const maxDuration = 300;

// Two different models on purpose: Llama 3.3 vs Llama 4 Scout — old guard vs
// new generation. Both on Groq's free tier. Override per side in .env.local.
// Side B must be a NON-reasoning model: reasoning models (like gpt-oss) can
// spend the whole token budget "thinking" and emit zero visible words.
const MODEL_A = process.env.DEBATER_A_MODEL ?? 'llama-3.3-70b-versatile';
const MODEL_B = process.env.DEBATER_B_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct';

function sse(event: DebateEvent): string {
  // Server-Sent Events wire format: each message is "data: <payload>\n\n".
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: Request) {
  const { topic } = (await req.json()) as { topic?: string };

  if (!topic || topic.trim().length < 3 || topic.length > 200) {
    return Response.json({ error: 'Please enter a topic between 3 and 200 characters.' }, { status: 400 });
  }

  const { allowed } = checkRateLimit(ipFromRequest(req));
  if (!allowed) {
    return Response.json(
      { error: "You've hit the debate limit for this hour. Come back soon!" },
      { status: 429 },
    );
  }

  if (!(await isTopicAllowed(topic))) {
    return Response.json(
      { error: "That topic isn't something our debaters will touch. Try another one." },
      { status: 422 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: DebateEvent) => controller.enqueue(encoder.encode(sse(event)));
      const transcript: Turn[] = [];

      try {
        for (let round = 0; round < ROUND_NAMES.length; round++) {
          for (const side of ['A', 'B'] as Side[]) {
            send({ type: 'turn-start', side, round });

            // Failsafe: if a model returns nothing (hiccup, filter, empty
            // stream), retry once. A debate where one side is silent must
            // abort loudly, never continue hollow.
            let fullText = '';
            for (let attempt = 0; attempt < 2 && !fullText.trim(); attempt++) {
              const result = streamText({
                model: groq(side === 'A' ? MODEL_A : MODEL_B),
                system: systemPrompt(side, topic),
                prompt: turnPrompt(side, round, transcript),
                maxOutputTokens: 350,
                temperature: 0.8,
              });

              for await (const delta of result.textStream) {
                fullText += delta;
                send({ type: 'delta', text: delta });
              }
            }

            if (!fullText.trim()) {
              throw new Error(`Debater ${side} went silent in round ${round + 1}`);
            }

            transcript.push({ side, round, text: fullText });
            send({ type: 'turn-end' });
          }
        }

        send({ type: 'done' });
      } catch (err) {
        console.error('Debate stream failed:', err);
        send({ type: 'error', message: 'A debater lost their voice. Please try again.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
