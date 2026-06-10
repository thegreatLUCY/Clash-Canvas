import { Turn } from '@/lib/types';

// The "real ML" leg of the hybrid: argument strength comes from a pre-trained
// HuggingFace model (FareehaAly/fator-argument-quality, a DistilBERT fine-tuned
// for argument effectiveness) running in a free Python service — see
// ml-service/ in this repo, deployed to HF Spaces.
//
// The contract is tiny on purpose: POST { topic, texts: [...] } and get back
// { scores: [0..1, ...] }. If the service is down, cold-starting, or not
// configured yet, we return null and the caller falls back to the judge's
// scores — the product never breaks because of the ML service.

const TIMEOUT_MS = 25_000; // free HF Spaces sleep when idle; first call is slow

// Returns one 0..1 score per turn (aligned with the transcript order), or null
// if the service isn't configured/reachable. Aggregation happens in the route.
export async function scoreStrengthML(
  topic: string,
  transcript: Turn[],
): Promise<number[] | null> {
  const url = process.env.STRENGTH_API_URL;
  if (!url) return null;

  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, texts: transcript.map((t) => t.text) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`strength service responded ${res.status}`);

    const { scores } = (await res.json()) as { scores: number[] };
    if (!Array.isArray(scores) || scores.length !== transcript.length) {
      throw new Error('strength service returned malformed scores');
    }

    return scores;
  } catch (err) {
    console.error('ML strength scoring unavailable, falling back to judge:', err);
    return null;
  }
}
