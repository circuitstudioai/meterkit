import { BillingError } from "./index";
import type { Identity } from "./service";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function supabaseAdapter(config: {
  url: string;
  anonKey: string;
  appId: string;
  workspaceIds: string[];
  fetcher?: typeof fetch;
}) {
  const network = config.fetcher ?? fetch;
  async function api(path: string, request: Request, body?: unknown) {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer "))
      throw new BillingError("unauthorized", 401);
    const response = await network(`${config.url}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: auth,
        apikey: config.anonKey,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new BillingError(
        response.status === 401 ? "unauthorized" : "access_denied",
        response.status === 401 ? 401 : 403,
      );
    return response.json();
  }
  return {
    async authenticate(
      request: Request,
      workspaceId: string,
    ): Promise<Identity> {
      if (!uuid.test(workspaceId) || !config.workspaceIds.includes(workspaceId))
        throw new BillingError("workspace_not_enabled", 403);
      const user = await api("/auth/v1/user", request);
      if (typeof user.id !== "string" || !uuid.test(user.id))
        throw new BillingError("unauthorized", 401);
      const members = await api(
        `/rest/v1/workspace_members?workspace_id=eq.${workspaceId}&user_id=eq.${user.id}&select=user_id`,
        request,
      );
      if (!Array.isArray(members) || members.length !== 1)
        throw new BillingError("workspace_denied", 403);
      const canEdit = await api("/rest/v1/rpc/can_edit_workspace", request, {
        target_workspace: workspaceId,
      });
      const access = await api(
        "/rest/v1/rpc/workspace_feature_access",
        request,
        { target_workspace: workspaceId },
      );
      if (canEdit !== true || access.savings !== true)
        throw new BillingError("savings_not_authorized", 403);
      return { scope: { appId: config.appId, workspaceId }, userId: user.id };
    },
    async prepare(identity: Identity, recordId: string, request: Request) {
      if (!uuid.test(recordId))
        throw new BillingError("invalid_record_id", 400);
      const rows = await api(
        `/rest/v1/savings_cases?workspace_id=eq.${identity.scope.workspaceId}&id=eq.${recordId}&select=id,revision,state,terms,calculation`,
        request,
      );
      if (!Array.isArray(rows) || rows.length !== 1)
        throw new BillingError("record_not_found", 404);
      const row = rows[0];
      if (
        row.terms?.coverage !== "confirmed" ||
        row.calculation?.eligible !== true ||
        ["dismissed", "superseded", "needs_information"].includes(row.state)
      )
        throw new BillingError("confirmed_terms_required", 422);
      if (
        !/^[A-Z]{3}$/.test(row.terms.currency) ||
        !Number.isSafeInteger(row.revision) ||
        row.revision < 1 ||
        !["recurringMinor", "oneTimeMinor", "netMinor"].every((k) =>
          Number.isSafeInteger(row.calculation[k]),
        )
      )
        throw new BillingError("invalid_calculation", 422);
      // No contracts, employee data, names, free-form notes or browser-supplied amounts go to the model.
      return {
        recordId: row.id,
        revision: row.revision,
        currency: row.terms.currency,
        state: row.state,
        calculation: {
          recurringMinor: row.calculation.recurringMinor,
          oneTimeMinor: row.calculation.oneTimeMinor,
          netMinor: row.calculation.netMinor,
        },
        limitation:
          "Stored comparison estimate at the cited revision; current eligibility was not recomputed. Not realized savings or an instruction to cancel or purchase.",
      };
    },
  };
}
