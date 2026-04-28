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
import { PrivacyShell } from '../components/PrivacyShell';

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
        <ToastProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
          <SiteFooter />
          <CompareBar />
          <CommandPalette />
          <KeyboardHelp />
          <PrivacyShell />
        </ToastProvider>
      </body>
    </html>
  );
}
