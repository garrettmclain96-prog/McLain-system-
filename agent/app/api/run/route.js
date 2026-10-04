import { getRun } from 'workflow/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const url = new URL(request.url);
  const runId = String(url.searchParams.get('runId') || '').trim();

  if (!/^wrun_[A-Za-z0-9_-]+$/.test(runId)) {
    return Response.json({ error: 'invalid_run_id' }, { status: 400 });
  }

  try {
    const run = getRun(runId);
    const status = await run.status;
    const payload = { runId, status };

    if (status === 'completed') {
      payload.value = await run.returnValue;
    }

    return Response.json(payload, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    console.error('Run lookup failed', error);
    return Response.json({
      error: 'run_lookup_failed',
      message: error instanceof Error ? error.message : 'Run could not be read.',
    }, { status: 500 });
  }
}
