import { test } from "node:test";
import assert from "node:assert/strict";
import { supabaseUserIdentity } from "./user-identity";
const first="22222222-2222-4222-8222-222222222222",second="33333333-3333-4333-8333-333333333333";
const request=(token="first")=>new Request("https://billing.test/api/alpha/balance",{headers:{Authorization:`Bearer ${token}`}});
test("wallet owner comes from the configured Auth server, with independent per-app scope",async()=>{
 const calls:{url:string;auth:string|null}[]=[];
 const fetcher:typeof fetch=async(input,init)=>{
  const auth=new Headers(init?.headers).get("Authorization");calls.push({url:String(input),auth});
  return Response.json({id:auth==="Bearer first"?first:second,email:"not-retained@example.test"});
 };
 const appA=supabaseUserIdentity({url:"https://issuer-a.supabase.co",anonKey:"public-fixture",appId:"chat-a",fetcher});
 const appB=supabaseUserIdentity({url:"https://issuer-b.supabase.co",anonKey:"public-fixture",appId:"chat-b",fetcher});
 assert.deepEqual(await appA.authenticate(request()),{scope:{appId:"chat-a",workspaceId:first},userId:first});
 assert.deepEqual(await appA.authenticate(request("second")),{scope:{appId:"chat-a",workspaceId:second},userId:second});
 assert.deepEqual(await appB.authenticate(request()),{scope:{appId:"chat-b",workspaceId:first},userId:first});
 assert.deepEqual(calls.map(call=>call.url),["https://issuer-a.supabase.co/auth/v1/user","https://issuer-a.supabase.co/auth/v1/user","https://issuer-b.supabase.co/auth/v1/user"]);
});
test("missing credentials and browser wallet overrides fail before any network request",async()=>{
 let calls=0;const adapter=supabaseUserIdentity({url:"https://issuer.supabase.co",anonKey:"fixture",appId:"chat",fetcher:async()=>{calls++;return Response.json({id:first});}});
 await assert.rejects(()=>adapter.authenticate(new Request("https://billing.test")),{code:"unauthorized",status:401});
 await assert.rejects(()=>adapter.authenticate(request(),second),{code:"wallet_scope_denied",status:403});
 assert.equal(calls,0);
});
test("provider refusal, invalid user IDs and failures cannot authenticate or disclose provider text",async()=>{
 for(const [response,code,status] of [[new Response('private fixture token',{status:401}),'unauthorized',401],[Response.json({id:'not-a-user'}),'unauthorized',401],[new Response('private fixture token',{status:503}),'identity_unavailable',503],[new Response('not JSON'),'identity_unavailable',503]] as const){
  const adapter=supabaseUserIdentity({url:"https://issuer.supabase.co",anonKey:"fixture",appId:"chat",fetcher:async()=>response});
  await assert.rejects(()=>adapter.authenticate(request()),{code,status,message:code});
 }
});
test("requests bind to the configured issuer, refuse redirects, disable caching and preserve cancellation",async()=>{
 let calls=0;const adapter=supabaseUserIdentity({url:"https://issuer.supabase.co",anonKey:"fixture",appId:"chat",fetcher:async(input,init)=>{
  calls++;assert.equal(String(input),'https://issuer.supabase.co/auth/v1/user');assert.equal(init?.redirect,'error');assert.equal(init?.cache,'no-store');assert.ok(init?.signal);
  return new Response(null,{status:302,headers:{Location:'https://attacker.test'}});
 }});
 await assert.rejects(()=>adapter.authenticate(request()),{code:'identity_unavailable'});assert.equal(calls,1);
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>adapter.authenticate(new Request('https://billing.test',{headers:{Authorization:'Bearer first'},signal:controller.signal})),{code:'identity_unavailable'});assert.equal(calls,1);
});
test("oversized Auth metadata is rejected rather than retained in a wallet identity",async()=>{
 const adapter=supabaseUserIdentity({url:"https://issuer.supabase.co",anonKey:"fixture",appId:"chat",fetcher:async()=>Response.json({id:first,metadata:'x'.repeat(65536)})});
 await assert.rejects(()=>adapter.authenticate(request()),{code:'identity_unavailable'});
});
test("issuer and app configuration cannot contain insecure URLs, paths or empty identity values",()=>{
 for(const url of ['http://issuer.supabase.co','https://issuer.supabase.co/path','https://u:p@issuer.supabase.co','https://issuer.supabase.co?next=evil'])
  assert.throws(()=>supabaseUserIdentity({url,anonKey:'fixture',appId:'chat'}),{code:'invalid_identity_policy'});
 assert.throws(()=>supabaseUserIdentity({url:'https://issuer.supabase.co',anonKey:'fixture',appId:''}),{code:'invalid_identity_policy'});
});
