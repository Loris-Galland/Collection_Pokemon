import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

/**
 * Turns a stored value back into usable data, keeping whatever is still valid. Returns undefined when nothing can be
 * recovered.
 */
export type Restore<T> = (value: unknown) => T | undefined;

/**
 * Reads a JSON value saved on the phone. A missing or invalid value gives the fallback, and a partly corrupted one keeps
 * its valid entries, so one bad item never wipes the rest. Rejects when the storage itself cannot be read, because the
 * caller must not mistake that for an empty value and overwrite what is stored.
 */
export async function readJson<T>(key: string, fallback: T, restore: Restore<T>): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return restore(parsed) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Saves a value as JSON on the phone. Rejects when it could not be written. */
export async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** Removes saved values from the phone. */
export async function removeJson(keys: readonly string[]): Promise<void> {
  await AsyncStorage.multiRemove([...keys]);
}

/** Moves a saved value to a new key, unless that key already holds one. */
export async function moveJson(from: string, to: string): Promise<void> {
  const value = await AsyncStorage.getItem(from);
  if (value === null) return;
  if ((await AsyncStorage.getItem(to)) === null) await AsyncStorage.setItem(to, value);
  await AsyncStorage.removeItem(from);
}

/**
 * React state saved on the phone. It is read for its key, then written after each change. `loaded` stays false until the
 * value of the current key has been read, and the value of another key is never written under this one.
 */
export function usePersistentState<T>(
  key: string,
  fallback: T,
  restore: Restore<T>,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [stored, setStored] = useState<{ key: string; value: T }>();

  useEffect(() => {
    let cancelled = false;
    readJson(key, fallback, restore)
      .catch(() => fallback)
      .then((value) => {
        if (!cancelled) setStored({ key, value });
      });
    return () => {
      cancelled = true;
    };
    // Read once for each key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (stored?.key !== key) return;
    writeJson(key, stored.value).catch((error) => console.warn(`Could not save ${key} locally`, error));
  }, [key, stored]);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (action) =>
      setStored((current) =>
        current?.key === key
          ? { key, value: typeof action === 'function' ? (action as (value: T) => T)(current.value) : action }
          : current,
      ),
    [key],
  );

  const loaded = stored?.key === key;
  return [loaded ? stored.value : fallback, setValue, loaded];
}
