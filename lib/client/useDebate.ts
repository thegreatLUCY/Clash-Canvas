'use client';

import { useCallback, useState } from 'react';
import { DebateEvent, Turn, Verdict } from '@/lib/types';

// This hook is the frontend's brain. It owns the whole lifecycle:
//
//   idle → debating → analyzing → done
//                ↘ error
//
// "debating" reads the SSE stream from /api/debate chunk by chunk and grows
// the transcript in real time. When the stream says 'done', we flip to
// "analyzing" and POST the finished transcript to /api/analyze for the verdict.
//
// The components never talk to the network — they just render this state.

export type Phase = 'idle' | 'debating' | 'analyzing' | 'done' | 'error';

export function useDebate() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [topic, setTopic] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [models, setModels] = useState<{ a: string; b: string } | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (newTopic: string) => {
    setPhase('debating');
    setTopic(newTopic);
    setTurns([]);
    setModels(null);
    setVerdict(null);
    setError(null);

    // React state updates are async, so we also keep a plain local copy of the
    // transcript that we can trust to be complete when the stream ends.
    const transcript: Turn[] = [];

    try {
      const res = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: newTopic }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Could not start the debate.');
      }

      // Read the SSE stream by hand: bytes → text → "data: {...}" messages.
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // SSE messages are separated by a blank line. The last piece of the
        // buffer may be a half-received message, so keep it for next time.
        const messages = buffer.split('\n\n');
        buffer = messages.pop() ?? '';

        for (const message of messages) {
          if (!message.startsWith('data: ')) continue;
          const event = JSON.parse(message.slice(6)) as DebateEvent;

          if (event.type === 'meta') {
            setModels(event.models);
          } else if (event.type === 'turn-start') {
            transcript.push({ side: event.side, round: event.round, text: '' });
            setTurns([...transcript]);
          } else if (event.type === 'delta') {
            transcript[transcript.length - 1].text += event.text;
            setTurns(transcript.map((t) => ({ ...t })));
          } else if (event.type === 'error') {
            throw new Error(event.message);
          } else if (event.type === 'done') {
            setPhase('analyzing');
            const analyzeRes = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ topic: newTopic, transcript }),
            });
            if (!analyzeRes.ok) throw new Error('Analysis failed.');
            setVerdict(await analyzeRes.json());
            setPhase('done');
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setPhase('error');
    }
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setTurns([]);
    setModels(null);
    setVerdict(null);
    setError(null);
  }, []);

  return { phase, topic, turns, models, verdict, error, start, reset };
}
