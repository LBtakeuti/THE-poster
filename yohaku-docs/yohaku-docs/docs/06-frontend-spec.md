# 06 — フロントエンド仕様

見た目・操作感の正は `reference/poster-store-prototype.html`。これを Next.js + React Three Fiber に移植する。

## デザイントークン

```
--ink:     #171513   /* 文字・ボタン・線の基調 */
--paper:   #ffffff   /* 背景。純白。クリームにしない */
--hair:    #e8e5df   /* 極薄の区切り線 */
--line:    #dcd8d0   /* 入力欄の枠 */
--muted:   #9a948c   /* 補助テキスト */
```

- フォント: 本文は system-ui 系サンセリフ。ポスター内の作品名（日本語）だけ明朝（Georgia / Hiragino Mincho 系）。
- 余白を広く、装飾は足さない。角丸はボタン・入力欄のみ。
- ロゴ: 13px のひし形（border 1.6px）+ "Yohaku"（letter-spacing 0.30em, uppercase）。

## 画面

### ストア `/`
- ヘッダー: ロゴ（クリックでトップ）/ 右に「Limited prints」表記 + 言語トグル。
- グリッド: `grid-template-columns: repeat(4,1fr)`、`max-width: 820px` 以下で `repeat(2,1fr)`。
- 各カード: 上に回る 3D ポスター（縦長 3:4 の枠）、下に 作品名 / `sub · 価格` / 「残り N / M」/「Buy」/ 残量バー。
- 在庫 0 は Buy を無効化し "Archived"、ポスターを少し褪せさせる。

### チェックアウト `/checkout`
- 2 カラム（780px 以下で 1 カラム）。左: 入力フォーム、右: 注文サマリー（sticky）。
- 入力: Email / 氏名 / 住所 / 部屋番号(任意) / 市区町村・都道府県・郵便番号 / Payment Element。**国は無し。**
- 数量ステッパー（1〜残数）。小計・送料・合計。Pay ボタンに合計を表示。
- 完了 `/checkout/complete`: PaymentIntent の状態を見て「ありがとうございました」を表示。

### 管理 `/admin/*`
`07-admin-spec.md` 参照。

## 回る 3D ポスター（核心の UI）

**方針: 1 枚の `<Canvas>` に drei の `<View>` を使い、各カードの DOM 矩形へ個別描画する。** 試作の scissor 分割と同じ考え方を drei が抽象化している。商品が増えても WebGL コンテキストは 1 つで済む。

構成案:

```
components/poster/
  PosterCanvas.tsx   // ページに 1 つ。fixed の <Canvas> + <View.Port/>。各 View を track。
  PosterCard.tsx     // カードの DOM。viewer ref を作り <View track={ref}> に紐づけ。
  Poster.tsx         // 実際のメッシュ（薄い箱 + テクスチャ + 影 + 操作）
```

`Poster.tsx` の要点:
- ジオメトリ: 薄い `boxGeometry`（幅2 / 高さ2.828 / 奥行0.012）。正面=作品テクスチャ、裏面=白紙、側面=白。`meshStandardMaterial`（roughness 高め, metalness 0）で紙のマット感。紙は **真っ白**（クリームにしない）。微細なノイズで質感だけ足す。
- テクスチャ: `useTexture(publicUrl)`。色管理は sRGB。
- 操作: drei `<PresentationControls>` でドラッグ回転 + スナップバック + 慣性。アイドル時はごく緩やかに自動回転、`<Float>` で微小に浮遊。
- 影: 接地のソフトシャドウ（drei `<ContactShadows>`、または試作と同じ「背後に置いたぼかし影プレーン」を回転に応じて横方向に縮める）。**硬い影にしない。**
- ライティング: `<hemisphereLight>` + キーの `<directionalLight>` + 弱いフィル。暖色を入れず中立に（白が黄ばまないように）。
- `prefers-reduced-motion` を尊重（自動回転・浮遊を止める）。

> 試作の `paintCanvas()` はデモ用に絵柄をコードで描いていたもの。本番では Storage の実画像をテクスチャに使う。レイアウト・操作感・影・ライティングは試作を踏襲する。

## 状態と取得

- ストアの products は **サーバーコンポーネントで取得**（active/archived、sort_order 順）。SEO とパフォーマンスのため。
- 残数 = `edition_size - sold_count` をその場で計算して表示。
- 在庫のリアルタイム反映が欲しければ Supabase Realtime を後付け可能（必須ではない）。初版は購入完了後の再取得で十分。

## アクセシビリティ / 品質の床

- レスポンシブ（スマホまで）。キーボードフォーカスが見える。`prefers-reduced-motion` 対応。
- 3D が使えない/失敗した場合のフォールバック（静止画像）を用意できると尚良い。
