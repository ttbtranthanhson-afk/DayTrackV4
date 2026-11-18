import { useSyncExternalStore } from 'react';
import {
  getAccountItem,
  onAccountChange,
  removeAccountItem,
  setAccountItem,
} from './accountStorage';

export const AVATAR_STORAGE_KEY = 'daytrack_avatar';

function load(): string | null {
  try {
    const raw = getAccountItem(AVATAR_STORAGE_KEY);
    return raw && raw.startsWith('data:image/') ? raw : null;
  } catch {
    return null;
  }
}

let avatarState: string | null = load();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): string | null {
  return avatarState;
}

function emit() {
  listeners.forEach(listener => listener());
}

onAccountChange(() => {
  avatarState = load();
  emit();
});

export function useAvatar(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function setAvatar(dataUrl: string) {
  if (!dataUrl.startsWith('data:image/')) return;
  avatarState = dataUrl;
  setAccountItem(AVATAR_STORAGE_KEY, dataUrl);
  emit();
}

export function clearAvatar() {
  avatarState = null;
  removeAccountItem(AVATAR_STORAGE_KEY);
  emit();
}
