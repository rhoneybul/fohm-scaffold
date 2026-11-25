-- Routes a member plans on the map (docs/ROUTES.md), only while APP.routes and
-- Mapbox are on: the points they tapped, the line between them as Mapbox
-- Directions found it on the roads (thinned to 500 points), which legs stayed
-- straight because no road was found (drawn dashed, never guessed), and its
-- length. Member-owned, read and written only through /api (scoped in
-- api/data.ts); RLS on with no policies, as the other member tables.
-- route_snaps counts each account's asks of /api/route, for its hourly limit;
-- nothing reads it but that. Re-runnable.

create table if not exists routes (
  id text primary key,
  member_id text not null references accounts (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  profile text not null check (profile in ('walking', 'cycling', 'driving')),
  points jsonb not null check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) between 2 and 25),
  track jsonb not null default '[]' check (jsonb_typeof(track) = 'array' and jsonb_array_length(track) <= 500),
  straight_legs jsonb not null default '[]' check (jsonb_typeof(straight_legs) = 'array'),
  distance_m integer not null default 0 check (distance_m >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists routes_member_idx on routes (member_id, updated_at desc);
alter table routes enable row level security;

create table if not exists route_snaps (
  member_id text not null references accounts (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists route_snaps_member_idx on route_snaps (member_id, created_at desc);
alter table route_snaps enable row level security;
