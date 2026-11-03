import { useEffect, useSyncExternalStore } from 'react';

import { API_URL, authClient } from './auth-client';

// Null means the account has no picture, and a missing entry means it is not known yet.
const avatars = new Map<string, string | null>();
const listeners = new Set<() => void>();

function publish(userId: string, image: string | null): void {
  avatars.set(userId, image);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function request(method: 'GET' | 'PUT' | 'DELETE', image?: string): Promise<Response> {
  const response = await fetch(`${API_URL}/api/avatar`, {
    method,
    credentials: 'omit',
    headers: { cookie: await authClient.getCookie(), 'content-type': 'application/json' },
    body: image ? JSON.stringify({ image }) : undefined,
  });
  if (!response.ok) throw new Error(`Avatar request failed with status ${response.status}`);
  return response;
}

/** The picture of an account as base64, from memory when it is already known. */
export async function loadAvatar(userId: string): Promise<string | null> {
  const known = avatars.get(userId);
  if (known !== undefined) return known;
  const { image } = (await (await request('GET')).json()) as { image: string | null };
  publish(userId, image);
  return image;
}

export async function saveAvatar(userId: string, image: string): Promise<void> {
  await request('PUT', image);
  publish(userId, image);
}

export async function removeAvatar(userId: string): Promise<void> {
  await request('DELETE');
  publish(userId, null);
}

/** Drops the picture from memory, once the account is deleted. */
export function forgetAvatar(userId: string): void {
  avatars.delete(userId);
}

/** The picture of an account as an image address. Without one, or while it loads, the screen shows the initial. */
export function useAvatarUri(userId: string): string | undefined {
  const image = useSyncExternalStore(subscribe, () => avatars.get(userId));

  useEffect(() => {
    // A failure only leaves the initial in place, and the next screen tries again.
    loadAvatar(userId).catch(() => undefined);
  }, [userId]);

  return image ? avatarUri(image) : undefined;
}

export function avatarUri(image: string): string {
  return `data:image/jpeg;base64,${image}`;
}
