-- When each account was last in the app, and on what (the dashboard's People
-- and each member's page); who invited whom and which /go/<channel> link an
-- account came through (Tapp, off until its keys are set). All written only by
-- the server. Harmless when unused.

alter table accounts add column if not exists last_seen_at timestamptz;
alter table accounts add column if not exists last_platform text;
alter table accounts add column if not exists last_app_version text;

-- A member's invite: an opaque code and the Tapp link made for it, once.
alter table accounts add column if not exists invite_code text;
alter table accounts add column if not exists invite_link text;
create unique index if not exists accounts_invite_code_idx on accounts (invite_code);
-- Who invited this account (once, within 14 days of sign-up), and the channel it came through.
alter table accounts add column if not exists invited_by text references accounts (id) on delete set null;
alter table accounts add column if not exists came_from text;
create index if not exists accounts_invited_by_idx on accounts (invited_by);

-- One Tapp link per /go/<channel>, made on its first click.
create table if not exists tapp_links (
  channel text primary key,
  link text not null,
  created_at timestamptz not null default now()
);
alter table tapp_links enable row level security;
