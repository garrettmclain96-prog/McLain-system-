# McLain Systems — commercial platform charter

**Status:** strategy and architecture decision proposal, not a claim of an incorporated company, finished infrastructure, or paying software customers.

## Mission
McLain Systems creates, operates, and licenses intelligent business software across multiple industries using a common technical foundation that improves through verified outcomes from each product.

## Ownership and product boundaries
- **McLain Systems**: proposed parent business / intellectual-property ownership and commercialization strategy. A legal entity has NOT been verified. Do not describe it as an LLC until formed.
- **McLain System** (`McLain-system-`): founder-only private portfolio and evidence control plane. Protect personal sources and secret project strategy.
- **McLain OS** (`McLain-OS`): registry, model/provider orchestration, execution boundaries and optional internal operator surface. Consolidate duplicate owner/state responsibilities; do not create a third control plane.
- **McLain Core**: proposed *shared commercial components* (organization identity, members/roles, billing entitlements, audit trail, typed workflows, event schemas, integrations). Implement as versioned modules/contracts only when two paying products need the same capability. Not a new user-facing dashboard or giant migration.
- **OpsPost** (`beachside-crew`): initial commercial operations SaaS. Jamaica Beach deployment is the field pilot. Next acceptance priority: non-disruptive Vonage after-hours IVR with human transfer, then verified Front Desk → work order → assignment → closure.
- **ValetOS** (`valetos-enterprise`): first specialized vertical product; preserve working paid RV valet service, ship isolated enterprise staging and test multi-company tenancy and billing.
- **Evidence products** (TraceForge/ClaimForge/ParcelForge): separate regulated/privacy-sensitive family; may share provenance primitives, not business-customer databases.

## Hard rules
1. Do not overwrite live OpsPost or Island Trash Valet data/projects; isolated branches, staging services, test keys and rollback.
2. One canonical source per commercial product; no clone-and-forget apps.
3. Demo, test, planned and live states are visibly distinct. No fake results or revenue.
4. Subscription entitlements, refunds, disputes, taxes, customer deletion/export, security and contract terms are required before public SaaS claims.
5. Tenant-scoped data must never be reachable across companies. Fail closed if authorization fails.
6. Customer value before abstraction: extract a shared module only when evidenced by two real use cases.
7. Respect third-party open-source licenses, contributor provenance, commercial restrictions, API ToS and data rights.
8. Company ownership, brand ownership, customer agreements, insurance and bank accounts require legal/business verification. Texas tax permit alone is not proof of a corporation.

## First vertical release sequence
1. **OpsPost** — verify one resort day end-to-end: incoming request → triage → authorized assignee → evidence → manager closeout.
2. **Vonage** — Voice API number used only as opt-in VBC after-hours/no-answer overflow, human fallback, secure callbacks; later scope events into OpsPost. No production telephone routing changed without account admin.
3. **ValetOS** — staging distinct from current Jamaica Beach root app and current delivery deployment; tenant/security, Stripe sandbox, driver field tests, subscriptions and customer onboarding.
4. **Commercialization** — three permissioned design partners, one measurable success criterion each, setup fees and recurring licensing only after accurate scope and support terms.

## Core platform contracts — desired, not all built
`Organization`, `Property`, `Member`, `RoleGrant`, `ServiceRequest`, `Job`, `Assignment`, `Evidence`, `Event`, `Invoice`, `Entitlement`, `Integration`.
Event envelope: `{id, org_id, source_product, event_type, occurred_at, subject_id, schema_version, payload, correlation_id}`; publish only sanitized, tenant-appropriate events with deduplication and replay controls.

## Next commercial proof
A prospect can independently sign into an isolated pilot, create a company, submit an operational request, see it routed correctly, finish it with evidence, and receive correct invoice/receipt. Completion must be observed in hosted staging before calling it production-ready.
