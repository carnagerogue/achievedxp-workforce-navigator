import { redirect } from 'next/navigation';

/**
 * The Reentry Compass and the dashboard were two competing homes; they are
 * now one guided surface at /dashboard. This route survives as a redirect so
 * old links, bookmarks, and the "Start here" muscle memory keep working
 * (fragments like /start#corner are preserved by the browser).
 */
export default function StartRedirect() {
  redirect('/dashboard');
}
