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

  // 初期位置をマウント後に決定（SSR不一致回避）。
  // スマホ(<=640px)は右下固定、PCはランダム。どちらもドラッグ移動は可。
  useEffect(() => {
    const maxX = Math.max(MARGIN, window.innerWidth - BTN - MARGIN);
    const maxY = Math.max(MARGIN, window.innerHeight - BTN - MARGIN);
    const isMobile = window.innerWidth <= 640;
    if (isMobile) {
      setPos({ x: maxX, y: maxY }); // 右下固定
    } else {
      setPos({
        x: MARGIN + Math.random() * (maxX - MARGIN),
        y: MARGIN + Math.random() * (maxY - MARGIN),
      });
    }
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
        <span aria-hidden="true">🍔</span>
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
