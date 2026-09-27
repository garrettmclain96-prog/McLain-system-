# Canonical Portfolio Map

Verified 2026-09-27. This file is the public-safe architecture map for McLain Systems. Private venture state, personal records, credentials, customer data, and confidential invention detail stay in the authenticated McLain System control plane.

## Rules

1. **One product, one canonical home.** New repos are not created for a feature that belongs to an existing product.
2. **Jamaica Ops is a deployment of OpsPost, not a separate commercial product.**
3. **Legacy field apps become modules or are retired; they do not become parallel platforms.**
4. **No fake usage, revenue, recovery, customer, or payout claims.**
5. **Public demos never authenticate into live operational data.**
6. **Payment or external-action workflows fail closed until provider verification is complete.**
7. **McLain System remains the private control plane; product apps remain operational surfaces.**

## Canonical product families

| System | Role | Canonical source / surface | State | What belongs here |
|---|---|---|---|---|
| **McLain System** | Private portfolio control plane | `garrettmclain96-prog/McLain-system-` · Vercel `mclain-system` | ACTIVE | Portfolio state, second brain, priorities, evidence links, execution history |
| **OpsPost** | Commercial operations platform | `garrettmclain96-prog/beachside-crew` · https://opspost.vercel.app | ACTIVE | Staff, schedule, coverage, time clock, Front Desk, work orders, incidents, notifications, integrations |
| **Jamaica Ops** | First customer/deployment profile for OpsPost | Same codebase as OpsPost | ACTIVE DEPLOYMENT | Jamaica Beach RV Resort configuration, departments, staff roles, resort workflows |
| **ValetOS / Island Valet** | OpsPost service module + local revenue workflow | `garrettmclain96-prog/valetos-enterprise` · https://valetos-enterprise.vercel.app | BLOCKED ON PAYMENT VERIFICATION | Booking, paid stops, route planning, collection proof, reconciliation |
| **Site Sight / Beach Site Check** | Legacy field-inspection module moving into OpsPost | Lovable `site-sight-jam` | LEGACY / MERGE | Pedestal/site inspections and guest issue intake; crew workspace is authenticated, guest report form remains public |
| **Seawall Turnover** | Standalone local service business | `garrettmclain96-prog/seawall-turnover` · Vercel `seawall-turnover-hpio` | VALIDATE | Lead capture, turnover request intake, Storm-Ready service; next proof is a paid completed job |
| **TraceForge** | Evidence / OSINT case platform | `garrettmclain96-prog/traceforge` · Vercel `traceforge` | ACTIVE | Sourced investigations, evidence provenance, domain history, recovery intelligence |
| **ClaimForge** | Recovery discovery + claimant workflow | `garrettmclain96-prog/claimforge-accelerate` | BUILD / DEPLOY | Official recovery sources, evidence checklist, future claimant/case workflow; fabricated activity removed |
| **Family Evidence Engine** | Family/property evidence vertical | Vercel `family-evidence-engine-mobile` | ACTIVE / CONSOLIDATE | Family records, deed/probate evidence, lineage proofs, source-linked research |
| **ParcelForge** | Property intelligence / field research | Vercel `parcelforge` | ACTIVE | Parcel research, field navigation, ownership/history evidence |
| **Community Meal Flow** | Community meal coordination | `garrettmclain96-prog/community-meal-flow` · Vercel `community-meal-flow` | ACTIVE / VALIDATE | Kitchen, volunteer, partner, policy and meal-flow operations |
| **Aurora Core** | Shared telemetry / device integration layer | `garrettmclain96-prog/Aurora-core-beta` · Vercel `aurora-core-beta` | MODULE / MERGE | MQTT, equipment state, alerts, sensor/device intelligence; integrate into OpsPost instead of selling as a parallel ops platform |
| **Fold Zero / ECC** | Internal experimentation / execution tooling | Vercel `fold-zero`, `ecc` | INTERNAL | Falsifiable experiment design, platform audit, engineering execution support |
| **YouBeenClassed / YouBeenGassed** | Legacy consumer project family | existing repositories and Vercel projects | HOLD / DECIDE | Preserve assets; no new parallel deployments until the product purpose is revalidated |

## Current production facts

- OpsPost, McLain System, Community Meal Flow, and ParcelForge were checked with no runtime error groups in the latest 24-hour production review.
- OpsPost's public Manager Demo is now an isolated local-data sandbox. The old browser demo credentials were removed and the three old demo auth accounts were disabled.
- ValetOS checkout code now retries safely when Square rejects a prefilled phone number, distinguishes bad credentials, and the public backend can no longer create a confirmed booking without server-side payment confirmation.
- ValetOS remains fail-closed until a valid Square production credential and verified payment-confirmation path are installed.
- Seawall Turnover's current connected Vercel project is `seawall-turnover-hpio`; the verified-domain Resend sender change is deployed there.
- Beach Site Check now requires authenticated crew for inspections, admin, work orders, guest-report reading, and guest-report resolution. Anonymous guests can still submit a guest issue.
- ClaimForge's active code has been converted away from fabricated recovery totals, fake matches, fake leaderboard data, and fake social proof. Its current foundation is an official-source recovery sweep.

## Consolidation targets

### Ops family
```
McLain Systems
└── OpsPost
    ├── Jamaica Ops configuration
    ├── AI Front Desk
    ├── Scheduling / coverage / time
    ├── Work orders / incidents
    ├── Site inspections  ← absorb Beach Site Check
    ├── Guest issue intake ← preserve public report surface
    ├── ValetOS            ← service module
    └── Aurora telemetry   ← shared device layer
```

### Evidence family
```
McLain Systems
└── Evidence platform family
    ├── TraceForge          — general sourced investigations
    ├── ClaimForge          — recovery / claimant cases
    ├── Family Evidence     — genealogy, probate, deed/title evidence
    └── ParcelForge         — parcel/property intelligence
```

These products may share provenance, source storage, case primitives and export formats, but they remain separate user experiences when their workflows materially differ.

## Definition of "finished"

A prototype is not finished because it deploys. For this portfolio, a system closes a loop only when it produces the outcome it claims:

- **OpsPost:** real issue → eligible owner → work → evidence → manager closure.
- **ValetOS:** payment → paid stop → navigable route → collection → reconciliation.
- **Seawall Turnover:** qualified lead → scoped job → completed turnover → customer acceptance → payment.
- **ClaimForge:** official source → potential match → evidence packet → claimant action → externally verified disposition.
- **Family Evidence:** source record → named person/tract → documented linkage → contradictory evidence resolved → exportable proof packet.
- **GloveGate / hardware:** built revision → measured test → durability data → filing/vendor package aligned to tested hardware.

Anything short of that is BUILD, VALIDATE, MERGE, HOLD, or ARCHIVE—not DONE.
