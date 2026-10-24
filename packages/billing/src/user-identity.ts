import { BillingError } from "./index";
import type { Identity } from "./service";
export type UserIdentityConfig = {
  url: string;
  anonKey: string;
  appId: string;
  fetcher?: typeof fetch;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Server-configured issuer/app binding. A token's unverified payload never selects a wallet. */
export function supabaseUserIdentity(config: UserIdentityConfig) {
  let issuer: URL;
  try { issuer = new URL(config.url); }
  catch { throw new BillingError("invalid_identity_policy", 500); }
  if (issuer.protocol !== "https:" || issuer.username || issuer.password ||
      issuer.pathname !== "/" || issuer.search || issuer.hash || issuer.port ||
      !config.anonKey?.trim() || !config.appId?.trim() || config.appId.length > 200)
    throw new BillingError("invalid_identity_policy", 500);
  const appId = config.appId, endpoint = `${issuer.origin}/auth/v1/user`;
  const network = config.fetcher ?? fetch;
  return {
    async authenticate(request: Request, claimedWorkspaceId = ""): Promise<Identity> {
      if (claimedWorkspaceId) throw new BillingError("wallet_scope_denied", 403);
      const token = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9._~-]{1,8192})$/i)?.[1];
      if (!token) throw new BillingError("unauthorized", 401);
      try {
        request.signal.throwIfAborted();
        const response = await network(endpoint, {
          method: "GET", headers: { Authorization: `Bearer ${token}`, apikey: config.anonKey },
          redirect: "error", cache: "no-store",
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(10000)]),
        });
        if (response.status === 401 || response.status === 403)
          throw new BillingError("unauthorized", 401);
        if (!response.ok) throw new BillingError("identity_unavailable", 503);
        const user = await boundedUser(response);
        request.signal.throwIfAborted();
        if (typeof user.id !== "string" || !uuid.test(user.id))
          throw new BillingError("unauthorized", 401);
        return { scope: { appId, workspaceId: user.id }, userId: user.id };
      } catch (error) {
        if (error instanceof BillingError) throw error;
        // Never return token, provider errors, email or user metadata.
        throw new BillingError("identity_unavailable", 503);
      }
    },
  };
}
async function boundedUser(response: Response): Promise<Record<string, unknown>> {
  const reader = response.body?.getReader();
  if (!reader) throw new BillingError("identity_unavailable", 503);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new BillingError("identity_unavailable", 503);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const user = JSON.parse(Buffer.concat(chunks).toString());
  if (!user || typeof user !== "object" || Array.isArray(user))
    throw new BillingError("unauthorized", 401);
  return user;
}
