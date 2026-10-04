import { start } from 'workflow/api';
import { executeMissionWorkflow, planMissionWorkflow } from '../../../workflows/mission.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const phase = new URL(request.url).searchParams.get('phase') || 'plan';

    if (phase === 'execute') {
      const plan = {
        objective: 'Prove the durable execution workflow and AI Gateway are operational.',
        strategy: 'Produce a terse verification artifact without external side effects.',
        steps: [
          {
            id: '1',
            title: 'Generate verification artifact',
            action: 'Return a short confirmation that the execution worker ran.',
            doneWhen: 'A concrete workProduct and nextActions array are returned.'
          }
        ],
        risks: [],
        dependencies: [],
        deliverables: ['Execution verification artifact'],
        recommendedApprovalNote: 'Automated production smoke test.'
      };

      const run = await start(executeMissionWorkflow, [{
        project: 'Agent OS',
        goal: 'Execute the fixed production smoke-test plan and return a concise verification artifact.',
        memory: 'This is an automated production smoke test. Do not claim external side effects.',
        plan,
        approvalNote: 'Approved automated smoke test.'
      }]);

      return Response.json({ ok: true, phase: 'execute', runId: run.runId }, { status: 202 });
    }

    const run = await start(planMissionWorkflow, [{
      project: 'Agent OS',
      goal: 'Create a concise three-step verification plan proving the durable planning workflow and AI Gateway are operational.',
      memory: 'This is an automated production smoke test. Keep the result terse.'
    }]);

    return Response.json({ ok: true, phase: 'plan', runId: run.runId }, { status: 202 });
  } catch (error) {
    return Response.json({
      ok: false,
      message: error instanceof Error ? error.message : 'Smoke test failed to start.'
    }, { status: 500 });
  }
}
