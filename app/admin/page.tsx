'use client';

import { useEffect, useState } from 'react';

type ModelOption = { id: string; label: string };
type State = 'loading' | 'ready' | 'saving' | 'saved' | 'error';

// The control room. Two dropdowns — one per side — that decide which LLMs fight.
// Reads the current pairing on mount, writes the new pairing on save. The page
// itself is already behind the Basic Auth gate in proxy.ts, so by the time this
// renders the browser has the admin creds and our fetch() calls inherit them.
export default function AdminPage() {
  const [options, setOptions] = useState<ModelOption[]>([]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/models')
      .then((r) => r.json())
      .then((data) => {
        setOptions(data.options);
        setA(data.active.a);
        setB(data.active.b);
        setState('ready');
      })
      .catch(() => {
        setState('error');
        setMessage('Could not load the model list.');
      });
  }, []);

  async function save() {
    setState('saving');
    setMessage('');
    try {
      const res = await fetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a, b }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Save failed.');
      }
      setState('saved');
      setMessage('Saved. New debates will use this pairing.');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Save failed.');
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16">
      <p className="font-mono text-[11px] tracking-[0.35em] text-bone-dim uppercase">
        Control room
      </p>
      <h1 className="mt-2 font-display text-5xl uppercase">Pick the fighters</h1>
      <p className="mt-4 max-w-lg text-bone-dim">
        Choose which model argues each side. Side&nbsp;A runs on OpenRouter key A,
        Side&nbsp;B on key B. Changes apply to the next debate. This lives in
        memory — a redeploy resets it to the env defaults.
      </p>

      {state === 'loading' ? (
        <p className="mt-10 font-mono text-sm text-bone-dim">Loading…</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <SidePicker color="text-side-a" label="Side A" value={a} onChange={setA} options={options} />
          <SidePicker color="text-side-b" label="Side B" value={b} onChange={setB} options={options} />
        </div>
      )}

      <button
        onClick={save}
        disabled={state === 'loading' || state === 'saving'}
        className="mt-10 cursor-pointer self-start border-2 border-bone bg-bone px-8 py-3 font-display text-xl tracking-wide text-arena uppercase transition-transform hover:-rotate-1 hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === 'saving' ? 'Saving…' : 'Save pairing'}
      </button>

      {message && (
        <p
          className={`mt-4 font-mono text-sm ${state === 'error' ? 'text-side-a' : 'text-bone-dim'}`}
        >
          {message}
        </p>
      )}
    </main>
  );
}

function SidePicker({
  color,
  label,
  value,
  onChange,
  options,
}: {
  color: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ModelOption[];
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className={`font-display text-2xl uppercase ${color}`}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-2 border-bone/25 bg-arena-2/80 px-4 py-3 font-mono text-sm text-bone focus:border-bone focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
