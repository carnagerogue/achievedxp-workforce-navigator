'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { error: Error | null }

/**
 * Last line of defense: if a page throws, render a friendly recovery panel
 * instead of a blank screen. The actual runtime error is still surfaced to
 * the console so we don't swallow diagnostics.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-8 shadow-card">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-rose-900">Something went wrong</h2>
            <p className="mt-1 text-sm text-rose-800">
              We hit an unexpected error rendering this view. Reloading will usually recover it.
            </p>
            <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-white/70 p-2 font-mono text-xs text-rose-900">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              <RotateCw className="h-4 w-4" /> Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
