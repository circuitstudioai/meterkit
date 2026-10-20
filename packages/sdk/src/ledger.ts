import { IdempotencyConflictError, InsufficientCreditsError } from "./errors";
import { withLock } from "./mutex";
import type {
  CreditOptions,
  LedgerEntry,
  LedgerListener,
  LedgerStore,
  LowBalanceEvent,
} from "./types";

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export class CreditLedger {
  private listeners = new Set<LedgerListener>();

  constructor(private readonly store: LedgerStore) {}

  on(listener: LedgerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getBalance(userId: string): Promise<number> {
    return this.store.getBalance(userId);
  }

  async listEntries(userId?: string): Promise<LedgerEntry[]> {
    return this.store.listEntries(userId);
  }

  async credit(opts: CreditOptions): Promise<LedgerEntry> {
    return withLock(opts.userId, async () => {
      if (opts.idempotencyKey) {
        const existing = await this.store.findByIdempotencyKey(opts.idempotencyKey);
        if (existing) {
          if (existing.type !== "topup" || existing.amount !== opts.amount) {
            throw new IdempotencyConflictError(opts.idempotencyKey);
          }
          return existing;
        }
      }
      const current = await this.store.getBalance(opts.userId);
      const entry: LedgerEntry = {
        id: id("led"),
        userId: opts.userId,
        type: "topup",
        amount: opts.amount,
        balanceAfter: current + opts.amount,
        idempotencyKey: opts.idempotencyKey,
        paypalTransactionId: opts.paypalTransactionId,
        metadata: opts.metadata,
        createdAt: new Date().toISOString(),
      };
      await this.store.append(entry);
      return entry;
    });
  }

  async debit(opts: {
    userId: string;
    amount: number;
    featureKey?: string;
    units?: number;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }): Promise<LedgerEntry> {
    if (opts.amount < 0) {
      throw new Error("Debit amount must be >= 0");
    }
    return withLock(opts.userId, async () => {
      if (opts.idempotencyKey) {
        const existing = await this.store.findByIdempotencyKey(opts.idempotencyKey);
        if (existing) {
          if (
            existing.type !== "debit" ||
            existing.amount !== -opts.amount ||
            existing.featureKey !== opts.featureKey
          ) {
            throw new IdempotencyConflictError(opts.idempotencyKey);
          }
          return existing;
        }
      }

      const current = await this.store.getBalance(opts.userId);
      if (current < opts.amount) {
        throw new InsufficientCreditsError(opts.userId, opts.amount, current);
      }

      const balanceAfter = current - opts.amount;
      const entry: LedgerEntry = {
        id: id("led"),
        userId: opts.userId,
        type: "debit",
        amount: -opts.amount,
        balanceAfter,
        featureKey: opts.featureKey,
        units: opts.units,
        idempotencyKey: opts.idempotencyKey,
        metadata: opts.metadata,
        createdAt: new Date().toISOString(),
      };
      await this.store.append(entry);

      const threshold = await this.store.getThreshold(opts.userId);
      if (balanceAfter <= threshold) {
        const event: LowBalanceEvent = {
          type: "low_balance",
          userId: opts.userId,
          balance: balanceAfter,
          threshold,
        };
        for (const listener of this.listeners) {
          listener(event);
        }
      }

      return entry;
    });
  }
}
