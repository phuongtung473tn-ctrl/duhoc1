-- Storage for admin-uploaded landing images.
-- Run once after the core Supabase schema migrations.
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "site assets are publicly readable" on storage.objects;
create policy "site assets are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'site-assets');

drop policy if exists "admins can upload site assets" on storage.objects;
create policy "admins can upload site assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'site-assets'
    and (storage.foldername(name))[1] = 'landing'
    and public.is_funnel_admin()
  );

drop policy if exists "admins can update site assets" on storage.objects;
create policy "admins can update site assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'site-assets' and public.is_funnel_admin())
  with check (bucket_id = 'site-assets' and public.is_funnel_admin());

drop policy if exists "admins can delete site assets" on storage.objects;
create policy "admins can delete site assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-assets' and public.is_funnel_admin());
