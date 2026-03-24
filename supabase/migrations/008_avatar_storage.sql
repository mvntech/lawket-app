-- migration 008: public avatars storage bucket
-- creates a public bucket for user avatar images with size and type restrictions

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB in bytes
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- users can only read/write their own folder ({user_id}/avatar.ext)
create policy "avatars_own_folder"
  on storage.objects
  for all
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- public read access for all avatar images (bucket is public)
create policy "avatars_public_read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');
