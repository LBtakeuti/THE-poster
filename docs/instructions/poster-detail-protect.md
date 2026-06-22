# ポスター詳細ページ＋拡大＋画像保護（第一弾）

## 背景・目的
竹内くんの要望：
1. ポスターをクリックすると詳細ページに行き、そこそこ大きく見える・画面内で拡大できる（Z1）
2. 作品画像をできる限りダウンロードさせない（透かし＋右クリック/ドラッグ無効）

重要な前提（厳守）：
- Webの仕組み上、表示する画像の100%ダウンロード防止は不可能。本実装の狙いは「保存の手間を上げる」＋「盗っても使えないよう透かしを焼く」こと。過剰な約束はしない。
- 署名付きURL・サーバー経由配信・原本非公開・タイル分割は **Supabase接続後の第二弾** で行う。今回（サンプル画像段階）は対象外。
- 開発サーバーが PORT=3137 で稼働中。**`npm run build` は絶対に実行しない**。検証は tsc / lint のみ。
- 「素のHTML風」方針（Tailwind不使用、例外CSSは app/globals.css に素CSS）。新規スタイルは globals.css に素CSSで追加。
- drei は v10。3D表示の既存方式（単一Canvas＋View、Poster.tsx）を尊重する。

## 実装範囲（第一弾・今回やること）

### 1. 透かし（ウォーターマーク）を作品画像に焼く
- 新規 `lib/poster/watermark.ts`（クライアント可・DOM canvas使用）に関数を作る:
  - `applyWatermark(src: HTMLCanvasElement | HTMLImageElement, w: number, h: number): HTMLCanvasElement`
  - 元の絵を新しい canvas に描画し、その上に **斜め45度・半透明のテキストを敷き詰める**。
  - 文言は定数 `WATERMARK_TEXT = "THE POSTER · PREVIEW"`（後で1箇所変更で差し替え可能に。先頭に定数定義）。
  - 透かしは `rgba(23,21,19,0.16)` 程度・繰り返しタイル・回転 -30度。読めるが鑑賞は妨げすぎない濃さ。
- `components/poster/Poster.tsx` のテクスチャ生成を透かし入りにする:
  - サンプル絵柄（paintFront の戻り canvas）に applyWatermark を通してから CanvasTexture 化。
  - 実画像（imageUrl）も、TextureLoader 直読みをやめ、`new Image()`（crossOrigin="anonymous"）でロード→canvasに描画→applyWatermark→CanvasTexture 化する。読み込み完了で texture.needsUpdate。
  - 失敗時（CORS等）はサンプル絵柄にフォールバック。
- 既存の一覧（StoreGrid 経由の Poster）にも透かしが乗る（同じ Poster を使うため）。一覧・詳細とも透かし入りになる想定でよい。

### 2. 詳細ページ /poster/[slug]
- `lib/products.ts` に `getProductBySlug(slug: string)` を追加:
  - getStoreProducts の結果から slug 一致を返す（Supabase接続時も未接続サンプル時も動く）。見つからなければ null。
- `app/poster/[slug]/page.tsx`（サーバーコンポーネント）:
  - params.slug で取得。null は `notFound()`。
  - 画像URL（posterPublicUrl、サンプルは page.tsx と同様 sample-poster.png のフォールバック）を組み立てて子に渡す。
  - 戻るリンク（「← 一覧へ / Back」）、作品名、Riso・A2・価格、残数、購入/SOLD OUT を一覧と同じ表記で表示。
- `components/poster/PosterDetail.tsx`（"use client"）:
  - 大きめの 3D ビュー。**専用の `<Canvas>` を1つ置き**（一覧の固定Canvasとは別。詳細ページ単独なので衝突しない）、中央に Poster を大きく表示。
  - 操作：ドラッグ回転（PresentationControls）＋ **軽いズーム**。ズームは drei `OrbitControls` の代わりに、PresentationControls はズーム不可のため、カメラ dolly を許す簡易ズーム（ホイール/ピンチで `minDistance`〜`maxDistance` 制限）か、`+ / −` ボタン2段階でも可。**中解像度しか無いので近づいても粗くなる＝それ以上見せない**自然な上限になる。実装が簡単な方を選んでよい（ボタン2段階ズーム推奨）。
  - 透かしは Poster 経由で焼かれる（上記1）。
- カードのクリック遷移：`components/store/StoreGrid.tsx`
  - 各カードの 3D ポスター領域（PosterCard の枠）をクリック/タップすると `/poster/[slug]` へ遷移。
  - 既存の「購入/SOLD OUT」ボタンの挙動は変えない（ボタンは遷移させない＝イベント伝播に注意）。
  - 3D操作（ドラッグ回転）とクリック遷移が競合しないよう、ドラッグ時は遷移しない簡易判定（mousedown→mouseup の移動量が小さければクリック扱い）か、カード下部の作品名/画像枠を Link にする等、自然な実装でよい。

### 3. 右クリック/ドラッグ/長押し保存の無効化（サイト全体）
- グローバルに抑止する client コンポーネント（例 `components/ui/NoSave.tsx`、"use client"）を作り、`app/layout.tsx` に1つ置く:
  - `contextmenu`（右クリックメニュー）を preventDefault
  - `dragstart`（画像ドラッグ保存）を preventDefault
  - 画像長押し（iOS）対策に CSS を併用
- globals.css に追加:
  - `img, canvas { -webkit-user-drag: none; user-select: none; -webkit-touch-callout: none; }`
- 注意：フォーム入力（input/textarea）の選択・コピーは妨げないこと（テキスト選択を全面禁止しない。img/canvas に限定）。

## やらないこと（第二弾・別途）
- サーバー経由画像配信（原本URL非露出）、署名付きURL、サーバー側での透かし焼き＆中解像度化（sharp導入）、タイル分割。
- これらは Supabase 接続後。今回はコメント等で「第二弾で対応」と分かるようにしておくのは可だが、実装はしない。

## 受け入れ条件
1. 一覧でポスター（3D領域）をクリックすると詳細ページに遷移する。購入/SOLD OUT ボタンは従来通り動く。
2. 詳細ページで作品が大きく表示され、ドラッグ回転＋ズーム（ボタン or ホイール）ができる。戻るリンクで一覧へ戻れる。
3. 一覧・詳細とも、作品画像に斜めの半透明透かし「THE POSTER · PREVIEW」が乗っている。
4. サイト上で画像/canvas を右クリックしても保存メニューが出ない。画像のドラッグ保存ができない。フォーム入力のテキスト操作は普通にできる。
5. `npx tsc --noEmit` エラー0、`npm run lint` エラー0。build は実行しない。
6. consoleエラーを増やさない。

## コミット
- 論理単位で分けてよい（例: 透かし／詳細ページ／保存無効化）。日本語メッセージ・prefix付き。
- まとめて1コミットでも可。指示書のパスは docs/instructions/poster-detail-protect.md。
