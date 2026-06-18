-- ============================================================
--  the poster — optional seed data (matches the 8 posters in the prototype)
--  Images are not seeded; upload them later from the admin panel and
--  set image_path. These start as 'active' so the storefront isn't empty.
-- ============================================================

insert into public.products (slug, title, price_cents, currency, edition_size, sold_count, status, sort_order) values
  ('morning-sun',    '余白 — Morning Sun',    4800, 'jpy', 20,  0, 'active', 10),
  ('still-water',    '静寂 — Still Water',    4800, 'jpy', 20,  7, 'active', 20),
  ('first-light',    '朝霧 — First Light',    5200, 'jpy', 12,  8, 'active', 30),
  ('distant-hills',  '遠景 — Distant Hills',  4800, 'jpy', 20,  0, 'active', 40),
  ('afterglow',      '余韻 — Afterglow',      4800, 'jpy', 20, 11, 'active', 50),
  ('ripple',         '漣 — Ripple',           5200, 'jpy', 15, 15, 'active', 60),  -- sold out -> trigger archives it on next update
  ('mountain-shade', '山影 — Mountain Shade', 4800, 'jpy', 20,  0, 'active', 70),
  ('white-night',    '白夜 — White Night',    5400, 'jpy', 10,  4, 'active', 80);

-- 'ripple' is at edition_size already; archive it explicitly to reflect sold-out state:
update public.products set status = 'archived' where slug = 'ripple';
