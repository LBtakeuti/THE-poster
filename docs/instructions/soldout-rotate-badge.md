# 売り切れポスターの扱いを変更（回す＋末尾へ＋SOLD OUTバッジ）

## 目的
売り切れ商品の見せ方を変える。竹内くんの指示：
「売り切れも回す。並びは下の方にたまっていく。購入ボタンの位置に SOLD OUT バッジを付ける。」

## 前提・厳守事項
- 開発サーバーが PORT=3137 で稼働中。**`npm run build` は絶対に実行しない**（.next を壊すため）。検証は tsc / lint のみ。
- 不変条件（ルート CLAUDE.md）は順守。在庫・決済まわりのロジックは触らない。今回は表示のみの変更。
- 素のHTML風方針（Tailwind不使用、例外CSSは globals.css）。新規スタイルは globals.css に素CSSで足す。

## 変更1: 売り切れも回す＋褪色をやめる
ファイル: `components/poster/Poster.tsx`
- `const idleRotate = !reducedMotion && !sold;` → `const idleRotate = !reducedMotion;`（sold を外し、売り切れも自動回転・浮遊する）
- 褪色を廃止する。useFrame 内の opacity 制御を「常に不透明」にする：
  - `const target = sold ? 0.5 : 1.0;` → `const target = 1.0;`
- これで売り切れも他と同じ鮮やかさで回る。`sold` プロップ自体は残してよい（呼び出し側の型維持）。
- コメント「売り切れ(sold)は少し褪せさせ、浮遊・自動回転を止める。」は実態に合わせて更新する。

## 変更2: 売り切れを並びの末尾へ（下にたまる）
ファイル: `components/store/StoreGrid.tsx`
- `products.map(...)` する前に、購入可能なものを先・売り切れを後ろにした配列を作る。
- 安定ソートを使い、元の並び順（sort_order）を保ったまま売り切れだけ後方へ送る：
  ```ts
  const ordered = [...products].sort(
    (a, b) => Number(isPurchasable(b)) - Number(isPurchasable(a)),
  );
  ```
- `ordered.map((p) => ...)` に差し替える。

## 変更3: 購入ボタンの位置に SOLD OUT バッジ
ファイル: `components/store/StoreGrid.tsx`
- 現状、売り切れ時は `disabled` の button に `{t.archived}`（販売終了）を表示している。
- これを「SOLD OUT」バッジに置き換える。テキストは日英共通で固定文字列 `SOLD OUT`。
- 購入ボタン（.buy-button）と同じ位置（右側）に表示する。
- スタイルは globals.css に `.sold-badge` を新規追加（素CSS）。控えめだが分かるデザイン：
  - 例: 細い枠 or 薄いグレー背景、文字は小さめ・大文字・トラッキング広め・muted寄りの色。
  - 既存の .buy-button / disabled button のサイズ感（padding 18px / 文字10px / uppercase / tracking 0.12em）に合わせ、丸み(rounded-full相当)も揃える。
- 既存 disabled button の Tailwind ユーティリティclassは撤去し、`className="sold-badge"` に統一する。

## 受け入れ条件
1. 全8枚のポスターが回転する（売り切れの「漣 — Ripple」も回る・褪色していない）。
2. 売り切れ商品がグリッドの末尾（下の方）にまとまって表示される。購入可能商品は元の順序を保つ。
3. 売り切れカードの購入ボタン位置に「SOLD OUT」バッジが出る。購入可能カードは従来どおり「購入/Buy」リンク。
4. `npx tsc --noEmit` がエラー0。`npm run lint` がエラー0。
5. build は実行しない。

## コミット
- 1コミット=1論理変更でまとめてよい（今回は一連のUI変更）。日本語メッセージ・prefix付き。
- 例: `feat: 売り切れポスターも回転＋並びを末尾へ＋SOLD OUTバッジ表示`
