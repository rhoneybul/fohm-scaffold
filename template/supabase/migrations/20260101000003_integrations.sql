-- Plans and billing (Stripe), the AI assistant's questions and answers (Claude),
-- and devices for push notifications (Expo). Every integration is off until
-- its key is set; these tables are harmless when unused.

alter table accounts add column if not exists plan text not null default 'free';
alter table accounts add column if not exists plan_until timestamptz;
alter table accounts add column if not exists plan_source text;
alter table accounts add column if not exists stripe_customer_id text;
alter table accounts add column if not exists stripe_subscription_id text;
alter table accounts add column if not exists stripe_extra_subscription text;
do $$ begin
  alter table accounts add constraint accounts_plan_check check (plan in ('free', 'pro'));
exception when duplicate_object then null; end $$;

create table if not exists ai_chats (
  id text primary key,
  member_id text not null references accounts (id) on delete cascade,
  question text not null,
  answer text not null,
  model text,
  created_at timestamptz not null default now()
);
create index if not exists ai_chats_member_idx on ai_chats (member_id, created_at desc);
alter table ai_chats enable row level security;

create table if not exists push_tokens (
  id text primary key,
  member_id text not null references accounts (id) on delete cascade,
  token text not null,
  platform text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists push_tokens_token_idx on push_tokens (token);
alter table push_tokens enable row level security;
