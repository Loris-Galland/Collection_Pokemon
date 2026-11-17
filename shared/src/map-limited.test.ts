import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapLimited } from './map-limited.ts';

describe('mapLimited', () => {
  it('runs no more than the limit at a time and keeps the order of the results', async () => {
    let running = 0;
    let highest = 0;
    const results = await mapLimited([1, 2, 3, 4, 5], 2, async (item) => {
      running += 1;
      highest = Math.max(highest, running);
      await new Promise((resolve) => setTimeout(resolve, 5 - item));
      running -= 1;
      if (item === 3) throw new Error('three');
      return item * 10;
    });
    assert.equal(highest, 2);
    assert.deepEqual(
      results.map((result) => (result.status === 'fulfilled' ? result.value : 'failed')),
      [10, 20, 'failed', 40, 50],
    );
  });

  it('does nothing for no items', async () => {
    assert.deepEqual(await mapLimited([], 4, async () => 1), []);
  });
});
