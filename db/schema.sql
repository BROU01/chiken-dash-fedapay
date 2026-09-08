-- Chicken Crash — schema. Amounts are stored as integer XOF (no minor unit).
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  phone text not null,
  password_hash text not null,
  first_name text not null,
  last_name text not null,
  birthdate date not null,
  deposit_limit_daily bigint,
  self_excluded_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists wallets (
  user_id uuid primary key references users(id) on delete cascade,
  balance bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal', 'bet', 'payout', 'adjustment')),
  amount bigint not null,
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  provider text,
  provider_ref text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ledger_entries_user_id_idx on ledger_entries (user_id, created_at desc);
create unique index if not exists ledger_entries_provider_ref_idx on ledger_entries (provider, provider_ref) where provider_ref is not null;

create table if not exists rounds (
  id bigserial primary key,
  nonce bigint not null,
  server_seed text not null,
  server_seed_hash text not null,
  crash_point numeric(10, 2) not null,
  status text not null default 'betting' check (status in ('betting', 'live', 'crashed')),
  betting_opens_at timestamptz not null,
  starts_at timestamptz not null,
  crashed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists rounds_status_idx on rounds (status);

create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  round_id bigint not null references rounds(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  stake bigint not null,
  auto_cashout_target numeric(10, 2),
  cashout_multiplier numeric(10, 2),
  payout bigint,
  status text not null default 'placed' check (status in ('placed', 'cashed', 'lost')),
  created_at timestamptz not null default now(),
  unique (round_id, user_id)
);

create index if not exists bets_user_id_idx on bets (user_id, created_at desc);
