import { env } from "@/lib/env";

export function paypalApiBase(mode = env.paypalMode): string {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

type PayPalLink = { rel: string; href: string };

export type PayPalOrder = {
  id: string;
  status: string;
  links?: PayPalLink[];
  purchase_units?: Array<{
    amount?: { value: string };
    payments?: { captures?: Array<{ id?: string; amount?: { value: string } }> };
  }>;
};

export type PayPalPayout = {
  batch_header?: { payout_batch_id?: string };
};

export class PayPalClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(clientId?: string, clientSecret?: string) {
    this.clientId = clientId || env.paypalClientId;
    this.clientSecret = clientSecret || env.paypalClientSecret;
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const response = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal auth failed: ${error}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;
    return this.accessToken;
  }

  async createOrder(amount: number, currency = "USD"): Promise<PayPalOrder> {
    const token = await this.getAccessToken();

    const response = await fetch(`${paypalApiBase()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
            description: "AI Spend Wallet Top-up",
          },
        ],
        application_context: {
          return_url: `${env.appUrl}/api/paypal/capture`,
          cancel_url: `${env.appUrl}/wallet`,
          brand_name: "AI Spend Wallet",
          user_action: "PAY_NOW",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal order creation failed: ${error}`);
    }

    return response.json() as Promise<PayPalOrder>;
  }

  async captureOrder(orderId: string): Promise<PayPalOrder> {
    const token = await this.getAccessToken();

    const response = await fetch(`${paypalApiBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal order capture failed: ${error}`);
    }

    return response.json() as Promise<PayPalOrder>;
  }

  async createPayout(
    recipientEmail: string,
    amount: number,
    currency = "USD",
    note = "AI tool payment"
  ): Promise<PayPalPayout> {
    const token = await this.getAccessToken();
    const batchId = `batch_${Date.now()}`;

    const response = await fetch(`${paypalApiBase()}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: batchId,
          email_subject: "Payment from AI Spend Wallet",
          email_message: note,
        },
        items: [
          {
            recipient_type: "EMAIL",
            amount: {
              value: amount.toFixed(2),
              currency,
            },
            receiver: recipientEmail,
            note,
            sender_item_id: `item_${Date.now()}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal payout failed: ${error}`);
    }

    return response.json() as Promise<PayPalPayout>;
  }

  async getPayoutStatus(payoutBatchId: string): Promise<PayPalPayout> {
    const token = await this.getAccessToken();

    const response = await fetch(`${paypalApiBase()}/v1/payments/payouts/${payoutBatchId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal payout status check failed: ${error}`);
    }

    return response.json() as Promise<PayPalPayout>;
  }

  async verifyWebhookSignature(
    webhookId: string,
    headers: Record<string, string>,
    body: string
  ): Promise<boolean> {
    const token = await this.getAccessToken();
    const lower = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
    );

    const response = await fetch(`${paypalApiBase()}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transmission_id: lower["paypal-transmission-id"],
        transmission_time: lower["paypal-transmission-time"],
        cert_url: lower["paypal-cert-url"],
        auth_algo: lower["paypal-auth-algo"],
        transmission_sig: lower["paypal-transmission-sig"],
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { verification_status?: string };
    return data.verification_status === "SUCCESS";
  }
}

export const paypalClient = new PayPalClient();
