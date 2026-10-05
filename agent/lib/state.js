import { get, list, put } from '@vercel/blob';

const STATE_PATH = 'agent-os/state-v2.json';
const EMPTY_STATE = {
  version: 2,
  updatedAt: null,
  memory: '',
  project: 'General',
  missions: [],
  approvals: [],
  schedules: [],
  toolPolicy: {
    research: 'auto',
    externalRead: 'auto',
    externalWrite: 'approval',
    deploy: 'approval',
    emailSend: 'approval',
  },
};

function tokenOptions() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('Agent OS persistence is not configured.');
  return { token };
}

export async function loadAgentState() {
  const opts = tokenOptions();
  const result = await list({ prefix: STATE_PATH, limit: 1, ...opts });
  const blob = result.blobs.find((item) => item.pathname === STATE_PATH);
  if (!blob) return structuredClone(EMPTY_STATE);

  const file = await get(blob.url, { access: 'private', ...opts });
  if (!file) return structuredClone(EMPTY_STATE);

  const text = await new Response(file.stream).text();
  let parsed = {};
  try { parsed = JSON.parse(text); } catch {}

  return {
    ...structuredClone(EMPTY_STATE),
    ...parsed,
    toolPolicy: { ...EMPTY_STATE.toolPolicy, ...(parsed.toolPolicy || {}) },
    missions: Array.isArray(parsed.missions) ? parsed.missions.slice(0, 100) : [],
    approvals: Array.isArray(parsed.approvals) ? parsed.approvals.slice(0, 100) : [],
    schedules: Array.isArray(parsed.schedules) ? parsed.schedules.slice(0, 50) : [],
  };
}

export async function saveAgentState(nextState) {
  const safe = {
    ...structuredClone(EMPTY_STATE),
    ...nextState,
    version: 2,
    updatedAt: new Date().toISOString(),
    memory: String(nextState?.memory || '').slice(0, 30000),
    project: String(nextState?.project || 'General').slice(0, 120),
    missions: Array.isArray(nextState?.missions) ? nextState.missions.slice(0, 100) : [],
    approvals: Array.isArray(nextState?.approvals) ? nextState.approvals.slice(0, 100) : [],
    schedules: Array.isArray(nextState?.schedules) ? nextState.schedules.slice(0, 50) : [],
    toolPolicy: { ...EMPTY_STATE.toolPolicy, ...(nextState?.toolPolicy || {}) },
  };

  await put(STATE_PATH, JSON.stringify(safe), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
    ...tokenOptions(),
  });

  return safe;
}

export async function mutateAgentState(mutator) {
  const current = await loadAgentState();
  const next = await mutator(structuredClone(current));
  return saveAgentState(next || current);
}
