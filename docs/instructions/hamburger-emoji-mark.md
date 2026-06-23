# 作業指示書: 🍔マークを「本物の絵文字」に変更

## 目的
ハンバーガーの三本線アイコンをやめ、**🍔絵文字そのもの**をマークとして表示する。
ドラッグ移動・ランダム初期配置・白い丸下地は維持する（挙動は変えない、見た目のマークだけ変更）。

## 前提（厳守）
- 素モード（Tailwind不使用）。開発サーバー PORT=3137 稼働中。`npm run build` 厳禁。検証は tsc / lint のみ。

## 受け入れ条件
1. ボタン（.menu-toggle）の中身が🍔絵文字1つになっている（三本線spanは無し）。
2. ドラッグ移動・ランダム配置・クリックでメニュー開閉は従来どおり動く。
3. tsc 0 / lint 0。

---

## 手順

### 1. `components/store/SiteMenu.tsx` のボタン中身を差し替え
現状の `<button ...>` 内にある3つの `<span className="menu-toggle-bar" />` を削除し、代わりに🍔絵文字を入れる。
ボタン要素の属性（type/className/aria-label/aria-expanded/style/onPointerDown/Move/Up）は**そのまま維持**し、子要素だけ下記に置き換える:
```tsx
        <span aria-hidden="true">🍔</span>
```
（結果として button の中身はこの span 1つだけになる。）

### 2. `app/globals.css` の `.menu-toggle` ブロックを下記で置換
```css
.menu-toggle {
  position: fixed;
  top: 16px;
  right: 16px; /* マウント前の既定位置。JSが left/top をインライン指定して上書き */
  z-index: 50;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  font-size: 22px;
  line-height: 1;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #dcd8d0;
  border-radius: 999px;
  box-shadow: 0 1px 6px rgba(23, 21, 19, 0.14);
  cursor: grab;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
.menu-toggle:active {
  cursor: grabbing;
}
```

### 3. 不要になった旧ルールを削除
下記の三本線用ルールは使われなくなるので削除する:
- `.menu-toggle-bar { ... }`
- `.menu-toggle[aria-expanded="true"] .menu-toggle-bar:nth-child(1) { ... }`
- `.menu-toggle[aria-expanded="true"] .menu-toggle-bar:nth-child(2) { ... }`
- `.menu-toggle[aria-expanded="true"] .menu-toggle-bar:nth-child(3) { ... }`

### 4. 検証してコミット
- `npx tsc --noEmit` エラー0、`npm run lint` エラー0（build禁止）。
- コミットメッセージ例: `style: 🍔マークを絵文字表示に変更（三本線アイコンを廃止）`
- 変更ファイル: components/store/SiteMenu.tsx / app/globals.css / docs/instructions/hamburger-emoji-mark.md

## 報告に含めること
- tsc / lint 結果・受け入れ条件の達否・コミットハッシュ
