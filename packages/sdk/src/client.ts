import { FeatureNotPricedError, InsufficientCreditsError } from "./errors";
import type {
  CreditOptions,
  FeaturePrice,
  LedgerEntry,
  MeterKitMode,
  MeterOptions,
  MeterResult,
} from "./types";

export type MeterKitApiConfig = {
  mode: "api";
  apiUrl: string;
  apiKey?: string;
};

async function request<T>(
  base: string,
  path: string,
  init?: RequestInit & { apiKey?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (init?.apiKey) {
    headers.Authorization = `Bearer ${init.apiKey}`;
  }
  const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
  });
  const body = (await res.json()) as T & { error?: string; code?: string };
  if (!res.ok) {
    if ((body as { code?: string }).code === "INSUFFICIENT_CREDITS") {
      const err = body as unknown as { userId: string; required: number; balance: number };
      throw new InsufficientCreditsError(err.userId, err.required, err.balance);
    }
    throw new Error((body as { error?: string }).error || `MeterKit API ${res.status}`);
  }
  return body;
}

/** Thin HTTP client for hosted MeterKit (dashboard API). */
export class MeterKitApiClient {
  readonly mode: MeterKitMode = "api";

  constructor(private readonly config: MeterKitApiConfig) {}

  async getBalance(userId: string): Promise<number> {
    const data = await request<{ balance: number }>(
      this.config.apiUrl,
      `/api/meter/balance?userId=${encodeURIComponent(userId)}`,
      { apiKey: this.config.apiKey }
    );
    return data.balance;
  }

  async credit(opts: CreditOptions): Promise<LedgerEntry> {
    const data = await request<{ entry: LedgerEntry }>(
      this.config.apiUrl,
      "/api/meter/credit",
      {
        method: "POST",
        apiKey: this.config.apiKey,
        body: JSON.stringify(opts),
      }
    );
    return data.entry;
  }

  async meter(featureKey: string, opts: MeterOptions): Promise<MeterResult> {
    try {
      return await request<MeterResult>(this.config.apiUrl, "/api/meter/debit", {
        method: "POST",
        apiKey: this.config.apiKey,
        body: JSON.stringify({ featureKey, ...opts }),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not priced")) {
        throw new FeatureNotPricedError(featureKey);
      }
      throw error;
    }
  }

  async listPrices(): Promise<FeaturePrice[]> {
    const data = await request<{ prices: FeaturePrice[] }>(
      this.config.apiUrl,
      "/api/meter/prices",
      { apiKey: this.config.apiKey }
    );
    return data.prices;
  }
}
