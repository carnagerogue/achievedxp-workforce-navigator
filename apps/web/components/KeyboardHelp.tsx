'use client';

import { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';

/**
 * Keyboard shortcut reference overlay. Opens with `?` (shift+/) and closes
 * with Esc. Kept intentionally tiny — shows every hotkey the app supports
 * in one modal so users can discover them without reading docs.
 */
const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['⌘', 'K'],        label: 'Open command palette (jump to pages or jobs)' },
  { keys: ['Ctrl', 'K'],     label: 'Open command palette — Windows / Linux' },
  { keys: ['/'],             label: 'Focus search' },
  { keys: ['?'],             label: 'Show this help overlay' },
  { keys: ['Esc'],           label: 'Close any overlay (palette, help, modals)' },
  { keys: ['↑', '↓'],        label: 'Navigate results inside the command palette' },
  { keys: ['Enter'],         label: 'Open the highlighted palette result' },
];

export function KeyboardHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typingInField =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // `?` (shift+/) toggles; Esc closes.
      if (e.key === '?' && !typingInField) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card-hover animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-br from-teal-50/70 to-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Keyboard className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-900">Keyboard shortcuts</p>
              <p className="text-[11px] text-slate-500">Everything you can do without reaching for a mouse.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="divide-y divide-slate-100">
          {SHORTCUTS.map((s) => (
            <li key={s.keys.join('+') + s.label} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <span className="text-slate-700">{s.label}</span>
              <span className="flex shrink-0 items-center gap-1">
                {s.keys.map((k, i) => (
                  <kbd
                    key={k + i}
                    className="inline-flex min-w-[1.6rem] items-center justify-center rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-2 text-[11px] text-slate-500">
          Press <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px] text-slate-600">?</kbd> any time to show this again.
        </div>
      </div>
    </div>
  );
}
