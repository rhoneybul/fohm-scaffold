-- A member's profile photo: a small square JPEG in their own folder of the
-- private member-media bucket (uploaded by the app, cut square and scaled on
-- the device), kept here as its path and played through a signed link. Shown on
-- their avatar, and to the owner and their coach on the dashboard.
--
-- Re-runnable: the column only if it's missing, the read rule replaced whole.

alter table accounts add column if not exists photo_path text;

-- Who may play a file: its uploader, the owner, a message's member and their
-- coach (as before), and now a member's coach for their profile photo.
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
          or exists (
            select 1 from public.accounts m
            where m.photo_path = object_name and m.coach_id = me.id
          )
        )
    );
$$;

revoke all on function public.fohm_can_read_media(text) from public, anon;
grant execute on function public.fohm_can_read_media(text) to authenticated;
