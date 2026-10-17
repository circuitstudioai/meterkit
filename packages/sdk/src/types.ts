export type LedgerEntryType = "topup" | "debit" | "adjust";

export type LedgerEntry = {
  id: string;
  userId: string;
  type: LedgerEntryType;
  amount: number;
  balanceAfter: number;
  featureKey?: string;
  units?: number;
  idempotencyKey?: string;
  paypalTransactionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type FeaturePrice = {
  featureKey: string;
  name: string;
  creditsPerUnit: number;
  unitLabel: string;
};

export type LowBalanceEvent = {
  type: "low_balance";
  userId: string;
  balance: number;
  threshold: number;
};

export type MeterKitEvent = LowBalanceEvent;

export type LedgerListener = (event: MeterKitEvent) => void;

export type MeterOptions = {
  userId: string;
  units: number;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

export type MeterResult = {
  credits: number;
  balance: number;
  entry: LedgerEntry;
};

export type CreditOptions = {
  userId: string;
  amount: number;
  idempotencyKey?: string;
  paypalTransactionId?: string;
  metadata?: Record<string, unknown>;
};

export interface LedgerStore {
  getBalance(userId: string): Promise<number>;
  getThreshold(userId: string): Promise<number>;
  setThreshold(userId: string, threshold: number): Promise<void>;
  findByIdempotencyKey(key: string): Promise<LedgerEntry | null>;
  append(entry: LedgerEntry): Promise<void>;
  listEntries(userId?: string): Promise<LedgerEntry[]>;
}

export interface PriceCatalog {
  get(featureKey: string): Promise<FeaturePrice | null>;
  list(): Promise<FeaturePrice[]>;
  upsert(price: FeaturePrice): Promise<void>;
}

export type MeterKitMode = "self-hosted" | "api";
