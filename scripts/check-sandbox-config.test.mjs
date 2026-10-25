import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectSandboxConfig } from './check-sandbox-config.mjs';
const env = { METERKIT_VERIFY_SANDBOX_CONFIG:'true', VERCEL_ENV:'preview', PAYPAL_CLIENT_ID:'fixture-client', PAYPAL_CLIENT_SECRET:'fixture-secret' };
test('no network outside explicit Preview opt-in', async () => {
  for (const e of [{}, {...env, VERCEL_ENV:'production'}, {...env, METERKIT_VERIFY_SANDBOX_CONFIG:'false'}]) {
    assert.equal(await inspectSandboxConfig(e, () => { throw Error('unexpected network'); }), null);
  }
});
test('read-only fixed sandbox metadata and redacted report; no inferred merchant', async () => {
  const paths=[];
  const report=await inspectSandboxConfig(env, async (url, options) => {
    paths.push(url); assert.equal(new URL(url).origin,'https://api-m.sandbox.paypal.com');
    assert.equal(options.redirect,'error'); assert.equal(options.cache,'no-store');
    if(url.endsWith('/token')) return Response.json({access_token:'fixture-token',app_id:'not-a-merchant'});
    assert.equal(options.headers.Authorization,'Bearer fixture-token');
    if(url.endsWith('/webhooks')) return Response.json({webhooks:[{id:'fixture-webhook',url:'https://example.test/api/alpha/paypal/webhook',event_types:[{name:'PAYMENT.CAPTURE.COMPLETED'}]}]});
    return Response.json({error:'fixture-private-body'}, {status:401});
  });
  assert.equal(paths.length,3); assert.equal(report.oauth,'pass'); assert.equal(report.alphaCaptureWebhookCount,1);
  assert.equal(report.identity,401); assert.equal(report.merchantIdentityAvailable,false);
  assert.equal(report.merchantConfigured,false); assert.equal(report.configuredWebhookFound,false);
  assert.doesNotMatch(JSON.stringify(report),/fixture|not-a-merchant/);
});
test('denied OAuth prevents metadata calls', async () => {
  let count=0; const report=await inspectSandboxConfig(env,async()=>{count++;return Response.json({error:'secret'}, {status:401});});
  assert.equal(count,1);assert.equal(report.oauth,'failed');assert.doesNotMatch(JSON.stringify(report),/secret/);
});
test('network errors sanitized; metadata failures independent', async () => {
  const report=await inspectSandboxConfig(env,async url=>{
    if(url.endsWith('/token')) return Response.json({access_token:'fixture-token'});
    throw Error('private-provider-error');
  });
  assert.equal(report.oauth,'pass'); assert.equal(report.webhooks,'unavailable');assert.equal(report.identity,'unavailable');
  assert.doesNotMatch(JSON.stringify(report),/private-provider-error|fixture-token/);
});
test('oversized OAuth metadata stops without exposing body or making further requests', async () => {
  let count=0;const report=await inspectSandboxConfig(env,async()=>{count++;return new Response('x'.repeat(65537));});
  assert.equal(count,1);assert.equal(report.oauth,'unavailable');
});
test('successful identity is not merchant proof without explicit payer ID', async () => {
  const report=await inspectSandboxConfig(env,async url=>Response.json(url.endsWith('/token')?{access_token:'fixture-token'}:url.endsWith('/webhooks')?{webhooks:[]}:{user_id:'not-a-payer-id'}));
  assert.equal(report.identity,200);assert.equal(report.merchantIdentityAvailable,false);
  assert.equal(report.webhookCount,0);assert.equal(report.alphaCaptureWebhookCount,0);
});
