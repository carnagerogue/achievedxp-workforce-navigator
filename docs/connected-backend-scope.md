# Connected Backend Scope — accounts, the person↔officer bridge, and SMS reminders

**Status:** scope · **Companion docs:** [`caseworker-auth-plan.md`](./caseworker-auth-plan.md), [`caseworker-powerhouse-backend-roadmap.md`](./caseworker-powerhouse-backend-roadmap.md)

## What this adds beyond the existing docs

The two companion docs scope the **caseworker** side going server-backed (auth, the `caseworker-repo.ts` seam, Postgres participants/tasks, audit). They predate three things the platform has since grown, which this scope covers:

1. **The jobseeker side now holds real data** — the Reentry Compass journey, plan steps, supervision info + conditions + fees, weekly check-ins, and "Your Corner." All browser-local today (`checklist-store.ts`, `reentry-store.ts`, `support-network.ts`). For cross-device use and the bridge, the person needs an account too.
2. **The person↔officer bridge** — today it's a one-way, lossy base64 snapshot (`plan-transfer.ts`). The mission ("bridge the gap between the person and their officer") needs a real, consent-gated, live shared record.
3. **SMS reminders** — the single highest-impact, best-evidenced feature still missing (SMS appointment reminders cut no-shows ~25–30%; ideas42 / J-PAL). Preventable technical violations drive ~1 in 4 prison admissions (CSG). This requires a server + messaging provider and is the strongest argument for building the backend at all.

## Three pillars

### Pillar 1 — Accounts & identity (both audiences)
- **Caseworker / PO / supervisor:** hosted auth (Clerk / Auth0 / Cognito / Supabase) or agency **SSO/OIDC** (Microsoft Entra / Google Workspace). **MFA required** for any PII access. Roles per the auth-plan: `caseworker` (own caseload), `supervisor`/`admin` (team + user management). *(Unchanged from existing docs.)*
- **Jobseeker — phone-first.** The returning person likely has no email but does have a phone, and a verified phone number is also the SMS reminder channel. Use **phone-number OTP** as the primary sign-in. This is the key addition: it doubles as identity *and* the engagement channel, and meets a low-digital-literacy user where they are.
- **Data residency:** Option B (server-side, encrypted Postgres) from the auth-plan — required for sync, the bridge, and reminders.

### Pillar 2 — The person↔officer bridge (consent-gated shared record)
Replaces the base64 snapshot with a live connection. **The person controls what's shared — this is the central design and legal principle.**

- **Connection model:** an `individual` ↔ `caseworker` link with a status (invited / active / revoked) and an explicit **set of shared scopes**. Either side can start it: a caseworker invites by phone/email, or the person shares a code/link. The person accepts and chooses scopes.
- **Granular, person-controlled scopes:** plan & steps, supervision (officer/report date), conditions & compliance, fees, job-search log, weekly check-ins. **Always private:** Your Corner (support map) and the "future self" reflection — these are the person's, never shared.
- **Live, not a snapshot:** both sides see the current shared plan; edits propagate (section ownership or last-write-wins per field). The **supervision summary becomes a live shared artifact** instead of a one-time printout.
- **Trust mechanics:** the person can see exactly what the officer sees, **revoke any scope at any time**, and **every officer view/edit is audit-logged** and visible to the person ("Officer Lee viewed your plan today"). Read-receipts both ways.
- Keep the base64 export as an **offline / no-account fallback** so the handoff still works without sign-up.

### Pillar 3 — Engagement engine (SMS / push reminders)
The evidence-backed core. All the source data already exists in the models (`supervision.ts` report dates + condition cadences, fees due dates, `reentry-journey.ts` steps, plan-step due dates) — `TodayFocus` already computes the same urgency client-side; this moves it server-side and pushes it out.

- **Provider:** Twilio / Telnyx / Amazon SNS. **Scheduler:** a queue/cron worker.
- **Reminder types:** report-to-officer, condition due/overdue, fee payment due, plan-step due, weekly check-in nudge, appointments.
- **Two-way (optional):** "Reply DONE to mark your check-in complete" → maps to `advanceCondition`. "Reply HELP" → routes to a human/211.
- **Message design (evidence-based):** plain language, name the consequence, include a planning prompt — the format shown to work in the J-PAL/ideas42 trials.
- **Compliance is mandatory (TCPA):** documented prior express consent before any SMS, automatic **STOP/UNSUBSCRIBE** handling, quiet hours, and **A2P 10DLC brand/campaign registration** (carrier requirement, multi-week lead time — start this first).

## Architecture

Build on the existing **NestJS `apps/api` + Prisma + Postgres** (already in the repo with `users`, `profiles`, `jobs` modules).

