import { askGateway, parseJsonObject } from '../lib/gateway.js';

export async function planMissionWorkflow(input) {
  'use workflow';
  return await planMissionStep(input);
}

async function planMissionStep(input) {
  'use step';

  const system = [
    'You are the planning engine for McLain Agent OS.',
    'Convert the mission into an execution-ready plan.',
    'Strengthen weak assumptions, identify blockers, and optimize for leverage, ownership, reuse, automation, and scalability.',
    'Do not claim to have taken external actions.',
    'Return ONLY valid JSON with this shape:',
    '{"objective":"...","strategy":"...","steps":[{"id":"1","title":"...","action":"...","doneWhen":"..."}],"risks":["..."],"dependencies":["..."],"deliverables":["..."],"recommendedApprovalNote":"..."}',
    'Use 3-8 concrete steps. Keep each field concise but useful.'
  ].join('\n');

  const user = [
    'PROJECT: ' + (input.project || 'General'),
    'MISSION: ' + input.goal,
    input.memory ? 'PERSISTENT CONTEXT:\n' + input.memory : '',
  ].filter(Boolean).join('\n\n');

  const result = await askGateway([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { maxTokens: 2600 });

  const parsed = parseJsonObject(result.text);
  return {
    kind: 'mission_plan',
    model: result.model,
    createdAt: new Date().toISOString(),
    plan: parsed || {
      objective: input.goal,
      strategy: result.text,
      steps: [],
      risks: ['Planner output could not be parsed as structured JSON.'],
      dependencies: [],
      deliverables: [],
      recommendedApprovalNote: 'Review the unstructured strategy before execution.',
    },
  };
}

export async function executeMissionWorkflow(input) {
  'use workflow';
  return await executeMissionStep(input);
}

async function executeMissionStep(input) {
  'use step';

  const system = [
    'You are the execution engine for McLain Agent OS.',
    'Complete as much of the approved mission as can be completed inside an AI work session.',
    'Produce concrete reusable output, not generic advice.',
    'Do not pretend that emails were sent, files were changed, purchases were made, deployments happened, or other external actions occurred unless the supplied context explicitly proves they occurred.',
    'When an external action is required, put it in blockedOn and provide the exact next action.',
    'Return ONLY valid JSON with this shape:',
    '{"summary":"...","workProduct":"markdown...","completed":["..."],"blockedOn":["..."],"nextActions":["..."],"assetsToCreate":["..."]}'
  ].join('\n');

  const user = [
    'PROJECT: ' + (input.project || 'General'),
    'MISSION: ' + input.goal,
    'APPROVED PLAN:\n' + JSON.stringify(input.plan || {}, null, 2),
    input.memory ? 'PERSISTENT CONTEXT:\n' + input.memory : '',
    input.approvalNote ? 'OWNER APPROVAL NOTE:\n' + input.approvalNote : '',
  ].filter(Boolean).join('\n\n');

  const result = await askGateway([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ], { maxTokens: 6500 });

  const parsed = parseJsonObject(result.text);
  return {
    kind: 'mission_result',
    model: result.model,
    completedAt: new Date().toISOString(),
    result: parsed || {
      summary: 'Execution completed with an unstructured response.',
      workProduct: result.text,
      completed: [],
      blockedOn: [],
      nextActions: [],
      assetsToCreate: [],
    },
  };
}
