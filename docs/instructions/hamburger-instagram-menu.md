# 作業指示書: 🍔ハンバーガーメニュー（INSTAGRAMのみ）

## 目的
PC/SP 両方でストアのトップ画面 左上に🍔（ハンバーガー）アイコンを固定表示し、
クリック/タップで全画面オーバーレイメニューを開く。メニューの中身は **INSTAGRAM だけ**
（提供された underline-animation の下線ホバーアニメ付き）。LINKEDIN・X・メールアドレスは入れない。

## 前提（重要）
- 本プロジェクトは「素のHTML風」モードで **Tailwind を読み込まない**（`app/globals.css` 冒頭参照）。
  → コンポーネント内の Tailwind クラスは効かないので、**必要なスタイルは globals.css に素CSSで足す**。
  → ただしグローバル名（`.absolute` 等）を素のまま定義すると既存ヘッダーが壊れるため、
     **必ず `.poster-menu` 配下にスコープして定義する**。
- `framer-motion` は未インストール。`@/lib/utils` の `cn` あり。`@/*` パスあり。
- 開発サーバー稼働中は `npm run build` 厳禁。検証は tsc / lint / e2e のみ。

## 受け入れ条件
1. `components/ui/underline-animation.tsx` が下記の内容で存在する（提供コードそのまま）。
2. `framer-motion` が依存に追加されている。
3. ストアのトップ（`/`）の左上に🍔アイコンが PC/SP とも表示される。
4. クリックで全画面メニューが開き、**INSTAGRAM**（青 #0015ff・下線ホバーアニメ）が1つだけ出る。
5. 背景クリックまたは🍔（×に変化）クリックで閉じる。
6. tsc エラー0 / lint エラー0。
7. 既存ヘッダー（ロゴ・言語切替）の見た目が変わっていない。

---

## 手順

### 1. 依存インストール
```
npm install framer-motion
```
（React 19 のため最新版でよい。万一 tsc が `ValueAnimationTransition` 型で落ちる場合は
`npm install framer-motion@^11` に切り替える。）

