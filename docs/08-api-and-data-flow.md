# 08 — API ルートの契約

サーバーの route handler は 2 本だけ（商品 CRUD・注文取得は Supabase クライアント + RLS で直接行う）。

## `POST /api/create-payment-intent`

注文を下書き作成し、Stripe の PaymentIntent を返す。

**Request**
```json
{
  "items": [{ "product_id": "uuid", "quantity": 2 }],
  "email": "you@example.com",
  "locale": "ja"
}
```

**処理**
1. zod で検証（items 1件以上、quantity>=1、email 形式、locale in ja|en）。
2. service クライアントで products 取得。各 item:
   - `status === 'active'` && `edition_size - sold_count >= quantity`。
   - 満たさなければ `409 { error: 'unavailable', product_id }`。
3. `total = Σ(price_cents*quantity) + SHIPPING`（サーバー価格で計算）。
4. orders(pending) + order_items を作成（価格・タイトルをスナップショット）。
5. Stripe PaymentIntent 作成（`metadata.order_id` を付与）。orders に `stripe_payment_intent_id` と `amount_total_cents` を保存。

**Response**
```json
{ "clientSecret": "pi_..._secret_...", "orderId": "uuid", "amount": 10400 }
```

**Errors**: `400`(検証), `409`(在庫/非公開), `500`。

## `POST /api/stripe/webhook`

Stripe からの通知を受け、在庫を確定する唯一の経路。

- `runtime = 'nodejs'`、**raw body** で署名検証（`stripe.webhooks.constructEvent`）。
- `payment_intent.succeeded`:
  - order を特定。既に `paid` なら no-op（冪等）。
  - `rpc('commit_order_stock', { p_order_id })`。
    - 成功 → done（trigger が売り切れを archived 化）。
    - `insufficient_stock` → `stripe.refunds.create({ payment_intent })` + orders `canceled`。
- `payment_intent.payment_failed`: orders `canceled`。
- 正常終了で `200`。署名検証失敗は `400`。

**冪等性**: order の現在 status と `stripe_payment_intent_id` unique 制約で二重処理を防ぐ。

## 商品・注文の取得（route 不要）

- ストア: サーバーコンポーネントから anon/サーバークライアントで
  `select * from products where status in ('active','archived') order by sort_order`。
- 管理: ログイン済みクライアントで RLS 越しに products 全件 / orders を取得。
- これらは API ルートを作らず Supabase クライアント直叩きでよい（RLS が守る）。

## バリデーション方針

- 入力は必ず zod でスキーマ検証してから使う。
- 金額・在庫の判断は **常にサーバー側の値** を使う。クライアントから来た金額や残数は表示用にすぎない。
