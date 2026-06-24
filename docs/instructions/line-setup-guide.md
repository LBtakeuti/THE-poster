# LINE通知セットアップ手順（管理者向け・初心者OK）

注文が入ったら、あなたの個人LINEに通知を届けるための設定手順。

## 前提（安心ポイント）
- **新しい電話番号は不要**。今ある個人LINEアカウントでログインして作れる。
- 個人LINEと「LINE公式アカウント（通知の送り主）」は別物だが、同じLINEビジネスIDから管理できる。
- 無料プランでOK。注文通知くらいの件数なら無料枠で足りる。

## 取得するもの（最終的に2つ）
- `LINE_CHANNEL_ACCESS_TOKEN`（送信用の鍵）
- `LINE_ADMIN_USER_ID`（あなた宛に送るための宛先ID。Uで始まる文字列）

---

## 手順

### Step 1. LINE Developers にログイン
1. https://developers.line.biz/console/ を開く。
2. 「LINEアカウントでログイン」を選び、**今お使いの個人LINE**でログイン（メール+パスワード or QR）。
3. 初回は開発者登録（名前・メール）を求められるので入力。

### Step 2. プロバイダーを作る
- 「Create a new provider」→ 名前は会社名や「THE POSTER」など任意で作成。
  - ※プロバイダー＝アカウントのまとめ箱。後から変更可。

### Step 3. Messaging API チャネルを作る（＝公式アカウントが1つできる）
- 「Create a Messaging API channel」を選ぶ。
- 入力例:
  - Channel name（公式アカウント名）: `THE POSTER 注文通知`
  - Category / Subcategory: それっぽいもの（後で変更可）
  - 同意してCreate。

### Step 4. 送信用の鍵（アクセストークン）を発行
1. 作ったチャネルを開く → 上部タブ「**Messaging API**」。
2. 下の方「**Channel access token (long-lived)**」→「Issue（発行）」。
3. 表示された長い文字列が **`LINE_CHANNEL_ACCESS_TOKEN`**。コピーして控える。

### Step 5. あなたの宛先ID（user ID）を取得
1. 同じチャネルの上部タブ「**Basic settings**」を開く。
2. 一番下あたりの「**Your user ID**」に `U` から始まる文字列がある。
3. これが **`LINE_ADMIN_USER_ID`**。コピーして控える。

### Step 6. 公式アカウントを「友だち追加」（これが無いと届きません）
1. 「Messaging API」タブにある **QRコード** を表示。
2. あなたの**個人LINE**のカメラで読み取り、公式アカウントを**友だち追加**。
   - ※友だち追加していない相手には通知を送れない仕様のため必須。

### Step 7.（任意）自動応答をオフ
- 公式アカウントの管理画面で「応答メッセージ」「あいさつメッセージ」はオフでOK（通知専用のため）。

---

## できたら
- `LINE_CHANNEL_ACCESS_TOKEN` と `LINE_ADMIN_USER_ID` の2つを、設計メートに渡してください。
  `.env.local` に追記し、テスト決済で実際にLINEへ通知が届くか確認します。

## つまずきやすい点
- 「Messaging API channel」ではなく「LINE Login channel」を作ると通知用には使えない。必ず **Messaging API** を選ぶ。
- 友だち追加（Step 6）を忘れると、鍵が正しくても通知が届かない。
- トークンは秘密情報。スクショやSNSに貼らない（`.env.local` はGit管理外なので安全）。
