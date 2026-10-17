const locks = new Map<string, Promise<void>>();

/** Per-key async mutex so concurrent debits serialize on the same user. */
export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  let release: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(
    key,
    previous.then(() => current)
  );
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === current) {
      locks.delete(key);
    }
  }
}
