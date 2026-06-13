// Shared shapes used by both the API routes (server) and the React UI (client).
// Keeping them in one file means the frontend and backend can never disagree
// about what a "turn" or a "verdict" looks like.

export type Side = 'A' | 'B';

export const ROUND_NAMES = [
  'Opening Statement',
  'Rebuttal',
  'Counter-Rebuttal',
  'Closing Statement',
] as const;

export interface Turn {
  side: Side;
  round: number; // 0-based index into ROUND_NAMES
  text: string;
}

// One logical error the judge found in a specific argument.
export interface Fallacy {
  side: Side;
  round: number;
  type: string; // e.g. "Straw Man", "Appeal to Emotion"
  quote: string; // the offending sentence, verbatim
  explanation: string; // one plain-English sentence
}

// The single most dramatic exchange of the debate.
export interface BestMoment {
  round: number;
  quoteA: string;
  quoteB: string;
  why: string;
}

export interface Verdict {
  winner: Side | 'tie';
  // 0-100 final argument strength per side, AFTER the fallacy penalty.
  strengthA: number;
  strengthB: number;
  // Points deducted from each side for the logical fouls they committed.
  penaltyA: number;
  penaltyB: number;
  // Round-by-round strength — one {a, b} pair per round, 0-100 each.
  // The ensemble's per-round clash, made visible as a tug-of-war.
  perRound: { a: number; b: number }[];
  // How strength was scored:
  //  'ensemble' = DistilBERT quality blended with the LLM judge's clash scores
  //  'judge'    = ML Space was asleep, so the judge scored alone
  strengthSource: 'ensemble' | 'judge';
  fallacies: Fallacy[];
  bestMoment: BestMoment;
}

// Events sent over the SSE stream from /api/debate to the browser.
export type DebateEvent =
  | { type: 'meta'; models: { a: string; b: string } } // model labels, sent once up front
  | { type: 'turn-start'; side: Side; round: number }
  | { type: 'delta'; text: string } // a few characters of the current turn
  | { type: 'turn-end' }
  | { type: 'done' }
  | { type: 'error'; message: string };
