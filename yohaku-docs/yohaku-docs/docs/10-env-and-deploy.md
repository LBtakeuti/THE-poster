# 10 — 環境変数 / デプロイ / 独自ドメイン

## 環境変数

| 変数 | 用途 | 公開可否 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 公開 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | 公開 |
| `SUPABASE_SERVICE_ROLE_KEY` | service role（注文作成 / webhook） | **サーバー専用** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 公開鍵 | 公開 |
| `STRIPE_SECRET_KEY` | Stripe 秘密鍵 | **サーバー専用** |
| `STRIPE_WEBHOOK_SECRET` | webhook 署名シークレット | **サーバー専用** |
| `NEXT_PUBLIC_SITE_URL` | 本番 URL（return_url 等に使用） | 公開 |

- `NEXT_PUBLIC_` が付くものだけブラウザに出る。秘密鍵には付けない。
- `.env.local` をローカル用に。Vercel ではダッシュボードの Environment Variables に同じものを設定（Production / Preview を分ける）。
- 開発中は Stripe を **テストモード**（`pk_test_` / `sk_test_`）で。本番公開時に本番キーへ差し替え。

## Vercel デプロイ

1. GitHub にリポジトリを push。
2. Vercel で Import。Framework は Next.js が自動検出される。
3. 上記の環境変数を設定（Production）。
4. デプロイ。`https://<project>.vercel.app` で動作確認。
5. Stripe ダッシュボード（本番）で Webhook エンドポイントを追加:
   `https://<本番ドメイン>/api/stripe/webhook`、イベントは `payment_intent.succeeded` と `payment_intent.payment_failed`。
   発行された署名シークレットを Vercel の `STRIPE_WEBHOOK_SECRET`（Production）に設定。

## 独自ドメイン（お名前.com → Vercel）

1. Vercel: Project > Settings > Domains で取得済みドメイン（例 `example.com`）を追加。
   - Vercel が「設定すべきレコード」を表示する（apex 用の A レコードと `www` 用の CNAME）。**実際の値は Vercel の画面に出るものを使う**（IP やホスト名は変わり得るため、画面表示を正とする）。
2. お名前.com: ドメイン Navi > DNS > DNS レコード設定 で、Vercel が指示したとおりに設定:
   - apex（`@` / 空ホスト）: A レコード → Vercel 指定の IP
   - `www`: CNAME → Vercel 指定のホスト名（`cname.vercel-dns.com` 等）
   - （お名前.com 側で「お名前.com のネームサーバーを使用」になっていることを確認。他社 NS に向いていると上記レコードは効かない。）
3. 反映まで数十分〜数時間。Vercel の Domains 画面が「Valid」になれば完了。SSL は Vercel が自動発行。
4. 確定後、`NEXT_PUBLIC_SITE_URL` を本番ドメインに更新して再デプロイ。Stripe webhook も本番ドメインで登録済みか確認。

> お名前.com 側の画面文言は時期により変わる。上記で詰まったら「お名前.com 独自ドメイン Vercel DNS 設定」で最新手順を確認するとよい。

## 公開前チェックリスト

- [ ] Stripe を本番キーに切り替え、本番 webhook が `paid` まで通る
- [ ] オーバーセル不可（在庫1に同時2購入のテスト → 片方が refund + canceled になる）
- [ ] 在庫 0 で自動アーカイブ、ストアで購入不可表示
- [ ] 管理画面が非 admin から開けない（RLS + 画面ガード）
- [ ] service role / secret がクライアントバンドルに出ていない
- [ ] 日英トグルが全画面で機能、Payment Element のロケールも一致
- [ ] スマホ 2 列 / PC 4 列、3D が崩れない、reduced-motion で動きが止まる