### 2. `components/ui/underline-animation.tsx` を新規作成（下記の全文をそのまま）
```tsx
'use client'

import React, { useEffect, useRef, useState } from "react"
import { motion, useAnimationControls, ValueAnimationTransition } from "framer-motion"
import { cn } from "@/lib/utils"

interface UnderlineBaseProps {
  label: string
  className?: string
  onClick?: () => void
  underlineHeightRatio?: number
  underlinePaddingRatio?: number
  transition?: ValueAnimationTransition
}

interface DirectionalUnderlineProps extends UnderlineBaseProps {
  direction?: "left" | "right"
}

// Center Underline
export function CenterUnderline({
  label,
  className,
  onClick,
  transition = { duration: 0.25, ease: "easeInOut" },
  underlineHeightRatio = 0.1,
  underlinePaddingRatio = 0.01,
  ...props
}: UnderlineBaseProps) {
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const updateUnderlineStyles = () => {
      if (textRef.current) {
        const fontSize = parseFloat(getComputedStyle(textRef.current).fontSize)
        const underlineHeight = fontSize * underlineHeightRatio
        const underlinePadding = fontSize * underlinePaddingRatio
        textRef.current.style.setProperty(
          "--underline-height",
          `${underlineHeight}px`
        )
        textRef.current.style.setProperty(
          "--underline-padding",
          `${underlinePadding}px`
        )
      }
    }

    updateUnderlineStyles()
    window.addEventListener("resize", updateUnderlineStyles)

    return () => window.removeEventListener("resize", updateUnderlineStyles)
  }, [underlineHeightRatio, underlinePaddingRatio])

  return (
    <motion.span
      className={cn("relative inline-block cursor-pointer", className)}
      whileHover="visible"
      onClick={onClick}
      ref={textRef}
      {...props}
    >
      <span>{label}</span>
      <motion.div
        className="absolute left-1/2 bg-current -translate-x-1/2"
        style={{
          height: "var(--underline-height)",
          bottom: "calc(-1 * var(--underline-padding))",
        }}
        variants={{
          hidden: {
            width: 0,
            originX: 0.5,
          },
          visible: {
            width: "100%",
            transition: transition,
          },
        }}
      />
    </motion.span>
  )
}

// Comes In Goes Out Underline
export function ComesInGoesOutUnderline({
  label,
  direction = "left",
  className,
  onClick,
  underlineHeightRatio = 0.1,
  underlinePaddingRatio = 0.01,
  transition = {
    duration: 0.4,
    ease: "easeInOut",
  },
  ...props
}: DirectionalUnderlineProps) {
  const controls = useAnimationControls()
  const [blocked, setBlocked] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const updateUnderlineStyles = () => {
      if (textRef.current) {
        const fontSize = parseFloat(getComputedStyle(textRef.current).fontSize)
        const underlineHeight = fontSize * underlineHeightRatio
        const underlinePadding = fontSize * underlinePaddingRatio
        textRef.current.style.setProperty(
          "--underline-height",
          `${underlineHeight}px`
        )
        textRef.current.style.setProperty(
          "--underline-padding",
          `${underlinePadding}px`
        )
      }
    }

    updateUnderlineStyles()
    window.addEventListener("resize", updateUnderlineStyles)

    return () => window.removeEventListener("resize", updateUnderlineStyles)
  }, [underlineHeightRatio, underlinePaddingRatio])

  const animate = async () => {
    if (blocked) return

    setBlocked(true)

    await controls.start({
      width: "100%",
      transition,
      transitionEnd: {
        left: direction === "left" ? "auto" : 0,
        right: direction === "left" ? 0 : "auto",
      },
    })

    await controls.start({
      width: 0,
      transition,
      transitionEnd: {
        left: direction === "left" ? 0 : "",
        right: direction === "left" ? "" : 0,
      },
    })

    setBlocked(false)
  }

  return (
    <motion.span
      className={cn("relative inline-block cursor-pointer", className)}
      onHoverStart={animate}
      onClick={onClick}
      ref={textRef}
      {...props}
    >
      <span>{label}</span>
      <motion.span
        className={cn("absolute bg-current w-0", {
          "left-0": direction === "left",
          "right-0": direction === "right",
        })}
        style={{
          height: "var(--underline-height)",
          bottom: "calc(-1 * var(--underline-padding))",
        }}
        animate={controls}
      />
    </motion.span>
  )
}

// Goes Out Comes In Underline
export function GoesOutComesInUnderline({
  label,
  direction = "left",
  className,
  onClick,
  underlineHeightRatio = 0.1,
  underlinePaddingRatio = 0.01,
  transition = {
    duration: 0.5,
    ease: "easeOut",
  },
  ...props
}: DirectionalUnderlineProps) {
  const controls = useAnimationControls()
  const [blocked, setBlocked] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const updateUnderlineStyles = () => {
      if (textRef.current) {
        const fontSize = parseFloat(getComputedStyle(textRef.current).fontSize)
        const underlineHeight = fontSize * underlineHeightRatio
        const underlinePadding = fontSize * underlinePaddingRatio
        textRef.current.style.setProperty(
          "--underline-height",
          `${underlineHeight}px`
        )
        textRef.current.style.setProperty(
          "--underline-padding",
          `${underlinePadding}px`
        )
      }
    }

    updateUnderlineStyles()
    window.addEventListener("resize", updateUnderlineStyles)

    return () => window.removeEventListener("resize", updateUnderlineStyles)
  }, [underlineHeightRatio, underlinePaddingRatio])

  const animate = async () => {
    if (blocked) return

    setBlocked(true)

    await controls.start({
      width: 0,
      transition,
      transitionEnd: {
        left: direction === "left" ? "auto" : 0,
        right: direction === "left" ? 0 : "auto",
      },
    })

    await controls.start({
      width: "100%",
      transition,
      transitionEnd: {
        left: direction === "left" ? 0 : "",
        right: direction === "left" ? "" : 0,
      },
    })

    setBlocked(false)
  }

  return (
    <motion.span
      className={cn("relative inline-block cursor-pointer", className)}
      onHoverStart={animate}
      onClick={onClick}
      ref={textRef}
      {...props}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">{label}</span>
      <motion.span
        className={cn("absolute bg-current", {
          "left-0": direction === "left",
          "right-0": direction === "right",
        })}
        style={{
          height: "var(--underline-height)",
          bottom: "calc(-1 * var(--underline-padding))",
          width: "100%",
        }}
        animate={controls}
        aria-hidden="true"
      />
    </motion.span>
  )
}
```
※ 改変しない。`React` の未使用 import で lint が出る場合のみ、未使用 import の整理は可。

