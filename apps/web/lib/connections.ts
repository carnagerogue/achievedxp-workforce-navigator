'use client';

import { useSyncExternalStore } from 'react';
import { lsGet, lsSet, onStoreChange } from './scoped-storage';

/**
 * Connections — the honest version of "one account that controls the rest."
 *
 * The dream is a single place where you connect Indeed / LinkedIn / ZipRecruiter /
 * Monster and apply everywhere. The truth (verified 2026) is that those platforms
 * do NOT offer a jobseeker "connect my account and apply for me" hook — their
 * seeker terms forbid it, and no such OAuth scope exists anywhere. Pretending
 * otherwise would mean holding people's passwords and risking their accounts —
 * exactly the wrong thing to do to justice-impacted users.
 *
 * So this framework is built to be truthful about what each connection actually
 * does. Two honest kinds of "connect":
 *
 *  1. `oauth`   — real sign-in (Google / LinkedIn / Microsoft), identity + email
 *                 only, used to fill your Apply Kit. A real consent redirect when
 *                 your program has configured a client; otherwise gracefully off.
 *  2. `handoff` — job boards. We can't link into your account there, so "Connect"
 *                 means: open their real site, sign in or create your account, and
 *                 we remember that you have one so your jobs from that source
 *                 deep-link straight to apply and your tracker knows about it.
 *                 A consent-gated bookmark, never a password vault.
 *
 * Every provider ships an explicit `does` / `doesNot` so the promise is never
 * bigger than the reality. Connection state is per-user via the scope seam.
 */

export type LinkMethod = 'oauth' | 'handoff';
export type ProviderCategory = 'identity' | 'jobBoard';

export interface ProviderCaps {
  /** Fills your Apply Kit / profile from the connected account. */
  importsProfile: boolean;
  /** Postings from this source show up in your one job feed. */
  feedsJobs: boolean;
  /** One-tap, prefilled handoff to apply on this source. */
  fastApply: boolean;
}

export interface Provider {
  id: string;
  name: string;
  /** One line: what it is. */
  blurb: string;
  category: ProviderCategory;
  method: LinkMethod;
  /** A muted accent for the tile (kept within the design system, not a logo). */
  accent: string;
  /** The real site we send people to when they connect / set up. */
  url: string;
  caps: ProviderCaps;
  /** Exactly what connecting does — shown before the user consents. */
  does: string[];
  /** Exactly what it does NOT do — no dark patterns, ever. */
  doesNot: string[];
  /** For OAuth providers, the public Clerk key that enables account linking. */
  oauthEnvHint?: string;
}

/**
 * The registry. Identity providers first (the real OAuth ones), then the big
 * job boards as honest handoffs. Kept deliberately small and truthful.
 */
