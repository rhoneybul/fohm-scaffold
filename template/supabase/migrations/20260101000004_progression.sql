-- The progression skeleton (kind 'coaching'): where a member is, the skills
-- they've got, how practice went, and clips for the coach to look at.
alter table accounts add column if not exists level text;
alter table accounts add column if not exists assessment jsonb;
alter table accounts add column if not exists goal text;
alter table accounts add column if not exists assessed_at timestamptz;

alter table entries add column if not exists link text;

create table if not exists checkins (
  id text primary key,
  member_id text not null references accounts (id) on delete cascade,
  date date not null,
  skill_id text,
  minutes integer check (minutes is null or (minutes > 0 and minutes <= 1440)),
  feel integer check (feel is null or feel between 1 and 3),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists checkins_member_idx on checkins (member_id, date desc);
alter table checkins enable row level security;

create table if not exists progress (
  id text primary key,
  member_id text not null references accounts (id) on delete cascade,
  skill_id text not null,
  done_at timestamptz not null default now(),
  owner_note text,
  created_at timestamptz not null default now()
);
create unique index if not exists progress_member_skill_idx on progress (member_id, skill_id);
alter table progress enable row level security;
