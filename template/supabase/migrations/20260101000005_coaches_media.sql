-- Multiple coaches, and video (or photo, or audio) on messages.
--
-- Coaches: an account can be a 'coach' (made with COACH_CODE). The owner
-- assigns each member to a coach (accounts.coach_id); a coach sees only their
-- own members. With no coaches, nothing changes: the owner sees everyone.
--
-- Media: files go to the private Storage bucket 'member-media', each in the
-- uploader's own folder (<auth user id>/...), and play through short-lived
-- signed links. Who may read a file is decided here, in the database, so a
-- leaked path is useless: its uploader, the owner, and, for a file attached
-- to a message, the member it belongs to and their coach.

alter table accounts drop constraint if exists accounts_role_check;
alter table accounts add constraint accounts_role_check check (role in ('member', 'coach', 'owner'));
alter table accounts add column if not exists coach_id text references accounts (id) on delete set null;
create index if not exists accounts_coach_idx on accounts (coach_id);

alter table entries add column if not exists media_path text;
alter table entries add column if not exists media_type text;
alter table entries add column if not exists reply_media_path text;
alter table entries add column if not exists reply_media_type text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('member-media', 'member-media', false, 52428800, array['video/*', 'image/*', 'audio/*'])
on conflict (id) do nothing;

-- Anyone with an account may upload, into their own folder only.
create or replace function public.fohm_has_account() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.accounts a where a.auth_user_id = auth.uid());
$$;

create or replace function public.fohm_can_read_media(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select split_part(object_name, '/', 1) = auth.uid()::text
    or exists (
      select 1 from public.accounts me
      where me.auth_user_id = auth.uid()
        and (
          me.role = 'owner'
          or exists (
            select 1 from public.entries e join public.accounts m on m.id = e.member_id
            where (e.media_path = object_name or e.reply_media_path = object_name)
              and (m.id = me.id or m.coach_id = me.id)
          )
        )
    );
$$;

revoke all on function public.fohm_has_account() from public, anon;
revoke all on function public.fohm_can_read_media(text) from public, anon;
grant execute on function public.fohm_has_account() to authenticated;
grant execute on function public.fohm_can_read_media(text) to authenticated;

drop policy if exists "fohm media upload" on storage.objects;
create policy "fohm media upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'member-media' and split_part(name, '/', 1) = auth.uid()::text and public.fohm_has_account());

drop policy if exists "fohm media read" on storage.objects;
create policy "fohm media read" on storage.objects for select to authenticated
  using (bucket_id = 'member-media' and public.fohm_can_read_media(name));

drop policy if exists "fohm media delete" on storage.objects;
create policy "fohm media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'member-media' and split_part(name, '/', 1) = auth.uid()::text);
