import { ROUND_NAMES, Side, Turn } from '@/lib/types';

// Each debater gets a fixed persona via the system prompt, and a fresh user
// prompt per round containing the transcript so far. The transcript is what
// makes them actually clash instead of monologuing past each other.

const ROUND_INSTRUCTIONS = [
  'Deliver your opening statement. Stake out your strongest position.',
  "Rebut your opponent's opening. Attack their weakest claim directly — quote or paraphrase it, then dismantle it.",
  "Defend against your opponent's rebuttal, then counter-attack. Do not repeat your opening.",
  'Deliver your closing statement. Summarize why you have won this debate. No new arguments.',
];

export function systemPrompt(side: Side, topic: string): string {
  const stance = side === 'A' ? 'FOR' : 'AGAINST';
  return [
    `You are Debater ${side} in a fast public debate. You argue ${stance} the topic: "${topic}".`,
    'Be sharp, persuasive, and concrete. Use real-world examples over abstractions.',
    'Hard limit: 90 words per turn. Short punchy sentences. No headers, no bullet lists, no markdown.',
    'Never break character, never mention being an AI, never concede the debate.',
  ].join(' ');
}

export function turnPrompt(side: Side, round: number, transcript: Turn[]): string {
  const history =
    transcript.length === 0
      ? '(The debate is just beginning — you speak first.)'
      : transcript
          .map((t) => `[${ROUND_NAMES[t.round]} — Debater ${t.side}]: ${t.text}`)
          .join('\n\n');

  return [
    `DEBATE TRANSCRIPT SO FAR:\n${history}`,
    `It is now the "${ROUND_NAMES[round]}" round and it is your turn, Debater ${side}.`,
    ROUND_INSTRUCTIONS[round],
  ].join('\n\n');
}
