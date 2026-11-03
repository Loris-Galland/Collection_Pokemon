import type { Language } from '@collection/shared';
import { useEffect, useState } from 'react';

import { fetchCached, useQuery } from '@/lib/use-query';
import { useSettings } from '@/features/settings/settings-provider';

import { fetchCard, fetchSet, fetchSets, searchCards, type CardDetail } from './tcgdex';

/** Every set, in the catalog language. */
export function useSets() {
  const { language } = useSettings();
  return useQuery(`sets:${language}`, () => fetchSets(language));
}

/** A set and its cards. */
export function useSet(setId: string) {
  const { language } = useSettings();
  return useQuery(`set:${language}:${setId}`, () => fetchSet(language, setId));
}

/** The details of one card. */
export function useCard(cardId: string) {
  const { language } = useSettings();
  return useQuery(`card:${language}:${cardId}`, () => fetchCard(language, cardId));
}

/** Maximum number of parallel requests to TCGdex, so a large collection does not flood it. */
const MAX_PARALLEL_REQUESTS = 6;

/** Loads each card, cache first, a few at a time. Failures are skipped. */
export async function loadCards(
  language: Language,
  cardIds: readonly string[],
  onProgress?: (doneCount: number) => void,
): Promise<Map<string, CardDetail>> {
  const cards = new Map<string, CardDetail>();
  const queue = [...cardIds];
  let doneCount = 0;
  const worker = async () => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      const cardId = id;
      try {
        const detail = await fetchCached(`card:${language}:${cardId}`, () => fetchCard(language, cardId));
        cards.set(detail.card.id, detail);
      } catch {
        // Card not found or network failure. It is simply left out of the result.
      }
      onProgress?.(++doneCount);
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_PARALLEL_REQUESTS, queue.length) }, worker));
  return cards;
}

/**
 * The details of several cards. A card that was already opened comes from the cache, so adding one card to the list
 * only loads that card.
 */
export function useCards(cardIds: readonly string[]): { cards: Map<string, CardDetail>; loading: boolean } {
  const { language } = useSettings();
  const requestKey = `${language}|${[...cardIds].sort().join(',')}`;
  const [loaded, setLoaded] = useState<{ key: string; cards: Map<string, CardDetail> }>({
    key: '',
    cards: new Map(),
  });

  useEffect(() => {
    let cancelled = false;
    loadCards(language, cardIds).then((cards) => {
      if (!cancelled) setLoaded({ key: requestKey, cards });
    });
    return () => {
      cancelled = true;
    };
    // The request key already captures `cardIds` and `language`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  return { cards: loaded.cards, loading: loaded.key !== requestKey };
}

/** Waits until typing settles before returning the value, so we do not send one request per keystroke. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Number of letters from which the search also looks through cards. */
export const CARD_SEARCH_MIN_LENGTH = 2;
const MAX_QUERY_LENGTH = 60;

/** Cards matching the query, across every set. */
export function useCardSearch(query: string) {
  const { language } = useSettings();
  // A sensible query fits in a few words, so oversized input is truncated.
  const debounced = useDebouncedValue(query.trim().slice(0, MAX_QUERY_LENGTH), 300);
  const enabled = debounced.length >= CARD_SEARCH_MIN_LENGTH;
  const result = useQuery(`search:${language}:${debounced.toLocaleLowerCase('fr')}`, () =>
    enabled ? searchCards(language, debounced) : Promise.resolve({ cards: [], total: 0 }),
  );
  // Until the input settles, the search counts as still running.
  const pending = query.trim().slice(0, MAX_QUERY_LENGTH) !== debounced;
  return { ...result, loading: enabled && (result.loading || pending), enabled };
}
