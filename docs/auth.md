# Accounts & per-user data isolation

The app supports real sign-in (email, Google, Microsoft) with each person's data
isolated to their account. It's built to be **graceful**: with no auth keys set,
the app runs exactly as before — one local data scope, behind the site-password
gate — and lights up accounts the moment keys are added. No code change, just
environment variables.

## Two states

| | Accounts OFF (no Clerk key) | Accounts ON (Clerk key set) |
|---|---|---|
| Gate | Site password (`/access`) | Personal routes require sign-in; rest open |
| Data scope | single `guest` namespace on the device | one namespace per signed-in user |
| Sign-in UI | none | header "Sign in" / avatar menu; `/sign-in`, `/sign-up` |
| Server data key | client-generated id | **verified** Clerk user id |

## How isolation works (`lib/scoped-storage.ts`)

Every browser-local store (plan, compass, profile, saved jobs, Your Corner,
caseworker caseload, …) reads and writes under an **active scope**: keys are
`dxp:<scope>:<base>`. The scope is the signed-in user's id, or `guest` when
signed out / auth off.

- `AuthScopeSync` sets the scope from the session. On sign-in → the user's id;
  on sign-out → `guest` (empty). Switching users re-reads every store, so nobody
  ever sees the previous person's data on a shared device.
- The old flat keys (`dxp.foo`) from before scoping are purged on load, so
  stale, unattributed data can't resurface.
- `apps/web/lib/__tests__/scoped-storage.test.ts` locks the guarantee.

Server-side, personal API routes (`/matches`, `/insights`, `/profile`,
`/assessment`) key off the **verified** session id via `resolveUserId()`
(`lib/auth-server.ts`) — never a client-sent id — so a signed-in user can't read
another user's data by editing the URL.

## Turning accounts on (operator steps)

1. Create a free app at [clerk.com](https://clerk.com).
2. In the Clerk dashboard, enable the sign-in methods you want: **Email**,
   **Google**, and **Microsoft** (Clerk walks you through each OAuth setup; for a
   quick start it can use Clerk's shared OAuth credentials, then you swap in your
   own before launch).
3. Copy the two API keys into the web service's environment (Railway → web →
   Variables):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts `pk_...`)
   - `CLERK_SECRET_KEY` (starts `sk_...`)
   - Keep the four `NEXT_PUBLIC_CLERK_*_URL` values from `.env.example`.
4. Redeploy. Because `NEXT_PUBLIC_*` is inlined at build time, accounts turn on
   with the new build. The site-password gate is then bypassed (auth replaces
   it); you can remove `SITE_PASSWORD`, or set `SITE_GATE=off`.

## Cross-device data

Browser-local stores are still per-device (namespaced per user). To make a
signed-in user's data follow them across devices, set `DATABASE_URL`
(see `docs/web-persistence.md`) — the server data (profile, assessment,
matches) then keys off the verified Clerk id and persists in Postgres. Syncing
the remaining plan/compass stores to the server is the next increment; the scope
seam is the seam that work plugs into.

## Swapping the provider

`AUTH_ENABLED`, `AuthProvider`, `AuthScopeSync`, `AuthControls`, and
`lib/auth-server.ts` are the only files that know about Clerk. To self-host with
Auth.js/NextAuth (no vendor) instead, reimplement those against the same tiny
interface — `setScope(userId | 'guest')` on the client, `resolveUserId()` on the
server — and nothing else in the app changes.
