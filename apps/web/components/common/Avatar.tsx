'use client';

import { useEffect, useState } from 'react';

/**
 * Initials avatar with a deterministic gradient per name. Workforce support is
 * human — a colored identity makes each workspace warmer and easier to scan than a
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

export function initialsForName(name: string): string {
  const normalized = name.trim().replace(/[@._-]+/g, ' ');
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, imageUrl, size = 44 }: { name: string; imageUrl?: string; size?: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [imageUrl]);
  const g = GRADIENTS[hash(name || '?') % GRADIENTS.length];
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${g} font-bold text-white shadow-sm ring-2 ring-white/30`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-label={name || 'Account'}
    >
      {imageUrl && !imageFailed ? (
        // Clerk supplies a short-lived, user-specific CDN URL. A native image
        // avoids coupling account photos to Next's static remote-host allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
      ) : initialsForName(name)}
    </span>
  );
}
