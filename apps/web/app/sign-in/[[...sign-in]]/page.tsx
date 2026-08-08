import { redirect } from 'next/navigation';
import { AUTH_ENABLED } from '../../../lib/auth-config';
import { AuthEntry } from '../../../components/auth/AuthEntry';

export const metadata = { title: 'Sign in · Achieve DXP' };

export default function SignInPage() {
  if (!AUTH_ENABLED) redirect('/');
  return (
    <div className="flex min-h-[72vh] flex-col items-center justify-center py-12">
      <h1 className="mb-8 text-center text-3xl font-semibold tracking-tight text-slate-900">
        Welcome back
      </h1>
      <AuthEntry mode="sign-in" />
      <p className="mt-8 max-w-xs text-center text-xs leading-relaxed text-slate-400">
        Signing in protects access to your navigator. Planning tools are saved in this browser unless you explicitly export or share them; nothing is shared with employers automatically.
      </p>
    </div>
  );
}
