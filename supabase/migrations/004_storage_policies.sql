-- migration 004 — storage policies

-- private bucket for documents
-- max 50 MB per file, legal document MIME types only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lawket-documents',
  'lawket-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]
);

-- users can only access files under their own user_id folder
-- file path convention: {user_id}/{case_id}/{timestamp}_{filename}
create policy "storage_own_folder" on storage.objects
  for all
  using (
    bucket_id = 'lawket-documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
