'use client';

import { useState } from 'react';
import { Check, Plus, Briefcase, UserCircle2, Zap, Link2Off } from 'lucide-react';
import { type Provider, isConnected, disconnect, isOAuthEnabled, useConnections } from '../../lib/connections';
import { ConnectDialog } from './ConnectDialog';

const CAP_META = [
  { key: 'importsProfile', label: 'Fills your kit', Icon: UserCircle2 },
  { key: 'feedsJobs', label: 'In your feed', Icon: Briefcase },
  { key: 'fastApply', label: 'Fast apply', Icon: Zap },
] as const;

export function ConnectionTile({ provider }: { provider: Provider }) {
  const [open, setOpen] = useState(false);
  // Subscribe so the tile flips to "Connected" the moment the store updates.
  const conns = useConnections();
  const connected = isConnected(provider.id);
  const conn = conns[provider.id];
  const oauthOff = !isOAuthEnabled(provider);

  return (
    <div className={'relative flex flex-col rounded-2xl border bg-white p-4 shadow-card transition ' + (connected ? 'border-teal-300' : 'border-slate-200')}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: provider.accent }}>
          {provider.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold text-slate-900">{provider.name}</h3>
            {connected && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">
                <Check className="h-3 w-3" /> Connected
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-500">{conn?.handle || provider.blurb}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CAP_META.filter((c) => provider.caps[c.key]).map((c) => (
          <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-slate-900/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-500">
            <c.Icon className="h-3 w-3" /> {c.label}
          </span>
        ))}
      </div>

      <div className="mt-3.5 flex items-center gap-2">
        {connected ? (
          <button onClick={() => disconnect(provider.id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-600">
            <Link2Off className="h-3.5 w-3.5" /> Disconnect
          </button>
        ) : oauthOff ? (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-medium text-slate-400" title="Your program can turn on sign-in with this provider.">
            Enabled by your program
          </span>
        ) : (
          <button onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]">
            <Plus className="h-3.5 w-3.5" /> Connect
          </button>
        )}
      </div>

      {open && <ConnectDialog provider={provider} onClose={() => setOpen(false)} />}
    </div>
  );
}
