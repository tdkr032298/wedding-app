/*
=========================================================
Table Policies
各テーブルのRLS設定
=========================================================
*/

alter table public.guests enable row level security;
alter table public.messages enable row level security;
alter table public.photos enable row level security;
alter table public.missions enable row level security;
alter table public.mission_logs enable row level security;
alter table public.seats enable row level security;
alter table public.tables enable row level security;
alter table public.timeline enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Allow anon read guests" on public.guests;
drop policy if exists "Allow anon update guest login stats" on public.guests;
drop policy if exists "Allow anon insert messages" on public.messages;
drop policy if exists "Allow anon read messages" on public.messages;
drop policy if exists "Allow anon insert photos" on public.photos;
drop policy if exists "Allow anon read photos" on public.photos;
drop policy if exists "Allow anon update photo awards" on public.photos;
drop policy if exists "Allow anon read missions" on public.missions;
drop policy if exists "Allow anon insert mission logs" on public.mission_logs;
drop policy if exists "Allow anon read mission logs" on public.mission_logs;
drop policy if exists "Allow anon read own mission logs" on public.mission_logs;
drop policy if exists "Allow anon update mission log awards" on public.mission_logs;
drop policy if exists "Allow anon read seats" on public.seats;
drop policy if exists "Allow anon read tables" on public.tables;
drop policy if exists "Allow anon read timeline" on public.timeline;
drop policy if exists "Allow anon read profiles" on public.profiles;

create policy "Allow anon read guests"
on public.guests
for select
to anon
using (is_active = true);

create policy "Allow anon update guest login stats"
on public.guests
for update
to anon
using (is_active = true)
with check (is_active = true);

create policy "Allow anon insert messages"
on public.messages
for insert
to anon
with check (
  guest_name is not null
  and message is not null
);

create policy "Allow anon read messages"
on public.messages
for select
to anon
using (true);

create policy "Allow anon insert photos"
on public.photos
for insert
to anon
with check (
  guest_name is not null
  and image_url is not null
  and file_path is not null
);

create policy "Allow anon read photos"
on public.photos
for select
to anon
using (true);

create policy "Allow anon update photo awards"
on public.photos
for update
to anon
using (true)
with check (true);

create policy "Allow anon read missions"
on public.missions
for select
to anon
using (is_active = true);

create policy "Allow anon insert mission logs"
on public.mission_logs
for insert
to anon
with check (
  guest_name is not null
  and mission_id is not null
);

create policy "Allow anon read mission logs"
on public.mission_logs
for select
to anon
using (true);

create policy "Allow anon update mission log awards"
on public.mission_logs
for update
to anon
using (true)
with check (true);

create policy "Allow anon read seats"
on public.seats
for select
to anon
using (true);

create policy "Allow anon read tables"
on public.tables
for select
to anon
using (true);

create policy "Allow anon read timeline"
on public.timeline
for select
to anon
using (is_active = true);

create policy "Allow anon read profiles"
on public.profiles
for select
to anon
using (is_active = true);
