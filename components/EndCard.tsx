'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { ROUND_NAMES, Verdict } from '@/lib/types';

// The money shot. Everything in the app builds to this card.
// The card itself lives in a ref'd <div> so the share buttons can rasterize
// exactly that DOM node to a PNG with html-to-image — no server involved.

const ROUND_SHORT = ['Opening', 'Rebuttal', 'Counter', 'Closing'];

export function EndCard({
  topic,
  verdict,
  onRestart,
}: {
  topic: string;
  verdict: Verdict;
  onRestart: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const foulsA = verdict.fallacies.filter((f) => f.side === 'A');
  const foulsB = verdict.fallacies.filter((f) => f.side === 'B');
  const winnerLabel =
    verdict.winner === 'tie'
      ? 'Too close to call'
      : verdict.winner === 'A'
        ? 'Winner: Side A · For'
        : 'Winner: Side B · Against';

  async function capture(): Promise<string> {
    // pixelRatio 2 = retina-sharp PNG that holds up on a Twitter timeline.
    return toPng(cardRef.current!, { pixelRatio: 2, backgroundColor: '#0b0a0e' });
  }

  async function download() {
    setBusy('download');
    try {
      const a = document.createElement('a');
      a.href = await capture();
      a.download = 'clashcanvas-verdict.png';
      a.click();
    } finally {
      setBusy(null);
    }
  }

  async function copyImage() {
    setBusy('copy');
    try {
      const blob = await (await fetch(await capture())).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } finally {
      setBusy(null);
    }
  }

  function postToX() {
    const text = `Two AIs just debated "${topic}" — verdict: ${winnerLabel}. ⚔️`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-10">
      {/* ── The card (this exact node becomes the PNG) ─────────────────── */}
      <div
        ref={cardRef}
        className="relative w-full max-w-2xl overflow-hidden border border-bone/15 bg-arena"
      >
        {/* Corner washes + giant ghost VS, the poster backdrop */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(155deg, color-mix(in srgb, var(--color-side-a) 16%, transparent) 0%, transparent 40%, transparent 60%, color-mix(in srgb, var(--color-side-b) 16%, transparent) 100%)',
          }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-[16rem] leading-none text-bone opacity-[0.04] select-none"
        >
          VS
        </span>

        <div className="relative p-7 sm:p-10">
          {/* Masthead */}
          <div className="flex items-baseline justify-between border-b-2 border-bone/20 pb-3">
            <p className="font-display text-lg tracking-[0.15em] uppercase">
              Clash<span className="text-side-a">Can</span><span className="text-side-b">vas</span>
            </p>
            <p className="font-mono text-[9px] tracking-[0.4em] text-bone-dim uppercase">
              Official verdict
            </p>
          </div>

          <h2 className="mt-5 font-display text-[clamp(1.8rem,5vw,2.6rem)] leading-[1.05] uppercase">
            {topic}
          </h2>

          {/* Winner banner — slammed in at an angle like a stamped poster */}
          <div className="mt-6 -ml-1">
            <div
              className={`slam-in inline-block px-6 py-2.5 font-display text-2xl tracking-wide uppercase shadow-[6px_6px_0_rgba(0,0,0,0.45)] ${
                verdict.winner === 'tie'
                  ? 'bg-gold text-arena'
                  : verdict.winner === 'A'
                    ? 'bg-side-a text-bone'
                    : 'bg-side-b text-bone'
              }`}
            >
              {winnerLabel}
            </div>
          </div>

          {/* Headline strength numbers */}
          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-[0.25em] text-side-a uppercase">
                Side A · For
              </p>
              <p className="font-display text-6xl text-side-a">{verdict.strengthA}</p>
            </div>
            <p className="pb-2 font-mono text-[9px] tracking-[0.3em] text-bone-dim uppercase">
              Argument strength / 100
            </p>
            <div className="text-right">
              <p className="font-mono text-[10px] tracking-[0.25em] text-side-b uppercase">
                Side B · Against
              </p>
              <p className="font-display text-6xl text-side-b">{verdict.strengthB}</p>
            </div>
          </div>

          {/* ── Round-by-round tug-of-war — the ML model's scores, visible ── */}
          <div className="mt-5 border-y border-bone/15 py-4">
            <p className="mb-3 font-mono text-[9px] tracking-[0.35em] text-bone-dim uppercase">
              Round-by-round · scored by{' '}
              <span className="text-gold">
                {verdict.strengthSource === 'ml' ? 'BERT argument-quality model' : 'Gemini judge'}
              </span>
            </p>
            <div className="space-y-2">
              {verdict.perRound.map((r, i) => {
                const total = Math.max(r.a + r.b, 1);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 font-mono text-[9px] tracking-widest text-bone-dim uppercase">
                      R{i + 1} {ROUND_SHORT[i]}
                    </span>
                    <div className="flex h-3 flex-1 overflow-hidden bg-bone/10">
                      <div
                        className="origin-left bg-side-a"
                        style={{
                          width: `${(r.a / total) * 100}%`,
                          animation: `bar-fill 0.8s ${0.2 + i * 0.12}s cubic-bezier(0.2,0.8,0.2,1) both`,
                        }}
                      />
                      <div className="w-px shrink-0 bg-arena" />
                      <div
                        className="origin-right bg-side-b"
                        style={{
                          width: `${(r.b / total) * 100}%`,
                          animation: `bar-fill 0.8s ${0.2 + i * 0.12}s cubic-bezier(0.2,0.8,0.2,1) both`,
                        }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right font-mono text-[9px] text-bone-dim">
                      {r.a}–{r.b}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Logical fouls — type AND the offending quote ──────────────── */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {(['A', 'B'] as const).map((side) => {
              const fouls = side === 'A' ? foulsA : foulsB;
              const color = side === 'A' ? 'var(--color-side-a)' : 'var(--color-side-b)';
              return (
                <div key={side}>
                  <p className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color }}>
                    Side {side} · {fouls.length} logical foul{fouls.length === 1 ? '' : 's'}
                  </p>
                  <div className="mt-2 space-y-2">
                    {fouls.length === 0 && (
                      <p className="font-mono text-[10px] text-bone-dim uppercase">Clean fight</p>
                    )}
                    {fouls.map((f, i) => (
                      <div
                        key={i}
                        className="border-l-2 bg-arena-2/70 px-3 py-2"
                        style={{ borderColor: color }}
                      >
                        <span
                          className="font-mono text-[9px] font-bold tracking-widest uppercase"
                          style={{ color }}
                        >
                          {f.type}
                        </span>
                        <p className="mt-1 text-[0.8rem] leading-snug text-bone/85 italic">
                          “{f.quote}”
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Best moment */}
          <div className="mt-7 border-t border-bone/15 pt-5">
            <p className="font-mono text-[10px] tracking-[0.4em] text-gold uppercase">
              ⚡ Best moment · {ROUND_NAMES[verdict.bestMoment.round]}
            </p>
            <blockquote className="mt-3 border-l-2 border-side-a pl-3 text-[0.95rem] italic">
              “{verdict.bestMoment.quoteA}”
            </blockquote>
            <blockquote className="mt-2 ml-auto max-w-[90%] border-r-2 border-side-b pr-3 text-right text-[0.95rem] italic">
              “{verdict.bestMoment.quoteB}”
            </blockquote>
          </div>

          {/* Footer: name the machinery — this is the portfolio flex */}
          <div className="mt-7 flex items-center justify-between border-t border-bone/15 pt-4 font-mono text-[8px] tracking-[0.25em] text-bone-dim uppercase">
            <span>Llama 3.3 vs Llama 4 · 4 rounds</span>
            <span>
              {verdict.strengthSource === 'ml'
                ? 'Strength: IBM-Debater BERT · Fallacies: Gemini'
                : 'Verdict: Gemini judge'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Actions (outside the captured node, never in the PNG) ─────────── */}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={download}
          disabled={busy !== null}
          className="cursor-pointer bg-bone px-6 py-3 font-display tracking-wide text-arena uppercase transition-transform hover:scale-[1.04] disabled:opacity-50"
        >
          {busy === 'download' ? 'Saving…' : 'Download card'}
        </button>
        <button
          onClick={copyImage}
          disabled={busy !== null}
          className="cursor-pointer border border-bone/40 px-6 py-3 font-display tracking-wide uppercase transition-transform hover:scale-[1.04] disabled:opacity-50"
        >
          {busy === 'copy' ? 'Copied!' : 'Copy image'}
        </button>
        <button
          onClick={postToX}
          className="cursor-pointer border border-bone/40 px-6 py-3 font-display tracking-wide uppercase transition-transform hover:scale-[1.04]"
        >
          Post on X
        </button>
        <button
          onClick={onRestart}
          className="cursor-pointer px-6 py-3 font-mono text-xs tracking-widest text-bone-dim uppercase hover:text-bone"
        >
          New fight →
        </button>
      </div>
    </main>
  );
}
