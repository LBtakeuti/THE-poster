# 05 — Stripe 連携（決済 + 在庫減算）

決済方式は **Payment Element + PaymentIntent**（Checkout ではなく自前のチェックアウトページ）。在庫整合性の中心はここ。

## 概要

```
クライアント                    サーバー                         Stripe
  │  POST /api/create-payment-intent
  ├──────────────────────────────►
  │                          注文(pending)+明細を作成
  │                          PaymentIntent 作成 ──────────────►
  │  ◄── clientSecret ───────────┤
  │  Payment Element で確定 ───────────────────────────────────►
  │                                          payment_intent.succeeded
  │                          ◄── webhook ──────────────────────┤
  │                          commit_order_stock()
  │                            成功→paid / 失敗→refund+canceled
  │  return_url（完了ページ）へ
```

## 1. PaymentIntent 作成: `POST /api/create-payment-intent`

サーバー（route handler）でやること:

1. 入力 `{ items: [{ product_id, quantity }], email, locale }` を zod で検証。
2. service クライアントで対象 products を取得。各 item について:
   - `status === 'active'` か
   - `edition_size - sold_count >= quantity` か（UX 用の事前チェック）
   を確認。ダメなら 409 を返す。
3. 金額を **サーバー側の価格で** 計算（`price_cents * quantity` の合計 + 送料）。クライアントの金額は信用しない。
4. `orders`(status `pending`) と `order_items`(価格・タイトルをスナップショット) を作成。
5. Stripe PaymentIntent を作成:
   ```ts
   const pi = await stripe.paymentIntents.create({
     amount: totalCents,
     currency: 'usd',
     automatic_payment_methods: { enabled: true },
     receipt_email: email,
     metadata: { order_id: order.id },
   });
   await serviceDb.from('orders')
     .update({ stripe_payment_intent_id: pi.id, amount_total_cents: totalCents })
     .eq('id', order.id);
   ```
6. `{ clientSecret: pi.client_secret }` を返す。

## 2. クライアント側の確定

```ts
const stripe = await loadStripe(NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
const elements = stripe.elements({ clientSecret });   // or deferred mode
// <PaymentElement /> を表示
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: { return_url: `${SITE_URL}/checkout/complete` },
});
```

> 試作 (`reference/`) では deferred mode（clientSecret 無しで Element だけ表示）にしてある。本番ではサーバーで PaymentIntent を作って `clientSecret` を渡し、`confirmPayment` で確定する。`@stripe/react-stripe-js` の `<Elements>` / `<PaymentElement>` を使う。

## 3. Webhook: `POST /api/stripe/webhook`

**最重要。** Next.js (App Router) では生のボディが必要。

```ts
export const runtime = 'nodejs';            // edge ではなく node
// route handler 内で:
const body = await req.text();              // raw body
const sig = req.headers.get('stripe-signature')!;
const event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
```

イベント別処理:

- `payment_intent.succeeded`:
  1. `order_id = event.data.object.metadata.order_id`。
  2. 冪等性: その order が既に `paid` なら何もしない（重複配信対策。`stripe_payment_intent_id` の unique も保険）。
  3. `await serviceDb.rpc('commit_order_stock', { p_order_id: order_id })`。
     - **成功** → 完了（trigger が売り切れ商品を archived 化）。
     - **失敗（`insufficient_stock`）** → 在庫が無かった稀ケース。
       ```ts
       await stripe.refunds.create({ payment_intent: pi.id });
       await serviceDb.from('orders').update({ status: 'canceled' }).eq('id', order_id);
       ```
- `payment_intent.payment_failed`:
  - `orders.status = 'canceled'`（在庫は触っていないので戻す処理は不要）。

常に 200 を返す（例外時は 4xx/5xx を返すと Stripe が再送する。返金処理まで終えたら 200）。

## 4. ローカルテスト

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# 別ターミナルでテスト購入。あるいは:
stripe trigger payment_intent.succeeded
```

`stripe listen` が表示する `whsec_...` を開発時の `STRIPE_WEBHOOK_SECRET` に使う。本番は Stripe ダッシュボードで本番エンドポイント（`https://<本番ドメイン>/api/stripe/webhook`）を登録し、その署名シークレットを Vercel の環境変数に入れる。

## 5. テストカード

- 成功: `4242 4242 4242 4242`（任意の将来日付 / 任意 CVC / 任意郵便）
- 要 3DS: `4000 0027 6000 3184`
- 失敗: `4000 0000 0000 9995`

## 注記: より厳密にしたい場合（任意）

「決済成功 → まれに返金」を避けたいなら、PaymentIntent 作成時に在庫を一時的に確保（reserve）し、放棄/期限切れで戻す方式にできる。実装が重くなるため初版は採用しない。限定アートの低同時性では webhook + 返金フォールバックで十分。
