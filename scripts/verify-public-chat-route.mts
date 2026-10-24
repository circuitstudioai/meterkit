import assert from "node:assert/strict";
import * as route from "../examples/chatbot-metered/app/api/alpha/[...path]/route";
// No database, Auth, model or payment credentials are required to refuse activation.
const saved = process.env.METERKIT_CHAT_ENABLED;
try {
  delete process.env.METERKIT_CHAT_ENABLED;
  for (const [method, dispatch] of [["GET", route.GET], ["POST", route.POST], ["OPTIONS", route.OPTIONS]] as const) {
    const response = await dispatch(new Request("http://fixture.test/api/alpha/balance", {
      method, ...(method === "POST" ? { body: "{}" } : {}),
    }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), { error: "chat_not_configured" });
  }
} finally {
  if (saved === undefined) delete process.env.METERKIT_CHAT_ENABLED;
  else process.env.METERKIT_CHAT_ENABLED = saved;
}
console.log("Public chatbot GET/POST/OPTIONS refuse unconfigured activation without provider access.");
