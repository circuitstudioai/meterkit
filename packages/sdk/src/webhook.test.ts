import { describe, expect, it, jest } from "@jest/globals";
import { verifyPaypalWebhook } from "./webhook";

describe("PayPal webhook verification", () => {
  it("returns false when required headers are missing", async () => {
    const ok = await verifyPaypalWebhook({
      webhookId: "WH-1",
      headers: {},
      body: "{}",
      accessToken: "tok",
      apiBase: "https://api-m.sandbox.paypal.com",
    });
    expect(ok).toBe(false);
  });

  it("posts the PayPal verify payload and accepts SUCCESS", async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ verification_status: "SUCCESS" }),
    }));
    const ok = await verifyPaypalWebhook({
      webhookId: "WH-1",
      headers: {
        "paypal-transmission-id": "t1",
        "paypal-transmission-time": "2026-10-17T00:00:00Z",
        "paypal-cert-url": "https://example.com/cert",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "sig",
      },
      body: JSON.stringify({ id: "EVT-1" }),
      accessToken: "tok",
      apiBase: "https://api-m.sandbox.paypal.com",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const init = call[1];
    const payload = JSON.parse(String(init.body));
    expect(payload.webhook_id).toBe("WH-1");
    expect(payload.transmission_id).toBe("t1");
  });

  it("rejects FAILURE status", async () => {
    const ok = await verifyPaypalWebhook({
      webhookId: "WH-1",
      headers: {
        "paypal-transmission-id": "t1",
        "paypal-transmission-time": "now",
        "paypal-cert-url": "https://example.com/cert",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "sig",
      },
      body: "{}",
      accessToken: "tok",
      apiBase: "https://api-m.sandbox.paypal.com",
      fetchImpl: (async () => ({
        ok: true,
        json: async () => ({ verification_status: "FAILURE" }),
      })) as unknown as typeof fetch,
    });
    expect(ok).toBe(false);
  });
});
