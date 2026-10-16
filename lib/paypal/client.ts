const PAYPAL_API_BASE =
  process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export class PayPalClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(clientId?: string, clientSecret?: string) {
    this.clientId = clientId || process.env.PAYPAL_CLIENT_ID || "";
    this.clientSecret = clientSecret || process.env.PAYPAL_CLIENT_SECRET || "";
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
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

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000; // 1 min buffer

    return this.accessToken;
  }

  async createOrder(amount: number, currency: string = "USD"): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
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
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/paypal/capture`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/wallet`,
          brand_name: "AI Spend Wallet",
          user_action: "PAY_NOW",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal order creation failed: ${error}`);
    }

    return response.json();
  }

  async captureOrder(orderId: string): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal order capture failed: ${error}`);
    }

    return response.json();
  }

  async createPayout(
    recipientEmail: string,
    amount: number,
    currency: string = "USD",
    note: string = "AI tool payment"
  ): Promise<any> {
    const token = await this.getAccessToken();

    const batchId = `batch_${Date.now()}`;

    const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
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
              currency: currency,
            },
            receiver: recipientEmail,
            note: note,
            sender_item_id: `item_${Date.now()}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal payout failed: ${error}`);
    }

    return response.json();
  }

  async getPayoutStatus(payoutBatchId: string): Promise<any> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${PAYPAL_API_BASE}/v1/payments/payouts/${payoutBatchId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayPal payout status check failed: ${error}`);
    }

    return response.json();
  }

  async verifyWebhookSignature(
    webhookId: string,
    headers: Record<string, string>,
    body: string
  ): Promise<boolean> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transmission_id: headers["paypal-transmission-id"],
          transmission_time: headers["paypal-transmission-time"],
          cert_url: headers["paypal-cert-url"],
          auth_algo: headers["paypal-auth-algo"],
          transmission_sig: headers["paypal-transmission-sig"],
          webhook_id: webhookId,
          webhook_event: JSON.parse(body),
        }),
      }
    );

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.verification_status === "SUCCESS";
  }
}

export const paypalClient = new PayPalClient();
