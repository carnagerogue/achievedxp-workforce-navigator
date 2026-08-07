import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { ToastProvider } from '../components/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { CompareBar } from '../components/CompareBar';
import { CommandPalette } from '../components/CommandPalette';
import { KeyboardHelp } from '../components/KeyboardHelp';
import { AuthProvider } from '../components/auth/AuthProvider';
import { AuthScopeSync } from '../components/auth/AuthScopeSync';
import { AUTH_ENABLED } from '../lib/auth-config';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Achieve DXP · Workforce Navigator',
  description:
    'Real-world jobs matched to you — with the full picture on background-check risk and fair-chance employers.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-full flex-col font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-teal-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <AuthProvider>
          <AuthScopeSync />
          <ToastProvider>
            <SiteHeader />
            {!AUTH_ENABLED && (
              <div className="preview-notice" role="status">
                <strong>Private preview</strong>
                <span className="preview-notice__full">Guest profile data stays in this server session and may reset. Do not enter sensitive case notes.</span>
                <span className="preview-notice__short">Guest data may reset. Avoid sensitive case notes.</span>
              </div>
            )}
            <main id="main-content" className="mx-auto w-full max-w-[1440px] flex-1 px-5 sm:px-8">
              <div className="workspace-shell"><ErrorBoundary>{children}</ErrorBoundary></div>
            </main>
            <SiteFooter />
            <CompareBar />
            <CommandPalette />
            <KeyboardHelp />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
