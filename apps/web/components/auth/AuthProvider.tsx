'use client';

/**
 * Wraps the app in Clerk's provider ONLY when accounts are enabled. With no
 * Clerk key, it renders children untouched, so the app builds and runs with
 * zero auth dependency (CI, local dev, pre-setup deploys).
 */
import { ClerkProvider } from '@clerk/nextjs';
import { AUTH_ENABLED } from '../../lib/auth-config';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!AUTH_ENABLED) return <>{children}</>;
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#0c7069',
          borderRadius: '0.9rem',
          fontFamily: 'var(--font-inter)',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
