# Caseworker Mode — authentication & PII protection plan

**Status:** proposal · **Owner:** TBD · **Decision needed before:** real participant data is entered

## Why
Caseworker Mode handles some of the most sensitive PII there is: named criminal-conviction
history, supervision status, and recovery/housing barriers. Today the whole site is behind a
single **shared password** (`SITE_PASSWORD`), which is fine for a pre-launch demo but is **not
authentication** — one shared secret, no individual accounts, no audit trail, no revocation.

Mitigating fact: participant data currently lives **only in the caseworker's browser**
(`localStorage`); it is never sent to a server. Only a ZIP is sent to the job lookup. So there is
no central database to breach yet — the exposure surface is the device + the shared password.
The shipped hardening (session-only mode, clear caseload, device notice) addresses the
shared-device risk in the interim. This document covers the production fix.

## Decision 1 — where does participant data live? (pick one)

| Option | Data location | Pros | Cons |
|---|---|---|---|
| **A. Device-local + real auth** | Stays in the browser; gated by individual login | Smallest blast radius (no central PII store), simplest infra, no server breach risk | No cross-device access, no central audit, lost device = lost caseload, weak backup/retention story |
| **B. Server-side + access control** | Encrypted in Postgres, per-user access | Cross-device, central audit, backup, retention/deletion policy, supervisor oversight | Bigger build; you now hold a PII database → encryption at rest, audit, retention, and compliance obligations all become yours |

Recommendation: **B for any multi-user/agency deployment**; A only if every caseworker is on a
single managed device and you explicitly accept the tradeoffs.

## Decision 2 — auth approach (independent of 1)
- **Email + password** with a vetted library/service. Easiest path: a hosted provider
  (Auth0 / Clerk / Cognito / Supabase Auth) so we don't hand-roll password storage, MFA, or
  session handling.
- **SSO / OIDC** if the agency has Microsoft Entra / Google Workspace — strongly preferred for
  government/agency customers (no separate passwords, central de-provisioning).
- **Require MFA** for any account that can see participant PII.
- **Roles:** `caseworker` (own caseload) vs `supervisor/admin` (team caseloads + user management).

## Build outline (Option B + hosted auth)
1. **Auth** — wire a hosted provider; protect `/caseworker` (and the API) by session, replacing
   the shared-password middleware for those routes. ~roles + MFA.
2. **Data model** — `Participant` rows in Postgres keyed to the owning caseworker (`owner_user_id`),
   plus a `participant_audit` table (who viewed/edited what, when). The NestJS API already has a
   `users` module + Prisma to build on.
3. **Access control** — every read/write checks `owner_user_id` (or team membership for supervisors).
4. **Encryption** — TLS in transit (already); column-level encryption for the most sensitive fields
   (conviction, notes, recovery barriers) or DB-level encryption at rest.
5. **Retention & deletion** — configurable auto-purge (e.g. N months inactive) + a hard "delete
   participant" that removes all rows + audit-logs the deletion.
6. **Migrate the client store** — swap `caseworker-store.ts` (localStorage) for API calls; keep
   session-only mode as an option for shared machines.

## Rough effort (engineering)
- Hosted auth + route protection + roles: **~3–5 days**
- Server-side participant model + access control + audit: **~4–6 days**
- Encryption-at-rest + retention/deletion policy: **~2–4 days**
- Migrate client to API + QA: **~2–3 days**
- **Total: ~2–3 weeks** for a production-credible v1 (excludes formal security review / pen test).

## Compliance — confirm with legal/compliance BEFORE real data
Criminal-justice + recovery data can trigger obligations depending on source and contracts:
- **State DOC / reentry program agreements** — data-handling terms in the contract.
- **CJIS-adjacent** handling if any data originates from criminal-justice systems.
- **HIPAA / BAA** if recovery/treatment data comes from a covered entity.
- Breach-notification and retention obligations vary by state.

Treat this as a launch gate: do not enter real participants' data until the data-residency
decision is made and compliance has signed off.
