/// <reference types="node" />
import { MAX_ENTRIES_PER_CHANGE, type CollectionChange, type Copy } from '@collection/shared';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CollectionSourceError } from './collection-source.ts';
import {
  createServerCollectionSource,
  restoreQueuedChanges,
  type CollectionRequest,
  type QueuedChange,
  type Stored,
} from './server-collection-source.ts';

const copy = (index: number): Copy => ({
  id: `copy-${String(index).padStart(4, '0')}`,
  cardId: `sv03.5-${index}`,
  setId: 'sv03.5',
  variant: 'normal',
  language: 'fr',
  condition: 'near-mint',
  quantity: 1,
});

function memory<T>(initial?: T): Stored<T> & { value: T | undefined } {
  const stored = {
    value: initial,
    read: async () => stored.value,
    write: async (value: T) => void (stored.value = structuredClone(value)),
    remove: async () => void (stored.value = undefined),
  };
  return stored;
}

/**
 * A server that answers with the given responses in turn, then with success. `null` stands for no network. It applies
 * every change it accepts, like the real one.
 */
function fakeServer(answers: (Response | null)[] = [], copies: Copy[] = []) {
  const sent: QueuedChange[] = [];
  let online = true;
  const request: CollectionRequest = async (call) => {
    if (call.method === 'POST') sent.push(call.body as QueuedChange);
    if (!online) throw new TypeError('Network request failed');
    const answer = answers.shift();
    if (answer === null) throw new TypeError('Network request failed');
    if (answer) return answer;
    return call.method === 'GET' ? Response.json({ copies }) : new Response(null, { status: 204 });
  };
  return {
    request,
    sent,
    answers,
    setOnline: (value: boolean) => void (online = value),
  };
}

const refusal = (status: number, error?: string) => Response.json({ error }, { status });

function sourceWith(
  server: ReturnType<typeof fakeServer>,
  options: { cache?: Copy[]; local?: Copy[]; outbox?: QueuedChange[] } = {},
) {
  const cache = memory<readonly Copy[]>(options.cache);
  const local = memory<readonly Copy[]>(options.local);
  const outbox = memory<readonly QueuedChange[]>(options.outbox);
  let nextId = 0;
  const source = createServerCollectionSource({
    request: server.request,
    cache,
    local,
    outbox,
    newChangeId: () => `change-${++nextId}`,
  });
  return { source, cache, local, outbox };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));
const remove: CollectionChange = { type: 'remove', copyId: 'copy-0001' };
const raise: CollectionChange = { type: 'set-quantity', copyId: 'copy-0002', quantity: 3 };

describe('loading from the server', () => {
  it('shows the collection of the server and keeps it for offline use', async () => {
    const { source, cache } = sourceWith(fakeServer([], [copy(1)]));
    assert.deepEqual(await source.load(), { copies: [copy(1)] });
    await settle();
    assert.deepEqual(cache.value, [copy(1)]);
  });

  it('shows the last known collection when offline', async () => {
    const { source } = sourceWith(fakeServer([null]), { cache: [copy(1)] });
    assert.deepEqual(await source.load(), { copies: [copy(1)] });
  });

  it('shows the copies saved on the phone when offline and nothing was read before', async () => {
    const { source } = sourceWith(fakeServer([null, null]), { local: [copy(2)] });
    assert.deepEqual(await source.load(), { copies: [copy(2)] });
  });

  it('fails when offline with nothing to show', async () => {
    const { source } = sourceWith(fakeServer([null]));
    await assert.rejects(source.load(), CollectionSourceError);
  });

  it('adds the changes the server does not have yet to what it sends back', async () => {
    // The change cannot be sent, but the server can still be read.
    const server = fakeServer([refusal(503)], [copy(1), copy(2)]);
    const { source } = sourceWith(server, { outbox: [{ changeId: 'old', change: remove }] });
    assert.deepEqual(await source.load(), { copies: [copy(2)] });
  });
});

describe('sending the collection saved on the phone', () => {
  it('sends it once in batches the server accepts, then forgets it', async () => {
    const saved = Array.from({ length: MAX_ENTRIES_PER_CHANGE + 2 }, (_, index) => copy(index));
    const server = fakeServer();
    const { source, local } = sourceWith(server, { local: saved });
    await source.load();

    assert.deepEqual(
      server.sent.map((sent) => sent.changeId),
      ['upload-copy-0000', `upload-copy-0${MAX_ENTRIES_PER_CHANGE}`],
    );
    const [first] = server.sent;
    assert.equal(first?.change.type === 'add-many' && first.change.entries.length, MAX_ENTRIES_PER_CHANGE);
    const { id, ...input } = copy(0);
    assert.deepEqual(first?.change.type === 'add-many' && first.change.entries[0], { id, input });
    assert.equal(local.value, undefined);
  });

  it('keeps what did not arrive, and sends it again later with the same change id', async () => {
    const saved = Array.from({ length: MAX_ENTRIES_PER_CHANGE + 2 }, (_, index) => copy(index));
    // The second batch gets no answer.
    const server = fakeServer([undefined as never, null]);
    const { source, local } = sourceWith(server, { local: saved });
    await source.load();
    assert.equal(local.value?.length, 2, 'the first batch has left the phone');

    await source.load();
    const ids = server.sent.map((sent) => sent.changeId);
    assert.equal(ids.at(-1), ids.at(-2), 'the batch keeps its change id');
    assert.equal(local.value, undefined);
  });

  it('sends it before the changes made offline, which may be about its copies', async () => {
    const server = fakeServer();
    const { source } = sourceWith(server, { local: [copy(1)], outbox: [{ changeId: 'old', change: remove }] });
    await source.load();
    assert.deepEqual(
      server.sent.map((sent) => sent.changeId),
      ['upload-copy-0001', 'old'],
    );
  });
});

