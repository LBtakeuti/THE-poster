# 作業指示書: モバイルでヘッダー（ロゴ）崩れを修正

## 背景・原因
素モード（Tailwind不使用）のため、Header のロゴ `<img className="h-[26px] ...">` のサイズ指定が効かず、
ロゴSVG（viewBox 243.9×26.9・width/height無し）が特大表示になり、モバイルで上にはみ出して切れている。
ヘッダーの中央寄せ・言語ボタンの右寄せも Tailwind 依存で効いていない。
→ 素CSSでロゴの高さを固定し、ヘッダーを中央寄せ＋言語ボタン右寄せにする。

## 受け入れ条件
1. モバイル/PCともロゴが適切な大きさ（モバイル高さ約26px、PC約40px）で、はみ出さない。
2. ロゴがヘッダー中央、言語ボタンが右端に配置される。
3. 既存の他画面（チェックアウト/管理）に影響しない（`.store-header` は store の Header のみ）。
4. tsc 0 / lint 0。

## 手順

### 1. `components/store/Header.tsx` に素CSS用のクラスを付与
- ロゴの `<img ...>` の className に `store-logo` を**追記**する（既存のTailwindクラスは残してよい）。
  例: `className="store-logo h-[26px] w-auto min-[821px]:h-[40px]"`
- 言語ボタンを包む `<div className="flex items-center gap-5">` の className に `store-header-actions` を**追記**する。
  例: `className="store-header-actions flex items-center gap-5"`
- それ以外（構造・属性）は変更しない。

### 2. `app/globals.css` に下記を追記（既存の `.store-header, .store-grid { ... }` ブロックはそのまま残す）
```css
/* ── ストアヘッダー: 素モードで Tailwind が効かないため、ロゴ寸法と配置を素CSSで明示。 ── */
.store-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px 16px 14px;
  min-height: 44px;
}
.store-logo {
  height: 26px;
  width: auto;
  display: block;
}
.store-header-actions {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 20px;
}
@media (min-width: 821px) {
  .store-header {
    padding: 26px 24px 18px;
  }
  .store-logo {
    height: 40px;
  }
  .store-header-actions {
    right: 24px;
  }
}
```

### 3. コミット
- コミットメッセージ例: `fix: モバイルでヘッダーのロゴ寸法・配置が崩れる問題を修正`
- 変更ファイル: components/store/Header.tsx / app/globals.css / docs/instructions/header-mobile-fix.md

## 報告に含めること
- 受け入れ条件の達否・コミットハッシュ（tsc/lint はリード側で実行）
