-- ============================================================
--  Yohaku — initial schema
--  Run in the Supabase SQL editor, or via the Supabase CLI:
--    supabase db push   (after placing this file under supabase/migrations/)
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- helpers
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------------------------------------
-- products
--   one row = one limited-edition poster (single SKU, no variants)
--   remaining stock is DERIVED:  edition_size - sold_count
--   status: draft (hidden) | active (on sale) | archived (sold out or manually retired)
-- ------------------------------------------------------------
create table public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,                 -- artwork name, shown verbatim in both languages
  description_ja text,
  description_en text,
  price_cents   integer not null check (price_cents >= 0),
  currency      text not null default 'usd',
  edition_size  integer not null check (edition_size > 0),   -- the "max 20" cap
  sold_count    integer not null default 0 check (sold_count >= 0),
  image_path    text,                          -- object path inside the 'posters' storage bucket
  status        text not null default 'draft'
                  check (status in ('draft','active','archived')),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint sold_not_over_edition check (sold_count <= edition_size)
);

create index products_status_idx on public.products (status, sort_order);

create trigger products_touch_updated
  before update on public.products
  for each row execute function public.touch_updated_at();

-- auto-archive the moment an edition sells out
create or replace function public.auto_archive_when_sold_out()
returns trigger language plpgsql as $$
begin
  if new.sold_count >= new.edition_size and new.status = 'active' then
    new.status = 'archived';
  end if;
  return new;
end $$;

create trigger products_auto_archive
  before update of sold_count on public.products
  for each row execute function public.auto_archive_when_sold_out();

-- ------------------------------------------------------------
-- orders + order_items
--   written ONLY by the server (service role). Never by the browser.
-- ------------------------------------------------------------
create table public.orders (
  id                       uuid primary key default gen_random_uuid(),
  stripe_payment_intent_id text unique,
  email                    text,
  status                   text not null default 'pending'
                             check (status in ('pending','paid','fulfilled','canceled','refunded')),
  amount_total_cents       integer not null default 0,
  currency                 text not null default 'usd',
  locale                   text not null default 'en' check (locale in ('ja','en')),
  shipping_name            text,
  shipping_address1        text,
  shipping_address2        text,
  shipping_city            text,
  shipping_state           text,
  shipping_postal_code     text,
  shipping_country         text,    -- optional; Stripe also captures billing country in the Payment Element
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger orders_touch_updated
  before update on public.orders
  for each row execute function public.touch_updated_at();

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       uuid not null references public.products(id) on delete restrict,
  quantity         integer not null check (quantity > 0),
  unit_price_cents integer not null,            -- price snapshot at purchase time
  title_snapshot   text not null,               -- title snapshot at purchase time
  created_at       timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

-- ------------------------------------------------------------
-- admin_users
--   membership = admin. Linked to Supabase Auth users.
-- ------------------------------------------------------------
create table public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- ------------------------------------------------------------
-- commit_order_stock(order_id)
--   The ONLY place inventory is decremented. Called from the Stripe
--   webhook (service role) after payment_intent.succeeded.
--   Atomic: if ANY line item lacks stock the whole tx rolls back and
--   the caller refunds the payment.
-- ------------------------------------------------------------
create or replace function public.commit_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item        record;
  affected    integer;
begin
  for item in
    select product_id, quantity from public.order_items where order_id = p_order_id
  loop
    update public.products
       set sold_count = sold_count + item.quantity
     where id = item.product_id
       and sold_count + item.quantity <= edition_size;   -- atomic oversell guard

    get diagnostics affected = row_count;
    if affected = 0 then
      raise exception 'insufficient_stock for product %', item.product_id
        using errcode = 'P0001';
    end if;
  end loop;

  update public.orders set status = 'paid' where id = p_order_id;
end $$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.admin_users enable row level security;

-- products: anyone may read active/archived (the storefront);
--           admins may read everything and write everything.
create policy products_public_read on public.products
  for select to anon, authenticated
  using (status in ('active','archived') or public.is_admin());

create policy products_admin_write on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- orders / order_items: admins may read. No anon/authenticated writes.
-- (the server uses the SERVICE ROLE key, which bypasses RLS, to insert.)
create policy orders_admin_read on public.orders
  for select to authenticated using (public.is_admin());

create policy order_items_admin_read on public.order_items
  for select to authenticated using (public.is_admin());

-- admin_users: only admins can see the list.
create policy admin_users_admin_read on public.admin_users
  for select to authenticated using (public.is_admin());

-- ============================================================
-- After running this:
--   1. Create an auth user (Authentication > Users) for yourself.
--   2. Insert your admin row:
--        insert into public.admin_users (user_id) values ('<your-auth-user-uuid>');
--   3. Create a public storage bucket named 'posters' (see 04-supabase-setup.md).
-- ============================================================
