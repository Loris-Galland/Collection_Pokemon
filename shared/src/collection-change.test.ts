import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_COPY_QUANTITY,
  MAX_ENTRIES_PER_CHANGE,
  MAX_ID_LENGTH,
  combinationOf,
  isCollectionChange,
  type CopyInput,
} from './collection.ts';

const input: CopyInput = {
  cardId: 'sv03.5-006',
  setId: 'sv03.5',
  variant: 'holo',
  language: 'fr',
  condition: 'near-mint',
  quantity: 1,
};

describe('combinationOf', () => {
  it('keeps what makes two copies the same, without the quantity or the set', () => {
    assert.deepEqual(combinationOf(input), {
      cardId: 'sv03.5-006',
      variant: 'holo',
      language: 'fr',
      condition: 'near-mint',
    });
  });
});

describe('isCollectionChange', () => {
  it('accepts each kind of change', () => {
    assert.ok(isCollectionChange({ type: 'add', id: 'a', input }));
    assert.ok(isCollectionChange({ type: 'add-many', entries: [{ id: 'a', input }] }));
    assert.ok(isCollectionChange({ type: 'set-quantity', copyId: 'a', quantity: 3 }));
    assert.ok(isCollectionChange({ type: 'set-quantity', copyId: 'a', quantity: 0 }));
    assert.ok(isCollectionChange({ type: 'remove', copyId: 'a' }));
  });

  it('refuses an unknown kind or a missing value', () => {
    assert.ok(!isCollectionChange(null));
    assert.ok(!isCollectionChange({ type: 'drop', copyId: 'a' }));
    assert.ok(!isCollectionChange({ type: 'remove' }));
    assert.ok(!isCollectionChange({ type: 'add', id: 'a' }));
  });

  it('refuses values outside the allowed lists', () => {
    assert.ok(!isCollectionChange({ type: 'add', id: 'a', input: { ...input, language: 'xx' } }));
    assert.ok(!isCollectionChange({ type: 'add', id: 'a', input: { ...input, condition: 'shiny' } }));
    assert.ok(!isCollectionChange({ type: 'add', id: 'a', input: { ...input, cardId: { $ne: '' } } }));
  });

  it('refuses quantities that are not whole, too small or too large', () => {
    assert.ok(!isCollectionChange({ type: 'add', id: 'a', input: { ...input, quantity: 0 } }));
    assert.ok(!isCollectionChange({ type: 'add', id: 'a', input: { ...input, quantity: 1.5 } }));
    assert.ok(!isCollectionChange({ type: 'add', id: 'a', input: { ...input, quantity: MAX_COPY_QUANTITY + 1 } }));
    assert.ok(!isCollectionChange({ type: 'set-quantity', copyId: 'a', quantity: -1 }));
  });

  it('refuses ids that are empty or too long', () => {
    assert.ok(!isCollectionChange({ type: 'remove', copyId: '' }));
    assert.ok(!isCollectionChange({ type: 'remove', copyId: 'x'.repeat(MAX_ID_LENGTH + 1) }));
    assert.ok(!isCollectionChange({ type: 'add', id: 'a', input: { ...input, cardId: 'x'.repeat(MAX_ID_LENGTH + 1) } }));
  });

  it('accepts the Unown cards and their odd ids', () => {
    assert.ok(isCollectionChange({ type: 'add', id: 'a', input: { ...input, cardId: 'exu-!', setId: 'exu' } }));
    assert.ok(isCollectionChange({ type: 'add', id: 'a', input: { ...input, cardId: 'exu-%3F', setId: 'exu' } }));
  });

  it('refuses ids with characters the catalog never uses', () => {
    assert.ok(!isCollectionChange({ type: 'remove', copyId: '$cardId' }));
    assert.ok(!isCollectionChange({ type: 'add', id: 'a', input: { ...input, cardId: 'sv03.5-0\n06' } }));
    assert.ok(!isCollectionChange({ type: 'add', id: 'a', input: { ...input, setId: '$$ROOT' } }));
  });

  it('refuses a card that does not belong to the given set', () => {
    assert.ok(!isCollectionChange({ type: 'add', id: 'a', input: { ...input, setId: 'swsh1' } }));
  });

  it('refuses an add-many where two entries share an id', () => {
    const entries = [
      { id: 'a', input },
      { id: 'a', input: { ...input, language: 'en' } },
    ];
    assert.ok(!isCollectionChange({ type: 'add-many', entries }));
  });

  it('refuses an add-many that is empty or too large', () => {
    assert.ok(!isCollectionChange({ type: 'add-many', entries: [] }));
    const entries = Array.from({ length: MAX_ENTRIES_PER_CHANGE + 1 }, (_, index) => ({ id: `${index}`, input }));
    assert.ok(!isCollectionChange({ type: 'add-many', entries }));
  });
});
