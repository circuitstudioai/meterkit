import assert from "node:assert/strict";
import { test } from "node:test";
import { chatUiConfig } from "./ui-config";
const enabled = { METERKIT_CHAT_UI_ENABLED: "true", METERKIT_CHAT_ENABLED: "true",
  METERKIT_CHAT_SANDBOX_POLICY_APPROVED: "true", METERKIT_CHAT_DATA_APPROVED: "true",
  DATABASE_URL: "postgres://fixture", METERKIT_CHAT_APP_ID: "fixture-chat",
  METERKIT_CHAT_ORIGIN: "http://127.0.0.1:43129", METERKIT_CHAT_SUPABASE_URL: "https://auth.example",
  METERKIT_CHAT_SUPABASE_ANON_KEY: "public-anon", PAYPAL_CLIENT_SECRET: "must-not-cross-boundary",
  GEMINI_API_KEY: "must-not-cross-boundary" };
test("UI is disabled by default and every independent approval remains required", () => {
  assert.equal(chatUiConfig({}), null);
  for (const key of ["METERKIT_CHAT_UI_ENABLED", "METERKIT_CHAT_ENABLED", "METERKIT_CHAT_SANDBOX_POLICY_APPROVED",
    "METERKIT_CHAT_DATA_APPROVED", "DATABASE_URL", "METERKIT_CHAT_APP_ID", "METERKIT_CHAT_SUPABASE_URL",
    "METERKIT_CHAT_SUPABASE_ANON_KEY", "METERKIT_CHAT_ORIGIN"]) {
    assert.equal(chatUiConfig({ ...enabled, [key]: undefined }), null, key);
  }
});
test("public config is an exact allowlist, never a spread of server credentials", () => {
  assert.deepEqual(chatUiConfig(enabled), { issuer: "https://auth.example", anonKey: "public-anon",
    appId: "fixture-chat", origin: "http://127.0.0.1:43129" });
});
test("invalid auth, origin and recovery scope refuse UI rather than offer unprotected actions", () => {
  for (const issuer of ["http://auth.example", "https://user:password@auth.example", "https://auth.example/path", "https://auth.example?query", "https://auth.example:444"])
    assert.equal(chatUiConfig({ ...enabled, METERKIT_CHAT_SUPABASE_URL: issuer }), null);
  for (const origin of ["*", "https://chat.example/", "https://chat.example/path", "http://public.example", "null"])
    assert.equal(chatUiConfig({ ...enabled, METERKIT_CHAT_ORIGIN: origin }), null);
  assert.equal(chatUiConfig({ ...enabled, METERKIT_CHAT_APP_ID: "bad:scope" }), null);
});
