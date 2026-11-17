// Changes kept on the phone until the server has them. The collection and the wishes both send their changes this way.

/** A value saved on the phone under one key. `read` gives undefined when nothing is saved there. */
export interface Stored<T> {
  read(): Promise<T | undefined>;
  write(value: T): Promise<void>;
  remove(): Promise<void>;
}

/** A change kept on the phone until the server has it. Its id stays the same however many times it is sent. */
export interface QueuedChange<C> {
  changeId: string;
  change: C;
}

/** Sends one request to a route of the server. Rejects when the server cannot be reached. */
export type ServerRequest = (request: { method: 'GET' } | { method: 'POST'; body: unknown }) => Promise<Response>;

/** What became of a change sent once. `unreachable` covers no network and a failing server. */
export type SendResult<R extends string> = 'sent' | 'unreachable' | 'signed-out' | R;

export interface ChangeQueueOptions<R extends string> {
  outbox: Stored<readonly QueuedChange<unknown>[]>;
  request: ServerRequest;
  /** Why the server refused a change, read from its answer. 401 is handled here and never reaches it. */
  refusalOf: (response: Response) => Promise<R>;
  /**
   * Runs before the queue is sent, for instance to send data saved on the phone before. The queue waits when it
   * returns false.
   */
  before?: (send: (entry: QueuedChange<unknown>) => Promise<SendResult<R>>) => Promise<boolean>;
}

export interface ChangeQueue<C, R extends string> {
  /** Reads the queue saved on the phone. */
  load(): Promise<readonly QueuedChange<C>[]>;
  /** The changes still to send, oldest first. */
  entries(): readonly QueuedChange<C>[];
  /** Keeps a change on the phone. Rejects when it could not be saved, and then the change is not kept at all. */
  add(entry: QueuedChange<C>): Promise<void>;
  /** Sends the changes in order and stops at the first one the server cannot take yet. */
  drain(): Promise<void>;
  /** Why the server refused a change since the last call, if it did. */
  takeRefusal(): R | 'signed-out' | undefined;
}

const warn = (what: string) => (error: unknown) => console.warn(`Could not ${what}`, error);

/**
 * Keeps changes on the phone and sends them in order. A refused change is dropped and its reason kept for the caller.
 * When the session has ended the changes wait, for the account to sign in again on this phone.
 */
export function createChangeQueue<C, R extends string>(options: ChangeQueueOptions<R>): ChangeQueue<C, R> {
  const { outbox, request, refusalOf, before } = options;
  let queued: QueuedChange<C>[] = [];
  let refused: R | 'signed-out' | undefined;
  let draining: Promise<void> | undefined;
  let writes = Promise.resolve();

  /** Saves the queue as it is when the write starts, so writes that overlap never bring back an old queue. */
  function persist(): Promise<void> {
    const write = writes.then(() => outbox.write(queued));
    writes = write.catch(() => undefined);
    return write;
  }

  async function send({ changeId, change }: QueuedChange<unknown>): Promise<SendResult<R>> {
    let response: Response;
    try {
      response = await request({ method: 'POST', body: { changeId, change } });
    } catch {
      return 'unreachable';
    }
    if (response.ok) return 'sent';
    // A server that fails will most likely accept the change later.
    if (response.status >= 500) return 'unreachable';
    if (response.status === 401) return 'signed-out';
    return refusalOf(response);
  }

  async function drainQueue(): Promise<void> {
    if (before && !(await before(send))) return;
    for (let next = queued[0]; next; next = queued[0]) {
      const result = await send(next);
      if (result === 'unreachable') return;
      if (result === 'signed-out') {
        refused = result;
        return;
      }
      if (result !== 'sent') refused = result;
      queued = queued.filter((entry) => entry !== next);
      await persist();
    }
  }

  return {
    async load() {
      queued = [...(((await outbox.read()) as QueuedChange<C>[] | undefined) ?? [])];
      return queued;
    },
    entries: () => queued,
    async add(entry) {
      queued = [...queued, entry];
      try {
        await persist();
      } catch (error) {
        queued = queued.filter((queuedEntry) => queuedEntry !== entry);
        throw error;
      }
    },
    drain() {
      // Several callers share one run, so a change is never sent twice at the same time.
      draining ??= drainQueue()
        .catch(warn('send the changes made offline'))
        .finally(() => {
          draining = undefined;
        });
      return draining;
    },
    takeRefusal() {
      const reason = refused;
      refused = undefined;
      return reason;
    },
  };
}
