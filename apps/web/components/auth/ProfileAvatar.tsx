'use client';

import { useUser } from '@clerk/nextjs';
import { AUTH_ENABLED } from '../../lib/auth-config';
import { accountDisplayName, accountImageUrl } from '../../lib/account-identity';
import { Avatar } from '../common/Avatar';

export function ProfileAvatar({ name, size = 44 }: { name: string; size?: number }) {
  return AUTH_ENABLED ? <ClerkProfileAvatar fallbackName={name} size={size} /> : <Avatar name={name} size={size} />;
}

function ClerkProfileAvatar({ fallbackName, size }: { fallbackName: string; size: number }) {
  const { isLoaded, user } = useUser();
  const name = isLoaded && user ? accountDisplayName(user) || fallbackName : fallbackName;
  const imageUrl = isLoaded && user ? accountImageUrl(user) : undefined;
  return <Avatar name={name} imageUrl={imageUrl} size={size} />;
}
