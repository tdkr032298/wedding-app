/*
=========================================================
Storage Policies
Supabase Storage: wedding-photos
=========================================================
*/

drop policy if exists "Allow anon upload wedding photos" on storage.objects;
drop policy if exists "Allow anon read wedding photos" on storage.objects;
drop policy if exists "Anyone can upload wedding photos" on storage.objects;
drop policy if exists "Anyone can view wedding photos" on storage.objects;

create policy "Allow anon upload wedding photos"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'wedding-photos'
);

create policy "Allow anon read wedding photos"
on storage.objects
for select
to anon
using (
  bucket_id = 'wedding-photos'
);
