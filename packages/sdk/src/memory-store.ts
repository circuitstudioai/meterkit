import type { FeaturePrice, LedgerEntry, LedgerStore, PriceCatalog } from "./types";

export class MemoryLedgerStore implements LedgerStore {
  private balances = new Map<string, number>();
  private thresholds = new Map<string, number>();
  private entries: LedgerEntry[] = [];
  private byKey = new Map<string, LedgerEntry>();

  constructor(private readonly defaultThreshold = 100) {}

  async getBalance(userId: string): Promise<number> {
    return this.balances.get(userId) ?? 0;
  }

  async getThreshold(userId: string): Promise<number> {
    return this.thresholds.get(userId) ?? this.defaultThreshold;
  }

  async setThreshold(userId: string, threshold: number): Promise<void> {
    this.thresholds.set(userId, threshold);
  }

  async findByIdempotencyKey(key: string): Promise<LedgerEntry | null> {
    return this.byKey.get(key) ?? null;
  }

  async append(entry: LedgerEntry): Promise<void> {
    this.entries.push(entry);
    this.balances.set(entry.userId, entry.balanceAfter);
    if (entry.idempotencyKey) {
      this.byKey.set(entry.idempotencyKey, entry);
    }
  }

  async listEntries(userId?: string): Promise<LedgerEntry[]> {
    return userId
      ? this.entries.filter((e) => e.userId === userId)
      : [...this.entries];
  }
}

export class MemoryPriceCatalog implements PriceCatalog {
  private prices = new Map<string, FeaturePrice>();

  constructor(initial: FeaturePrice[] = []) {
    for (const price of initial) {
      this.prices.set(price.featureKey, price);
    }
  }

  async get(featureKey: string): Promise<FeaturePrice | null> {
    return this.prices.get(featureKey) ?? null;
  }

  async list(): Promise<FeaturePrice[]> {
    return [...this.prices.values()];
  }

  async upsert(price: FeaturePrice): Promise<void> {
    this.prices.set(price.featureKey, price);
  }
}
