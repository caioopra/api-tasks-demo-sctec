/**
 * In-memory stand-in for a Redis client.
 *
 * Exposes the same shape that a thin Redis wrapper would (`get`, `set`,
 * `del`) plus an optional TTL on `set`. Lets routes do read-through caching
 * in a way that matches the architecture diagram without actually requiring
 * a Redis container at lecture time.
 */
interface Entry {
  value: unknown;
  expiresAt: number | null;
}

const store = new Map<string, Entry>();

export const cacheService = {
  /**
   * @returns the cached value, or `undefined` on a cache miss / expired key.
   *          Expired keys are evicted as a side-effect so the store does not
   *          grow unbounded.
   */
  get<T>(key: string): T | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      store.delete(key);
      return undefined;
    }
    return entry.value as T;
  },

  /**
   * Cache a value under `key`. When `ttlSeconds` is omitted the entry never
   * expires (still cleared by {@link cacheService.del} or `_reset`).
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    store.set(key, { value, expiresAt });
  },

  /** Evict a single key. No-op when the key is absent. */
  del(key: string): void {
    store.delete(key);
  },

  /** Test-only helper — wipe the cache. */
  _reset(): void {
    store.clear();
  },
};
