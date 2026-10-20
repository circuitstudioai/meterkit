import { describe, expect, it } from "@jest/globals";
import { CreditLedger } from "./ledger";
import { MemoryLedgerStore, MemoryPriceCatalog } from "./memory-store";
import { createMeterKit } from "./meter";
import { IdempotencyConflictError, InsufficientCreditsError } from "./errors";

describe("CreditLedger", () => {
  it("never allows a negative balance", async () => {
    const ledger = new CreditLedger(new MemoryLedgerStore());
    await ledger.credit({ userId: "u1", amount: 50 });
    await expect(
      ledger.debit({ userId: "u1", amount: 80 })
    ).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect(await ledger.getBalance("u1")).toBe(50);
  });

  it("is idempotent for the same debit key", async () => {
    const ledger = new CreditLedger(new MemoryLedgerStore());
    await ledger.credit({ userId: "u1", amount: 100 });
    const first = await ledger.debit({
      userId: "u1",
      amount: 25,
      featureKey: "chat",
      idempotencyKey: "msg-1",
    });
    const second = await ledger.debit({
      userId: "u1",
      amount: 25,
      featureKey: "chat",
      idempotencyKey: "msg-1",
    });
    expect(second.id).toBe(first.id);
    expect(await ledger.getBalance("u1")).toBe(75);
  });

  it("rejects an idempotency key reused with different details", async () => {
    const ledger = new CreditLedger(new MemoryLedgerStore());
    await ledger.credit({ userId: "u1", amount: 100 });
    await ledger.debit({
      userId: "u1",
      amount: 10,
      featureKey: "chat",
      idempotencyKey: "k",
    });
    await expect(
      ledger.debit({
        userId: "u1",
        amount: 20,
        featureKey: "chat",
        idempotencyKey: "k",
      })
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it("serializes concurrent debits without overselling", async () => {
    const ledger = new CreditLedger(new MemoryLedgerStore());
    await ledger.credit({ userId: "u1", amount: 100 });
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        ledger.debit({
          userId: "u1",
          amount: 10,
          featureKey: "chat",
          idempotencyKey: `c-${i}`,
        })
      )
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    const denied = results.filter((r) => r.status === "rejected");
    expect(ok).toHaveLength(10);
    expect(denied).toHaveLength(10);
    expect(await ledger.getBalance("u1")).toBe(0);
    for (const r of denied) {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(
        InsufficientCreditsError
      );
    }
  });

  it("emits low_balance when crossing the threshold", async () => {
    const store = new MemoryLedgerStore(40);
    const ledger = new CreditLedger(store);
    const events: string[] = [];
    ledger.on((e) => events.push(`${e.type}:${e.balance}`));
    await ledger.credit({ userId: "u1", amount: 100 });
    await ledger.debit({ userId: "u1", amount: 70 });
    expect(events).toEqual(["low_balance:30"]);
  });
});

describe("meter + catalog", () => {
  it("prices from the catalog so units can change without code deploy", async () => {
    const catalog = new MemoryPriceCatalog([
      {
        featureKey: "chat.message",
        name: "Chat message",
        creditsPerUnit: 5,
        unitLabel: "message",
      },
    ]);
    const kit = createMeterKit({ catalog });
    await kit.credit({ userId: "u1", amount: 100 });
    const first = await kit.meter("chat.message", { userId: "u1", units: 2 });
    expect(first.credits).toBe(10);
    await kit.setPrice({
      featureKey: "chat.message",
      name: "Chat message",
      creditsPerUnit: 8,
      unitLabel: "message",
    });
    const second = await kit.meter("chat.message", { userId: "u1", units: 2 });
    expect(second.credits).toBe(16);
    expect(second.balance).toBe(74);
  });

  it("withMeter runs the function after a successful debit", async () => {
    const kit = createMeterKit({
      prices: [
        {
          featureKey: "pdf.export",
          name: "Export PDF",
          creditsPerUnit: 25,
          unitLabel: "export",
        },
      ],
    });
    await kit.credit({ userId: "u1", amount: 25 });
    const { result, meter } = await kit.withMeter(async () => "ok", {
      featureKey: "pdf.export",
      userId: "u1",
      units: 1,
    });
    expect(result).toBe("ok");
    expect(meter.credits).toBe(25);
    expect(meter.balance).toBe(0);
  });
});
