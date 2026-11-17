import { mapLimited, type CatalogLanguage } from '@collection/shared';
import { useSyncExternalStore } from 'react';

import { loadCards } from '@/features/catalog/hooks';
import { cardImageUrl, fetchSet, fetchSets, keepCardSearchOffline } from '@/features/catalog/tcgdex';
import { readJson, writeJson } from '@/lib/storage';

import { keepImage, keptCatalogSize, removeKeptCatalog } from './catalog-files';

const DOWNLOADED_KEY = 'offline-sets/v1';
/** Pictures downloaded at the same time. More would compete with what the screens are loading. */
const PARALLEL_IMAGES = 4;

type Downloaded = Partial<Record<CatalogLanguage, Record<string, string>>>;

interface CurrentDownload {
  language: CatalogLanguage;
  setId: string;
  done: number;
  total: number;
}

export interface OfflineState {
  /** The sets kept on the phone, by language, with the day they were downloaded. */
  downloaded: Downloaded;
  current: CurrentDownload | undefined;
  /** Sets waiting their turn, in order. */
  waiting: readonly { language: CatalogLanguage; setId: string }[];
  /** Sets that could not be downloaded in the last run. */
  failedCount: number;
  /** Space taken on the phone, in bytes. */
  size: number;
}

const restoreDownloaded = (value: unknown): Downloaded | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Downloaded) : undefined;

let state: OfflineState = { downloaded: {}, current: undefined, waiting: [], failedCount: 0, size: 0 };
const listeners = new Set<() => void>();
let running = false;

function update(patch: Partial<OfflineState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

const ready = readJson<Downloaded>(DOWNLOADED_KEY, {}, restoreDownloaded)
  .catch(() => ({}))
  .then((downloaded) => update({ downloaded, size: keptCatalogSize() }));

/** Downloads a set, its cards with their variants and prices, and their small pictures. */
async function downloadSet(language: CatalogLanguage, setId: string): Promise<void> {
  const { set, cards } = await fetchSet(language, setId);
  const pictures = [
    ...cards.flatMap((card) => cardImageUrl(card.imageUrl, 'low') ?? []),
    ...[set.logoUrl, set.symbolUrl].flatMap((url) => url ?? []),
  ];
  const total = cards.length + pictures.length;
  let done = 0;
  const progress = () => update({ current: { language, setId, done: ++done, total } });
  update({ current: { language, setId, done, total } });

  const loaded = await loadCards(
    language,
    cards.map((card) => card.id),
    progress,
  );
  if (loaded.size < cards.length) throw new Error(`${cards.length - loaded.size} cards of ${setId} could not load`);
  const images = await mapLimited(pictures, PARALLEL_IMAGES, (url) => keepImage(url).finally(progress));
  const imageFailures = images.filter((result) => result.status === 'rejected').length;
  if (imageFailures > 0) throw new Error(`${imageFailures} pictures of ${setId} could not load`);
}

async function run() {
  if (running) return;
  running = true;
  let failedCount = 0;
  try {
    for (let next = state.waiting[0]; next; next = state.waiting[0]) {
      update({ waiting: state.waiting.slice(1) });
      try {
        await downloadSet(next.language, next.setId);
        const downloaded = {
          ...state.downloaded,
          [next.language]: { ...state.downloaded[next.language], [next.setId]: new Date().toISOString() },
        };
        update({ downloaded });
        await writeJson(DOWNLOADED_KEY, downloaded);
      } catch (error) {
        console.warn(`Could not download ${next.setId} for offline use`, error);
        failedCount += 1;
      }
      update({ size: keptCatalogSize() });
    }
  } finally {
    running = false;
    update({ current: undefined, failedCount });
  }
}

/**
 * Downloads sets so they open without a network. Sets already downloaded are downloaded again, which refreshes their
 * prices, and pictures already on the phone are skipped. It goes on while the app is open, across screens.
 */
export async function downloadSets(language: CatalogLanguage, setIds: readonly string[]): Promise<void> {
  await ready;
  const busy = new Set(
    [state.current, ...state.waiting].flatMap((entry) => (entry ? `${entry.language}/${entry.setId}` : [])),
  );
  const added = setIds.filter((setId) => !busy.has(`${language}/${setId}`)).map((setId) => ({ language, setId }));
  if (added.length === 0) return;
  update({ waiting: [...state.waiting, ...added], failedCount: 0 });
  // The list of sets and of every card, so the catalog and the search open offline too.
  await Promise.all([fetchSets(language), keepCardSearchOffline(language)]).catch((error) =>
    console.warn('Could not keep the list of sets offline', error),
  );
  await run();
}

/** Stops the sets waiting their turn. The one being downloaded finishes. */
export function cancelDownloads(): void {
  update({ waiting: [] });
}

/** Removes everything kept for offline use, apart from the collection itself. */
export async function removeDownloads(): Promise<void> {
  cancelDownloads();
  removeKeptCatalog();
  update({ downloaded: {}, size: 0 });
  await writeJson(DOWNLOADED_KEY, {});
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getState = () => state;

/** What is kept for offline use and what is being downloaded. */
export function useOfflineDownloads(): OfflineState {
  return useSyncExternalStore(subscribe, getState, getState);
}
