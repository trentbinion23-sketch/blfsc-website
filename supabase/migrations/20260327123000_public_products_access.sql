begin;

update public.products
set image_url = '/images/' || regexp_replace(image_url, '^/+', '')
where image_url is not null
  and btrim(image_url) <> ''
  and image_url ~* '^/[^/]+\.(avif|gif|jpe?g|png|svg|webp)$'
  and image_url not like '/images/%';

update public.products
set image = '/images/' || regexp_replace(image, '^/+', '')
where image is not null
  and btrim(image) <> ''
  and image ~* '^/[^/]+\.(avif|gif|jpe?g|png|svg|webp)$'
  and image not like '/images/%';

drop policy if exists "products_select_live_or_admin" on public.products;
drop policy if exists "products_select_live_public" on public.products;
drop policy if exists "products_select_admin_all" on public.products;

create policy "products_select_live_public"
on public.products
for select
to anon, authenticated
using (coalesce(active, true) = true);

create policy "products_select_admin_all"
on public.products
for select
to authenticated
using (public.is_member_admin());

commit;
