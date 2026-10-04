'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const MISSION_STORE = 'mclain-agent-missions-v1';
const MEMORY_STORE = 'mclain-agent-memory-v1';
const PROJECT_STORE = 'mclain-agent-project-v1';

function loadJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    return JSON.parse(localStorage.getItem(key) || '') || fallback;
  } catch {
    return fallback;
  }
}

function statusClass(status) {
  if (status === 'completed') return 'completed';
  if (status === 'failed' || status === 'canceled') return 'failed';
  if (status === 'review') return 'review';
  if (status === 'planning') return 'planning';
  if (status === 'executing' || status === 'launching') return 'executing';
  return '';
}

function statusLabel(status) {
  const labels = {
    planning: 'Planning',
    review: 'Needs approval',
    launching: 'Starting',
    executing: 'Executing',
    completed: 'Complete',
    failed: 'Failed',
    canceled: 'Canceled',
  };
  return labels[status] || status || 'Queued';
}

export default function Home() {
  const [goal, setGoal] = useState('');
  const [project, setProject] = useState('General');
  const [memory, setMemory] = useState('');
  const [mode, setMode] = useState('review');
  const [missions, setMissions] = useState([]);
  const [ready, setReady] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    setMissions(loadJson(MISSION_STORE, []));
    setMemory(localStorage.getItem(MEMORY_STORE) || '');
    setProject(localStorage.getItem(PROJECT_STORE) || 'General');
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(MISSION_STORE, JSON.stringify(missions.slice(0, 40)));
  }, [missions, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(MEMORY_STORE, memory);
    localStorage.setItem(PROJECT_STORE, project);
  }, [memory, project, ready]);

  const patchMission = useCallback((id, changes) => {
    setMissions((current) => current.map((m) => (
      m.id === id ? { ...m, ...changes, updatedAt: new Date().toISOString() } : m
    )));
  }, []);

  const addMission = useCallback((mission) => {
    setMissions((current) => [mission, ...current].slice(0, 40));
  }, []);

  async function postMission(payload) {
    const response = await fetch('/api/mission', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || 'Mission request failed.');
    return data;
  }

  const startExecution = useCallback(async (mission, approvedPlan, approvalNote = '') => {
    patchMission(mission.id, { status: 'launching', error: '' });
    try {
      const data = await postMission({
        action: 'execute',
        goal: mission.goal,
        project: mission.project,
        memory: mission.memory,
        plan: approvedPlan,
        approvalNote,
      });
      patchMission(mission.id, {
        status: 'executing',
        executeRunId: data.runId,
        plan: approvedPlan,
      });
    } catch (error) {
      patchMission(mission.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Execution could not start.',
      });
    }
  }, [patchMission]);

  async function launchMission(event) {
    event.preventDefault();
    const cleanGoal = goal.trim();
    if (!cleanGoal || launching) return;

    const id = crypto.randomUUID();
    const mission = {
      id,
      goal: cleanGoal,
      project: project.trim() || 'General',
      memory: memory.trim(),
      mode,
      status: 'planning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      planRunId: '',
      executeRunId: '',
      plan: null,
      result: null,
      error: '',
    };

    addMission(mission);
    setGoal('');
    setLaunching(true);

    try {
      const data = await postMission({
        action: 'plan',
        goal: mission.goal,
        project: mission.project,
        memory: mission.memory,
      });
      patchMission(id, { planRunId: data.runId, status: 'planning' });
    } catch (error) {
      patchMission(id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Planning could not start.',
      });
    } finally {
      setLaunching(false);
    }
  }

  const pollMission = useCallback(async (mission) => {
    const runId = mission.status === 'planning' ? mission.planRunId
      : mission.status === 'executing' ? mission.executeRunId
      : '';
    if (!runId) return;

    try {
      const response = await fetch('/api/run?runId=' + encodeURIComponent(runId), { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Run lookup failed.');

      if (data.status === 'failed' || data.status === 'canceled') {
        patchMission(mission.id, {
          status: data.status,
          error: 'Workflow ended with status: ' + data.status,
        });
        return;
      }

      if (data.status !== 'completed') return;

      if (mission.status === 'planning') {
        const plan = data.value?.plan || null;
        if (!plan) {
          patchMission(mission.id, { status: 'failed', error: 'Planner completed without a usable plan.' });
          return;
        }

        if (mission.mode === 'auto') {
          patchMission(mission.id, { status: 'launching', plan, planModel: data.value?.model || '' });
          await startExecution({ ...mission, plan }, plan, 'Auto-approved by mission mode.');
        } else {
          patchMission(mission.id, { status: 'review', plan, planModel: data.value?.model || '' });
        }
        return;
      }

      if (mission.status === 'executing') {
        patchMission(mission.id, {
          status: 'completed',
          result: data.value?.result || data.value || null,
          resultModel: data.value?.model || '',
          completedAt: data.value?.completedAt || new Date().toISOString(),
        });
      }
    } catch (error) {
      patchMission(mission.id, {
        error: error instanceof Error ? error.message : 'Unable to refresh workflow state.',
      });
    }
  }, [patchMission, startExecution]);

  useEffect(() => {
    if (!ready) return undefined;
    let stopped = false;

    async function tick() {
      const active = missions.filter((m) => m.status === 'planning' || m.status === 'executing');
      for (const mission of active) {
        if (stopped) return;
        await pollMission(mission);
      }
    }

    tick();
    const timer = setInterval(tick, 4000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [missions, pollMission, ready]);

  const stats = useMemo(() => {
    const active = missions.filter((m) => ['planning', 'launching', 'executing'].includes(m.status)).length;
    const waiting = missions.filter((m) => m.status === 'review').length;
    const done = missions.filter((m) => m.status === 'completed').length;
    return { active, waiting, done };
  }, [missions]);

  function removeMission(id) {
    setMissions((current) => current.filter((m) => m.id !== id));
  }

  async function copyWork(text) {
    try {
      await navigator.clipboard.writeText(text || '');
    } catch {}
  }

  return (
    <main className="shell">
      <header className="top">
        <div className="brand">
          <div className="orb" aria-hidden="true" />
          <div>
            <div className="eyebrow">McLain System</div>
            <h1>Agent OS · Mission Control</h1>
          </div>
        </div>
        <div className="live"><i /> Durable runtime</div>
      </header>

      <div className="grid">
        <section className="card">
          <div className="cardpad">
            <h2>Dispatch a mission</h2>
            <p className="sub">Plan it, approve it, then let a durable workflow execute the work session without depending on this browser staying open.</p>

            <form onSubmit={launchMission}>
              <div className="field">
                <label htmlFor="project">Project / operating area</label>
                <input id="project" className="input" value={project} onChange={(e) => setProject(e.target.value)} placeholder="ValetOS, McLain OS, research…" maxLength={120} />
              </div>

              <div className="field">
                <label htmlFor="goal">Mission</label>
                <textarea id="goal" className="textarea" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Example: Audit the current ValetOS launch flow, identify the three biggest conversion blockers, and produce the exact implementation plan." maxLength={12000} required />
              </div>

              <div className="field">
                <label htmlFor="memory">Persistent context for this device</label>
                <textarea id="memory" className="textarea memory" value={memory} onChange={(e) => setMemory(e.target.value)} placeholder="Rules, project state, priorities, constraints, preferred output…" maxLength={18000} />
              </div>

              <div className="split">
                <div className="field">
                  <label htmlFor="mode">Autonomy</label>
                  <select id="mode" className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="review">Plan → ask me → execute</option>
                    <option value="auto">Plan → execute automatically</option>
                  </select>
                </div>
                <div className="field">
                  <label>Worker</label>
                  <div className="input" aria-label="worker model">GPT-5.6 Sol · Gateway</div>
                </div>
              </div>

              <button className="launch" type="submit" disabled={launching || !goal.trim()}>
                {launching ? 'Dispatching…' : 'Launch mission'}
              </button>
              <p className="note">Workflow state is durable on Vercel. This first release stores your mission index and reusable context on this device; cross-device memory and external action tools are the next control-plane layer.</p>
            </form>
          </div>
        </section>

        <section className="card">
          <div className="queueHead">
            <div>
              <h2>Mission queue</h2>
              <p className="sub" style={{ margin: '3px 0 0' }}>Live durable runs</p>
            </div>
          </div>

          <div className="queue">
            <div className="statrow">
              <div className="stat"><b>{stats.active}</b><span>Active</span></div>
              <div className="stat"><b>{stats.waiting}</b><span>Approval</span></div>
              <div className="stat"><b>{stats.done}</b><span>Done</span></div>
            </div>

            {!missions.length && <div className="empty">No missions yet. Dispatch the first one from the left.</div>}

            {missions.map((mission) => (
              <article className="mission" key={mission.id}>
                <div className="mhead">
                  <div>
                    <span className={'badge ' + statusClass(mission.status)}>{statusLabel(mission.status)}</span>
                    <h3>{mission.goal}</h3>
                    <div className="meta">{mission.project} · {new Date(mission.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div className="body">
                  {mission.plan && (
                    <div className="plan">
                      <div className="objective"><strong>Objective:</strong> {mission.plan.objective || mission.goal}</div>
                      {mission.plan.strategy && <div className="objective" style={{ marginTop: 6 }}><strong>Strategy:</strong> {mission.plan.strategy}</div>}
                      {!!mission.plan.steps?.length && (
                        <div className="steps">
                          {mission.plan.steps.map((step, index) => (
                            <div className="step" key={(step.id || index) + '-' + index}>
                              <b>{index + 1}. {step.title || 'Step'}</b><br />
                              {step.action || ''}{step.doneWhen ? <><br /><span>Done when: {step.doneWhen}</span></> : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {mission.status === 'review' && (
                    <div className="actions">
                      <button className="btn primary" onClick={() => startExecution(mission, mission.plan, 'Approved by owner in Mission Control.')}>Approve + execute</button>
                      <button className="btn danger" onClick={() => patchMission(mission.id, { status: 'canceled' })}>Reject</button>
                    </div>
                  )}

                  {mission.result && (
                    <div className="result">
                      <h4>Execution result</h4>
                      {mission.result.summary && <p className="objective">{mission.result.summary}</p>}
                      {mission.result.workProduct && <div className="work">{mission.result.workProduct}</div>}
                      {!!mission.result.blockedOn?.length && (
                        <div className="steps">
                          {mission.result.blockedOn.map((item, index) => <div className="step" key={'block-' + index}><b>Blocked:</b> {item}</div>)}
                        </div>
                      )}
                      {!!mission.result.nextActions?.length && (
                        <div className="steps">
                          {mission.result.nextActions.map((item, index) => <div className="step" key={'next-' + index}><b>Next:</b> {item}</div>)}
                        </div>
                      )}
                      <div className="actions">
                        <button className="btn" onClick={() => copyWork(mission.result.workProduct || mission.result.summary || '')}>Copy work product</button>
                      </div>
                    </div>
                  )}

                  {mission.error && <div className="error">{mission.error}</div>}

                  <div className="actions">
                    {mission.planRunId && <span className="meta">Plan run: {mission.planRunId.slice(0, 18)}…</span>}
                    {mission.executeRunId && <span className="meta">Execute run: {mission.executeRunId.slice(0, 18)}…</span>}
                    {['completed', 'failed', 'canceled'].includes(mission.status) && <button className="btn" onClick={() => removeMission(mission.id)}>Clear</button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="footer">McLain Agent OS · durable mission orchestration · owner controlled</div>
    </main>
  );
}
