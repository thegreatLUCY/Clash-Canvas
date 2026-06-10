import { judgeDebate } from '@/lib/analysis/judge';
import { scoreStrengthML } from '@/lib/analysis/strength';
import { Turn, Verdict } from '@/lib/types';

export const maxDuration = 60;

// If the strength gap is smaller than this (out of 100), we don't pretend
// the ML can split hairs — we call it "Too Close to Call".
const TIE_MARGIN = 4;

export async function POST(req: Request) {
  const { topic, transcript } = (await req.json()) as { topic?: string; transcript?: Turn[] };

  if (!topic || !transcript || transcript.length === 0) {
    return Response.json({ error: 'Missing topic or transcript.' }, { status: 400 });
  }

  try {
    // The judge (Gemini) and the strength model (HuggingFace) don't depend on
    // each other, so they run concurrently — the user only waits for the
    // slower of the two instead of the sum.
    const [judge, ml] = await Promise.all([
      judgeDebate(topic, transcript),
      scoreStrengthML(topic, transcript),
    ]);

    // Build one 0-100 score per turn, from the ML model if it answered,
    // otherwise from the judge's per-turn scores (with a last-resort default
    // of the judge's overall side score, in case it skipped a turn).
    const turnScores = transcript.map((t, i) => {
      if (ml) return ml[i] * 100;
      const match = judge.turnStrengths.find((s) => s.side === t.side && s.round === t.round);
      return match?.score ?? (t.side === 'A' ? judge.strengthA : judge.strengthB);
    });

    const avg = (nums: number[]) => nums.reduce((s, v) => s + v, 0) / Math.max(nums.length, 1);
    const sideScores = (side: 'A' | 'B', round?: number) =>
      turnScores.filter(
        (_, i) =>
          transcript[i].side === side && (round === undefined || transcript[i].round === round),
      );

    const strengthA = avg(sideScores('A'));
    const strengthB = avg(sideScores('B'));
    const perRound = [0, 1, 2, 3].map((r) => ({
      a: Math.round(avg(sideScores('A', r))),
      b: Math.round(avg(sideScores('B', r))),
    }));

    const verdict: Verdict = {
      winner: Math.abs(strengthA - strengthB) < TIE_MARGIN ? 'tie' : strengthA > strengthB ? 'A' : 'B',
      strengthA: Math.round(strengthA),
      strengthB: Math.round(strengthB),
      perRound,
      strengthSource: ml ? 'ml' : 'judge',
      fallacies: judge.fallacies,
      bestMoment: judge.bestMoment,
    };

    return Response.json(verdict);
  } catch (err) {
    console.error('Analysis failed:', err);
    return Response.json({ error: 'The judge fell asleep. Please try again.' }, { status: 500 });
  }
}
