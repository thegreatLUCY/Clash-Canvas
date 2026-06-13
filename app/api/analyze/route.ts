import { judgeDebate } from '@/lib/analysis/judge';
import { scoreStrengthML } from '@/lib/analysis/strength';
import { Turn, Verdict } from '@/lib/types';

export const maxDuration = 60;

// If the strength gap is smaller than this (out of 100), we don't pretend
// the scoring can split hairs — we call it "Too Close to Call".
const TIE_MARGIN = 4;

// The ensemble: each turn's quality is a blend of the DistilBERT score (an
// objective, debater-blind read of argument quality) and the LLM judge's score
// (which actually understands the clash — did B answer A?). 50/50 by default.
const ML_WEIGHT = 0.5;

// Logical fouls finally cost something. Each fallacy the judge finds knocks
// points off that side's final strength, capped so one messy round can't bury
// an otherwise strong case.
const PENALTY_PER_FALLACY = 5;
const PENALTY_CAP = 20;

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

    // Build one 0-100 score per turn. The judge always contributes its clash-
    // aware score; if DistilBERT also answered, we blend the two. If the ML
    // Space is asleep, the judge scores alone.
    const turnScores = transcript.map((t, i) => {
      const match = judge.turnStrengths.find((s) => s.side === t.side && s.round === t.round);
      const judgeScore = match?.score ?? (t.side === 'A' ? judge.strengthA : judge.strengthB);
      if (!ml) return judgeScore;
      const mlScore = ml[i] * 100;
      return ML_WEIGHT * mlScore + (1 - ML_WEIGHT) * judgeScore;
    });

    const avg = (nums: number[]) => nums.reduce((s, v) => s + v, 0) / Math.max(nums.length, 1);
    const sideScores = (side: 'A' | 'B', round?: number) =>
      turnScores.filter(
        (_, i) =>
          transcript[i].side === side && (round === undefined || transcript[i].round === round),
      );

    // Raw quality (pre-penalty) — also what the round-by-round bars show.
    const qualityA = avg(sideScores('A'));
    const qualityB = avg(sideScores('B'));
    const perRound = [0, 1, 2, 3].map((r) => ({
      a: Math.round(avg(sideScores('A', r))),
      b: Math.round(avg(sideScores('B', r))),
    }));

    // Foul penalty: count each side's fallacies, dock points (capped).
    const foulPenalty = (side: 'A' | 'B') =>
      Math.min(judge.fallacies.filter((f) => f.side === side).length * PENALTY_PER_FALLACY, PENALTY_CAP);
    const penaltyA = foulPenalty('A');
    const penaltyB = foulPenalty('B');

    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    const strengthA = clamp(qualityA - penaltyA);
    const strengthB = clamp(qualityB - penaltyB);

    const verdict: Verdict = {
      winner: Math.abs(strengthA - strengthB) < TIE_MARGIN ? 'tie' : strengthA > strengthB ? 'A' : 'B',
      strengthA: Math.round(strengthA),
      strengthB: Math.round(strengthB),
      penaltyA,
      penaltyB,
      perRound,
      strengthSource: ml ? 'ensemble' : 'judge',
      fallacies: judge.fallacies,
      bestMoment: judge.bestMoment,
    };

    return Response.json(verdict);
  } catch (err) {
    console.error('Analysis failed:', err);
    return Response.json({ error: 'The judge fell asleep. Please try again.' }, { status: 500 });
  }
}