export const PROVIDERS: Provider[] = [
  {
    id: 'google',
    name: 'Google',
    blurb: 'Sign in with your Google account',
    category: 'identity',
    method: 'oauth',
    accent: '#ea4335',
    url: 'https://accounts.google.com',
    oauthEnvHint: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    caps: { importsProfile: true, feedsJobs: false, fastApply: false },
    does: [
      'Uses your name and email to fill your Apply Kit',
      'Signs you in without a new password to remember',
    ],
    doesNot: [
      'Never reads your Gmail, contacts, or files',
      'Never posts or applies anywhere on your behalf',
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    blurb: 'Sign in with LinkedIn',
    category: 'identity',
    method: 'oauth',
    accent: '#0a66c2',
    url: 'https://www.linkedin.com',
    oauthEnvHint: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    caps: { importsProfile: true, feedsJobs: false, fastApply: false },
    does: [
      'Uses your name, photo, and email to fill your Apply Kit',
      'Signs you in with the LinkedIn account you already have',
    ],
    doesNot: [
      'Cannot read your connections or post as you',
      'Cannot apply to LinkedIn jobs for you — their rules forbid it',
    ],
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    blurb: 'Sign in with a Microsoft account',
    category: 'identity',
    method: 'oauth',
    accent: '#5b5fc7',
    url: 'https://account.microsoft.com',
    oauthEnvHint: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    caps: { importsProfile: true, feedsJobs: false, fastApply: false },
    does: [
      'Uses your name and email to fill your Apply Kit',
      'Signs you in with your existing Microsoft/Outlook account',
    ],
    doesNot: [
      'Never reads your Outlook mail or OneDrive files',
      'Never applies anywhere on your behalf',
    ],
  },
  {
    id: 'indeed',
    name: 'Indeed',
    blurb: 'The largest U.S. job board',
    category: 'jobBoard',
    method: 'handoff',
    accent: '#2557a7',
    url: 'https://secure.indeed.com/account/register',
    caps: { importsProfile: false, feedsJobs: true, fastApply: true },
    does: [
      'Opens Indeed so you can sign in or create your account',
      'Remembers you have an Indeed account so applies go straight there',
      'Many Indeed postings already appear in your job feed',
    ],
    doesNot: [
      'We never see or store your Indeed password',
      "We can't apply on Indeed for you — their terms don't allow it",
    ],
  },
  {
    id: 'ziprecruiter',
    name: 'ZipRecruiter',
    blurb: 'Fast apply job board',
    category: 'jobBoard',
    method: 'handoff',
    accent: '#1c874b',
    url: 'https://www.ziprecruiter.com/registration',
    caps: { importsProfile: false, feedsJobs: false, fastApply: true },
    does: [
      'Opens ZipRecruiter so you can sign in or create your account',
      'Remembers your account so your tracker and applies point there',
    ],
    doesNot: [
      'We never see or store your ZipRecruiter password',
      "We can't submit applications there for you",
    ],
  },
  {
    id: 'monster',
    name: 'Monster',
    blurb: 'Long-running job board',
    category: 'jobBoard',
    method: 'handoff',
    accent: '#6c4bd8',
    url: 'https://www.monster.com/profile/create',
    caps: { importsProfile: false, feedsJobs: false, fastApply: true },
    does: [
      'Opens Monster so you can sign in or create your account',
      'Remembers your account for your tracker and one-tap applies',
    ],
    doesNot: [
      'We never see or store your Monster password',
      "We can't apply there for you",
    ],
  },
  {
    id: 'linkedin-jobs',
    name: 'LinkedIn Jobs',
    blurb: 'Apply through LinkedIn',
    category: 'jobBoard',
    method: 'handoff',
    accent: '#0a66c2',
    url: 'https://www.linkedin.com/jobs',
    caps: { importsProfile: false, feedsJobs: false, fastApply: true },
    does: [
      'Opens LinkedIn Jobs so you can search and apply there',
      'Remembers your account so your tracker stays in one place',
    ],
    doesNot: [
      'We never see or store your LinkedIn password',
      'Easy Apply happens on LinkedIn — we can’t do it for you',
    ],
  },
];

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/**
 * Whether an identity provider's real OAuth redirect is available. True only
 * when accounts are turned on (a Clerk key is present), because Clerk is what
 * brokers Google/LinkedIn/Microsoft sign-in here. Handoff providers are always
 * available — they just open the provider's own site.
 */
export function isOAuthEnabled(p: Provider): boolean {
  if (p.method !== 'oauth') return true;
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

/** Sources that already power the job feed today — always on, nothing to connect. */
export const FEED_SOURCES: { name: string; blurb: string }[] = [
  { name: 'Adzuna', blurb: 'Licensed aggregator — pulls a broad slice of the U.S. market into your feed' },
  { name: 'USAJobs', blurb: 'Every federal job, straight from the government' },
  { name: 'Remotive', blurb: 'Remote-friendly roles' },
];

// ---- per-user connection state -------------------------------------------

export interface Connection {
  providerId: string;
  connectedAt: number;
  method: LinkMethod;
  /** What the user linked (email or handle), if they chose to tell us. */
  handle?: string;
}

type ConnMap = Record<string, Connection>;
const KEY = 'connections';
const EMPTY_CONNECTIONS: ConnMap = {};

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((fn) => fn());

function read(): ConnMap {
  const raw = lsGet(KEY);
  try { return raw ? (JSON.parse(raw) as ConnMap) : {}; }
  catch { return {}; }
}
function write(v: ConnMap) { lsSet(KEY, JSON.stringify(v)); }

let conns: ConnMap = read();
onStoreChange(() => { conns = read(); emit(); });
function subscribe(fn: Listener) { listeners.add(fn); return () => listeners.delete(fn); }

export function getConnections(): ConnMap { return conns; }
export function isConnected(providerId: string): boolean { return !!conns[providerId]; }

/** Record a consented connection. For oauth this is called after the real
 *  redirect returns; for handoff, after the user confirms they set the account up. */
export function connect(providerId: string, opts?: { handle?: string; connectedAt?: number }) {
  const p = getProvider(providerId);
  if (!p) return;
  conns = {
    ...conns,
    [providerId]: {
      providerId,
      method: p.method,
      handle: opts?.handle?.trim() || undefined,
      // Timestamp is passed in by the caller (client `Date.now()`), so the store
      // itself stays free of ambient time and easy to test.
      connectedAt: opts?.connectedAt ?? 0,
    },
  };
  write(conns); emit();
}

export function disconnect(providerId: string) {
  if (!conns[providerId]) return;
  const next = { ...conns };
  delete next[providerId];
  conns = next;
  write(conns); emit();
}

export function connectedCount(): number { return Object.keys(conns).length; }

export function useConnections(): ConnMap {
  return useSyncExternalStore(subscribe, getConnections, () => EMPTY_CONNECTIONS);
}

// ---- job-board deep links ------------------------------------------------

/**
 * A prefilled job-search URL on a job board, from what we already know about
 * the person (location + a keyword from their goal/skills). This is the honest
 * "smarter handoff": we can't sign into their account, but we can drop them
 * straight into relevant listings on the board's own site. Returns null for
 * providers without a known search surface.
 */
export function boardSearchUrl(
  providerId: string,
  opts: { keyword?: string; city?: string; region?: string } = {},
): string | null {
  const q = encodeURIComponent((opts.keyword ?? '').trim());
  const loc = encodeURIComponent([opts.city, opts.region].filter(Boolean).join(', ').trim());
  switch (providerId) {
    case 'indeed':        return `https://www.indeed.com/jobs?q=${q}&l=${loc}`;
    case 'ziprecruiter':  return `https://www.ziprecruiter.com/jobs-search?search=${q}&location=${loc}`;
    case 'monster':       return `https://www.monster.com/jobs/search?q=${q}&where=${loc}`;
    case 'linkedin-jobs': return `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${loc}`;
    default:              return null;
  }
}
