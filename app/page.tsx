'use client';

import { TopicForm } from '@/components/TopicForm';
import { DebateStage } from '@/components/DebateStage';
import { EndCard } from '@/components/EndCard';
import { useDebate } from '@/lib/client/useDebate';

// The whole app is one page with four faces, driven by the useDebate hook:
// idle (topic form) → debating/analyzing (the arena) → done (the verdict card).

export default function Home() {
  const { phase, topic, turns, models, verdict, error, start, reset } = useDebate();

  if (phase === 'idle') return <TopicForm onStart={start} />;

  if (phase === 'error')
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <h2 className="font-display text-4xl text-side-a uppercase">Fight stopped</h2>
        <p className="max-w-md text-bone-dim italic">{error}</p>
        <button
          onClick={reset}
          className="cursor-pointer bg-bone px-6 py-3 font-display tracking-wide text-arena uppercase hover:scale-[1.04]"
        >
          Back to the ring
        </button>
      </main>
    );

  if (phase === 'done' && verdict)
    return (
      <EndCard topic={topic} verdict={verdict} turns={turns} models={models} onRestart={reset} />
    );

  return <DebateStage topic={topic} turns={turns} analyzing={phase === 'analyzing'} />;
}
