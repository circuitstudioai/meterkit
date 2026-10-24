import { BillingError, BillingKernel, type Scope } from "./index";
import type { SandboxPayPal } from "./paypal";
export class ConfirmedWorkFailure extends Error {}
export type Identity = { scope: Scope; userId: string };
export type ServiceOptions = {
  enabled: boolean;
  origin: string | readonly string[];
  /** Public user wallets are derived from verified identity, never browser-selected workspace IDs. */
  scopeMode?: "workspace" | "authenticated-user";
  feature: string;
  credits: number;
  kernel: BillingKernel;
  paypal: SandboxPayPal;
  authenticate: (request: Request, workspaceId: string) => Promise<Identity>;
  prepare: (
    identity: Identity,
    recordId: string,
    request: Request,
    data: Readonly<Record<string, unknown>>,
  ) => Promise<unknown>;
  generate: (input: unknown) => Promise<unknown>;
};
export function createHandler(o: ServiceOptions) {
  const origins = new Set(typeof o.origin === "string" ? [o.origin] : o.origin);
  if (
    !origins.size ||
    [...origins].some((origin) => {
      try {
        const url = new URL(origin);
        return !["http:", "https:"].includes(url.protocol) || origin !== url.origin;
      } catch {
        return true;
      }
    })
  ) throw new BillingError("invalid_origin_policy", 500);
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
    };
    const reply = (data: unknown, status = 200) =>
      Response.json(data, { status, headers });
    if (origin && !origins.has(origin))
      return reply({ error: "origin_denied" }, 403);
    if (origin)
      Object.assign(headers, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization,content-type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (!o.enabled) return reply({ error: "alpha_disabled" }, 503);
    const path = new URL(request.url).pathname.replace(/^.*\/api\/alpha/, "");
    try {
      if (path === "/paypal/webhook" && request.method === "POST")
        return reply(
          await o.paypal.webhook(
            Object.fromEntries(request.headers),
            await body(request),
          ),
        );
      if (!["GET", "POST"].includes(request.method))
        return reply({ error: "method_not_allowed" }, 405);
      const data = request.method === "POST" ? await body(request) : {};
      const workspaceId = String(
        data.workspaceId ??
          new URL(request.url).searchParams.get("workspaceId") ??
          "",
      );
      const identity = await o.authenticate(request, workspaceId);
      if (o.scopeMode === "authenticated-user") {
        if (workspaceId || identity.scope.workspaceId !== identity.userId)
          throw new BillingError("wallet_scope_denied", 403);
      } else if (identity.scope.workspaceId !== workspaceId) {
        throw new BillingError("workspace_denied", 403);
      }
      if (path === "/balance" && request.method === "GET")
        return reply(await o.kernel.balance(identity.scope));
      if (path === "/paypal/orders" && request.method === "POST")
        return reply(
          await o.paypal.create(
            identity.scope,
            String(data.packId ?? ""),
            String(data.key ?? ""),
          ),
        );
      if (path === "/paypal/capture" && request.method === "POST")
        return reply(
          await o.paypal.capture(identity.scope, String(data.orderId ?? "")),
        );
      if (path !== "/jobs" || request.method !== "POST")
        return reply({ error: "not_found" }, 404);
      if (data.expectedCredits !== o.credits)
        throw new BillingError("price_changed_review_required", 409);
      const key = String(data.key ?? "");
      const recordId = String(data.recordId ?? "");
      if (!key || !recordId || recordId.length > 200)
        throw new BillingError("invalid_job", 400);
      const input = await o.prepare(identity, recordId, request, data);
      const job = await o.kernel.reserve(identity.scope, {
        key,
        feature: o.feature,
        credits: o.credits,
        input,
      });
      if (!job.created)
        return reply(
          { status: job.status, result: job.result },
          job.status === "reserved"
            ? 202
            : job.status === "released"
              ? 409
              : 200,
        );
      let result: unknown;
      try {
        result = await o.generate(input);
      } catch (error) {
        if (error instanceof ConfirmedWorkFailure) {
          await o.kernel.release(identity.scope, key);
          return reply({ error: "work_failed", status: "released" }, 502);
        }
        // Unknown outcome: never release credits while remote execution may still be running.
        return reply(
          { error: "work_outcome_unknown", status: "reserved", key },
          202,
        );
      }
      // Never release after a DB failure here: the result/settlement transaction may have committed.
      await o.kernel.complete(identity.scope, key, result);
      return reply({ status: "completed", result });
    } catch (error) {
      if (error instanceof BillingError)
        return reply({ error: error.code }, error.status);
      return reply({ error: "service_unavailable" }, 503);
    }
  };
}
async function body(request: Request): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > 65000) throw new BillingError("body_too_large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new BillingError("invalid_body", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65000) {
      await reader.cancel();
      throw new BillingError("body_too_large", 413);
    }
    chunks.push(value);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString());
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
      throw new Error();
    return parsed;
  } catch {
    throw new BillingError("invalid_body", 400);
  }
}
