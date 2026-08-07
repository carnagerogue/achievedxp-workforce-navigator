# Apply ecosystem — one account, apply anywhere (honestly)

The goal: your Achieve account is the **hub** for the whole job hunt. See jobs
from many places in one feed, keep one reusable application profile, connect the
boards you already use, and apply from one place — without ever handing over a
password or letting a bot apply for you.

This document explains what we built, and — just as important — **why it stops
where it does**. The stopping points aren't laziness; they're the line between a
tool that protects justice-impacted users and one that quietly endangers their
accounts.

## The honest reality (why there's no "apply everywhere" button)

We researched the major platforms (Indeed, LinkedIn, ZipRecruiter, Monster,
Glassdoor) and the open aggregator + ATS APIs. The findings that shape this
design:

- **No jobseeker "connect my account and apply for me" API exists anywhere.**
  "Sign in with LinkedIn" and Indeed's OAuth grant identity/email (or *employer*)
  scopes only — never "apply as this person."
- **The big boards are closed to third-party aggregation and forbid scraping.**
  Indeed retired its Publisher API; ZipRecruiter's search API shut down Mar 2025;
  Monster/CareerBuilder filed Chapter 11 in 2025. Automating apply outside their
  official partners violates their terms and risks the user's account.
- **The sanctioned way to hold inventory** is licensed aggregators (Adzuna,
  USAJobs, Careerjet, The Muse, remote boards) plus public **ATS** job-board
  reads (Greenhouse, Lever, Ashby, SmartRecruiters, Workable). That same ATS
  layer is the only place a real *native* apply is even possible, and only where
  the employer authorizes it.

So we build the "one account that controls the rest" idea around **our** canonical
profile, not around holding credentials to other platforms. Three honest rails:
**(1)** a reusable Apply Kit, **(2)** an honest apply handoff, **(3)** a
consent-gated Connections framework.

## 1. The Apply Kit (`lib/apply-kit.ts`, `/apply-kit`)

One "application profile" a person fills **once** and reuses everywhere. Tuned to
what fair-chance applications actually ask (shifts, start date, transportation, a
short pitch, references, and the disclosure statement they already drafted), plus
free-form reusable Q&A.

- Per-user via the scope seam (`scoped-storage`), like every personal store.
- Prefills from the saved profile on first load — never overwrites typed values.
- `kitCompleteness()` drives the "X% ready" nudge.
- **Never** sent to an employer automatically. It exists to be *copied* by the
  person, fast.

## 2. Apply handoff (`components/apply/*`, wired into `/jobs/[id]`)

"Apply" opens the **real** posting and puts the Apply Kit right beside it —
one tap to copy each answer — then records the application in the tracker
(`setApplicationStatus`). We never submit on someone's behalf (that would break
the board's terms); we make the honest handoff as fast as a bot would be.

- `ApplyButton` → `ApplyDialog`: opens `job.applyUrl`, marks `APPLIED`, shows
  copy-ready kit fields, and nudges to finish the kit if it's under 60%.
- `CopyField`: labeled value + one-tap clipboard copy.

## 3. Connections (`lib/connections.ts`, `components/connections/*`, `/connections`)

The consent-gated "link your other accounts" surface. Every provider ships an
explicit `does` / `doesNot` so the promise is never bigger than the reality.
Two honest kinds of connection:

| Method | Providers | What "Connect" means |
|---|---|---|
| `oauth` | Google, LinkedIn, Microsoft | Real sign-in for **identity + email only**, used to fill the Apply Kit. A real consent redirect when accounts are configured; otherwise gracefully off ("Enabled by your program"). |
| `handoff` | Indeed, ZipRecruiter, Monster, LinkedIn Jobs | We can't link into your account there, so Connect opens their **real** site to sign in / create an account, then remembers you have one so applies and your tracker point to the right place. A consent-gated bookmark — **never a password vault**. |

The connect flow (`ConnectDialog`) is always: **see plainly what it does and
doesn't do → sign in on the provider's own site → come back and confirm.** The
password-safety promise is shown at every step. Disconnecting only removes the
link on our side; it never touches the account on the other platform.

Connection state is per-user (`scoped-storage`) and local-only. `connect()` takes
the timestamp from the caller so the store stays free of ambient time and easy to
test (`lib/__tests__/connections.test.ts`).

### Already working for you (feed sources)

`/connections` also shows the licensed sources already powering the job feed
(Adzuna, USAJobs, Remotive) — always on, nothing to connect — so people can see
their one feed is genuinely aggregating, not empty theater.

## Graceful degradation & privacy

- **No configuration required.** Handoff connections work out of the box (they
  just open real sites). Identity OAuth lights up only when accounts are
  configured — same switch (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) as the rest of
  auth. No keys ⇒ the identity tiles show "Enabled by your program," nothing
  breaks.
- `/apply-kit` and `/connections` sit behind the sign-in wall like the rest of
  the app when accounts are on (login is required before anything; see
  `docs/auth.md`).
- We never store passwords for any external platform, and never apply on anyone's
  behalf. Those are product invariants, not TODOs.

## Future seams (deliberately left clean)

- **Real identity import:** wire the `oauth` providers to Clerk's social sign-in
  so `connect()` is called from the OAuth callback with the verified email —
  auto-filling the Apply Kit. The registry + store already model this.
- **Native ATS apply:** where the source is a public/authorized ATS (Greenhouse
  per-board key, SmartRecruiters public application POST, employer-authorized
  Ashby/Workable/Lever), map the Apply Kit to that ATS's question schema and
  submit **server-side** (proxy all keys; never client-exposed). This is the only
  sanctioned "apply in-app," and it slots in behind the same Apply button.
- **Partner apply rails:** Indeed Apply / LinkedIn Apply Connect become possible
  only as an approved partner at scale — a business step, not a code step.

## Where things live

```
lib/apply-kit.ts                     Apply Kit store (scoped, per-user)
app/apply-kit/page.tsx               Apply Kit editor
components/apply/CopyField.tsx       one-tap copy field
components/apply/ApplyDialog.tsx     honest apply handoff + kit
components/apply/ApplyButton.tsx     apply entry point (wired into /jobs/[id])
lib/connections.ts                   provider registry + connection store (scoped)
components/connections/ConnectDialog.tsx    consent-gated connect flow
components/connections/ConnectionTile.tsx   provider tile
app/connections/page.tsx             the Connections surface
lib/__tests__/connections.test.ts    locks the honest-by-design invariants
```
