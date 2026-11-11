export interface Cached<T> {
  value: T;
  fetchedAt: Date;
  stale: boolean;
}

interface Entry {
  value: unknown;
  at: number;
}

interface CacheOptions {
  maxEntries?: number;
  /** How long a failure suppresses further provider calls for the same key. */
  failureMs?: number;
  /** Oldest successful result that may still be served after a failed refresh. */
  maxStaleMs?: number;
  now?: () => number;
}

/**
 * Bounded in-process cache for GA4 aggregates. Shares one in-flight request per key,
 * serves the last good result when a refresh fails, and briefly remembers failures so
 * quota or outage errors are not retried on every dashboard refresh.
 */
export class Ga4Cache {
  private readonly entries = new Map<string, Entry>();
  private readonly inflight = new Map<string, Promise<Entry>>();
  private readonly failures = new Map<string, { error: unknown; until: number }>();
  private readonly max: number;
  private readonly failureMs: number;
  private readonly maxStaleMs: number;
  private readonly now: () => number;

  constructor(options: CacheOptions = {}) {
    this.max = options.maxEntries ?? 200;
    this.failureMs = options.failureMs ?? 30_000;
    this.maxStaleMs = options.maxStaleMs ?? 6 * 3_600_000;
    this.now = options.now ?? Date.now;
  }

  async get<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<Cached<T>> {
    const entry = this.entries.get(key);
    const now = this.now();
    if (entry && now - entry.at < ttlMs) return this.hit(entry, false);
    const failure = this.failures.get(key);
    if (failure && failure.until > now) return this.fallback<T>(entry, failure.error);
    let pending = this.inflight.get(key);
    if (!pending) {
      pending = load().then((value) => ({ value, at: this.now() }));
      this.inflight.set(key, pending);
      void pending.then(
        () => this.inflight.delete(key),
        () => this.inflight.delete(key)
      );
    }
    try {
      const fresh = await pending;
      this.store(key, fresh);
      this.failures.delete(key);
      return this.hit(fresh, false);
    } catch (error) {
      this.failures.set(key, { error, until: this.now() + this.failureMs });
      return this.fallback<T>(entry, error);
    }
  }

  private fallback<T>(entry: Entry | undefined, error: unknown): Cached<T> {
    if (entry && this.now() - entry.at <= this.maxStaleMs) return this.hit(entry, true);
    throw error;
  }

  private hit<T>(entry: Entry, stale: boolean): Cached<T> {
    return { value: entry.value as T, fetchedAt: new Date(entry.at), stale };
  }

  private store(key: string, entry: Entry): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.max) this.entries.delete(this.entries.keys().next().value as string);
  }
}
