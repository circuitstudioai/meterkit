import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Sql, TransactionSql } from "postgres";
export type Scope = { appId: string; workspaceId: string };
export type Wallet = { available: number; held: number };
export type Job = {
  key: string;
  feature: string;
  credits: number;
  input: unknown;
};
export type Reservation = {
  created: boolean;
  status: "reserved" | "completed" | "released";
  result: unknown;
};
export type Intent = {
  id: string;
  packId: string;
  credits: number;
  amountMinor: number;
  currency: string;
  merchantId: string;
};
export type Capture = {
  orderId: string;
  captureId: string;
  status: string;
  amountMinor: number;
  currency: string;
  merchantId: string;
};
export class BillingError extends Error {
  constructor(
    public code: string,
    public status = 409,
  ) {
    super(code);
  }
}
export function fingerprint(value: unknown): string {
  function canonical(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, x]) => [k, canonical(x)]),
      );
    return v;
  }
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}
function text(value: string) {
  if (typeof value !== "string" || !value.trim() || value.length > 200)
    throw new BillingError("invalid_identifier", 400);
}
function amount(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 1_000_000_000)
    throw new BillingError("invalid_amount", 400);
}
function scopeValid(s: Scope) {
  text(s.appId);
  text(s.workspaceId);
}
export async function migrate(sql: Sql) {
  await sql.unsafe(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
}
export class BillingKernel {
  constructor(private readonly sql: Sql) {}
  async balance(s: Scope): Promise<Wallet> {
    scopeValid(s);
    const [w] = await this.sql<
      Wallet[]
    >`select available,held from meterkit_alpha.wallets where app_id=${s.appId} and workspace_id=${s.workspaceId}`;
    return w ?? { available: 0, held: 0 };
  }
  private async lock(tx: TransactionSql, s: Scope): Promise<Wallet> {
    await tx`insert into meterkit_alpha.wallets(app_id,workspace_id) values(${s.appId},${s.workspaceId}) on conflict do nothing`;
    const [w] = await tx<
      Wallet[]
    >`select available,held from meterkit_alpha.wallets where app_id=${s.appId} and workspace_id=${s.workspaceId} for update`;
    return w;
  }
  private async entry(
    tx: TransactionSql,
    s: Scope,
    kind: string,
    ref: string,
    da: number,
    dh: number,
  ) {
    const [w] = await tx<
      Wallet[]
    >`update meterkit_alpha.wallets set available=available+${da},held=held+${dh} where app_id=${s.appId} and workspace_id=${s.workspaceId} returning available,held`;
    await tx`insert into meterkit_alpha.entries(app_id,workspace_id,kind,reference,available_delta,held_delta,available_after,held_after) values(${s.appId},${s.workspaceId},${kind},${ref},${da},${dh},${w.available},${w.held})`;
  }
  async reserve(s: Scope, j: Job): Promise<Reservation> {
    scopeValid(s);
    text(j.key);
    text(j.feature);
    amount(j.credits);
    const hash = fingerprint({
      feature: j.feature,
      credits: j.credits,
      input: j.input,
    });
    return this.sql.begin(async (tx) => {
      const w = await this.lock(tx, s);
      const [old] =
        await tx`select * from meterkit_alpha.jobs where app_id=${s.appId} and workspace_id=${s.workspaceId} and request_key=${j.key}`;
      if (old) {
        if (old.fingerprint !== hash)
          throw new BillingError("idempotency_conflict");
        return {
          created: false,
          status: old.status,
          result: old.result,
        } as Reservation;
      }
      if (w.available < j.credits)
        throw new BillingError("insufficient_credits", 402);
      await tx`insert into meterkit_alpha.jobs(app_id,workspace_id,request_key,fingerprint,feature,credits,status) values(${s.appId},${s.workspaceId},${j.key},${hash},${j.feature},${j.credits},'reserved')`;
      await this.entry(tx, s, "reserve", j.key, -j.credits, j.credits);
      return { created: true, status: "reserved", result: null };
    }) as Promise<Reservation>;
  }
  async complete(s: Scope, key: string, result: unknown) {
    return this.finish(s, key, "completed", result);
  }
  async release(s: Scope, key: string) {
    return this.finish(s, key, "released", null);
  }
  private async finish(
    s: Scope,
    key: string,
    state: "completed" | "released",
    result: unknown,
  ) {
    scopeValid(s);
    text(key);
    const encoded = JSON.stringify(result);
    if (encoded === undefined || encoded.length > 64000)
      throw new BillingError("invalid_result", 400);
    await this.sql.begin(async (tx) => {
      await this.lock(tx, s);
      const [j] =
        await tx`select * from meterkit_alpha.jobs where app_id=${s.appId} and workspace_id=${s.workspaceId} and request_key=${key}`;
      if (!j) throw new BillingError("job_not_found", 404);
      if (j.status === state) {
        if (
          state === "completed" &&
          fingerprint(j.result) !== fingerprint(result)
        )
          throw new BillingError("result_conflict");
        return;
      }
      if (j.status !== "reserved") throw new BillingError("invalid_transition");
      await tx`update meterkit_alpha.jobs set status=${state},result=${tx.json(JSON.parse(encoded))},updated_at=now() where app_id=${s.appId} and workspace_id=${s.workspaceId} and request_key=${key}`;
      await this.entry(
        tx,
        s,
        state === "completed" ? "settle" : "release",
        key,
        state === "released" ? j.credits : 0,
        -j.credits,
      );
    });
  }
  async createIntent(s: Scope, i: Intent) {
    scopeValid(s);
    text(i.id);
    text(i.packId);
    text(i.merchantId);
    amount(i.credits);
    amount(i.amountMinor);
    if (i.currency !== "USD")
      throw new BillingError("unsupported_currency", 400);
    await this.sql.begin(async (tx) => {
      await tx`insert into meterkit_alpha.orders(id,app_id,workspace_id,pack_id,credits,amount_minor,currency,merchant_id) values(${i.id},${s.appId},${s.workspaceId},${i.packId},${i.credits},${i.amountMinor},${i.currency},${i.merchantId}) on conflict(id) do nothing`;
      const [old] =
        await tx`select * from meterkit_alpha.orders where id=${i.id}`;
      if (
        old.app_id !== s.appId ||
        old.workspace_id !== s.workspaceId ||
        old.pack_id !== i.packId ||
        old.credits !== i.credits ||
        old.amount_minor !== i.amountMinor ||
        old.currency !== i.currency ||
        old.merchant_id !== i.merchantId
      )
        throw new BillingError("intent_conflict");
    });
  }
  async attachOrder(intentId: string, orderId: string) {
    text(intentId);
    text(orderId);
    const rows = await this
      .sql`update meterkit_alpha.orders set order_id=${orderId} where id=${intentId} and (order_id is null or order_id=${orderId}) returning id`;
    if (!rows.length) throw new BillingError("order_conflict");
  }
  async lookupOrder(orderId: string) {
    text(orderId);
    const [row] = await this
      .sql`select * from meterkit_alpha.orders where order_id=${orderId}`;
    if (!row) throw new BillingError("unknown_order", 404);
    return row;
  }
  async orderForScope(s: Scope, orderId: string) {
    scopeValid(s);
    text(orderId);
    const [row] = await this
      .sql`select * from meterkit_alpha.orders where app_id=${s.appId} and workspace_id=${s.workspaceId} and order_id=${orderId}`;
    if (!row) throw new BillingError("order_not_found", 404);
    return row;
  }
  async intentForScope(s: Scope, id: string) {
    scopeValid(s);
    text(id);
    const [row] = await this
      .sql`select * from meterkit_alpha.orders where app_id=${s.appId} and workspace_id=${s.workspaceId} and id=${id}`;
    if (!row) throw new BillingError("intent_not_found", 404);
    return row;
  }
  /** Server-only: caller must authenticate provider data; never expose as a credit HTTP endpoint. */
  async fulfill(c: Capture, eventId?: string) {
    text(c.orderId);
    text(c.captureId);
    amount(c.amountMinor);
    if (eventId) text(eventId);
    await this.sql.begin(async (tx) => {
      const [o] =
        await tx`select * from meterkit_alpha.orders where order_id=${c.orderId} for update`;
      if (!o) throw new BillingError("unknown_order", 404);
      if (
        c.status !== "COMPLETED" ||
        o.amount_minor !== c.amountMinor ||
        o.currency !== c.currency ||
        o.merchant_id !== c.merchantId
      )
        throw new BillingError("capture_mismatch", 422);
      if (o.status === "completed" && o.capture_id !== c.captureId)
        throw new BillingError("capture_conflict");
      if (eventId) {
        await tx`insert into meterkit_alpha.events(event_id,capture_id) values(${eventId},${c.captureId}) on conflict do nothing`;
        const [event] =
          await tx`select capture_id from meterkit_alpha.events where event_id=${eventId}`;
        if (event.capture_id !== c.captureId)
          throw new BillingError("event_conflict");
      }
      if (o.status === "completed") return;
      const s = { appId: o.app_id, workspaceId: o.workspace_id };
      await this.lock(tx, s);
      await tx`update meterkit_alpha.orders set capture_id=${c.captureId},status='completed' where id=${o.id}`;
      await this.entry(tx, s, "credit", c.captureId, o.credits, 0);
    });
  }
}
