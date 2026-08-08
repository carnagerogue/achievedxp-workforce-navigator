/**
 * Prefer the image supplied by the identity provider a person actually used.
 * Clerk's user image may be its generic silhouette when no profile image was
 * copied onto the Clerk user, while the linked Google/Microsoft/LinkedIn
 * account still carries the real provider photo.
 */
export interface AccountIdentityLike {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  hasImage?: boolean;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
  externalAccounts?: Array<{
    provider?: string | null;
    imageUrl?: string | null;
  }>;
}

const PREFERRED_IMAGE_PROVIDERS = ['google', 'microsoft', 'linkedin'];

export function accountDisplayName(user: AccountIdentityLike | null | undefined): string {
  if (!user) return '';
  const explicit = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
  if (explicit) return explicit.trim();
  const local = user.primaryEmailAddress?.emailAddress?.split('@')[0] ?? '';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function accountImageUrl(user: AccountIdentityLike | null | undefined): string | undefined {
  if (!user) return undefined;
  const accounts = user.externalAccounts ?? [];
  const preferred = PREFERRED_IMAGE_PROVIDERS
    .map((provider) => accounts.find((account) => account.provider?.toLowerCase().includes(provider) && account.imageUrl))
    .find(Boolean);
  const anyProviderImage = accounts.find((account) => account.imageUrl)?.imageUrl;
  return preferred?.imageUrl ?? anyProviderImage ?? (user.hasImage ? user.imageUrl ?? undefined : undefined);
}
