# 詳細ページの見切れ修正＋レビュー改善（第一弾の仕上げ）

## 厳守事項
- 開発サーバーが PORT=3137 稼働中。**`npm run build` は絶対に実行しない**。検証は tsc / lint のみ。
- 「素のHTML風」方針（Tailwind不使用、例外CSSは app/globals.css に素CSS）。新規スタイルは素CSSで。
- drei v10。詳細ページの既存方式（PosterDetail.tsx の専用 Canvas）を尊重する。

---

## 変更1【最優先】詳細ページのポスター見切れを直す
症状：モバイル（および幅の狭い画面）で、詳細ページの3Dポスターが回転・浮遊すると枠からはみ出て見切れる。デフォルト表示でポスターの下端がズームボタンやページ外に被る。

原因：`components/poster/PosterDetail.tsx` のカメラがポスターに近すぎる（ポスターは Poster.tsx で mesh scale=1.7、実寸 高さ約4.8。現状 fov35・距離 MAX 5.2 では縦が視野に収まらない）。

要件：
- **デフォルト表示（ズーム最小=引き）の状態で、ポスターが360度回転しても・浮遊(Float)しても、上下左右に十分な余白を持って枠内に完全に収まること。** これが受け入れの核心。
- ズームイン時（+ボタンで寄せた状態）は拡大鑑賞なので多少はみ出てよい。ただし極端に切れない範囲に。
- モバイル幅（〜480px）で特に見切れないこと。

実装方針（いずれか・自然な方を選択。実測で調整可）：
- `PosterDetail.tsx` の `MAX_DISTANCE` を増やし、ポスター全体が余白付きで収まる距離にする（fov35 維持なら 8〜9 程度が目安。実際に枠内に収まる値へ調整）。`ZOOM_STEPS`（引き→中→寄り）も再設定し、最小ズーム=全体が収まる引き、最大ズーム=寄り（MIN_DISTANCE）に。`MIN_DISTANCE` も比率に合わせて見直す。
- 浮遊で上下にはみ出るのを抑えるため、詳細ページでは Float の振れ幅を小さく/無効にしてもよい（必要なら Poster に控えめ化の手段を足す。ただし一覧の見た目は変えない）。
- ズームボタン（.poster-detail-zoom, 右下 absolute）がポスターに被って鑑賞・操作を妨げないか確認。被るならステージ下に余白を足す等で調整。
- `.poster-detail-stage` の `aspect-ratio: 3/4` / `max-height: 78vh` は維持してよいが、モバイルで縦が大きくなりすぎる場合は `max-height` を調整して画面に収める。

検証時の目安：モバイル相当（幅 約390px）で詳細ページを開き、デフォルト状態でポスター全体（上下左右に余白）が見え、回転しても切れないこと。

---

## 変更2【重要】テクスチャの後始末（メモリリーク防止）
- 対象：`components/poster/Poster.tsx`
- `frontTex` / `backTex` / `realTex`（いずれも THREE のテクスチャ）が、アンマウント時や `imageUrl` 変更時に `dispose()` されずGPUメモリに残る。
- 対応：`useCanvasTexture` を useEffect クリーンアップ付きにする、または各テクスチャをアンマウント時に `dispose()` する。`realTex` は `imageUrl`/`gl` 変更時に旧テクスチャを破棄。既存の描画・透かし・CORSフォールバックの挙動は変えない。

---

## 変更3【重要】usePrefersReducedMotion の重複をなくす
- 同一フックが `components/poster/PosterDetail.tsx` と `components/store/StoreGrid.tsx` に重複定義されている。
- `lib/hooks/usePrefersReducedMotion.ts`（"use client" 不要・client用フック）に切り出し、両ファイルから import する。重複定義は削除。

---

## 変更4【軽微】ドラッグ抑止を画像だけに限定
- 対象：`components/ui/NoSave.tsx`
- 現状 `dragstart` を一律 `preventDefault()` していて、リンク等のドラッグも止まる。
- `e.target instanceof HTMLImageElement`（必要なら canvas も）に限定して preventDefault する。contextmenu 側の isFormField ガードと方針を揃える。フォーム・リンクの通常操作は妨げない。

---

## 変更5 確認用E2Eテストをコミット
- `test/e2e-poster-detail-check.mjs`（既に存在）を `git add` してコミットに含める。

---

## やらないこと（今回対象外）
- `getProductBySlug` の全件フェッチ最適化（`.eq("slug", ...)` 化）は、Supabase接続後の第二弾で扱う。今回は変更不要。コードに「第二弾で1件取得に最適化」とコメントを残すのは可。
- 署名URL・サーバー配信・タイル分割（第二弾）。

---

## 受け入れ条件
1. モバイル幅でも詳細ページのポスターがデフォルト表示で枠内に完全に収まり、回転・浮遊で見切れない。
2. ズーム（+/−）は従来通り機能する。
3. テクスチャ dispose 実装済み（アンマウント/再ロードでリークしない）。
4. usePrefersReducedMotion が共通モジュール化され重複が消えている。
5. NoSave の dragstart 抑止が画像（/canvas）限定になっている。
6. `npx tsc --noEmit` エラー0、`npm run lint` エラー0。build は実行しない。
7. 一覧（トップ）の見た目・挙動は従来通り（透かし・クリック遷移・回転・SOLD OUT）。

## コミット
- 論理単位で分けてよい（見切れ修正／レビュー改善／テスト追加）。日本語メッセージ・prefix付き。
