'use client';

/**
 * Initials avatar with a deterministic gradient per name. Reentry work is
 * human — a colored identity makes the caseload scannable and warmer than a
 * row of identical icons.
 */
const GRADIENTS = [
  'from-teal-500 to-cyan-600',
  'from-navy-700 to-teal-700',
  'from-violet-500 to-indigo-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const g = GRADIENTS[hash(name || '?') % GRADIENTS.length];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${g} font-bold text-white shadow-sm ring-1 ring-black/5`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
