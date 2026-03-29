-- Safer Supabase RLS proposal for the BLFSC portal.
-- Goal: remove recursive policy checks involving public.profiles
-- and keep access rules simple enough for the current frontend.
--
-- Assumptions:
-- - public.profiles has an id column that matches auth.users.id
-- - public.orders has a user_id column that should match auth.uid()
-- - authenticated members should be able to read public.products
--
-- Important:
-- - Review policy names before running this in production.
-- - If your existing policy names differ, update the DROP POLICY lines.
-- - This script intentionally avoids querying public.profiles from any
--   policy expression, which is the usual cause of recursive RLS errors.

begin;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Drop old policies if they exist.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

drop policy if exists "products_read_authenticated" on public.products;

drop policy if exists "orders_select_own" on public.orders;
drop policy if exists "orders_insert_own" on public.orders;
drop policy if exists "orders_update_own" on public.orders;

-- Profiles: only the signed-in user can read and manage their own row.
-- Do not query public.profiles inside these policies.
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Products: simplest safe fix for the current portal.
-- Any signed-in member can read products.
create policy "products_read_authenticated"
on public.products
for select
to authenticated
using (true);

-- Orders: users can only read and write their own orders.
create policy "orders_select_own"
on public.orders
for select
to authenticated
using (user_id = auth.uid());

create policy "orders_insert_own"
on public.orders
for insert
to authenticated
with check (user_id = auth.uid());

create policy "orders_update_own"
on public.orders
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;

-- If you later want "approved members only" access, do not add a policy
-- that queries public.profiles from inside another public.profiles policy.
-- Safer options are:
-- 1. Put an approval flag into auth JWT app_metadata and check auth.jwt()
-- 2. Use a carefully reviewed SECURITY DEFINER helper function
-- 3. Keep products open to authenticated users and enforce approval elsewhere
