// Running many requests without flooding the service that answers them.

/**
 * Runs a task for each item, at most `limit` at a time, in the order of the items. A failed task stops nothing, and the
 * results say which ones failed, in the same order as the items.
 */
export async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    for (let index = next++; index < items.length; index = next++) {
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index]!) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
