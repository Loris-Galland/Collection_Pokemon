import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isShinyCard } from './catalog.ts';

describe('isShinyCard', () => {
  it('makes holo prints and rare cards shine, in English or French', () => {
    assert.ok(isShinyCard({ variants: ['holo'], rarity: 'Common' }));
    assert.ok(isShinyCard({ variants: ['normal'], rarity: 'Illustration rare' }));
    assert.ok(isShinyCard({ variants: ['normal'], rarity: 'Ultra Rare' }));
    assert.ok(isShinyCard({ variants: ['normal'], rarity: 'Rare Secrète' }));
  });

  it('leaves common cards with a reverse print still', () => {
    assert.ok(!isShinyCard({ variants: ['normal', 'reverse'], rarity: 'Commune' }));
    assert.ok(!isShinyCard({ variants: ['normal'], rarity: undefined }));
  });
});
