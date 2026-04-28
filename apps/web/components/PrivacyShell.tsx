'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, X } from 'lucide-react';
import { initIdleWipe } from '../lib/personal-store';

/**
 * Three privacy primitives mounted at the app root:
 *
 *   1. First-run privacy notice — shown once per browser, dismissable. Tells
 *      a justice-impacted candidate (often using a library/kiosk computer)
 *      what gets stored locally and how to wipe it.
 *
 *   2. Idle-wipe init — wires localStorage cleanup if the tab has been
 *      inactive for >4 hours. The actual logic lives in personal-store.ts;
 *      this component just calls it on mount.
 *
 *   3. (Indirect) the header has a "Clear my data" button that calls
 *      `clearAllPersonalData()` directly.
 *
 * Why client-side: every primitive needs the localStorage API. Sits inside
 * the layout but renders nothing visible after the notice is dismissed.
 */

const NOTICE_KEY = 'dxp.privacyNoticeAcknowledged';

export function PrivacyShell() {
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    // Idle-wipe attaches its own listeners; cleanup function unbinds them
    // on unmount (effectively never, since this lives at the app root).
    const cleanup = initIdleWipe();

    // Show the notice if we haven't recorded an ack in localStorage yet.
    try {
      const acked = window.localStorage.getItem(NOTICE_KEY);
      if (!acked) setShowNotice(true);
    } catch {
      // localStorage blocked (e.g. private mode with strict cookies) —
      // skip the notice rather than render something we can't dismiss.
    }

    return () => cleanup();
  }, []);

  const dismiss = () => {
    try { window.localStorage.setItem(NOTICE_KEY, String(Date.now())); } catch { /* ignore */ }
    setShowNotice(false);
  };

  if (!showNotice) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Shield className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-navy-900">Heads up — using a shared computer?</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-700">
              We save your saved jobs, application status, and any caseworker plan in this browser
              so you can pick up where you left off. <strong>Sign out</strong> when you're done, or
              tap <strong>Clear my data</strong> in the header. We'll also auto-wipe this browser
              after 4 hours of inactivity. Read more in our{' '}
              <Link href="/privacy" className="font-semibold text-teal-700 hover:underline">
                privacy notes
              </Link>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
              >
                Got it
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
