# 07 — 管理画面仕様

`/admin/*`。Supabase Auth でログイン必須、`is_admin()` を満たすユーザーのみ。デザインはストアと同じミニマル基調でよい。

## 認証

- `/admin/login`: Supabase Auth（メール+パスワード、またはマジックリンク）。
- ログイン後、サーバー側で admin 判定。非 admin はログアウト or 403。
- ミドルウェア or レイアウトで `/admin/*` を保護。

## 画面

### 商品一覧 `/admin/products`
- 全 status（draft / active / archived）を表示。
- 各行: サムネイル、作品名、価格、`sold_count / edition_size`、status バッジ、並び順。
- 操作: 編集へ、複製（任意）、削除（確認ダイアログ）、公開↔非公開トグル、手動アーカイブ。
- 並び替え: ドラッグで `sort_order` を更新（任意。最初は数値入力でも可）。
- 「新規追加」ボタン。

### 商品の追加・編集 `/admin/products/new`, `/admin/products/[id]`
入力項目（**最小セット**）:
- 作品名（title）— 必須
- 画像アップロード（Storage `posters` へ。`image_path` を保存）— 1 枚
- 価格（表示はドル等、保存は `price_cents`）— 必須
- 販売上限（edition_size = 限定枚数）— 必須。**既に売れた数（sold_count）より小さくはできない**バリデーション。
- 説明（description_ja / description_en）— 任意
- 公開状態（draft / active）。「販売開始」で active に。
- slug（自動生成 + 編集可、unique）

操作ボタン:
- 保存（draft のまま）/ 公開する（active）
- 手動アーカイブ（status=archived。売り切れ前でも販売停止できる）
- アーカイブ解除（archived→active。ただし残数があるときのみ）
- 削除（物理削除。order_items から参照されている場合は FK の restrict で弾かれる→「過去の注文があるため削除不可。代わりにアーカイブしてください」と案内）

### 注文一覧 `/admin/orders`
- 一覧: 日付、注文番号、メール、商品×数量、合計、status（pending/paid/...）。
- 詳細: 明細（スナップショットの価格・タイトル）、配送先、Stripe PaymentIntent への参照リンク。
- 読み取りのみ（返金などは当面 Stripe ダッシュボードで実施。必要なら後で返金ボタンを追加）。

### 売上 `/admin/sales`（簡易で可）
- 合計売上（paid のみ）、期間フィルタ、商品別の販売数 / 売上。
- 初版は「合計」と「商品別販売数」だけでも十分。

## 実装メモ

- 商品の作成・更新・削除は RLS 上 admin で通る（service role は不要）。ただし画像アップロードは Storage ポリシーで admin のみ許可済み。
- 注文一覧は admin の RLS 読み取りで取得（service role 不要）。
- `edition_size` 変更や手動アーカイブ時も、`sold_count <= edition_size` 制約と自動アーカイブ trigger と矛盾しないよう UI 側でガードする。
