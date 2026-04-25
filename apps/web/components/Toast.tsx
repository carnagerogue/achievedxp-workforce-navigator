'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
}

interface ToastApi {
  push: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, body?: string) => void;
  error:   (title: string, body?: string) => void;
  info:    (title: string, body?: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    setToasts((prev) => [...prev, { ...t, id: Date.now() + Math.random() }]);
  }, []);

  const api: ToastApi = useMemo(
    () => ({
      push,
      success: (title, body) => push({ tone: 'success', title, body }),
      error:   (title, body) => push({ tone: 'error',   title, body }),
      info:    (title, body) => push({ tone: 'info',    title, body }),
    }),
    [push],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  // Auto-dismiss after 4s. Errors stay up longer (6s) so the user has time to read.
  useEffect(() => {
    const timeout = toast.tone === 'error' ? 6000 : 4000;
    const t = setTimeout(onDismiss, timeout);
    return () => clearTimeout(t);
  }, [toast.tone, onDismiss]);

  const tones = {
    success: { cls: 'border-teal-200 bg-teal-50   text-teal-900',   Icon: CheckCircle2,  iconCls: 'text-teal-600' },
    error:   { cls: 'border-rose-200 bg-rose-50   text-rose-900',   Icon: AlertTriangle, iconCls: 'text-rose-600' },
    info:    { cls: 'border-navy-200 bg-navy-50   text-navy-900',   Icon: Info,          iconCls: 'text-navy-600' },
  } as const;
  const { cls, Icon, iconCls } = tones[toast.tone];

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white/95 p-3.5 shadow-card-hover backdrop-blur animate-toast-in ${cls}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconCls}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.body && <p className="mt-0.5 text-xs opacity-90">{toast.body}</p>}
      </div>
      <button
        onClick={onDismiss}
        className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
