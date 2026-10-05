import { loadAgentState, saveAgentState } from '../../../lib/state.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_STATUS = new Set(['planning','review','launching','executing','completed','failed','canceled','scheduled']);

function cleanMission(m) {
  if (!m || typeof m !== 'object') return null;
  const id = String(m.id || '').slice(0, 100);
  const goal = String(m.goal || '').trim().slice(0, 12000);
  if (!id || !goal) return null;
  return {
    ...m,
    id,
    goal,
    project: String(m.project || 'General').slice(0, 120),
    memory: String(m.memory || '').slice(0, 18000),
    status: ALLOWED_STATUS.has(m.status) ? m.status : 'planning',
    updatedAt: String(m.updatedAt || new Date().toISOString()),
  };
}

export async function GET() {
  try {
    const state = await loadAgentState();
    return Response.json(state, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({
      error: 'state_load_failed',
      message: error instanceof Error ? error.message : 'State could not be loaded.',
    }, { status: 500 });
  }
}

export async function PUT(request) {
  let body = {};
  try { body = await request.json(); }
  catch { return Response.json({ error: 'invalid_json' }, { status: 400 }); }

  try {
    const state = await loadAgentState();
    const next = {
      ...state,
      memory: typeof body.memory === 'string' ? body.memory : state.memory,
      project: typeof body.project === 'string' ? body.project : state.project,
      missions: Array.isArray(body.missions) ? body.missions.map(cleanMission).filter(Boolean) : state.missions,
      approvals: Array.isArray(body.approvals) ? body.approvals.slice(0,100) : state.approvals,
      schedules: Array.isArray(body.schedules) ? body.schedules.slice(0,50) : state.schedules,
      toolPolicy: body.toolPolicy && typeof body.toolPolicy === 'object' ? { ...state.toolPolicy, ...body.toolPolicy } : state.toolPolicy,
    };
    const saved = await saveAgentState(next);
    return Response.json(saved, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({
      error: 'state_save_failed',
      message: error instanceof Error ? error.message : 'State could not be saved.',
    }, { status: 500 });
  }
}
