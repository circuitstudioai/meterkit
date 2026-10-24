/** Browser transport only. Server verification, scope and prices remain authoritative.
 * No cookies/localStorage/sessionStorage, refresh tokens, checkout or automatic retries.
 */
export class ChatClientError extends Error {
  constructor(public readonly code: string) { super(code); }
}
type Session = { token: string; userId: string; expiresAt: number };
export type ChatJob = Readonly<{ key: string; recordId: string; prompt: string; expectedCredits: 5 }>;
export type JobOutcome = { status: "completed"; text: string } | { status: "reserved" } | { status: "released" };
export type ClientConfig = { issuer: string; anonKey: string; fetcher?: typeof fetch; now?: () => number; randomId?: () => string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPattern = /^[A-Za-z0-9._~-]{1,8192}$/;

async function json(response: Response): Promise<Record<string, unknown>> {
  const reader = response.body?.getReader();
  if (!reader) throw new ChatClientError("invalid_response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) { await reader.cancel(); throw new ChatClientError("invalid_response"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new ChatClientError("invalid_response"); }
}

export function createAlphaClient(config: ClientConfig) {
  const issuer = new URL(config.issuer);
  if (issuer.protocol !== "https:" || issuer.username || issuer.password || issuer.port ||
      issuer.pathname !== "/" || issuer.search || issuer.hash || !config.anonKey.trim())
    throw new ChatClientError("invalid_auth_config");
  const network = config.fetcher ?? fetch, now = config.now ?? Date.now;
  const randomId = config.randomId ?? (() => crypto.randomUUID());
  let session: Session | undefined;
  let epoch = 0, busy = false;
  // Retain unknown work across local sign-out; only its original user may reconcile it.
  let pending: { owner: string; job: ChatJob } | undefined;
  const current = () => {
    if (!session || session.expiresAt <= now()) {
      session = undefined;
      throw new ChatClientError("sign_in_required");
    }
    return session;
  };
  async function request(path: "/balance" | "/jobs", body?: ChatJob) {
    const auth = current(), version = epoch;
    const response = await network(`/api/alpha${path}`, {
      method: body ? "POST" : "GET", redirect: "error", cache: "no-store", credentials: "omit",
      headers: { Authorization: `Bearer ${auth.token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
    });
    const data = await json(response);
    if (version !== epoch) throw new ChatClientError("session_changed");
    if (response.status === 401) { session = undefined; throw new ChatClientError("sign_in_required"); }
    return { response, data };
  }
  async function execute(): Promise<JobOutcome> {
    const auth = current();
    if (!pending || pending.owner !== auth.userId) throw new ChatClientError("pending_owner_required");
    if (busy) throw new ChatClientError("request_in_progress");
    busy = true;
    try {
      const { response, data } = await request("/jobs", pending.job);
      if (response.status === 202 && data.status === "reserved") return { status: "reserved" };
      if ((response.status === 409 || response.status === 502) && data.status === "released") {
        pending = undefined;
        return { status: "released" };
      }
      const result = data.result as { text?: unknown } | undefined;
      if (response.ok && data.status === "completed" && typeof result?.text === "string" &&
          result.text.trim() && result.text.length <= 8000) {
        pending = undefined;
        return { status: "completed", text: result.text };
      }
      // Even an HTTP failure could follow a committed reserve/settlement. Never start a new key.
      throw new ChatClientError("job_needs_reconciliation");
    } catch (error) {
      if (error instanceof ChatClientError && ["session_changed", "sign_in_required"].includes(error.code)) throw error;
      throw new ChatClientError("job_needs_reconciliation");
    } finally { busy = false; }
  }
  return {
    async signIn(email: string, password: string): Promise<void> {
      // A later sign-in or local sign-out invalidates earlier in-flight responses.
      const version = ++epoch;
      session = undefined;
      try {
        const response = await network(`${issuer.origin}/auth/v1/token?grant_type=password`, {
          method: "POST", redirect: "error", cache: "no-store", credentials: "omit",
          headers: { apikey: config.anonKey, "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(10000),
        });
        const data = await json(response);
        const user = data.user as { id?: unknown } | undefined;
        if (!response.ok || typeof data.access_token !== "string" || !tokenPattern.test(data.access_token) ||
            typeof user?.id !== "string" || !uuid.test(user.id) || typeof data.expires_in !== "number" ||
            !Number.isFinite(data.expires_in) || data.expires_in <= 0 || data.expires_in > 86400)
          throw new Error();
        if (version !== epoch) throw new ChatClientError("session_changed");
        session = { token: data.access_token, userId: user.id, expiresAt: now() + data.expires_in * 1000 };
      } catch (error) {
        if (error instanceof ChatClientError && error.code === "session_changed") throw error;
        throw new ChatClientError("sign_in_failed");
      }
    },
    /** Local logout only; does not claim provider-wide token revocation. */
    signOut() { ++epoch; session = undefined; },
    pendingJob(): ChatJob | undefined {
      return session && session.expiresAt > now() && pending?.owner === session.userId ? pending.job : undefined;
    },
    async balance(): Promise<{ available: number; held: number }> {
      try {
        const { response, data } = await request("/balance");
        if (!response.ok || !Number.isSafeInteger(data.available) || !Number.isSafeInteger(data.held) ||
            (data.available as number) < 0 || (data.held as number) < 0) throw new Error();
        return { available: data.available as number, held: data.held as number };
      } catch (error) {
        if (error instanceof ChatClientError && ["sign_in_required", "session_changed"].includes(error.code)) throw error;
        throw new ChatClientError("balance_unavailable");
      }
    },
    async send(prompt: string): Promise<JobOutcome> {
      const auth = current();
      if (pending) throw new ChatClientError("pending_job_exists");
      if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) throw new ChatClientError("invalid_prompt");
      const job = Object.freeze({ key: randomId(), recordId: randomId(), prompt: prompt.trim(), expectedCredits: 5 as const });
      pending = { owner: auth.userId, job };
      return execute();
    },
    reconcile: execute,
  };
}
