begin;

-- =====================================================================
-- Prepare products table for Phase 2 (public vs member-only separation)
-- and add optional SKU field.
-- =====================================================================

alter table public.products add column if not exists member_only boolean not null default true;
alter table public.products add column if not exists sku text;

commit;
