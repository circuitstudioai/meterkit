-- Dedicated schema; never alters an application's existing tables.
create schema if not exists meterkit_alpha;
revoke all on schema meterkit_alpha from public;
create table if not exists meterkit_alpha.wallets (
 app_id text not null, workspace_id text not null,
 available integer not null default 0 check (available>=0),
 held integer not null default 0 check (held>=0),
 primary key(app_id,workspace_id)
);
create table if not exists meterkit_alpha.jobs (
 app_id text not null, workspace_id text not null, request_key text not null,
 fingerprint text not null, feature text not null, credits integer not null check(credits>0),
 status text not null check(status in ('reserved','completed','released')),
 result jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(app_id,workspace_id,request_key),
 foreign key(app_id,workspace_id) references meterkit_alpha.wallets
);
create table if not exists meterkit_alpha.orders (
 id text primary key, app_id text not null, workspace_id text not null, pack_id text not null,
 credits integer not null check(credits>0), amount_minor integer not null check(amount_minor>0),
 currency text not null check(currency='USD'), merchant_id text not null,
 order_id text unique, capture_id text unique,
 status text not null default 'created' check(status in ('created','completed')),
 created_at timestamptz not null default now()
);
create table if not exists meterkit_alpha.events (
 event_id text primary key, capture_id text not null, created_at timestamptz not null default now()
);
create table if not exists meterkit_alpha.entries (
 id bigint generated always as identity primary key, app_id text not null, workspace_id text not null,
 kind text not null check(kind in ('credit','reserve','settle','release')),
 reference text not null, available_delta integer not null, held_delta integer not null,
 available_after integer not null check(available_after>=0), held_after integer not null check(held_after>=0),
 created_at timestamptz not null default now(), unique(app_id,workspace_id,kind,reference)
);
create or replace function meterkit_alpha.immutable_entry() returns trigger language plpgsql as $$
begin raise exception 'Journal entries are immutable'; end $$;
drop trigger if exists immutable_entries on meterkit_alpha.entries;
create trigger immutable_entries before update or delete on meterkit_alpha.entries for each row execute function meterkit_alpha.immutable_entry();
revoke all on all tables in schema meterkit_alpha from public;

-- Supabase API roles must never inherit access to the server-only ledger.
revoke all on all functions in schema meterkit_alpha from public;
revoke all on all sequences in schema meterkit_alpha from public;
do $$
declare api_role text;
begin
  foreach api_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname=api_role) then
      execute format('revoke all on schema meterkit_alpha from %I', api_role);
      execute format('revoke all on all tables in schema meterkit_alpha from %I', api_role);
      execute format('revoke all on all functions in schema meterkit_alpha from %I', api_role);
      execute format('revoke all on all sequences in schema meterkit_alpha from %I', api_role);
    end if;
  end loop;
end $$;
