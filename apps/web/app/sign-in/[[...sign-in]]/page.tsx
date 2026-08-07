import { redirect } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';
import { AUTH_ENABLED } from '../../../lib/auth-config';

export const metadata = { title: 'Sign in · Achieve DXP' };

export default function SignInPage() {
  if (!AUTH_ENABLED) redirect('/');
  return (
    <div className="flex min-h-[72vh] flex-col items-center justify-center py-12">
      <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-slate-900">
        Welcome back
      </h1>
      <SignIn signUpUrl="/sign-up" />
      <p className="mt-8 max-w-xs text-center text-xs leading-relaxed text-slate-400">
        Your account keeps your plan private and yours — on any device. Nothing is ever shared with employers.
      </p>
    </div>
  );
}
