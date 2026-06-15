# 02 — アーキテクチャ / データの流れ

## 全体構成

```
            ┌──────────────────────────────────────────────┐
  Browser   │  Next.js (App Router) on Vercel              │
  ────────► │   - Store page (R3F posters, i18n)           │
            │   - Checkout page (Stripe Payment Element)   │
            │   - Admin (Supabase Auth protected)          │
            │   - Route handlers (server):                 │
            │       /api/create-payment-intent             │
            │       /api/stripe/webhook                    │
            └───────┬───────────────────────┬──────────────┘
                    │ anon key (RLS)         │ service role key (server only)
                    ▼                        ▼
            ┌──────────────────┐      ┌──────────────────┐
            │   Supabase       │      │     Stripe       │
            │  Postgres + RLS  │◄────►│  PaymentIntent   │
            │  Auth            │      │  Webhook         │
            │  Storage(posters)│      └──────────────────┘
            └──────────────────┘
```

## キーになる設計判断

### 1. 在庫減算は「webhook → DB 関数」だけ

オーバーセルを防ぐため、在庫を減らす場所を 1 か所に固定する。

- チェックアウト開始時や「購入」ボタン押下時には **減算しない**。
- Stripe の `payment_intent.succeeded` を webhook で受けたサーバーだけが、DB 関数 `commit_order_stock()` を呼んで減算する。
- `commit_order_stock()` は `update ... where sold_count + qty <= edition_size` という原子的ガードで増やすため、同時実行でも上限を超えない。
- 万一どれかの商品で在庫が足りなければ関数が例外を投げ、トランザクション全体がロールバック。webhook ハンドラはその決済を **返金（refund）** して注文を `canceled` にする。

詳細は `05-stripe-integration.md`。

### 2. クライアントは anon key、サーバーは service role key

- ブラウザからの DB アクセスは anon key + RLS。読めるのは products の `active` / `archived` のみ。
- orders / order_items の作成や在庫減算はサーバー（service role key、RLS バイパス）でのみ。
- service role key と Stripe secret は **絶対にクライアントへ出さない**。

### 3. 商品画像は Supabase Storage

- バケット `posters`（公開読み取り）。書き込みは管理者のみ（Storage ポリシー）。
- products.image_path にオブジェクトパスを保存し、公開 URL を組み立てて表示。

## 購入フロー（シーケンス）

```
1. ユーザーが「Buy」→ チェックアウト画面へ（数量は残数が上限）
2. クライアント: POST /api/create-payment-intent { items, email, locale }
3. サーバー:
     - products を再取得し status=active かつ 残数>=数量 を検証
     - 金額を計算（cents）
     - orders(pending) と order_items を作成（service role）
     - Stripe PaymentIntent を作成（metadata に order_id）
     - clientSecret を返す
4. クライアント: Payment Element で確定 (stripe.confirmPayment, return_url 付き)
5. Stripe → /api/stripe/webhook へ payment_intent.succeeded
6. サーバー(webhook):
     - 署名検証
     - order_id を特定
     - commit_order_stock(order_id) を呼ぶ
         成功 → orders.status='paid'、売り切れ商品は trigger が archived 化
         失敗(insufficient_stock) → Stripe で refund、orders.status='canceled'
7. ユーザーは return_url（注文完了ページ）へ。完了ページは PaymentIntent の状態を表示。
```

> 補足: ステップ 3 の残数チェックは UX のための事前確認であって、最終的な整合性は必ずステップ 6 の `commit_order_stock` が担保する。
