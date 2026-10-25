import assert from "node:assert/strict";

// Refusing a legacy request must not contact Auth, wallet, model or payments.
const originalFetch = globalThis.fetch;
let requests = 0;
globalThis.fetch = async () => {
  requests++;
  throw new Error("Retired routes must not contact a provider");
};
try {
  for (const path of ["chat", "export"]) {
    const route = await import(new URL(
      "../examples/chatbot-metered/app/api/" + path + "/route.ts",
      import.meta.url,
    ).href);
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]) {
      for (const body of [undefined, '{"userId":"another-user","prompt":"charge me"}', "not json"]) {
        if ((method === "GET" || method === "HEAD") && body !== undefined) continue;
        const response = await route[method](new Request("http://fixture.test/api/" + path, {
          method, ...(body === undefined ? {} : { body }),
        }));
        assert.equal(response.status, 410, path + " " + method);
        assert.equal(response.headers.get("Cache-Control"), "no-store");
        assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
        assert.deepEqual(await response.json(), {
          error: "legacy_chat_route_retired", replacement: "/api/alpha",
        });
      }
    }
  }
  assert.equal(requests, 0);
} finally {
  globalThis.fetch = originalFetch;
}
console.log("Both historical chat/export routes refuse every supported verb, forged users and malformed bodies without provider access.");
