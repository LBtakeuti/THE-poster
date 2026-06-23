# 作業指示書: 🍔メニューをランダム配置＋ドラッグ移動＋常時視認化

## 目的
1. 🍔（ハンバーガー）を読み込みのたびに**画面内のランダムな位置**に表示する。
2. **ドラッグ／スワイプで自由に移動**できるようにする（マウス・タッチ両対応）。
3. ドラッグせず**短くタップ／クリックした時だけメニューを開く**（移動量5px以下をクリック扱い）。
4. 背景が濃くても見えるよう、🍔に**白い丸い下地＋薄い枠＋影**を付ける（現状「見えない」報告への対応）。

## 前提（厳守）
- 素モード（Tailwind不使用）。スタイルは globals.css の素CSS。
- 開発サーバー PORT=3137 稼働中。`npm run build` 厳禁。検証は tsc / lint のみ。
- ランダム位置は **クライアントのマウント後に決定**（SSRハイドレーション不一致を避けるため、初期stateはnull→useEffectで設定）。

## 受け入れ条件
1. 読み込むたびに🍔の初期位置が変わる（画面内に収まる）。
2. 🍔をドラッグ/スワイプで動かせる（マウス＆タッチ）。画面外には出ない（余白12pxでクランプ）。
3. ドラッグせず短くタップ/クリックすると INSTAGRAM メニューが開く。ドラッグ時は開かない。
4. 🍔が白い下地で常に視認できる。
5. tsc エラー0 / lint エラー0。既存ヘッダーに影響なし。

---

## 手順

### 1. `components/store/SiteMenu.tsx` を下記の内容で**全置換**
```tsx
"use client";

// 全画面ハンバーガーメニュー（中身は INSTAGRAM のみ）。
// 初期位置はマウント後にランダム決定。ドラッグ/スワイプで移動可。
// 移動量が小さい場合のみ「クリック」と見なしてメニューを開く（誤爆防止）。
import { useEffect, useRef, useState } from "react";
import { CenterUnderline } from "@/components/ui/underline-animation";

const BTN = 40; // ボタンの一辺(px)
const MARGIN = 12; // 画面端からの最小余白(px)
const CLICK_THRESHOLD = 5; // これ以下の移動はクリック扱い(px)

export function SiteMenu() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{
    startX: number;
    startY: number;
    offX: number;
    offY: number;
    moved: boolean;
  } | null>(null);

  // 初期位置をマウント後にランダム決定（SSR不一致回避）。
  useEffect(() => {
    const maxX = Math.max(MARGIN, window.innerWidth - BTN - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - BTN - MARGIN);
    setPos({
      x: MARGIN + Math.random() * (maxX - MARGIN),
      y: MARGIN + Math.random() * (maxY - MARGIN),
    });
  }, []);

  const clamp = (x: number, y: number) => {
    const maxX = Math.max(MARGIN, window.innerWidth - BTN - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - BTN - MARGIN);
    return {
      x: Math.min(Math.max(MARGIN, x), maxX),
      y: Math.min(Math.max(MARGIN, y), maxY),
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      offX: e.clientX - pos.x,
      offY: e.clientY - pos.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    if (
      Math.abs(e.clientX - d.startX) > CLICK_THRESHOLD ||
      Math.abs(e.clientY - d.startY) > CLICK_THRESHOLD
    ) {
      d.moved = true;
    }
    setPos(clamp(e.clientX - d.offX, e.clientY - d.offY));
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) {
      setOpen((v) => !v); // ほぼ動いていない＝クリック扱い
    }
  };

  return (
    <>
      <button
        type="button"
        className="menu-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open ? "true" : "false"}
        style={pos ? { left: pos.x, top: pos.y, right: "auto" } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span className="menu-toggle-bar" />
        <span className="menu-toggle-bar" />
        <span className="menu-toggle-bar" />
      </button>

      {open && (
        <div
          className="poster-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          onClick={() => setOpen(false)}
        >
          <nav className="poster-menu-inner" onClick={(e) => e.stopPropagation()}>
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="poster-menu-link"
            >
              <CenterUnderline label="INSTAGRAM" />
            </a>
          </nav>
        </div>
      )}
    </>
  );
}
```

### 2. `app/globals.css` の `.menu-toggle` ルールを下記で**置換**
（現状は position:fixed / top:16 / right:16 / z-index:50 などのブロック。下記で差し替える。
他の `.menu-toggle-bar` や `.menu-toggle[aria-expanded="true"]...` のルールはそのまま残す。）
```css
.menu-toggle {
  position: fixed;
  top: 16px;
  right: 16px; /* マウント前の既定位置。JSが left/top をインライン指定して上書き */
  z-index: 50;
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  padding: 9px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #dcd8d0;
  border-radius: 999px;
  box-shadow: 0 1px 6px rgba(23, 21, 19, 0.14);
  cursor: grab;
  touch-action: none; /* タッチでのドラッグ中にページがスクロールしないように */
  -webkit-user-select: none;
  user-select: none;
}
.menu-toggle:active {
  cursor: grabbing;
}
```

### 3. 検証してコミット
- `npx tsc --noEmit` エラー0、`npm run lint` エラー0（build禁止）。
- コミットメッセージ例: `feat: 🍔メニューをランダム配置＋ドラッグ移動対応・常時視認化`
- 変更ファイル: components/store/SiteMenu.tsx / app/globals.css / docs/instructions/hamburger-draggable-random.md

## 報告に含めること
- tsc / lint の結果
- 受け入れ条件1〜5の達否
- コミットハッシュ
