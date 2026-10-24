import { test } from "node:test";
import assert from "node:assert/strict";
import { supabaseAdapter } from "./supabase";
import { geminiExplanation } from "./gemini";
const workspace = "11111111-1111-4111-8111-111111111111",
  user = "22222222-2222-4222-8222-222222222222",
  record = "33333333-3333-4333-8333-333333333333";
const request = new Request("http://test", {
  headers: { Authorization: "Bearer fixture" },
});
test("Supabase verifies user, membership, role and module independently", async () => {
  let missing = "";
  let fetched: string[] = [];
  const adapter = supabaseAdapter({
    url: "https://supabase.example.test",
    anonKey: "public-fixture",
    appId: "app",
    workspaceIds: [workspace],
    fetcher: async (input) => {
      const url = String(input);
      fetched.push(url);
      if (url.includes("/auth/"))
        return missing === "user"
          ? Response.json({}, { status: 401 })
          : Response.json({ id: user });
      if (url.includes("workspace_members"))
        return Response.json(missing === "member" ? [] : [{ user_id: user }]);
      if (url.includes("can_edit_workspace"))
        return Response.json(missing !== "role");
      if (url.includes("workspace_feature_access"))
        return Response.json({ savings: missing !== "module" });
      return Response.json([
        {
          id: record,
          revision: 1,
          state: "estimated",
          terms: {
            coverage: "confirmed",
            currency: "CAD",
            baselineEvidence: "private contract text",
          },
          calculation: {
            eligible: true,
            recurringMinor: 100,
            oneTimeMinor: 0,
            netMinor: 100,
          },
        },
      ]);
    },
  });
  const identity = await adapter.authenticate(request, workspace);
  const source = await adapter.prepare(identity, record, request);
  assert.ok(!JSON.stringify(source).includes("private contract"));
  for (missing of ["user", "member", "role", "module"])
    await assert.rejects(() => adapter.authenticate(request, workspace));
  fetched = [];
  await assert.rejects(() => adapter.authenticate(request, "other"));
  assert.equal(fetched.length, 0);
});
test("Gemini must return a bounded explanation citing the exact evidence ID", async () => {
  const response = (citation: string) => ({
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                summary: "Fixture explanation, not a real model receipt.",
                citationIds: [citation],
              }),
            },
          ],
        },
      },
    ],
  });
  const config = { key: "fixture", model: "gemini-test", dataApproved: true };
  assert.deepEqual(
    await geminiExplanation({
      ...config,
      fetcher: async () => Response.json(response(record)),
    })({ recordId: record }),
    {
      summary: "Fixture explanation, not a real model receipt.",
      citationIds: [record],
    },
  );
  await assert.rejects(() =>
    geminiExplanation({
      ...config,
      fetcher: async () => Response.json(response("invented")),
    })({ recordId: record }),
  );
  let invoked = false;
  await assert.rejects(() =>
    geminiExplanation({
      ...config,
      dataApproved: false,
      fetcher: async () => {
        invoked = true;
        return Response.json({});
      },
    })({ recordId: record }),
  );
  assert.equal(invoked, false);
});
