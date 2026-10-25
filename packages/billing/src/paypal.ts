import {
  BillingKernel,
  BillingError,
  fingerprint,
  type Scope,
  type Capture,
} from "./index";
type Config = {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  webhookId: string;
  returnUrl: string;
  packs: Record<string, { credits: number; amountMinor: number }>;
  fetcher?: typeof fetch;
};
type ProviderOrder = {
  id: string;
  status: string;
  links?: { rel: string; href: string }[];
  purchase_units?: {
    custom_id?: string;
    amount?: { value: string; currency_code: string };
    payee?: { merchant_id: string };
    payments?: {
      captures?: {
        id: string;
        status: string;
        final_capture: boolean;
        amount: { value: string; currency_code: string };
      }[];
    };
  }[];
};
const base = "https://api-m.sandbox.paypal.com";
export class SandboxPayPal {
  private fetcher: typeof fetch;
  constructor(
    private kernel: BillingKernel,
    private config: Config,
  ) {
    this.fetcher = config.fetcher ?? fetch;
  }
  private async request(
    path: string,
    method = "GET",
    body?: unknown,
    key?: string,
  ): Promise<ProviderOrder & { verification_status?: string }> {
    if (
      !this.config.clientId ||
      !this.config.clientSecret ||
      !this.config.merchantId
    )
      throw new BillingError("paypal_not_configured", 503);
    const auth = await this.fetcher(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(15000),
    });
    if (!auth.ok) throw new BillingError("paypal_auth_failed", 502);
    const token = (await auth.json()) as { access_token?: string };
    if (!token.access_token) throw new BillingError("paypal_auth_failed", 502);
    const response = await this.fetcher(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
        ...(key ? { "PayPal-Request-Id": key } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new BillingError("paypal_request_failed", 502);
    return response.json();
  }
  async create(scope: Scope, packId: string, key: string) {
    if (!key || key.length > 120)
      throw new BillingError("invalid_request_key", 400);
    if (!Object.hasOwn(this.config.packs, packId))
      throw new BillingError("unknown_pack", 400);
    const pack = this.config.packs[packId];
    const id = fingerprint({ scope, key }).slice(0, 32);
    await this.kernel.createIntent(scope, {
      id,
      packId,
      ...pack,
      currency: "USD",
      merchantId: this.config.merchantId,
    });
    const intent = await this.kernel.intentForScope(scope, id);
    const order = intent.order_id
      ? await this.request(
          `/v2/checkout/orders/${encodeURIComponent(intent.order_id)}`,
        )
      : await this.request(
          "/v2/checkout/orders",
          "POST",
          {
            intent: "CAPTURE",
            purchase_units: [
              {
                custom_id: id,
                payee: { merchant_id: this.config.merchantId },
                amount: {
                  currency_code: "USD",
                  value: (pack.amountMinor / 100).toFixed(2),
                },
              },
            ],
            payment_source: {
              paypal: {
                experience_context: {
                  return_url: this.config.returnUrl,
                  cancel_url: this.config.returnUrl,
                  user_action: "PAY_NOW",
                },
              },
            },
          },
          id,
        );
    if (!order.id) throw new BillingError("invalid_provider_order", 502);
    await this.kernel.attachOrder(id, order.id);
    const approval = order.links?.find(
      (l) => l.rel === "payer-action" || l.rel === "approve",
    )?.href;
    if (approval) {
      const url = new URL(approval);
      if (
        url.protocol !== "https:" ||
        url.hostname !== "www.sandbox.paypal.com"
      )
        throw new BillingError("invalid_approval_url", 502);
    }
    return { orderId: order.id, approvalUrl: approval ?? null };
  }
  private async reconcile(
    orderId: string,
    eventId?: string,
    expectedCapture?: string,
  ) {
    const order = await this.request(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    );
    if (
      order.id !== orderId ||
      order.status !== "COMPLETED" ||
      order.purchase_units?.length !== 1
    )
      throw new BillingError("capture_incomplete", 422);
    const unit = order.purchase_units[0];
    const captures = unit.payments?.captures;
    if (captures?.length !== 1)
      throw new BillingError("capture_ambiguous", 422);
    const c = captures[0];
    if (
      !c.final_capture ||
      !c.id ||
      (expectedCapture && expectedCapture !== c.id)
    )
      throw new BillingError("capture_mismatch", 422);
    const amountMinor = minor(c.amount?.value);
    const currency = c.amount?.currency_code;
    const stored = await this.kernel.lookupOrder(orderId);
    if (
      unit.custom_id !== stored.id ||
      unit.amount?.value !== c.amount.value ||
      unit.amount?.currency_code !== currency
    )
      throw new BillingError("order_binding_mismatch", 422);
    const capture: Capture = {
      orderId,
      captureId: c.id,
      status: c.status,
      amountMinor,
      currency,
      merchantId: unit.payee?.merchant_id ?? "",
    };
    await this.kernel.fulfill(capture, eventId);
    return { orderId, captureId: c.id, status: "completed" };
  }
  async capture(scope: Scope, orderId: string) {
    await this.kernel.orderForScope(scope, orderId);
    const current = await this.request(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    );
    if (current.status !== "COMPLETED")
      await this.request(
        `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        "POST",
        {},
        fingerprint({ orderId, operation: "capture" }).slice(0, 32),
      );
    return this.reconcile(orderId);
  }
  async webhook(headers: Record<string, string>, event: unknown) {
    if (!this.config.webhookId)
      throw new BillingError("webhook_not_configured", 503);
    const h = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
    );
    const fields = [
      "auth-algo",
      "cert-url",
      "transmission-id",
      "transmission-sig",
      "transmission-time",
    ];
    if (fields.some((f) => !h[`paypal-${f}`]))
      throw new BillingError("unsigned_webhook", 401);
    const verification = await this.request(
      "/v1/notifications/verify-webhook-signature",
      "POST",
      {
        auth_algo: h["paypal-auth-algo"],
        cert_url: h["paypal-cert-url"],
        transmission_id: h["paypal-transmission-id"],
        transmission_sig: h["paypal-transmission-sig"],
        transmission_time: h["paypal-transmission-time"],
        webhook_id: this.config.webhookId,
        webhook_event: event,
      },
    );
    if (verification.verification_status !== "SUCCESS")
      throw new BillingError("invalid_webhook_signature", 401);
    const e = event as {
      id?: string;
      event_type?: string;
      resource?: {
        id?: string;
        supplementary_data?: { related_ids?: { order_id?: string } };
      };
    };
    if (e.event_type !== "PAYMENT.CAPTURE.COMPLETED") return { ignored: true };
    const orderId = e.resource?.supplementary_data?.related_ids?.order_id;
    if (!e.id || !orderId || !e.resource?.id)
      throw new BillingError("invalid_webhook", 400);
    return this.reconcile(orderId, e.id, e.resource.id);
  }
}
function minor(value: string) {
  if (typeof value !== "string" || !/^\d+\.\d{2}$/.test(value))
    throw new BillingError("invalid_provider_amount", 422);
  const n = Number(value.replace(".", ""));
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new BillingError("invalid_provider_amount", 422);
  return n;
}
