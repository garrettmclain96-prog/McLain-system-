import { start } from 'workflow/api';
import { loadAgentState, saveAgentState } from '../../../lib/state.js';
import { scheduledMissionWorkflow } from '../../../workflows/mission.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function addCadence(iso, cadence) {
  const base = new Date(iso || Date.now());
  if (cadence === 'weekly') base.setUTCDate(base.getUTCDate() + 7);
  else base.setUTCDate(base.getUTCDate() + 1);
  return base.toISOString();
}

export async function GET(request) {
  const expected = process.env.CRON_SECRET;
  const given = request.headers.get('authorization');
  if (!expected || given !== 'Bearer ' + expected) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const state = await loadAgentState();
  const now = Date.now();
  const due = state.missions
    .filter((m) => ['daily','weekly'].includes(m.recurrence))
    .filter((m) => {
      const at = Date.parse(m.nextRunAt || '');
      const active = ['planning','launching','executing'].includes(m.status);
      return Number.isFinite(at) && at <= now && !active;
    })
    .slice(0, 3);

  const launched = [];
  for (const mission of due) {
    const run = await start(scheduledMissionWorkflow, [{
      goal: mission.goal,
      project: mission.project,
      memory: mission.memory || state.memory || '',
      toolPolicy: state.toolPolicy || {},
    }]);

    mission.status = 'executing';
    mission.scheduledRunId = run.runId;
    mission.lastTriggeredAt = new Date().toISOString();
    mission.nextRunAt = addCadence(mission.nextRunAt, mission.recurrence);
    mission.updatedAt = new Date().toISOString();
    launched.push({ id: mission.id, runId: run.runId, nextRunAt: mission.nextRunAt });
  }

  if (launched.length) {
    state.missions = state.missions.map((m) => due.find((d) => d.id === m.id) || m);
    await saveAgentState(state);
  }

  return Response.json({ ok: true, checkedAt: new Date().toISOString(), launched });
}
