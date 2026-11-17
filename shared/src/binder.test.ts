import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BINDER_PAGE_SIZE, binderPages } from './binder.ts';

describe('binderPages', () => {
  it('puts nine cards on each page, the last one partly filled', () => {
    const pages = binderPages(Array.from({ length: 20 }, (_, index) => index));
    assert.deepEqual(
      pages.map((page) => page.length),
      [BINDER_PAGE_SIZE, BINDER_PAGE_SIZE, 2],
    );
    assert.equal(pages[1]?.[0], 9);
  });

  it('has no page for an empty set', () => {
    assert.deepEqual(binderPages([]), []);
  });
});
