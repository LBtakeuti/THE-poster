# 通貨を円(JPY)に統一する（表示＝請求を一貫させる）

竹内さんの決定: 金額の表示と請求を **円(JPY)に統一**。前回入れた「表示だけ円換算（moneyLocalized）」はやめる。
JPY はゼロ小数通貨（最小単位＝円。100で割らない）。決済APIは既に `amount: totalCents`＝円そのままで正しく動くため **API本体は変更不要**。

## 受け入れ条件
- ストア `/` の金額が ¥ 表示（日本語/英語どちらでも ¥）。$ は出ない。
- チェックアウトの合計・支払いボタン（鍵未設定の無効ボタン含む）が ¥ 表示。英語ロケールでも $ にならない。
- 管理の新規/編集で保存される商品が currency=jpy、価格は「円」で入力（×100しない）。
- 型チェック0・lint0。`npm run build` は実行しない（開発サーバー稼働中・.next を壊すため）。

## 変更内容

### 1) lib/checkout/shipping.ts
- `CHECKOUT_CURRENCY = "usd"` → `"jpy"`。
- `SHIPPING_CENTS = 800` はそのまま（¥800 送料として扱う）。

### 2) lib/sample-products.ts
- `mk(...)` 内の `currency: "usd"` → `"jpy"`。
- 価格の数値（4800 等）はそのまま（円として扱う＝¥4,800）。

### 3) components/store/StoreGrid.tsx
- import を `moneyLocalized` → `money`（`@/lib/format`）。
- 使用箇所 `moneyLocalized(p.price_cents, p.currency, locale)` → `money(p.price_cents, locale, p.currency)`。

### 4) lib/format.ts
- `moneyLocalized` と、その専用ヘルパ `DISPLAY_RATE_TO_USD` / `toMajorUnit` / `ZERO_DECIMAL_CURRENCIES` を削除。
- `money()` 本体と `CURRENCY_BY_LOCALE` は残す。

### 5) lib/__tests__/format.test.cjs
- 削除（`git rm`）。このファイルは削除する moneyLocalized 専用のテストのため。

### 6) components/checkout/CheckoutForm.tsx（無効ボタンの通貨を商品通貨に）
- 呼び出し `<DisabledPaymentSection total={total} />` を `<DisabledPaymentSection total={total} currency={product.currency} />` に。
- `function DisabledPaymentSection({ total }: { total: number })` を
  `function DisabledPaymentSection({ total, currency }: { total: number; currency: string })` に。
- 無効ボタンの `t.pay(money(total, locale))` を `t.pay(money(total, locale, currency))` に。

### 7) app/admin/(dashboard)/products/actions.ts
- `parseProductForm` の `priceCents: Math.round(Number(priceDollars) * 100)` を
  `priceCents: Math.round(Number(priceDollars))` に（円は整数そのまま。×100しない）。コメントも「保存は円(cents=円)」に更新。
- `createProductAction` の products.insert に `currency: "jpy",` を追加。
- `updateProductAction`（編集）の products.update（price_cents を含む箇所）にも `currency: "jpy",` を追加。

### 8) app/admin/(dashboard)/products/ProductForm.tsx
- ラベル `価格（ドル）` → `価格（円）`。
- 価格 input の `defaultValue={product ? (product.price_cents / 100).toString() : ""}` を
  `defaultValue={product ? product.price_cents.toString() : ""}` に。
- 価格 input が `step="0.01"` 等になっていれば `step="1"`、`min="0"` に（円は整数）。

### 9) supabase/migrations/0001_init.sql
- products と orders（または該当テーブル）の `currency text not null default 'usd'` を 2 箇所とも `default 'jpy'` に。

### 10) supabase/seed.sql
- 8 行の `'usd'` を全て `'jpy'` に。価格はそのまま。

## コミット（論理単位・日本語・prefix必須）
1. `feat: 通貨を円(JPY)に統一（サンプル/seed/migration/送料デフォルト）` … 1,2,9,10
2. `feat: 管理の商品価格を円入力に（×100廃止・currency=jpy保存）` … 7,8
3. `refactor: 表示専用の円換算(moneyLocalized)を廃止し金額表示を商品通貨に統一` … 3,4,5,6

完了後 `git push`（origin main）。各コミットのハッシュと push 結果を報告すること。
