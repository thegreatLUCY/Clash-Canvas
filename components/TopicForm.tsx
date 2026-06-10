'use client';

import { useEffect, useState } from 'react';

// The landing view: one giant wordmark, one input, one button.
// The placeholder rotates through spicy examples so first-time visitors
// instantly get what kind of topic to type.

const PLACEHOLDERS = [
  'Pineapple belongs on pizza',
  'Social media does more harm than good',
  'Cats are better than dogs',
  'Remote work is killing creativity',
  'Billionaires should not exist',
];

export function TopicForm({ onStart }: { onStart: (topic: string) => void }) {
  const [value, setValue] = useState('');
  // Server render and browser hydration must produce identical HTML, so the
  // random pick happens in useEffect — which only ever runs in the browser.
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  useEffect(() => {
    setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const topic = value.trim() || placeholder;
    onStart(topic);
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      {/* Two diagonal color washes — the corners of the ring. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-side-a opacity-[0.13] blur-3xl"
        style={{ clipPath: 'polygon(0 0, 55% 0, 25% 100%, 0 100%)' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-side-b opacity-[0.13] blur-3xl"
        style={{ clipPath: 'polygon(75% 0, 100% 0, 100% 100%, 45% 100%)' }}
      />

      <div className="relative z-10 w-full max-w-3xl text-center">
        <p className="rise-in font-mono text-[11px] tracking-[0.35em] text-bone-dim uppercase">
          Two AIs walk into a debate
        </p>

        <h1
          className="rise-in mt-4 font-display text-[clamp(4rem,16vw,11rem)] leading-[0.85] uppercase"
          style={{ animationDelay: '0.08s' }}
        >
          <span className="block text-side-a">Clash</span>
          <span className="block text-side-b">Canvas</span>
        </h1>

        <p
          className="rise-in mx-auto mt-6 max-w-md text-lg text-bone-dim italic"
          style={{ animationDelay: '0.16s' }}
        >
          Type any topic. Watch two AI models tear it apart live — then get the
          ML-scored verdict.
        </p>

        <form
          onSubmit={submit}
          className="rise-in mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row"
          style={{ animationDelay: '0.24s' }}
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`“${placeholder}”`}
            maxLength={200}
            autoFocus
            className="flex-1 border-2 border-bone/25 bg-arena-2/80 px-5 py-4 font-mono text-sm text-bone placeholder:text-bone-dim/60 focus:border-bone focus:outline-none"
          />
          <button
            type="submit"
            className="cursor-pointer border-2 border-bone bg-bone px-8 py-4 font-display text-xl tracking-wide text-arena uppercase transition-transform hover:-rotate-1 hover:scale-[1.03] active:scale-95"
          >
            Start the fight
          </button>
        </form>

        <p
          className="rise-in mt-5 font-mono text-[10px] tracking-widest text-bone-dim/70 uppercase"
          style={{ animationDelay: '0.32s' }}
        >
          4 rounds · live scoring · shareable verdict
        </p>
      </div>
    </main>
  );
}
