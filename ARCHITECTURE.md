# McLain System v2 Architecture

McLain System is a private operating control plane with a public-source application shell.

## Trust boundaries

1. **Browser / PWA** renders the venture map. It never receives database credentials.
2. **Vercel middleware** fails closed unless `SITE_PASSWORD` exists and the session cookie is valid.
3. **Vercel state proxy** accepts only allow-listed mutations and forwards the HttpOnly session token.
4. **Supabase Edge Function** verifies that token against the production Vercel verifier before using privileged database access.
5. **Postgres** stores one canonical state document, an append-only event journal, and versioned snapshots.

## State model

`mclain_system_state` is the canonical JSON document. It contains ventures, comets, prospects, deadlines, briefing data, and Gravity Engine weights.

Every state mutation:

- checks the expected state version when supplied;
- snapshots the previous document;
- increments the canonical version;
- records an event in `mclain_system_events`.

This prevents silent last-write-wins data loss and gives future automations an audit trail.

## Failure behavior

The app hydrates from private state before rendering. A successful response is cached locally. If the state service is unavailable, the last device cache is used. If no cache exists, a sanitized fallback shell renders instead of exposing private source data.

## Extension model

External systems should write through server-side adapters or the state control plane, never directly from browser code. Useful event types include `deployment.ready`, `lead.created`, `deadline.changed`, `revenue.received`, and `task.completed`.

Those events can later drive score changes, briefings, alerts, and automations without coupling the UI to any single vendor.
