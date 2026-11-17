// The binder shows a set as the pages of a real binder, nine pockets a page.

/** Pockets on one page of a binder, three rows of three. */
export const BINDER_PAGE_SIZE = 9;

/** Splits the cards of a set into binder pages, in the order of the set. The last page can be partly empty. */
export function binderPages<T>(cards: readonly T[], pageSize = BINDER_PAGE_SIZE): T[][] {
  const pages: T[][] = [];
  for (let start = 0; start < cards.length; start += pageSize) pages.push(cards.slice(start, start + pageSize));
  return pages;
}
