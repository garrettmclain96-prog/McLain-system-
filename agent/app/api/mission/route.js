import { start } from 'workflow/api';
import { executeMissionWorkflow, planMissionWorkflow } from '../../../workflows/mission.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_GOAL = 12000;
const MAX_MEMORY = 18000;

function clean(value, max) {
  return String(value || '').trim().slice(0, max);
}

export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const action = clean(body.action, 24);
  const goal = clean(body.goal, MAX_GOAL);
  const project = clean(body.project, 120) || 'General';
  const memory = clean(body.memory, MAX_MEMORY);
  const toolPolicy = body.toolPolicy && typeof body.toolPolicy === 'object' ? body.toolPolicy : {};

  if (!goal) {
    return Response.json({ error: 'goal_required' }, { status: 400 });
  }

  try {
    if (action === 'plan') {
      const run = await start(planMissionWorkflow, [{ goal, project, memory, toolPolicy }]);
      return Response.json({ runId: run.runId, phase: 'planning' }, { status: 202 });
    }

    if (action === 'execute') {
      if (!body.plan || typeof body.plan !== 'object') {
        return Response.json({ error: 'approved_plan_required' }, { status: 400 });
      }
      const approvalNote = clean(body.approvalNote, 3000);
      const run = await start(executeMissionWorkflow, [{
        goal,
        project,
        memory,
        plan: body.plan,
        approvalNote,
        toolPolicy,
      }]);
      return Response.json({ runId: run.runId, phase: 'executing' }, { status: 202 });
    }

    return Response.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    console.error('Mission start failed', error);
    return Response.json({
      error: 'mission_start_failed',
      message: error instanceof Error ? error.message : 'Mission could not be started.',
    }, { status: 500 });
  }
}
