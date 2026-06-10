'use client';

import { useEffect, useRef } from 'react';
import { ROUND_NAMES, Turn } from '@/lib/types';

// The live arena. Side A's turns hang on the left in scarlet, Side B's on the
// right in cobalt. The newest turn shows a blinking caret while text streams in.

export function DebateStage({
  topic,
  turns,
  analyzing,
}: {
  topic: string;
  turns: Turn[];
  analyzing: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep the newest words on screen as the debate streams in.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, analyzing]);

  const current = turns[turns.length - 1];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pt-6 pb-24">
      {/* Sticky fight header */}
      <header className="sticky top-0 z-20 -mx-4 border-b border-bone/10 bg-arena/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <span className="font-display text-lg tracking-wide text-side-a uppercase">For</span>
          <div className="min-w-0 text-center">
            <p className="truncate font-mono text-[10px] tracking-[0.25em] text-bone-dim uppercase">
              {topic}
            </p>
            {current && !analyzing && (
              <p className="mt-1 flex items-center justify-center gap-2 font-mono text-[10px] text-bone uppercase">
                <span
                  className="inline-block size-2 rounded-full bg-side-a"
                  style={{ animation: 'live-pulse 1.2s infinite' }}
                />
                Round {current.round + 1}/4 · {ROUND_NAMES[current.round]}
              </p>
            )}
          </div>
          <span className="font-display text-lg tracking-wide text-side-b uppercase">Against</span>
        </div>
      </header>

      {/* Center divider — the rope between the corners */}
      <div className="relative mt-8 space-y-6">
        <div
          aria-hidden
          className="absolute top-0 bottom-0 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-side-a via-bone/20 to-side-b sm:block"
        />

        {turns.map((turn, i) => {
          const isA = turn.side === 'A';
          const isLive = i === turns.length - 1 && !analyzing;
          return (
            <article
              key={i}
              className={`rise-in relative w-full sm:w-[52%] ${isA ? 'sm:mr-auto' : 'sm:ml-auto'}`}
            >
              <p
                className={`font-mono text-[10px] tracking-[0.25em] uppercase ${
                  isA ? 'text-side-a text-left' : 'text-side-b text-right'
                }`}
              >
                {ROUND_NAMES[turn.round]} — Side {turn.side}
              </p>
              <div
                className={`mt-2 bg-arena-2/70 p-5 text-[1.05rem] leading-relaxed ${
                  isA
                    ? 'border-l-4 border-side-a shadow-[inset_2px_0_24px_-12px_var(--color-side-a)]'
                    : 'border-r-4 border-side-b text-right shadow-[inset_-2px_0_24px_-12px_var(--color-side-b)]'
                }`}
              >
                <span className={isLive && turn.text ? 'streaming-caret' : undefined}>
                  {turn.text || '…'}
                </span>
              </div>
            </article>
          );
        })}

        {analyzing && (
          <div className="rise-in flex flex-col items-center gap-6 py-14 text-center">
            <div className="flex h-8 items-end gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={`w-2 origin-bottom ${i % 2 ? 'bg-side-b' : 'bg-side-a'}`}
                  style={{ height: '100%', animation: `deliberate 1s ${i * 0.12}s infinite ease-in-out` }}
                />
              ))}
            </div>
            <p className="font-display text-2xl tracking-wide uppercase">
              The ML pipeline is judging
            </p>
            {/* Show the actual machinery at work — each step fades in on a delay */}
            <div className="space-y-2 text-left font-mono text-[11px] tracking-wider text-bone-dim uppercase">
              {[
                ['Transcript locked', `${turns.length} arguments captured`],
                ['BERT argument-quality model', 'scoring every argument 0–100'],
                ['Gemini judge', 'hunting fallacies · quoting evidence'],
                ['Verdict engine', 'aggregating scores · declaring a winner'],
              ].map(([name, detail], i) => (
                <p key={name} className="rise-in" style={{ animationDelay: `${0.4 + i * 0.9}s` }}>
                  <span className="text-gold">▸</span> <span className="text-bone">{name}</span>
                  {' — '}
                  {detail}
                </p>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </main>
  );
}
