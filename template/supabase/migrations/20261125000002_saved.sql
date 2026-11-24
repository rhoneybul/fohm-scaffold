-- Saves: what a member keeps to come back to, one row per member and thing:
-- a goal from the catalogue they train for (with a status once it's on their
-- list, they're going, or it's done), a course, a session they bookmarked.
-- `kind` names the catalogue (the app's own words: 'goal', 'course',
-- 'session'), `item_id` the thing in it (src/lib/saves.ts). Member-owned, read
-- and written only through /api (scoped in api/data.ts); RLS on with no
-- policies, as the other member tables, so nothing reaches it directly.
-- Re-runnable.

create table if not exists saved (
  id text primary key,
  member_id text not null references accounts (id) on delete cascade,
  kind text not null check (kind ~ '^[a-z][a-z0-9-]{0,39}$'),
  item_id text not null check (length(item_id) between 1 and 200),
  -- null (saved), 'list' (on their to-do list), 'going' (booked, or set on it), 'done'.
  status text check (status is null or status in ('list', 'going', 'done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists saved_member_item_idx on saved (member_id, kind, item_id);
create index if not exists saved_member_idx on saved (member_id, created_at desc);
alter table saved enable row level security;
