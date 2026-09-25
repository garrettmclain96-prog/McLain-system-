# The McLain System

A private operating system for deciding what deserves attention, keeping project state synchronized, and turning a portfolio of ventures into an auditable execution system.

The interface is a 3D venture map driven by a Gravity Engine. The repository contains the reusable application shell and a sanitized fallback; private operating state loads only after authentication from the server-side control plane.

## Production architecture

- **Vercel** hosts the PWA, fail-closed password gate, AI routes, and authenticated state proxy.
- **Supabase** stores the canonical state document, event journal, and versioned snapshots behind a privileged Edge Function.
- **Browser** receives no database credentials and caches only the authenticated user's last known state for resilience.
- **Gravity Engine** weights speed to revenue, cash potential, stability, deadline pressure, meaning, and blocker drag.

See `ARCHITECTURE.md` for trust boundaries and extension points, and `SECURITY.md` for the security model.

## Run locally

    npm ci
    npm run build
    npm run check
    npm run serve

Static local mode deliberately uses the sanitized fallback because authenticated state is a deployed server capability.

## Vercel environment

- `SITE_PASSWORD` — required; the app fails closed without it.
- `ANTHROPIC_API_KEY` — optional; enables Ask the System.
- `OPENAI_API_KEY` — optional; enables the second-opinion route.
- `OPENAI_MODEL` — optional model override.
- `MCLAIN_STATE_ENDPOINT` — optional override for the private state Edge Function.

The production default state endpoint is configured in the server proxy. No database secret is required in Vercel.

## Source layout

- `src/system.html` — UI shell and safe fallback.
- `api/state.js` — authenticated state proxy.
- `api/session/verify.js` — session-token verifier used by the state service.
- `api/ask.js`, `api/chatgpt.js` — AI routes.
- `middleware.js` — fail-closed password gate.
- `infra/mclain-system.sql` — reproducible database schema.
- `scripts/check.mjs` — build/privacy/security smoke checks.

## Privacy rule

Private venture strategy, personal records, confidential invention detail, passwords, keys, and tokens do not belong in this repository. Runtime state belongs in the private control plane.
