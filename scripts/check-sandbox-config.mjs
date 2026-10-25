// Read-only, explicitly opted-in Preview diagnostic. Never logs secrets or bodies.
export async function inspectSandboxConfig(env, request = fetch) {
  if (env.METERKIT_VERIFY_SANDBOX_CONFIG !== 'true' || env.VERCEL_ENV !== 'preview') return null;
  const report = {
    oauth: 'not_run', webhooks: 'not_run', identity: 'not_run',
    merchantConfigured: Boolean(env.PAYPAL_MERCHANT_ID),
    webhookConfigured: Boolean(env.PAYPAL_WEBHOOK_ID),
    workspaceAuthConfigured: Boolean(env.SIGNAL_SUPABASE_URL && env.SIGNAL_SUPABASE_ANON_KEY),
    publicAuthConfigured: Boolean(env.METERKIT_CHAT_SUPABASE_URL && env.METERKIT_CHAT_SUPABASE_ANON_KEY),
    databaseConfigured: Boolean(env.DATABASE_URL),
  };
  const json = async (path, options) => {
    const response = await request('https://api-m.sandbox.paypal.com' + path, {
      ...options, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { status: response.status };
    // Provider metadata only, never returned verbatim or logged.
    if (!response.body) throw new Error('missing_metadata');
    const reader = response.body.getReader();
    const chunks = []; let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 65536) throw new Error('metadata_limit');
        chunks.push(value);
      }
      return { status: response.status, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) };
    } finally { await reader.cancel().catch(() => {}); }
  };
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) return report;
  try {
    const token = await json('/v1/oauth2/token', {
      method: 'POST', headers: {
        Authorization: 'Basic ' + Buffer.from(env.PAYPAL_CLIENT_ID + ':' + env.PAYPAL_CLIENT_SECRET).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      }, body: 'grant_type=client_credentials',
    });
    if (typeof token.data?.access_token !== 'string' || !token.data.access_token) {
      report.oauth = 'failed'; return report;
    }
    report.oauth = 'pass';
    const headers = { Authorization: 'Bearer ' + token.data.access_token };
    try {
      const result = await json('/v1/notifications/webhooks', { headers });
      report.webhooks = result.status;
      if (Array.isArray(result.data?.webhooks)) {
        report.webhookCount = result.data.webhooks.length;
        report.alphaCaptureWebhookCount = result.data.webhooks.filter(w => {
          try {
            const url = new URL(w.url);
            return url.protocol === 'https:' && url.pathname === '/api/alpha/paypal/webhook' &&
              w.event_types?.some(e => e.name === 'PAYMENT.CAPTURE.COMPLETED' || e.name === '*');
          } catch { return false; }
        }).length;
        report.configuredWebhookFound = Boolean(env.PAYPAL_WEBHOOK_ID && result.data.webhooks.some(w => w.id === env.PAYPAL_WEBHOOK_ID));
      }
    } catch { report.webhooks = 'unavailable'; }
    try {
      const result = await json('/v1/identity/oauth2/userinfo?schema=paypalv1.1', { headers });
      report.identity = result.status;
      // Client-credential tokens may not permit merchant identity. Never infer it from app ID.
      report.merchantIdentityAvailable = typeof result.data?.payer_id === 'string';
      if (report.merchantIdentityAvailable && env.PAYPAL_MERCHANT_ID) report.merchantMatches = result.data.payer_id === env.PAYPAL_MERCHANT_ID;
    } catch { report.identity = 'unavailable'; }
  } catch { report.oauth = 'unavailable'; }
  return report;
}
if (process.env.METERKIT_VERIFY_SANDBOX_CONFIG === 'true') {
  const report = await inspectSandboxConfig(process.env);
  if (report) console.log('MeterKit sandbox metadata: ' + JSON.stringify(report));
}