- **New API modules:** `auth` (or hosted-provider integration), `individuals`, `connections`, `messaging`, `audit`.
- **Web:** implement `serverCaseworkerRepo` behind the existing `getRepo()` seam (no component changes — the roadmap's whole point), plus an analogous individual-side repo to swap `checklist-store`/`reentry-store`/`support-network` reads/writes to the API. Add **React Query** for cache/hydration while preserving the current selector hooks so `caseworker-progress.ts` / `caseworker-nba.ts` / `TodayFocus` keep working unchanged.
- **Keep session-only / offline mode** as a shared-machine and no-connectivity fallback.

## Data model (extends the roadmap's participants/tasks)
- `users` — role, verified phone, email *(extend existing module)*
- `persons` — the jobseeker's record; **a "participant" is the caseworker's view of the same person** — model this explicitly so the two sides don't fork.
- `plan_steps`, `conditions`, `fees` (+ `fee_payments`), `checkins`, `supervision_info` — mirror the TS types in `checklist-store.ts` / `supervision.ts` (keep columns aligned).
- `contacts` — Your Corner; **private, never shared via a connection.**
- `connections` — `individual_id`, `caseworker_id`, `status`, `shared_scopes[]`, `created_at`, `revoked_at`.
- `messages` — scheduled/sent, template, target, consent reference, delivery status, reply.
- `consent` — `sms_opt_in` (TCPA), `shared_scopes` snapshot, timestamps.
- `audit` — actor, action, target, timestamp (every PII read/write, every officer view).

## Security & compliance (launch gates — do not enter real data before these)
- **Encryption at rest** — column-level for the most sensitive fields (conviction, notes, recovery/housing barriers, health); TLS in transit (already).
- **Audit log** for every PII access, especially officer views of a person's record.
- **Consent records** — both data-sharing (the bridge) and SMS (TCPA).
- **Retention & deletion** — configurable auto-purge + hard "delete me" that removes all rows and audit-logs the deletion.
- **Regulatory** (confirm with legal before real data): state DOC / reentry-program agreements, **CJIS**-adjacent handling if data originates from justice systems, **HIPAA/BAA** if treatment data comes from a covered entity, state breach-notification + retention rules. *(Per the auth-plan; this is the hard launch gate.)*

## Phasing (each phase independently shippable)
- **Phase 0 — Foundations:** provision Postgres + hosted auth + messaging sandbox; **kick off 10DLC registration immediately** (longest lead time). *(~few days work, but registration runs in the background for weeks.)*
- **Phase 1 — Caseworker server-backing:** `serverCaseworkerRepo` + auth + roles + audit. **~2–3 wks** *(already scoped in the roadmap).*
- **Phase 2 — Jobseeker accounts + server-backed person data:** phone-OTP auth; sync Compass/plan/supervision/conditions/fees/check-ins. **~2 wks.**
- **Phase 3 — The bridge:** connections + consent + granular scopes + live shared plan + read-receipts + audit-visible-to-person; base64 kept as fallback. **~2–3 wks.**
- **Phase 4 — SMS engagement engine:** provider + scheduler + templates + TCPA consent/STOP + two-way DONE. **~2–3 wks** *(gated on 10DLC from Phase 0).*
- **Phase 5 — Hardening & launch gate:** encryption-at-rest, retention/deletion, audit dashboards, **security review / pen test**, compliance sign-off.

**Total: ~10–13 weeks** for a production-credible connected v1, excluding legal/compliance turnaround and pen test (several streams parallelize).

## Decisions needed from the stakeholder
1. **Data residency** — confirm Option B (server-side). *(Recommended; required for all three pillars.)*
2. **Auth provider** — hosted (which?) vs agency SSO/OIDC.
3. **Hosting** — Vercel + managed Postgres, AWS, or an agency-mandated gov cloud (FedRAMP)? Changes everything downstream.
4. **Messaging provider** + who owns the 10DLC brand registration (start now).
5. **Compliance owner** — who signs off, secures BAAs, and negotiates DOC agreements.
6. **Jobseeker auth = phone-first?** *(Recommended — identity + reminder channel in one.)*

## Biggest risks / long-lead items
- **A2P 10DLC SMS registration** — carrier approval takes weeks; start in Phase 0.
- **Compliance sign-off** — the genuine launch gate; begin in parallel from day one.
- **Consent UX for the bridge** — get it wrong and it's both a trust failure and a legal one. The person must always understand and control what's shared.
- **Two-sided identity** — "person" and "participant" are the same human seen from two sides; model it once or the data forks.

## What stays true regardless
The browser-local build is the right default until compliance signs off. Everything above is positioned for via the `caseworker-repo.ts` seam and the aligned TS types — the jobseeker stores (`checklist-store`, `reentry-store`, `support-network`) should grow the same repo-seam pattern before Phase 2 so the swap is mechanical. Do not enter real participant data until Phase 5's gate is cleared.
