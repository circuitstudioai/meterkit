import assert from "node:assert/strict";
import { test } from "node:test";
import { createAlphaClient, createTabRecoveryStore } from "./alpha-client";
const userA = "11111111-1111-4111-8111-111111111111", userB = "22222222-2222-4222-8222-222222222222";
const reply = (data: unknown, status = 200) => Response.json(data, { status });
function setup(handler: (url: string, init: RequestInit) => Promise<Response> | Response) {
  let id = 0;
  const calls: { url: string; init: RequestInit }[] = [];
  const client = createAlphaClient({ issuer: "https://auth.example", anonKey: "public-anon", randomId: () => `id-${++id}`,
    fetcher: (async (url, init) => { calls.push({ url: String(url), init: init! }); return handler(String(url), init!); }) as typeof fetch });
  return { client, calls };
}
const login = (id = userA) => reply({ access_token: "fixture.token", expires_in: 60, refresh_token: "never-retained", user: { id } });
test("login and wallet use bounded no-store requests; only bearer identifies alpha wallet", async () => {
  const { client, calls } = setup(url => url.includes("/auth/") ? login() : reply({ available: 50, held: 0 }));
  await client.signIn("test@example.test", "fixture-password");
  assert.deepEqual(await client.balance(), { available: 50, held: 0 });
  assert.equal(calls[0].url, "https://auth.example/auth/v1/token?grant_type=password");
  assert.equal(calls[1].url, "/api/alpha/balance");
  for (const { init } of calls) {
    assert.equal(init.cache, "no-store"); assert.equal(init.redirect, "error"); assert.equal(init.credentials, "omit");
    assert.ok(init.signal);
  }
  assert.deepEqual(calls[1].init.headers, { Authorization: "Bearer fixture.token" });
  client.signOut();
  await assert.rejects(client.balance(), /sign_in_required/);
  assert.equal(calls.length, 2);
});
test("uncertain execution retains immutable exact key/input; no automatic retry or new job", async () => {
  let attempt = 0;
  const { client, calls } = setup(url => {
    if (url.includes("/auth/")) return login();
    if (++attempt === 1) throw new Error("private provider diagnostic");
    if (attempt === 2) return reply({ status: "reserved" }, 202);
    return reply({ status: "completed", result: { text: "Actual response" } });
  });
  await client.signIn("a", "b");
  await assert.rejects(client.send("  hello  "), /job_needs_reconciliation/);
  const pending = client.pendingJob();
  assert.ok(Object.isFrozen(pending));
  assert.deepEqual(pending, { key: "id-1", recordId: "id-2", prompt: "hello", expectedCredits: 5 });
  await assert.rejects(client.send("different"), /pending_job_exists/);
  assert.equal(calls.length, 2);
  assert.deepEqual(await client.reconcile(), { status: "reserved" });
  assert.deepEqual(await client.reconcile(), { status: "completed", text: "Actual response" });
  assert.equal(client.pendingJob(), undefined);
  assert.equal(calls[1].init.body, calls[2].init.body);
  assert.equal(calls[2].init.body, calls[3].init.body);
});
test("malformed, oversized and HTTP job failures retain pending; provider content never becomes error text", async () => {
  for (const result of [() => reply({ error: "secret diagnostic" }, 503), () => new Response("bad JSON"),
    () => new Response("x".repeat(65537)), () => reply({ status: "completed", result: { text: "" } })]) {
    const { client } = setup(url => url.includes("/auth/") ? login() : result());
    await client.signIn("a", "b");
    await assert.rejects(client.send("hello"), error => error instanceof Error && error.message === "job_needs_reconciliation");
    assert.ok(client.pendingJob());
  }
});
test("confirmed release permits a distinct new key", async () => {
  const { client } = setup(url => url.includes("/auth/") ? login() : reply({ status: "released", error: "work_failed" }, 502));
  await client.signIn("a", "b");
  assert.deepEqual(await client.send("hello"), { status: "released" });
  assert.equal(client.pendingJob(), undefined);
  assert.deepEqual(await client.send("next"), { status: "released" });
});
test("no session/invalid prompt never sends a job; expiry requires explicit reauthentication", async () => {
  let now = 0, calls = 0;
  const client = createAlphaClient({ issuer: "https://auth.example", anonKey: "public", now: () => now,
    fetcher: (async () => { calls++; return login(); }) as typeof fetch });
  await assert.rejects(client.send("hello"), /sign_in_required/);
  await client.signIn("a", "b");
  for (const prompt of [" ", "a".repeat(4001)]) await assert.rejects(client.send(prompt), /invalid_prompt/);
  now = 60001;
  await assert.rejects(client.balance(), /sign_in_required/);
  assert.equal(calls, 1);
});
test("local logout rejects stale login and in-flight wallet responses", async () => {
  let resolve!: (r: Response) => void;
  const { client } = setup(() => new Promise<Response>(r => { resolve = r; }));
  const signingIn = client.signIn("a", "b");
  client.signOut(); resolve(login());
  await assert.rejects(signingIn, /session_changed/);
  await assert.rejects(client.balance(), /sign_in_required/);
  const second = client.signIn("a", "b"); resolve(login()); await second;
  const balance = client.balance(); client.signOut(); resolve(reply({ available: 50, held: 0 }));
  await assert.rejects(balance, /session_changed/);
});
test("unknown work cannot be replayed under a different authenticated user", async () => {
  let user = userA;
  const { client, calls } = setup(url => url.includes("/auth/") ? login(user) : reply({ status: "reserved" }, 202));
  await client.signIn("a", "b"); await client.send("hello"); client.signOut();
  assert.equal(client.pendingJob(), undefined);
  user = userB; await client.signIn("c", "d");
  assert.equal(client.pendingJob(), undefined);
  await assert.rejects(client.reconcile(), /pending_owner_required/);
  await assert.rejects(client.send("new"), /pending_job_exists/);
  assert.equal(calls.length, 3);
  client.signOut(); user = userA; await client.signIn("a", "b");
  assert.deepEqual(await client.reconcile(), { status: "reserved" });
});
test("invalid Auth configuration/responses fail without leaking provider bodies", async () => {
  for (const issuer of ["http://auth.example", "https://auth.example/path", "https://u:p@auth.example", "https://auth.example?x=y"]) {
    assert.throws(() => createAlphaClient({ issuer, anonKey: "public" }), /invalid_auth_config/);
  }
  for (const response of [() => reply({ error: "secret" }, 401), () => reply({ access_token: "bad token", user: { id: userA }, expires_in: 60 }),
    () => reply({ access_token: "ok", user: { id: "bad" }, expires_in: 60 }), () => new Response("x".repeat(65537))]) {
    const { client } = setup(() => response());
    await assert.rejects(client.signIn("a", "b"), error => error instanceof Error && error.message === "sign_in_failed");
    await assert.rejects(client.balance(), /sign_in_required/);
  }
});