### 3. `components/store/SiteMenu.tsx` を新規作成（下記そのまま）
```tsx
"use client";

// 全画面ハンバーガーメニュー。PC/SP 共通。中身は INSTAGRAM のみ。
import { useState } from "react";
import { CenterUnderline } from "@/components/ui/underline-animation";

export function SiteMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="menu-toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
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

### 4. `app/page.tsx` に設置
- import 追加: `import { SiteMenu } from "@/components/store/SiteMenu";`
- `<main className="min-h-screen">` の直下（`<IntroOverlay />` の前）に `<SiteMenu />` を追加。

### 5. `app/globals.css` の末尾に追記（下記そのまま）
```css
/* ── 🍔サイトメニュー（PC/SP共通・全画面固定）。素モードのため素CSSで実装。 ── */
.menu-toggle {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 50;
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  padding: 9px;
  background: transparent;
  border: none;
  cursor: pointer;
}
.menu-toggle-bar {
  display: block;
  width: 100%;
  height: 2px;
  background: #171513;
  border-radius: 2px;
  transition: transform 0.25s ease, opacity 0.2s ease;
}
.menu-toggle[aria-expanded="true"] .menu-toggle-bar:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.menu-toggle[aria-expanded="true"] .menu-toggle-bar:nth-child(2) {
  opacity: 0;
}
.menu-toggle[aria-expanded="true"] .menu-toggle-bar:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* オーバーレイ本体 */
.poster-menu {
  position: fixed;
  inset: 0;
  z-index: 49;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(250, 249, 247, 0.94);
  -webkit-backdrop-filter: blur(2px);
  backdrop-filter: blur(2px);
}
.poster-menu-inner {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.poster-menu-link {
  font-size: 1.875rem;
  line-height: 1.1;
  color: #0015ff;
  text-decoration: none;
}
@media (max-width: 619px) {
  .poster-menu-link { font-size: 1.375rem; }
}

/* underline-animation.tsx 用ユーティリティ（素モードでTailwind無効のため .poster-menu 配下に限定）。
   既存ヘッダー等への影響を避けるため、必ずこのスコープ内だけで定義する。 */
.poster-menu .relative { position: relative; }
.poster-menu .inline-block { display: inline-block; }
.poster-menu .cursor-pointer { cursor: pointer; }
.poster-menu .absolute { position: absolute; }
.poster-menu .bg-current { background-color: currentColor; }
.poster-menu .left-0 { left: 0; }
.poster-menu .right-0 { right: 0; }
.poster-menu .left-1\/2 { left: 50%; }
.poster-menu .-translate-x-1\/2 { transform: translateX(-50%); }
.poster-menu .w-0 { width: 0; }
.poster-menu .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### 6. 検証してコミット
- `npx tsc --noEmit` でエラー0、`npm run lint` でエラー0 を確認（build は実行しない）。
- コミットメッセージ例:
  `feat: 全画面ハンバーガーメニュー（INSTAGRAMのみ）を追加`
- 変更ファイル: package.json / package-lock.json / components/ui/underline-animation.tsx /
  components/store/SiteMenu.tsx / app/page.tsx / app/globals.css /
  docs/instructions/hamburger-instagram-menu.md

## 報告に含めること
- 追加した framer-motion のバージョン
- tsc / lint の結果
- 変更した .tsx ファイル一覧（design-mate 検証用）
