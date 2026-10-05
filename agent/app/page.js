'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const CACHE_KEY = 'mclain-agent-state-v2';
const DEFAULT_POLICY = {
  research: 'auto',
  externalRead: 'auto',
  externalWrite: 'approval',
  deploy: 'approval',
  emailSend: 'approval',
};

function cachedState() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}

function recurrenceDelay(value) {
  if (value === 'weekly') return 7 * 24 * 60 * 60 * 1000;
  if (value === 'daily') return 24 * 60 * 60 * 1000;
  return 0;
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
  return ({
    planning: 'Planning',
    review: 'Needs approval',
    launching: 'Starting',
    executing: 'Executing',
    completed: 'Complete',
    failed: 'Failed',
    canceled: 'Canceled',
    scheduled: 'Scheduled',
  })[status] || status || 'Queued';
}

export default function Home() {
  const [goal, setGoal] = useState('');
  const [project, setProject] = useState('General');
  const [memory, setMemory] = useState('');
  const [mode, setMode] = useState('review');
  const [recurrence, setRecurrence] = useState('none');
  const [missions, setMissions] = useState([]);
  const [toolPolicy, setToolPolicy] = useState(DEFAULT_POLICY);
  const [ready, setReady] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [syncState, setSyncState] = useState('Connecting…');
  const [showPolicy, setShowPolicy] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [guideChoice, setGuideChoice] = useState('');
  const saveTimer = useRef(null);
  const hydrating = useRef(true);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const cache = cachedState();
      if (cache && !cancelled) {
        setMissions(Array.isArray(cache.missions) ? cache.missions : []);
        setMemory(cache.memory || '');
        setProject(cache.project || 'General');
        setToolPolicy({ ...DEFAULT_POLICY, ...(cache.toolPolicy || {}) });
      }

      try {
        const response = await fetch('/api/state', { cache: 'no-store' });
        const state = await response.json();
        if (!response.ok) throw new Error(state.message || 'Cloud state unavailable.');
        if (!cancelled) {
          setMissions(Array.isArray(state.missions) ? state.missions : []);
          setMemory(state.memory || '');
          setProject(state.project || 'General');
          setToolPolicy({ ...DEFAULT_POLICY, ...(state.toolPolicy || {}) });
          localStorage.setItem(CACHE_KEY, JSON.stringify(state));
          setSyncState('Private cloud synced');
        }
      } catch {
        if (!cancelled) setSyncState(cache ? 'Using device cache' : 'Cloud sync unavailable');
      } finally {
        hydrating.current = false;
        if (!cancelled) setReady(true);
      }
    }
    hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || hydrating.current) return undefined;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const payload = { missions: missions.slice(0, 100), memory, project, toolPolicy };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      try {
        const response = await fetch('/api/state', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error();
        setSyncState('Private cloud synced');
      } catch {
        setSyncState('Device saved · cloud retry needed');
      }
    }, 700);
    return () => clearTimeout(saveTimer.current);
  }, [missions, memory, project, toolPolicy, ready]);

  const patchMission = useCallback((id, changes) => {
    setMissions((current) => current.map((m) => (
      m.id === id ? { ...m, ...changes, updatedAt: new Date().toISOString() } : m
    )));
  }, []);

  const addMission = useCallback((mission) => {
    setMissions((current) => [mission, ...current].slice(0, 100));
  }, []);

  const missionStarters = [
    {
      id: 'build',
      icon: '🛠️',
      title: 'Build or improve something',
      blurb: 'Turn an idea or existing project into an execution plan and finished work.',
      project: 'McLain OS',
      goal: 'Review the project context I provide, identify the highest-impact improvement, build the exact implementation plan, produce every artifact you can complete autonomously, and clearly separate anything that needs my approval.',
      mode: 'review',
      recurrence: 'none',
    },
    {
      id: 'audit',
      icon: '🔎',
      title: 'Audit a project',
      blurb: 'Find bugs, weak spots, unfinished work, and the best next moves.',
      project: 'ValetOS',
      goal: 'Audit this project end-to-end. Find broken, incomplete, confusing, risky, or low-quality areas. Rank fixes by impact, then produce the exact remediation work and next actions.',
      mode: 'auto',
      recurrence: 'none',
    },
    {
      id: 'research',
      icon: '🧠',
      title: 'Research + decide',
      blurb: 'Investigate a question and return a decision, not a pile of links.',
      project: 'Research',
      goal: 'Research this objective deeply, compare the realistic options, identify tradeoffs and risks, then give me a clear recommendation with the evidence and an execution-ready next step.',
      mode: 'auto',
      recurrence: 'none',
    },
    {
      id: 'operator',
      icon: '⚙️',
      title: 'Run an operating routine',
      blurb: 'Have Agent OS revisit something every day and surface what changed.',
      project: 'Operations',
      goal: 'Review the current operating context, identify what changed or needs attention, prioritize the most important actions, and produce a concise operator brief with work completed, blockers, and next actions.',
      mode: 'auto',
      recurrence: 'daily',
    },
    {
      id: 'finish',
      icon: '🏁',
      title: 'Finish unfinished work',
      blurb: 'Give it a messy project and have it drive toward a shippable result.',
      project: 'General',
      goal: 'Take this unfinished project from its current state toward a shippable result. Determine what is missing, complete everything you can autonomously, and return only the decisions or approvals that truly require me.',
      mode: 'review',
      recurrence: 'none',
    },
    {
      id: 'watch',
      icon: '📡',
      title: 'Watch something weekly',
      blurb: 'Recurring intelligence for a project, market, competitor, or opportunity.',
      project: 'Watch',
      goal: 'Reassess this subject using the latest available context, identify meaningful changes, opportunities, risks, and decisions since the previous run, and give me only what is actionable.',
      mode: 'auto',
      recurrence: 'weekly',
    },
  ];

  function chooseStarter(starter) {
    setGuideChoice(starter.id);
    setProject(starter.project);
    setGoal(starter.goal);
    setMode(starter.mode);
    setRecurrence(starter.recurrence);
    setGuideOpen(false);
    setTimeout(() => document.getElementById('goal')?.focus(), 0);
  }

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
        toolPolicy,
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
  }, [patchMission, toolPolicy]);

  async function launchMission(event) {
    event.preventDefault();
    const cleanGoal = goal.trim();
    if (!cleanGoal || launching) return;

    const recurring = ['daily','weekly'].includes(recurrence);
    const now = new Date();
    const mission = {
      id: crypto.randomUUID(),
      goal: cleanGoal,
      project: project.trim() || 'General',
      memory: memory.trim(),
      mode: recurring ? 'auto' : mode,
      recurrence,
      nextRunAt: recurring ? new Date(now.getTime() + recurrenceDelay(recurrence)).toISOString() : null,
      status: 'planning',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      planRunId: '',
      executeRunId: '',
      scheduledRunId: '',
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
        toolPolicy,
      });
      patchMission(mission.id, { planRunId: data.runId, status: 'planning' });
    } catch (error) {
      patchMission(mission.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Planning could not start.',
      });
    } finally {
      setLaunching(false);
    }
  }

  const pollMission = useCallback(async (mission) => {
    let runId = '';
    if (mission.status === 'planning') runId = mission.planRunId;
    if (mission.status === 'executing') runId = mission.scheduledRunId || mission.executeRunId;
    if (!runId) return;

    try {
      const response = await fetch('/api/run?runId=' + encodeURIComponent(runId), { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || 'Run lookup failed.');

      if (data.status === 'failed' || data.status === 'canceled') {
        patchMission(mission.id, { status: data.status, error: 'Workflow ended with status: ' + data.status });
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
          await startExecution({ ...mission, plan }, plan, 'Auto-approved for AI-only execution. External side effects still require approval.');
        } else {
          patchMission(mission.id, { status: 'review', plan, planModel: data.value?.model || '' });
        }
        return;
      }

      if (mission.status === 'executing') {
        if (data.value?.kind === 'scheduled_mission_result') {
          patchMission(mission.id, {
            status: 'completed',
            plan: data.value?.planned?.plan || mission.plan,
            result: data.value?.executed?.result || null,
            resultModel: data.value?.executed?.model || '',
            scheduledRunId: '',
            completedAt: data.value?.completedAt || new Date().toISOString(),
          });
        } else {
          patchMission(mission.id, {
            status: 'completed',
            result: data.value?.result || data.value || null,
            resultModel: data.value?.model || '',
            completedAt: data.value?.completedAt || new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      patchMission(mission.id, { error: error instanceof Error ? error.message : 'Unable to refresh workflow state.' });
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
    const timer = setInterval(tick, 5000);
    return () => { stopped = true; clearInterval(timer); };
  }, [missions, pollMission, ready]);

  const stats = useMemo(() => ({
    active: missions.filter((m) => ['planning','launching','executing'].includes(m.status)).length,
    waiting: missions.filter((m) => m.status === 'review').length,
    recurring: missions.filter((m) => ['daily','weekly'].includes(m.recurrence)).length,
  }), [missions]);

  function stopRecurrence(id) {
    patchMission(id, { recurrence: 'none', nextRunAt: null });
  }

  function removeMission(id) {
    setMissions((current) => current.filter((m) => m.id !== id));
  }

  async function copyWork(text) {
    try { await navigator.clipboard.writeText(text || ''); } catch {}
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
        <div className="live"><i /> {syncState}</div>
      </header>

      <div className="grid">
        <section className="card">
          <div className="cardpad">
            <h2>Dispatch a mission</h2>
            <p className="sub">Plan, execute, persist, and recur from the server. Closing Safari no longer owns the mission state.</p>

            {guideOpen ? (
              <div className="guide">
                <div className="guideTitle">
                  <div>
                    <span className="badge review">Start here</span>
                    <h3>What do you want Agent OS to do?</h3>
                    <p>Pick a job. I’ll preconfigure the mission, autonomy, and recurrence; then edit the details before launch.</p>
                  </div>
                  <button className="btn" type="button" onClick={() => setGuideOpen(false)}>I know what I want</button>
                </div>
                <div className="starterGrid">
                  {missionStarters.map((starter) => (
                    <button className="starter" type="button" key={starter.id} onClick={() => chooseStarter(starter)}>
                      <span className="starterIcon">{starter.icon}</span>
                      <span><b>{starter.title}</b><small>{starter.blurb}</small></span>
                      <span className="starterArrow">›</span>
                    </button>
                  ))}
                </div>
                <div className="guideHint"><b>Best way to use it:</b> give it an outcome, not a tiny task. “Finish the customer checkout” is better than “write CSS.”</div>
              </div>
            ) : (
              <button className="btn guideReopen" type="button" onClick={() => setGuideOpen(true)}>
                ✨ Show me what Agent OS can do
              </button>
            )}

            <form onSubmit={launchMission}>
              <div className="field">
                <label htmlFor="project">Project / operating area</label>
                <input id="project" className="input" value={project} onChange={(e) => setProject(e.target.value)} placeholder="ValetOS, McLain OS, research…" maxLength={120} />
              </div>

              <div className="field">
                <label htmlFor="goal">Mission</label>
                <textarea id="goal" className="textarea" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Example: Audit ValetOS, identify the three biggest blockers, and produce the exact fixes." maxLength={12000} required />
              </div>

              <div className="field">
                <label htmlFor="memory">Persistent cross-device context</label>
                <textarea id="memory" className="textarea memory" value={memory} onChange={(e) => setMemory(e.target.value)} placeholder="Rules, project state, priorities, constraints, preferred output…" maxLength={30000} />
              </div>

              <div className="split">
                <div className="field">
                  <label htmlFor="mode">Autonomy</label>
                  <select id="mode" className="select" value={mode} onChange={(e) => setMode(e.target.value)} disabled={recurrence !== 'none'}>
                    <option value="review">Plan → ask me → execute</option>
                    <option value="auto">Plan → execute automatically</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="recurrence">Run</label>
                  <select id="recurrence" className="select" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                    <option value="none">Once</option>
                    <option value="daily">Now + every day</option>
                    <option value="weekly">Now + every week</option>
                  </select>
                </div>
              </div>

              <button className="btn" type="button" onClick={() => setShowPolicy((v) => !v)} style={{ marginBottom: 12 }}>
                {showPolicy ? 'Hide action policy' : 'Action permissions'}
              </button>

              {showPolicy && (
                <div className="plan" style={{ marginBottom: 14 }}>
                  {[
                    ['research','Research'],
                    ['externalRead','Read connected/external data'],
                    ['externalWrite','Write/change external systems'],
                    ['deploy','Deploy/publish'],
                    ['emailSend','Send messages/email'],
                  ].map(([key,label]) => (
                    <div className="field" key={key}>
                      <label>{label}</label>
                      <select className="select" value={toolPolicy[key]} onChange={(e) => setToolPolicy((p) => ({ ...p, [key]: e.target.value }))}>
                        <option value="auto">Allow automatically</option>
                        <option value="approval">Require my approval</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {guideChoice && (
                <div className="guideHint selectedHint">
                  Template loaded. Replace the generic wording with the actual project/outcome you want, add useful context below, then launch.
                </div>
              )}

              <button className="launch" type="submit" disabled={launching || !goal.trim()}>
                {launching ? 'Dispatching…' : 'Launch mission'}
              </button>
              <p className="note">Recurring missions auto-run AI work, but external side effects are converted into approval requests according to your policy.</p>
            </form>
          </div>
        </section>

        <section className="card">
          <div className="queueHead">
            <div>
              <h2>Mission queue</h2>
              <p className="sub" style={{ margin: '3px 0 0' }}>Durable + cross-device</p>
            </div>
          </div>

          <div className="queue">
            <div className="statrow">
              <div className="stat"><b>{stats.active}</b><span>Active</span></div>
              <div className="stat"><b>{stats.waiting}</b><span>Approval</span></div>
              <div className="stat"><b>{stats.recurring}</b><span>Recurring</span></div>
            </div>

            {!missions.length && <div className="empty">No missions yet. Dispatch one and it will sync here across devices.</div>}

            {missions.map((mission) => (
              <article className="mission" key={mission.id}>
                <div className="mhead">
                  <div>
                    <span className={'badge ' + statusClass(mission.status)}>{statusLabel(mission.status)}</span>
                    <h3>{mission.goal}</h3>
                    <div className="meta">
                      {mission.project} · {new Date(mission.createdAt).toLocaleString()}
                      {mission.recurrence !== 'none' ? ' · ' + mission.recurrence : ''}
                    </div>
                  </div>
                </div>

                <div className="body">
                  {mission.nextRunAt && mission.recurrence !== 'none' && (
                    <div className="objective"><strong>Next automatic run:</strong> {new Date(mission.nextRunAt).toLocaleString()}</div>
                  )}

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

                      {!!mission.result.actionRequests?.length && (
                        <div className="steps">
                          {mission.result.actionRequests.map((item, index) => (
                            <div className="step" key={'action-' + index}>
                              <b>Approval request · {item.type || 'external action'}</b><br />
                              {item.description || 'External action requested.'}<br />
                              <span>Status: {item.status || 'pending'}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {!!mission.result.blockedOn?.length && (
                        <div className="steps">
                          {mission.result.blockedOn.map((item, index) => <div className="step" key={'block-' + index}><b>Blocked:</b> {item}</div>)}
                        </div>
                      )}

                      <div className="actions">
                        <button className="btn" onClick={() => copyWork(mission.result.workProduct || mission.result.summary || '')}>Copy work product</button>
                      </div>
                    </div>
                  )}

                  {mission.error && <div className="error">{mission.error}</div>}

                  <div className="actions">
                    {mission.recurrence !== 'none' && <button className="btn danger" onClick={() => stopRecurrence(mission.id)}>Stop recurring</button>}
                    {['completed','failed','canceled'].includes(mission.status) && mission.recurrence === 'none' && <button className="btn" onClick={() => removeMission(mission.id)}>Clear</button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="footer">McLain Agent OS · durable missions · private memory · owner-controlled actions</div>
    </main>
  );
}
