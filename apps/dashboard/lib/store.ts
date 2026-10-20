import { and, desc, eq } from "drizzle-orm";
import {
  db,
  endUsers,
  features,
  ledgerEntries,
  apps as appsTable,
} from "@/lib/db";
import type { FeaturePrice, LedgerEntry, LedgerStore, PriceCatalog } from "@meterkit/sdk";

const DEFAULT_APP_ID = 1;

async function ensureUser(userId: string, appId = DEFAULT_APP_ID) {
  const [existing] = await db
    .select()
    .from(endUsers)
    .where(and(eq(endUsers.appId, appId), eq(endUsers.externalUserId, userId)))
    .limit(1);
  if (existing) {
    return existing;
  }
  const [created] = await db
    .insert(endUsers)
    .values({
      appId,
      externalUserId: userId,
      balance: 0,
      lowBalanceThreshold: 100,
    })
    .returning();
  return created;
}

export class DashboardLedgerStore implements LedgerStore {
  constructor(private readonly appId = DEFAULT_APP_ID) {}

  async getBalance(userId: string): Promise<number> {
    const user = await ensureUser(userId, this.appId);
    return Number(user.balance ?? 0);
  }

  async getThreshold(userId: string): Promise<number> {
    const user = await ensureUser(userId, this.appId);
    return Number(user.lowBalanceThreshold ?? 100);
  }

  async setThreshold(userId: string, threshold: number): Promise<void> {
    await ensureUser(userId, this.appId);
    await db
      .update(endUsers)
      .set({ lowBalanceThreshold: threshold })
      .where(and(eq(endUsers.appId, this.appId), eq(endUsers.externalUserId, userId)));
  }

  async findByIdempotencyKey(key: string): Promise<LedgerEntry | null> {
    const [row] = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.idempotencyKey, key))
      .limit(1);
    return row ? toEntry(row) : null;
  }

  async append(entry: LedgerEntry): Promise<void> {
    await ensureUser(entry.userId, this.appId);
    await db.insert(ledgerEntries).values({
      appId: this.appId,
      userId: entry.userId,
      type: entry.type,
      amount: entry.amount,
      balanceAfter: entry.balanceAfter,
      featureKey: entry.featureKey,
      units: entry.units,
      idempotencyKey: entry.idempotencyKey,
      paypalTransactionId: entry.paypalTransactionId,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
    await db
      .update(endUsers)
      .set({ balance: entry.balanceAfter })
      .where(and(eq(endUsers.appId, this.appId), eq(endUsers.externalUserId, entry.userId)));
  }

  async listEntries(userId?: string): Promise<LedgerEntry[]> {
    const rows = userId
      ? await db
          .select()
          .from(ledgerEntries)
          .where(and(eq(ledgerEntries.appId, this.appId), eq(ledgerEntries.userId, userId)))
          .orderBy(desc(ledgerEntries.createdAt))
      : await db
          .select()
          .from(ledgerEntries)
          .where(eq(ledgerEntries.appId, this.appId))
          .orderBy(desc(ledgerEntries.createdAt));
    return (rows as Parameters<typeof toEntry>[0][]).map(toEntry);
  }
}

export class DashboardPriceCatalog implements PriceCatalog {
  constructor(private readonly appId = DEFAULT_APP_ID) {}

  async get(featureKey: string): Promise<FeaturePrice | null> {
    const [row] = await db
      .select()
      .from(features)
      .where(and(eq(features.appId, this.appId), eq(features.featureKey, featureKey)))
      .limit(1);
    return row
      ? {
          featureKey: row.featureKey,
          name: row.name,
          creditsPerUnit: Number(row.creditsPerUnit),
          unitLabel: row.unitLabel,
        }
      : null;
  }

  async list(): Promise<FeaturePrice[]> {
    const rows = await db.select().from(features).where(eq(features.appId, this.appId));
    return (rows as { featureKey: string; name: string; creditsPerUnit: number; unitLabel: string }[]).map(
      (row) => ({
        featureKey: row.featureKey,
        name: row.name,
        creditsPerUnit: Number(row.creditsPerUnit),
        unitLabel: row.unitLabel,
      })
    );
  }

  async upsert(price: FeaturePrice): Promise<void> {
    const [existing] = await db
      .select()
      .from(features)
      .where(and(eq(features.appId, this.appId), eq(features.featureKey, price.featureKey)))
      .limit(1);
    if (existing) {
      await db
        .update(features)
        .set({
          name: price.name,
          creditsPerUnit: price.creditsPerUnit,
          unitLabel: price.unitLabel,
        })
        .where(eq(features.id, existing.id));
      return;
    }
    await db.insert(features).values({
      appId: this.appId,
      featureKey: price.featureKey,
      name: price.name,
      creditsPerUnit: price.creditsPerUnit,
      unitLabel: price.unitLabel,
    });
  }
}

function toEntry(row: {
  id: number;
  userId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  featureKey?: string | null;
  units?: number | null;
  idempotencyKey?: string | null;
  paypalTransactionId?: string | null;
  metadata?: string | null;
  createdAt: Date | number;
}): LedgerEntry {
  return {
    id: String(row.id),
    userId: row.userId,
    type: row.type as LedgerEntry["type"],
    amount: Number(row.amount),
    balanceAfter: Number(row.balanceAfter),
    featureKey: row.featureKey ?? undefined,
    units: row.units ?? undefined,
    idempotencyKey: row.idempotencyKey ?? undefined,
    paypalTransactionId: row.paypalTransactionId ?? undefined,
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function getDemoApp() {
  const [app] = await db.select().from(appsTable).limit(1);
  return app;
}
