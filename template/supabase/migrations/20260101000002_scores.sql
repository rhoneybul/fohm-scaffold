-- Scores from the game (apps made with --kind game play it; the table is harmless otherwise).
create table if not exists scores (
  id text primary key,
  member_id text not null references accounts (id) on delete cascade,
  game text not null,
  points integer not null check (points >= 0 and points <= 100000),
  seconds integer not null check (seconds > 0 and seconds <= 3600),
  created_at timestamptz not null default now()
);
create index if not exists scores_member_idx on scores (member_id, created_at desc);
alter table scores enable row level security;
