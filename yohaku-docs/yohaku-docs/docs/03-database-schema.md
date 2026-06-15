# 03 — データベース設計

canonical な定義は `supabase/migrations/0001_init.sql`。このドキュメントは設計意図と要点の解説。

## テーブル一覧

| テーブル | 役割 | 書き込み主体 |
|---|---|---|
| `products` | 商品（限定ポスター 1 種 = 1 行） | 管理者（RLS） |
| `orders` | 注文 | サーバー（service role）のみ |
| `order_items` | 注文明細 | サーバー（service role）のみ |
| `admin_users` | 管理者（auth ユーザーへの参照） | サーバー / 手動 |

## products

```
id, slug(unique), title,
description_ja, description_en,
price_cents, currency,
edition_size,          -- 限定枚数（上限）
sold_count,            -- 売れた枚数
image_path,            -- 'posters' バケット内のパス
status,                -- draft | active | archived
sort_order, created_at, updated_at
```

設計のポイント:

- **残数はカラムを持たず計算で出す。** `remaining = edition_size - sold_count`。冗長な在庫カラムを二重管理しない。
- **制約 `sold_count <= edition_size`** を CHECK で張り、DB レベルでもオーバーセルを拒否する。
- **タイトルは作品名 1 本**（例: `余白 — Morning Sun`）。日英で同じ作品名なので分けない。説明文が要るときだけ `description_ja` / `description_en` を使う。
- **status の 3 状態**で「公開可否」と「販売可否」を表現する:
  - `draft` … 非公開（作りかけ）。ストアに出さない。
  - `active` … 販売中。ストアに出る。買える。
  - `archived` … 売り切れ or 手動停止。ストアに出るが買えない（グレー表示）。
- ストアの一覧クエリは `status in ('active','archived')`、購入可否は `status = 'active' and remaining > 0` で判定。

## 自動アーカイブ（トリガー）

`sold_count` が更新され `edition_size` に達したら、トリガー `auto_archive_when_sold_out` が `status` を `archived` に切り替える。アプリ側でアーカイブ化を書き忘れても DB が保証する。

## orders / order_items

- 注文は **必ずサーバー（service role）が作る**。RLS で anon/authenticated の書き込みは無い（読み取りは管理者のみ）。
- `order_items` は購入時点の **価格とタイトルをスナップショット**（`unit_price_cents`, `title_snapshot`）。後で商品の値段や名前を変えても過去の注文は変わらない。
- `orders.stripe_payment_intent_id` は unique。webhook の重複配信に対する冪等性キーとして使う（同じ PI を二度処理しない）。

## 在庫コミット関数 `commit_order_stock(order_id)`

在庫を減らす唯一の場所。webhook から service role で呼ぶ。

- 注文明細をループし、各商品を
  `update products set sold_count = sold_count + qty where id = ? and sold_count + qty <= edition_size`
  で原子的に増やす。
- 1 件でも `row_count = 0`（在庫不足）なら **例外 `insufficient_stock`** を投げ、関数全体（= 1 トランザクション）がロールバック。
- 全件成功なら `orders.status = 'paid'` に更新。
- security definer + `search_path = public` 固定で安全に。

> なぜ原子的か: PostgreSQL の READ COMMITTED では、同じ行を同時に更新しようとした 2 つ目のトランザクションは 1 つ目のコミットを待ち、待機解除後に **最新の `sold_count` で WHERE を再評価** する。よって上限超過の UPDATE は対象 0 行になり、オーバーセルしない。

## RLS（要点）

- `products`: 公開読み取りは `active`/`archived` のみ。管理者は全件読み書き。
- `orders` / `order_items`: 管理者のみ読み取り。書き込みポリシー無し（= service role 専用）。
- `admin_users`: 管理者のみ読み取り。
- `is_admin()` ヘルパで「`admin_users` に自分の `auth.uid()` があるか」を判定。

## マイグレーション後の初期作業

1. Supabase の Authentication > Users で自分のユーザーを作成。
2. `insert into public.admin_users (user_id) values ('<自分のuuid>');`
3. Storage バケット `posters` を作成（`04-supabase-setup.md`）。
4. 必要なら `supabase/seed.sql` で初期商品を投入。

## 将来の拡張余地（今は作らない）

- 多言語タイトルが本当に必要になったら `title_ja` / `title_en` を足す（現状は作品名 1 本で運用）。
- エディション番号を 1 枚ずつ管理したくなったら `order_items` に `edition_number` を足し、採番ロジックを `commit_order_stock` に追加。
- 割引・クーポンは別テーブルで後付け可能。