describe('saving a change', () => {
  it('sends the change with a change id and updates the offline copy', async () => {
    const server = fakeServer([], [copy(1)]);
    const { source, cache, outbox } = sourceWith(server);
    await source.load();
    await source.apply(remove);
    assert.deepEqual(await source.sync!(), { unsentCount: 0, refused: undefined });
    await settle();
    assert.deepEqual(server.sent, [{ changeId: 'change-1', change: remove }]);
    assert.deepEqual(cache.value, []);
    assert.deepEqual(outbox.value, []);
  });

  it('keeps the change on the phone before sending it', async () => {
    const { source, outbox } = sourceWith(fakeServer([], [copy(1)]));
    await source.load();
    await source.apply(remove);
    assert.deepEqual(outbox.value, [{ changeId: 'change-1', change: remove }]);
  });

  it('refuses a change it could not keep on the phone', async () => {
    const { source, outbox } = sourceWith(fakeServer([], [copy(1)]));
    await source.load();
    outbox.write = async () => {
      throw new Error('disk full');
    };
    await assert.rejects(source.apply(remove), { reason: 'other' });
    assert.deepEqual(await source.sync!(), { unsentCount: 0, refused: undefined });
  });
});

describe('changing the collection offline', () => {
  it('keeps the changes and shows them while the server cannot be reached', async () => {
    const server = fakeServer([], [copy(1), copy(2)]);
    const { source, cache, outbox } = sourceWith(server);
    await source.load();
    server.setOnline(false);

    await source.apply(remove);
    await source.apply(raise);
    assert.deepEqual(await source.sync!(), { unsentCount: 2, refused: undefined });
    await settle();
    assert.deepEqual(cache.value, [{ ...copy(2), quantity: 3 }]);
    assert.equal(outbox.value?.length, 2);
  });

  it('shows them again after the app is closed and opened offline', async () => {
    const server = fakeServer([], [copy(1), copy(2)]);
    const first = sourceWith(server);
    await first.source.load();
    server.setOnline(false);
    await first.source.apply(remove);
    await settle();

    const reopened = sourceWith(server, { cache: [...first.cache.value!], outbox: [...first.outbox.value!] });
    assert.deepEqual(await reopened.source.load(), { copies: [copy(2)] });
  });

  it('sends them in order with the same ids when the network comes back', async () => {
    const server = fakeServer([], [copy(1), copy(2)]);
    const { source, outbox } = sourceWith(server);
    await source.load();
    server.setOnline(false);
    await source.apply(remove);
    await source.apply(raise);
    await source.sync!();

    server.setOnline(true);
    assert.deepEqual(await source.sync!(), { unsentCount: 0, refused: undefined });
    const accepted = server.sent.slice(-2);
    assert.deepEqual(accepted, [
      { changeId: 'change-1', change: remove },
      { changeId: 'change-2', change: raise },
    ]);
    assert.deepEqual(outbox.value, []);
  });

  it('keeps a change while the server fails, and sends it on the next try', async () => {
    const server = fakeServer([], [copy(1)]);
    const { source } = sourceWith(server);
    await source.load();
    server.answers.push(refusal(500));
    await source.apply(remove);
    assert.equal((await source.sync!()).unsentCount, 1);
    assert.equal((await source.sync!()).unsentCount, 0);
    assert.deepEqual(
      server.sent.map((sent) => sent.changeId),
      ['change-1', 'change-1'],
    );
  });

  it('drops a refused change, says why, and sends the next ones', async () => {
    const cases: [Response, string][] = [
      [refusal(409, 'collection_full'), 'full'],
      [refusal(409, 'id_taken'), 'other'],
      [refusal(400, 'invalid_change'), 'other'],
      [refusal(429, 'too_many_requests'), 'other'],
    ];
    for (const [response, reason] of cases) {
      const server = fakeServer([response], [copy(1), copy(2)]);
      const { source, outbox } = sourceWith(server, {
        outbox: [
          { changeId: 'a', change: remove },
          { changeId: 'b', change: raise },
        ],
      });
      await source.load();
      assert.deepEqual(
        server.sent.map((sent) => sent.changeId),
        ['a', 'b'],
        reason,
      );
      assert.deepEqual(await source.sync!(), { unsentCount: 0, refused: reason }, reason);
      assert.deepEqual(outbox.value, [], reason);
    }
  });

  it('reports a refusal once', async () => {
    const server = fakeServer([], [copy(1)]);
    const { source } = sourceWith(server);
    await source.load();
    server.answers.push(refusal(409, 'collection_full'));
    await source.apply(remove);
    assert.deepEqual(await source.sync!(), { unsentCount: 0, refused: 'full' });
    assert.deepEqual(await source.sync!(), { unsentCount: 0, refused: undefined });
  });

  it('keeps the changes for later when the session has ended', async () => {
    const signedOut = refusal(401, 'unauthorized');
    // The change is refused, the collection is read, then the change is refused again.
    const server = fakeServer([signedOut, undefined as never, signedOut.clone()], [copy(1)]);
    const { source, outbox } = sourceWith(server, { outbox: [{ changeId: 'a', change: remove }] });
    assert.deepEqual(await source.load(), { copies: [] });
    assert.deepEqual(await source.sync!(), { unsentCount: 1, refused: 'signed-out' });
    assert.equal(outbox.value?.length, 1);
  });
});

describe('reading the queue saved on the phone', () => {
  it('keeps the valid changes only', () => {
    const valid: QueuedChange = { changeId: 'a', change: remove };
    assert.deepEqual(restoreQueuedChanges([valid, { changeId: 'b' }, null, 'x']), [valid]);
    assert.equal(restoreQueuedChanges({}), undefined);
  });
});
