import { MODEL_OPTIONS, getActiveModels, setActiveModels } from '@/lib/debate/models';

// Read + write the live debater pairing. This route lives under /api/admin,
// which the proxy.ts gate protects with HTTP Basic Auth — so only someone who
// knows ADMIN_PASSWORD can reach it. setActiveModels re-validates against the
// allow-list as a second line of defence.

export async function GET() {
  return Response.json({ options: MODEL_OPTIONS, active: getActiveModels() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { a?: string; b?: string } | null;
  if (!body?.a || !body?.b) {
    return Response.json({ error: 'Pick a model for both sides.' }, { status: 400 });
  }
  try {
    const active = setActiveModels({ a: body.a, b: body.b });
    return Response.json({ active });
  } catch {
    return Response.json({ error: 'One of those models is not allowed.' }, { status: 422 });
  }
}
