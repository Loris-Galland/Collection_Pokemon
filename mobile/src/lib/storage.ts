import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

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

/** Delay before writing, so several quick taps (on the stepper for example) only cause one write. */
const WRITE_DELAY_MS = 400;

/**
 * React state saved on the phone. It is read on startup, then written shortly after each change. `loaded` stays false
 * until the first read is done.
 */
export function usePersistentState<T>(
  key: string,
  fallback: T,
  restore: Restore<T>,
): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    readJson(key, fallback, restore)
      .catch(() => fallback)
      .then((stored) => {
        setValue(stored);
        setLoaded(true);
      });
    // Read once on startup, for this key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      writeJson(key, value).catch((error) => console.warn(`Could not save ${key} locally`, error));
    }, WRITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [key, value, loaded]);

  return [value, setValue, loaded];
}
