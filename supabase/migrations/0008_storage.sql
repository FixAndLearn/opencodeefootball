-- 0008_storage.sql
-- Storage buckets for listings, chat attachments, verification documents, evidence.

insert into storage.buckets (id, name, public)
values
  ('listings', 'listings', true),
  ('chat-attachments', 'chat-attachments', false),
  ('verification-documents', 'verification-documents', false),
  ('dispute-evidence', 'dispute-evidence', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy listings_public_read on storage.objects
  for select using (bucket_id = 'listings');
create policy listings_seller_upload on storage.objects
  for insert with check (bucket_id = 'listings' and auth.role() = 'authenticated');
create policy listings_owner_delete on storage.objects
  for delete using (bucket_id = 'listings' and owner = auth.uid());

create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');
create policy avatars_owner_write on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy chat_attachments_member_read on storage.objects
  for select using (bucket_id = 'chat-attachments' and auth.role() = 'authenticated');
create policy chat_attachments_upload on storage.objects
  for insert with check (bucket_id = 'chat-attachments' and auth.role() = 'authenticated');

create policy verification_self_read on storage.objects
  for select using (
    bucket_id = 'verification-documents'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_moderator())
  );
create policy verification_self_upload on storage.objects
  for insert with check (
    bucket_id = 'verification-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy evidence_party_read on storage.objects
  for select using (
    bucket_id = 'dispute-evidence'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_moderator())
  );
create policy evidence_upload on storage.objects
  for insert with check (
    bucket_id = 'dispute-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
