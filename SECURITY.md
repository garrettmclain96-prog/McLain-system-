# Security

McLain System is designed as a private application even though its reusable shell may be public source.

## Controls

- The deployment fails closed when `SITE_PASSWORD` is missing.
- The session cookie is HttpOnly, Secure, SameSite=Strict, and marked high priority.
- Database credentials never ship to the browser.
- The state Edge Function performs custom server-to-server session verification before privileged access.
- McLain System tables use RLS and revoke table access from `anon` and `authenticated`; only the service role is granted direct access.
- State writes use optimistic version checks and retain snapshots.
- Vercel responses disable framing, sniffing, indexing, and unnecessary browser capabilities.

## Public repository rule

Do not commit API keys, passwords, session cookies, private venture strategy, confidential invention details, or personal records. The checked-in UI contains only a safe fallback. Real operating state belongs in the private control plane.

## Incident rule

If a credential is ever exposed, rotate it at the provider immediately. Removing or rewriting Git history does not make an exposed credential safe again.
