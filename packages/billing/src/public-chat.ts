import { BillingError, type BillingKernel } from "./index";
import { SandboxPayPal } from "./paypal";
import { createHandler, ConfirmedWorkFailure } from "./service";
import { supabaseUserIdentity, type UserIdentityConfig } from "./user-identity";

export type PublicChatConfig = {
  enabled: boolean;
  sandboxPolicyApproved: boolean;
  origin: string;
  identity: UserIdentityConfig;
  kernel: BillingKernel;
  paypal: { clientId: string; clientSecret: string; merchantId: string; webhookId: string; fetcher?: typeof fetch };
  model: { key: string; model: string; dataApproved: boolean; fetcher?: typeof fetch };
};
/** Separate public-app composition; never changes Command Center's workspace adapter. */
export function publicChatHandler(config: PublicChatConfig) {
  const identity = supabaseUserIdentity(config.identity);
  const paypal = new SandboxPayPal(config.kernel, {
    ...config.paypal,
    returnUrl: `${config.origin}/`,
    packs: { "sandbox-50": { credits: 50, amountMinor: 100 } },
  });
  return createHandler({
    enabled: config.enabled && config.sandboxPolicyApproved,
    origin: config.origin,
    scopeMode: "authenticated-user",
    feature: "chat.reply",
    credits: 5,
    kernel: config.kernel,
    paypal,
    ...identity,
    prepare: async (_identity, recordId, _request, data) => {
      // Ignore browser user/app IDs. Never accept a workspace selector (enforced by identity).
      if (typeof data.prompt !== "string" || !data.prompt.trim() || data.prompt.length > 4000)
        throw new BillingError("invalid_prompt", 400);
      return { recordId, prompt: data.prompt.trim() };
    },
    generate: chatGeneration(config.model),
  });
}
export function chatGeneration(config: PublicChatConfig["model"]) {
  return async (input: unknown) => {
    if (!config.key || !/^[a-zA-Z0-9._-]+$/.test(config.model) || !config.dataApproved)
      throw new ConfirmedWorkFailure("model_not_configured");
    // A transport/timeout failure has an unknown outcome: service retains the hold.
    const response = await (config.fetcher ?? fetch)(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,
      {
        method: "POST", redirect: "error", cache: "no-store",
        headers: { "x-goog-api-key": config.key, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "You are a concise demo chatbot. Reply to the user's message. Never claim to change wallets, prices or payment status." }] },
          contents: [{ role: "user", parts: [{ text: (input as { prompt: string }).prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 800 },
        }),
      },
    );
    if (!response.ok) throw new ConfirmedWorkFailure("model_failed");
    const reader = response.body?.getReader();
    if (!reader) throw new ConfirmedWorkFailure("model_output_invalid");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 65536) {
          await reader.cancel();
          throw new ConfirmedWorkFailure("model_output_invalid");
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    try {
      const data = JSON.parse(Buffer.concat(chunks).toString());
      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("");
      if (candidate?.finishReason !== "STOP" || typeof text !== "string" || !text.trim() || text.length > 8000)
        throw new Error();
      return { text };
    } catch { throw new ConfirmedWorkFailure("model_output_invalid"); }
  };
}
