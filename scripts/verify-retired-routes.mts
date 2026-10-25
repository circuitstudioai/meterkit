import assert from "node:assert/strict";
for (const path of [
  "meter/credit",
  "meter/debit",
  "paypal/create-order",
  "paypal/capture",
  "paypal/webhook",
  "payouts",
]) {
  const route = await import(
    new URL("../apps/dashboard/app/api/" + path + "/route.ts", import.meta.url)
      .href
  );
  for (const method of ["GET", "POST"]) {
    if (!route[method]) continue;
    const response = await route[method](
      new Request("http://fixture.test/api/" + path, {
        method,
        ...(method === "POST" ? { body: "{}" } : {}),
      }),
    );
    assert.equal(
      response.status,
      410,
      path + " " + method + " must be retired",
    );
    assert.equal((await response.json()).error, "legacy_payment_route_retired");
  }
}
console.log(
  "All six legacy payment routes refuse requests without initializing a DB or provider.",
);
