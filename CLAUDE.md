# CLAUDE.md — the poster

このリポジトリで作業する Claude Code 向けの指示書。`docs/` の仕様に従って実装すること。迷ったらこのファイルの「不変条件」を最優先する。

## プロジェクト概要

限定アートポスターのオンラインストア「the poster」（画面表記: **THE POSTER**）。Next.js (App Router, TS) + Supabase + Stripe + React Three Fiber。フロントはミニマル（白背景・ロゴのみ・回る 3D ポスター）。日英対応。詳細は `docs/` を参照。

## 技術選定（依存）

```
next  react  react-dom  typescript
@supabase/supabase-js  @supabase/ssr
stripe  @stripe/stripe-js  @stripe/react-stripe-js
three  @react-three/fiber  @react-three/drei
tailwindcss  zod
```

最新の安定版を使う。バージョンや API が記憶と違う可能性があるため、Stripe / Supabase / R3F の API は実装前に各公式ドキュメントで確認すること。

## 不変条件（絶対に破らない）

1. **在庫はオーバーセルさせない。** 在庫の減算は **Stripe webhook（`payment_intent.succeeded`）を受けたサーバー側でのみ** 行い、必ず DB 関数 `commit_order_stock()` を通す。フロントやチェックアウト開始時には減算しない。
2. **commit_order_stock が `insufficient_stock` を投げたら、その決済は即返金（refund）し、注文を `canceled` にする。** 二重に最後の 1 枚を買えてしまった稀ケースの保険。
3. **秘密鍵はサーバー専用。** `SUPABASE_SERVICE_ROLE_KEY` と `STRIPE_SECRET_KEY` と `STRIPE_WEBHOOK_SECRET` はクライアントへ絶対に出さない（`NEXT_PUBLIC_` を付けない）。
4. **orders / order_items への書き込みはサービスロールのみ。** ブラウザからは作らない（RLS で禁止済み）。
5. **RLS を無効化しない。** 公開読み取りは products の active/archived のみ。
6. **削除より状態遷移。** 売り切れや販売停止は `status = 'archived'`。レコードは消さない（履歴を残す）。商品の物理削除は管理者の明示操作のみ。
7. **金額は最小単位（cents）の integer で扱う。** 浮動小数で金額計算しない。注文時の価格・タイトルは order_items にスナップショットする。
8. **見た目は試作を正とする。** `reference/poster-store-prototype.html` の白基調・余白・タイポ・3D の質感・操作感を再現する。勝手に装飾を足さない。
9. **ロゴは公式 SVG を使う。** `docs/assets/logo.svg`（THE POSTER ワードマーク）を `public/logo.svg` に置いて参照する。文字を手書きしたり旧ひし形マークを使わない。

## ディレクトリ方針（提案）

```
app/
  (store)/page.tsx            # ストア（グリッド）
  checkout/page.tsx           # チェックアウト
  admin/...                   # 管理画面（要認証）
  api/create-payment-intent/route.ts
  api/stripe/webhook/route.ts
components/
  poster/PosterCanvas.tsx     # 単一 <Canvas> + drei <View>
  poster/PosterCard.tsx       # 1 枚ぶんの回る紙
  checkout/...
  admin/...
lib/
  supabase/{browser,server,service}.ts
  stripe.ts
  i18n/{dictionary.ts,context.tsx}
  format.ts                   # money() など
public/
  logo.svg                    # docs/assets/logo.svg をコピー
```

## 実装の順番（推奨タスク順）

進行管理は `docs/BUILD_PLAN.md` のフェーズに従う。

1. Next.js を scaffold（App Router / TS / Tailwind）。`docs/06` のデザイントークンを Tailwind に落とす。ロゴ `docs/assets/logo.svg` を `public/logo.svg` へ。
2. Supabase プロジェクト作成 → `supabase/migrations/0001_init.sql` 実行 → `posters` バケット作成 → 自分の admin ユーザー登録（`docs/04`）。
3. 環境変数と Supabase クライアント 3 種（browser / server / service）を用意（`docs/10`）。
4. ストアページ：products（active/archived）を取得 → グリッド → R3F の回る 3D ポスター → 日英トグル（`docs/06`,`09`）。画像は Storage から。
5. チェックアウト：入力フォーム + Stripe Payment Element + `POST /api/create-payment-intent`（`docs/05`,`08`）。
6. Webhook：`/api/stripe/webhook` で署名検証 → `commit_order_stock` → 失敗時 refund（`docs/05`）。
7. 管理画面：Supabase Auth ログイン → 商品 CRUD・画像アップロード・公開/アーカイブ・注文/売上（`docs/07`）。
8. Vercel デプロイ + 独自ドメイン + 本番 Stripe webhook（`docs/10`）。

各ステップ完了ごとにローカルで動作確認し、不変条件に反していないか見直すこと。

## コマンド（scaffold 後に追記）

- dev: `npm run dev`
- build: `npm run build`
- Stripe ローカル webhook: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
