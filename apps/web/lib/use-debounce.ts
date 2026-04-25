'use client';

import { useEffect, useState } from 'react';

/**
 * Returns a value that updates `delayMs` after the last change. Useful for
 * search inputs so we don't fire a network request on every keystroke.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
