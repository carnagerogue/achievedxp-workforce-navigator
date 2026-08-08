import { redirect } from 'next/navigation';
import { AUTH_ENABLED } from '../../../lib/auth-config';
import { AuthEntry } from '../../../components/auth/AuthEntry';

export const metadata = { title: 'Create your account · Achieve DXP' };

export default function SignUpPage() {
  if (!AUTH_ENABLED) redirect('/');
  return (
    <div className="flex min-h-[72vh] flex-col items-center justify-center py-12">
      <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-slate-900">
        Create your account
      </h1>
      <AuthEntry mode="sign-up" />
      <p className="mt-8 max-w-xs text-center text-xs leading-relaxed text-slate-400">
        Free, and private to you. Sign up with email, Google, or Microsoft.
      </p>
    </div>
  );
}
