# McLain Agent OS

A durable mission-control layer for the McLain System.

## V1 architecture

- Next.js mobile-first Mission Control
- Vercel Workflow SDK for durable planning and execution runs
- Vercel AI Gateway using deployment OIDC (no model API key required when OIDC is available)
- GPT-5.6 Sol as the default model, overridable with `MCLAIN_AGENT_MODEL`
- Human approval gate between planning and execution
- Browser-local mission index and persistent context
- Durable Vercel run IDs for workflow state

## Current trust boundary

V1 intentionally does not claim external side effects. The execution worker produces concrete work products and exact next actions, while future tool adapters can add GitHub, Vercel, Gmail, Drive, browser automation, and other actions behind explicit policy and approval controls.

## Next control-plane layers

1. Cross-device mission registry + semantic memory
2. Tool registry with per-tool permissions
3. Connector credentials and approval scopes
4. Event triggers / scheduled recurring missions
5. Multi-worker delegation and artifact storage
6. Notifications for blockers, approvals, and completed missions

## Deployment

The Agent OS deploys as its own Vercel project from the `agent/` root. Vercel Authentication protects the project deployment, and Vercel OIDC provides AI Gateway credentials to the runtime.
