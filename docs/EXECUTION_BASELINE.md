# Execution Baseline — 2026-09-27

This is the durable handoff after the portfolio consolidation/security sprint. It records only blockers that still require an external credential, real-world action, provider approval, or a new hosting connection.

## Closed in this sprint

- Dropbox working collection fully audited/organized; Needs Review cleared; raw source archives preserved.
- OpsPost public demo isolated from live operations; old demo credentials/provisioner removed; legacy demo auth accounts disabled.
- OpsPost canonical metadata points to production.
- Quo Operations inbox confirmed connected to OpsPost; 15 webhook receipts produced 15 Front Desk events with zero failed receipts at verification.
- Beach Site Check guest-report and inspection access hardened; guest submission remains public, crew data requires authentication.
- Evidence Chronicle and legacy Family Evidence Hub placed in archive-locked mode: RLS enabled everywhere and no anonymous/public database policies.
- Vault Intelligence verified owner-scoped/authenticated with a private storage bucket.
- BarOS Pro and legacy Lovable Jamaica Ops labeled as legacy surfaces pointing toward the canonical OpsPost family.
- ValetOS public confirmed-booking bypass closed; checkout phone validation hardened; booking UX is explicitly fail-closed.
- Seawall Turnover sender code moved to a verified Resend domain and deployed on the connected `seawall-turnover-hpio` project.
- ClaimForge active UI stripped of fabricated payout/activity/leaderboard claims and rebuilt around official-source recovery checks.
- McLain System now owns the machine-readable canonical portfolio registry and an iPhone-friendly private portfolio map.
- Active default GitHub branches checked for obvious credential literals; no obvious live-secret patterns found. Historical exported credentials remain treated as compromised.

## Remaining blockers that cannot be truthfully closed in software alone

### OpsPost / Jamaica Ops
**State:** operational platform is live.

Remaining proof:
1. Run one real resort shift through schedule/coverage/front-desk/work-order flow.
2. Preserve issue → owner → work → evidence → manager closure artifacts.
3. RV Business Tech integration still needs sanctioned provider/interface access and a named pilot owner.

### Island Valet / ValetOS
**State:** software is fail-closed and production deployment is READY.

External blocker:
- Valid Square production credential plus server-side payment verification/webhook path.

Do not mark a reservation paid/confirmed until Square proves payment.

Closure proof:
payment → paid stop → route → collection → reconciliation.

### Seawall Turnover
**State:** intake code deployed on `seawall-turnover-hpio`; current runtime review shows no error cluster.

Real-world blocker:
- One qualified customer must accept scope, receive a completed turnover, accept completion, and pay.

### ClaimForge
**State:** truthful evidence-first codebase exists.

Infrastructure blocker:
- The repository has no canonical Vercel/Lovable production project in the connected hosting inventory. Do not create a duplicate product implementation just to obtain a URL.

Closure proof:
official source → potential match → evidence packet → claimant action → externally verified disposition.

### TurnBot
**State:** patent/licensing/manufacturing corpus recovered and centralized.

Real-world blocker:
- Tested physical revision and focused OEM/licensing execution.

### GloveGate
**State:** prototype package exists.

Real-world blocker:
- Fabricate the controlled revision, record validation data, then complete durability testing before production-readiness claims.

### Family / land / mineral evidence
**State:** source corpus centralized; legacy open databases locked.

Research blocker:
- Legal/title proof still requires exact source record → person/tract linkage → deed/probate disposition → contradiction resolution. A family tree or search hit is not current mineral ownership proof.

### Credentials
Historical exports contained plaintext provider credentials. They remain treated as exposed.

Provider actions still required where applicable:
- revoke/rotate old OpenAI/Clerk/Stripe/webhook or other affected provider credentials;
- replace dependent production environment variables only after new keys exist;
- do not reuse values recovered from Dropbox.

## Tool/platform limitations encountered

- Lovable workspace credits reached zero after the Jamaica Ops and BarOS legacy-label updates. Vault Intelligence is already data-safe, but its consolidation banner could not be added without more Lovable credits.
- MealForge Kitchen OS is unpublished. Repeated Lovable database-audit queries returned a provider-side 499 cancellation, so no database mutation was attempted.
- Current Vercel connector can inspect/deploy existing context but exposes no safe create-project/import-repository action for ClaimForge.
- No Square connector/plugin was available in the connected plugin directory during this pass.

## Operating rule

A build is **DONE** only when the claimed outcome closes end to end. Deployments, mock data, inquiry forms, search matches, and prototype documents are evidence of progress—not proof of outcome.
