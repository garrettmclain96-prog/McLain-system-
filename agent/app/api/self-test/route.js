import { start } from 'workflow/api';
import { planMissionWorkflow } from '../../../../workflows/mission.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const run = await start(planMissionWorkflow, [{
      project: 'Agent OS',
      goal: 'Create a concise three-step verification plan proving the durable planning workflow and AI Gateway are operational.',
      memory: 'This is an automated production smoke test. Keep the result terse.'
    }]);
    return Response.json({ ok: true, runId: run.runId }, { status: 202 });
  } catch (error) {
    return Response.json({
      ok: false,
      message: error instanceof Error ? error.message : 'Smoke test failed to start.'
    }, { status: 500 });
  }
}
