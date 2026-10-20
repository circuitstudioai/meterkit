import { FeatureNotPricedError } from "./errors";
import { CreditLedger } from "./ledger";
import { MemoryLedgerStore, MemoryPriceCatalog } from "./memory-store";
import { MeterKitApiClient, type MeterKitApiConfig } from "./client";
import type {
  CreditOptions,
  FeaturePrice,
  LedgerListener,
  MeterKitEvent,
  MeterOptions,
  MeterResult,
  PriceCatalog,
} from "./types";

export type SelfHostedConfig = {
  mode?: "self-hosted";
  ledger?: CreditLedger;
  catalog?: PriceCatalog;
  prices?: FeaturePrice[];
  defaultLowBalanceThreshold?: number;
};

export type CreateMeterKitConfig = SelfHostedConfig | MeterKitApiConfig;

export class MeterKit {
  private constructor(
    readonly mode: "self-hosted" | "api",
    private readonly selfHosted?: {
      ledger: CreditLedger;
      catalog: PriceCatalog;
    },
    private readonly api?: MeterKitApiClient
  ) {}

  static create(config: CreateMeterKitConfig = {}): MeterKit {
    if (config.mode === "api") {
      return new MeterKit("api", undefined, new MeterKitApiClient(config));
    }
    const catalog =
      config.catalog ?? new MemoryPriceCatalog(config.prices ?? []);
    const ledger =
      config.ledger ??
      new CreditLedger(
        new MemoryLedgerStore(config.defaultLowBalanceThreshold ?? 100)
      );
    return new MeterKit("self-hosted", { ledger, catalog });
  }

  on(listener: LedgerListener): () => void {
    if (!this.selfHosted) {
      return () => {};
    }
    return this.selfHosted.ledger.on(listener);
  }

  async getBalance(userId: string): Promise<number> {
    if (this.api) {
      return this.api.getBalance(userId);
    }
    return this.selfHosted!.ledger.getBalance(userId);
  }

  async credit(opts: CreditOptions) {
    if (this.api) {
      return this.api.credit(opts);
    }
    return this.selfHosted!.ledger.credit(opts);
  }

  async setPrice(price: FeaturePrice): Promise<void> {
    if (!this.selfHosted) {
      throw new Error("Price catalog edits in API mode go through the dashboard");
    }
    await this.selfHosted.catalog.upsert(price);
  }

  async listPrices(): Promise<FeaturePrice[]> {
    if (this.api) {
      return this.api.listPrices();
    }
    return this.selfHosted!.catalog.list();
  }

  /**
   * Debit credits for a feature. Price comes from the catalog so builders
   * can change credits-per-unit without redeploying application code.
   */
  async meter(featureKey: string, opts: MeterOptions): Promise<MeterResult> {
    if (this.api) {
      return this.api.meter(featureKey, opts);
    }
    const price = await this.selfHosted!.catalog.get(featureKey);
    if (!price) {
      throw new FeatureNotPricedError(featureKey);
    }
    const credits = price.creditsPerUnit * opts.units;
    const entry = await this.selfHosted!.ledger.debit({
      userId: opts.userId,
      amount: credits,
      featureKey,
      units: opts.units,
      idempotencyKey: opts.idempotencyKey,
      metadata: opts.metadata,
    });
    return { credits, balance: entry.balanceAfter, entry };
  }

  async withMeter<T>(
    fn: () => Promise<T> | T,
    opts: MeterOptions & { featureKey: string }
  ): Promise<{ result: T; meter: MeterResult }> {
    const meter = await this.meter(opts.featureKey, opts);
    const result = await fn();
    return { result, meter };
  }
}

export function createMeterKit(config: CreateMeterKitConfig = {}): MeterKit {
  return MeterKit.create(config);
}

let defaultKit: MeterKit | null = null;

export function setDefaultMeterKit(kit: MeterKit): void {
  defaultKit = kit;
}

export function getDefaultMeterKit(): MeterKit {
  if (!defaultKit) {
    defaultKit = createMeterKit();
  }
  return defaultKit;
}

export async function meter(
  featureKey: string,
  opts: MeterOptions
): Promise<MeterResult> {
  return getDefaultMeterKit().meter(featureKey, opts);
}

export async function withMeter<T>(
  fn: () => Promise<T> | T,
  opts: MeterOptions & { featureKey: string }
): Promise<{ result: T; meter: MeterResult }> {
  return getDefaultMeterKit().withMeter(fn, opts);
}

export type { MeterKitEvent };
