import { streamText } from 'ai';
import { resolveDebater, getActiveModels, modelLabel } from '@/lib/debate/models';
import { systemPrompt, turnPrompt } from '@/lib/debate/prompts';
import { isTopicAllowed } from '@/lib/guardrails/moderation';
import { checkRateLimit, ipFromRequest } from '@/lib/guardrails/rateLimit';
import { DebateEvent, ROUND_NAMES, Side, Turn } from '@/lib/types';

// Allow up to 5 minutes — a full 8-turn debate takes a while even on Groq.
export const maxDuration = 300;

// Which model argues each side is chosen live from the /admin panel (see
// lib/debate/models.ts). Each side runs on its own OpenRouter key.

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
        // Tell the client which models are fighting, so the result card can
        // name them instead of guessing.
        const live = getActiveModels();
        send({ type: 'meta', models: { a: modelLabel(live.a), b: modelLabel(live.b) } });

        for (let round = 0; round < ROUND_NAMES.length; round++) {
          for (const side of ['A', 'B'] as Side[]) {
            send({ type: 'turn-start', side, round });

            // Failsafe: if a model returns nothing (hiccup, filter, empty
            // stream), retry once. A debate where one side is silent must
            // abort loudly, never continue hollow.
            let fullText = '';
            for (let attempt = 0; attempt < 2 && !fullText.trim(); attempt++) {
              const result = streamText({
                model: resolveDebater(side),
                system: systemPrompt(side, topic),
                prompt: turnPrompt(side, round, transcript),
                // Generous cap: reasoning flagships (GPT-5, Opus, R1) spend
                // hidden tokens thinking before the visible ~90-word argument.
                maxOutputTokens: 1200,
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
