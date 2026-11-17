import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { ResponseStore } from '@/features/catalog/tcgdex';

// Everything lives in the document directory, which the system does not empty when space runs low, unlike the cache.
const ROOT = 'catalog-offline/v1';
const RESPONSES = 'responses';
const IMAGES = 'images';

/** The web version has no files of its own, and the browser keeps what it has already loaded. */
export const OFFLINE_FILES_AVAILABLE = Platform.OS !== 'web';

const directory = (name: string) => new Directory(Paths.document, ROOT, name);

function ensure(dir: Directory): Directory {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** A file name safe on every phone. Requests and image addresses only differ by letters, digits and separators. */
const fileNameOf = (key: string) =>
  key.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9._-]/g, (char) => `~${char.charCodeAt(0).toString(16)}`);

/** Keeps each answer of TCGdex as a JSON file. */
export const responseFiles: ResponseStore = {
  async read(request) {
    const file = new File(directory(RESPONSES), `${fileNameOf(request)}.json`);
    if (!file.exists) return undefined;
    return JSON.parse(await file.text()) as unknown;
  },
  async write(request, body) {
    const file = new File(ensure(directory(RESPONSES)), `${fileNameOf(request)}.json`);
    await file.write(JSON.stringify(body));
  },
};

const imageFile = (url: string) => new File(directory(IMAGES), fileNameOf(url));

/** The address of a picture kept on the phone, or undefined when it was not downloaded. */
export function keptImageUri(url: string): string | undefined {
  if (!OFFLINE_FILES_AVAILABLE) return undefined;
  const file = imageFile(url);
  return file.exists ? file.uri : undefined;
}

/** Downloads a picture once. A partial download never takes the place of the picture. */
export async function keepImage(url: string): Promise<void> {
  const file = imageFile(url);
  if (file.exists) return;
  const partial = new File(ensure(directory(IMAGES)), `${fileNameOf(url)}.part`);
  await File.downloadFileAsync(url, partial, { idempotent: true });
  await partial.move(file, { overwrite: true });
}

/** Space taken by the catalog kept on the phone, in bytes. */
export function keptCatalogSize(): number {
  if (!OFFLINE_FILES_AVAILABLE) return 0;
  const root = new Directory(Paths.document, ROOT);
  return root.exists ? (root.size ?? 0) : 0;
}

/** Removes the whole catalog kept on the phone. */
export function removeKeptCatalog(): void {
  const root = new Directory(Paths.document, ROOT);
  if (root.exists) root.delete();
}

/** The picture kept on the phone when there is one, else the address on the network. */
export const keptOrRemote = (url: string | undefined): string | undefined => url && (keptImageUri(url) ?? url);
