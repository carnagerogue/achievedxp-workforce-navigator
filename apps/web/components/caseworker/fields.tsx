'use client';

import type { ReactNode } from 'react';

/** Shared form primitives for the caseworker cockpit (intake + composers). */

export function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={'block text-sm ' + (className ?? '')}>
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function TextInput({
  value, onChange, placeholder, type = 'text',
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
    />
  );
}

export function Select({
  value, onChange, children,
}: { value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
    >
      {children}
    </select>
  );
}

export function splitTags(v: string): string[] {
  return v.split(',').map((s) => s.trim()).filter(Boolean);
}
