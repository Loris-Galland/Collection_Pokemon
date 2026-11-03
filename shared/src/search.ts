// Searching the catalog. It runs on the phone, because TCGdex only matches a name with its exact accents.

/** Lower case with no accents or punctuation, so "Salamèche" and "salameche" read the same. */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/[-'’.,:;!?&_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SearchableCard {
  name: string;
  localId: string;
  setName: string;
}

export interface SearchEntry<T> {
  item: T;
  name: string;
  /** Words of the set name. */
  setWords: readonly string[];
  /** Printed number with no leading zeros, so "006" and "6" read the same. */
  number: string;
}

function comparableNumber(number: string): string {
  return number.replace(/^0+(?=.)/, '').toLowerCase();
}

/** Prepares items for repeated searches, since reading thousands of names on each keystroke would be slow. */
export function createSearchIndex<T>(items: readonly T[], read: (item: T) => SearchableCard): SearchEntry<T>[] {
  // Thousands of cards share a few set names, so each one is only prepared once.
  const setWordsByName = new Map<string, readonly string[]>();
  return items.map((item) => {
    const { name, localId, setName } = read(item);
    let setWords = setWordsByName.get(setName);
    if (!setWords) {
      setWords = normalizeSearchText(setName).split(' ');
      setWordsByName.set(setName, setWords);
    }
    return {
      item,
      name: normalizeSearchText(name),
      setWords,
      number: comparableNumber(localId),
    };
  });
}

/** The printed number of a card reads "006/165", and only its first part identifies the card in a set. */
function queryWords(query: string): string[] {
  return query
    .replace(/(\d+)\s*\/\s*\d+/g, '$1')
    .split(/\s+/)
    .flatMap((word) => normalizeSearchText(word).split(' '))
    .filter(Boolean);
}

interface QueryWord {
  word: string;
  number: string;
}

const NO_MATCH = -1;

/** Lower is better, and `NO_MATCH` means a word of the query is found nowhere. */
function score<T>(entry: SearchEntry<T>, words: readonly QueryWord[], phrase: string): number {
  for (const { word, number } of words) {
    const found =
      entry.name.includes(word) ||
      number === entry.number ||
      entry.setWords.some((setWord) => setWord.startsWith(word));
    if (!found) return NO_MATCH;
  }
  if (entry.name === phrase) return 0;
  if (entry.name.startsWith(phrase)) return 1;
  if (entry.name.split(' ').some((nameWord) => nameWord.startsWith(phrase))) return 2;
  if (entry.name.includes(phrase)) return 3;
  return 4;
}

/**
 * The items matching every word of the query, in the name, the set or the number. The closest names come first, and
 * items that match equally stay in the order of the index.
 */
export function searchIndex<T>(index: readonly SearchEntry<T>[], query: string): T[] {
  const words = queryWords(query);
  if (words.length === 0) return [];
  const phrase = words.join(' ');
  const queryWordList = words.map((word) => ({ word, number: comparableNumber(word) }));
  const matches: { item: T; rank: number }[] = [];
  for (const entry of index) {
    const rank = score(entry, queryWordList, phrase);
    if (rank !== NO_MATCH) matches.push({ item: entry.item, rank });
  }
  // The sort is stable, so the order of the index decides between equal ranks.
  return matches.sort((a, b) => a.rank - b.rank).map((match) => match.item);
}
