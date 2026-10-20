export type PaypalWebhookVerifyInput = {
  webhookId: string;
  headers: Record<string, string>;
  body: string;
  accessToken: string;
  apiBase: string;
  fetchImpl?: typeof fetch;
};

const REQUIRED = [
  "paypal-transmission-id",
  "paypal-transmission-time",
  "paypal-cert-url",
  "paypal-auth-algo",
  "paypal-transmission-sig",
] as const;

export async function verifyPaypalWebhook(
  input: PaypalWebhookVerifyInput
): Promise<boolean> {
  const lower = Object.fromEntries(
    Object.entries(input.headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  if (REQUIRED.some((key) => !lower[key])) {
    return false;
  }

  const fetchFn = input.fetchImpl ?? fetch;
  const response = await fetchFn(
    `${input.apiBase}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transmission_id: lower["paypal-transmission-id"],
        transmission_time: lower["paypal-transmission-time"],
        cert_url: lower["paypal-cert-url"],
        auth_algo: lower["paypal-auth-algo"],
        transmission_sig: lower["paypal-transmission-sig"],
        webhook_id: input.webhookId,
        webhook_event: JSON.parse(input.body),
      }),
    }
  );

  if (!response.ok) {
    return false;
  }
  const data = (await response.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}