test("concurrent replay is refused; logout during completion cannot expose output or clear pending", async () => {
  let resolve!: (r: Response) => void;
  const { client, calls } = setup(url => url.includes("/auth/") ? login() : new Promise<Response>(r => { resolve = r; }));
  await client.signIn("a", "b");
  const sending = client.send("private message");
  await assert.rejects(client.reconcile(), /request_in_progress/);
  await assert.rejects(client.send("new"), /pending_job_exists/);
  assert.equal(calls.length, 2);
  client.signOut(); resolve(reply({ status: "completed", result: { text: "private answer" } }));
  await assert.rejects(sending, /session_changed/);
  await client.signIn("a", "b");
  assert.equal(client.pendingJob()?.prompt, "private message");
});
test("401 clears session but retains original work for owner reauthentication", async () => {
  const { client } = setup(url => url.includes("/auth/") ? login() : reply({ error: "unauthorized" }, 401));
  await client.signIn("a", "b");
  await assert.rejects(client.send("hello"), /sign_in_required/);
  assert.equal(client.pendingJob(), undefined);
  await assert.rejects(client.balance(), /sign_in_required/);
  await client.signIn("a", "b");
  assert.equal(client.pendingJob()?.key, "id-1");
});

function recoveryHarness() {
  let raw: string | null = null, fail = false;
  let user = userA, answer: "unknown" | "completed" | "released" = "unknown";
  const jobs: string[] = [];
  const recovery = { read: () => { if (fail) throw new Error("disk"); return raw; },
    write: (value: string) => { if (fail) throw new Error("disk"); raw = value; } };
  function make() {
    let id = 0;
    return createAlphaClient({ issuer: "https://auth.example", anonKey: "public", recovery,
      randomId: () => `33333333-3333-4333-8333-${String(++id).padStart(12, "0")}`,
      fetcher: (async (url, init) => {
        if (String(url).includes("/auth/")) return login(user);
        assert.equal(raw, JSON.stringify({ version: 1, issuer: "https://auth.example",
          pending: { owner: user, job: JSON.parse(String(init?.body)) } }));
        jobs.push(String(init?.body));
        if (answer === "unknown") throw new Error("connection lost after commit");
        return answer === "completed" ? reply({ status: "completed", result: { text: "recovered" } }) :
          reply({ status: "released" }, 502);
      }) as typeof fetch });
  }
  return { make, jobs, recovery, raw: () => raw, setRaw: (value: string) => { raw = value; },
    fail: (value: boolean) => { fail = value; }, user: (value: string) => { user = value; },
    answer: (value: typeof answer) => { answer = value; } };
}
test("reload restores exact owner-bound unknown work, never token/session or automatic network", async () => {
  const h = recoveryHarness(), first = h.make();
  await first.signIn("a", "fixture-password");
  await assert.rejects(first.send("private prompt"), /job_needs_reconciliation/);
  const original = h.raw();
  assert.ok(original?.includes("private prompt"));
  for (const secret of ["fixture.token", "fixture-password", "never-retained"]) assert.ok(!original?.includes(secret));
  const reloaded = h.make();
  assert.equal(h.jobs.length, 1); assert.equal(reloaded.pendingJob(), undefined);
  await assert.rejects(reloaded.reconcile(), /sign_in_required/);
  await reloaded.signIn("a", "b");
  assert.ok(Object.isFrozen(reloaded.pendingJob()));
  await assert.rejects(reloaded.send("different"), /pending_job_exists/);
  h.answer("completed");
  assert.deepEqual(await reloaded.reconcile(), { status: "completed", text: "recovered" });
  assert.equal(h.jobs[0], h.jobs[1]);
  assert.equal(JSON.parse(h.raw()!).pending, null);
  const finished = h.make(); await finished.signIn("a", "b");
  assert.equal(finished.pendingJob(), undefined);
});
test("restored work stays hidden and cannot be replayed/replaced by a different account", async () => {
  const h = recoveryHarness(), first = h.make(); await first.signIn("a", "b");
  await assert.rejects(first.send("private"));
  h.user(userB); const other = h.make(); await other.signIn("c", "d");
  assert.equal(other.pendingJob(), undefined);
  await assert.rejects(other.reconcile(), /pending_owner_required/);
  await assert.rejects(other.send("new"), /pending_job_exists/);
  assert.equal(h.jobs.length, 1);
});
test("unwritable recovery blocks network; retry after storage recovery uses original key", async () => {
  const h = recoveryHarness(), client = h.make(); await client.signIn("a", "b");
  h.fail(true); await assert.rejects(client.send("private"), /recovery_unavailable/);
  assert.equal(h.jobs.length, 0); const job = client.pendingJob();
  h.fail(false); h.answer("released");
  assert.deepEqual(await client.reconcile(), { status: "released" });
  assert.deepEqual(JSON.parse(h.jobs[0]), job); assert.equal(JSON.parse(h.raw()!).pending, null);
});
test("malformed, foreign-issuer, oversized or extra-field journals fail closed rather than discard unknown work", async () => {
  const h = recoveryHarness(), client = h.make(); await client.signIn("a", "b");
  await assert.rejects(client.send("private")); const valid = h.raw()!;
  for (const raw of ["bad", "null", "x".repeat(32769), valid.replace("auth.example", "foreign.example"),
    valid.replace('"expectedCredits":5', '"expectedCredits":1'),
    valid.replace('"prompt":"private"', '"prompt":"private","access_token":"secret"'),
    valid.replace(userA, "not-a-user"), valid.replace('"version":1', '"version":2')]) {
    h.setRaw(raw); assert.throws(h.make, /recovery_unavailable/); assert.equal(h.jobs.length, 1);
  }
  h.setRaw(valid); h.fail(true); assert.throws(h.make, /recovery_unavailable/);
});
test("unconfirmed durable clear keeps pending work and exact reconciliation after a completed reply", async () => {
  let raw: string | null = null, writes = 0, calls = 0;
  const client = createAlphaClient({ issuer: "https://auth.example", anonKey: "public",
    recovery: { read: () => raw, write: value => { if (++writes === 2) throw new Error("disk"); raw = value; } },
    fetcher: (async url => String(url).includes("/auth/") ? login() :
      (++calls, reply({ status: "completed", result: { text: "settled" } }))) as typeof fetch });
  await client.signIn("a", "b"); await assert.rejects(client.send("hello"), /recovery_unavailable/);
  const key = client.pendingJob()?.key; assert.ok(key); assert.equal(JSON.parse(raw!).pending.job.key, key);
  assert.deepEqual(await client.reconcile(), { status: "completed", text: "settled" });
  assert.equal(calls, 2); assert.equal(client.pendingJob(), undefined);
});
test("silent write loss is detected before execution; invalid recovery IDs never reach network", async () => {
  let calls = 0;
  for (const randomId of [() => "invalid", () => crypto.randomUUID()]) {
    const client = createAlphaClient({ issuer: "https://auth.example", anonKey: "public", randomId,
      recovery: { read: () => null, write: () => {} }, fetcher: (async () => { calls++; return login(); }) as typeof fetch });
    await client.signIn("a", "b"); await assert.rejects(client.send("hello"), /invalid_job_id|recovery_unavailable/);
  }
  assert.equal(calls, 2);
});

test("tab adapter namespaces apps and recreates the same journal without deleting pending input", () => {
  const entries = new Map<string, string>();
  const storage = { getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); } };
  const first = createTabRecoveryStore(storage, "public-chat"); first.write("exact pending record");
  assert.equal(createTabRecoveryStore(storage, "public-chat").read(), "exact pending record");
  assert.equal(createTabRecoveryStore(storage, "other-app").read(), null);
  assert.deepEqual([...entries.keys()], ["meterkit:pending-job:v1:public-chat"]);
  for (const scope of ["", "../other", "x".repeat(129)])
    assert.throws(() => createTabRecoveryStore(storage, scope), /invalid_recovery_scope/);
});
