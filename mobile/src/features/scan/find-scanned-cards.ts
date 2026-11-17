import {
  cardWithNumber,
  rankScanMatches,
  readPrintedNumbers,
  setsForPrintedNumber,
  type CatalogLanguage,
  type ScanMatch,
} from '@collection/shared';

import { fetchSet, fetchSets } from '@/features/catalog/tcgdex';
import { fetchCached } from '@/lib/use-query';

/** Sets opened for one number. A total shared by more sets is rare, and the newest ones are the likely ones. */
const MAX_SETS_PER_NUMBER = 8;

/**
 * The cards carrying a number found in the text, the likeliest first. It reads the same caches as the catalog
 * screens, so it also works offline for the sets kept on the phone.
 */
export async function findScannedCards(language: CatalogLanguage, text: string): Promise<ScanMatch[]> {
  const numbers = readPrintedNumbers(text);
  if (numbers.length === 0) return [];
  const sets = await fetchCached(`sets:${language}`, () => fetchSets(language));
  const found = new Map<string, ScanMatch>();
  for (const number of numbers) {
    const candidates = setsForPrintedNumber(sets, number).slice(0, MAX_SETS_PER_NUMBER);
    const loaded = await Promise.all(
      candidates.map((set) =>
        fetchCached(`set:${language}:${set.id}`, () => fetchSet(language, set.id)).catch(() => undefined),
      ),
    );
    for (const entry of loaded) {
      const card = entry && cardWithNumber(entry.cards, number);
      if (card && !found.has(card.id)) found.set(card.id, { card, set: entry.set });
    }
  }
  return rankScanMatches([...found.values()], text);
}
