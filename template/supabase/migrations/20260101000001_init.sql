-- The first schema. Re-runnable (CI runs every migration twice): `if not exists` everywhere.
-- Row Level Security is on with no policies, so the public Supabase keys read nothing:
-- only /api, connecting as the database owner, touches these tables.

create table if not exists accounts (
  id text primary key,
  auth_user_id uuid unique,
  role text not null default 'member' check (role in ('member', 'owner')),
  name text not null,
  email text,
  owner_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table accounts enable row level security;

create table if not exists entries (
  id text primary key,
  member_id text not null references accounts (id) on delete cascade,
  title text not null,
  body text,
  reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists entries_member_idx on entries (member_id, created_at desc);
alter table entries enable row level security;
