"use client";

// サイト入場時のイントロ演出。白い全画面オーバーレイで、英語の遊び心ある
// 3行を縦の切り上がりアニメで出し、少し見せてからフェードアウトして消える。
// ・セッション中に一度だけ（戻ってきた時に毎回出ない）。
// ・動きを減らす設定では出さない（アクセシビリティ）。
// ・クリックでスキップ可能。
import { useEffect, useState } from "react";
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal";

// 文言はオリジナル（元デモの "HI FRIEND..." の流用ではない）。常に英語。
const LINES = [
  { text: "HELLO THERE 👋", reverse: false, from: "first" as const, base: 0 },
  {
    text: "🌤️ WELCOME TO THE POSTER",
    reverse: true,
    from: "last" as const,
    base: 0.5,
  },
  {
    text: "ENJOY 😊 IN ENGLISH",
    reverse: false,
    from: "center" as const,
    base: 1.15,
  },
];

const HOLD_MS = 2700; // 出し切ってから去り始めるまで
const FADE_MS = 600; // フェードアウト時間

export function IntroOverlay() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.sessionStorage.getItem("introSeen");
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (seen || reduce) return;

    setShow(true);
    window.sessionStorage.setItem("introSeen", "1");
    const t1 = window.setTimeout(() => setLeaving(true), HOLD_MS);
    const t2 = window.setTimeout(() => setShow(false), HOLD_MS + FADE_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setLeaving(true);
    window.setTimeout(() => setShow(false), FADE_MS);
  };

  return (
    <div
      className={"intro-overlay" + (leaving ? " intro-overlay--leaving" : "")}
      onClick={dismiss}
      role="button"
      tabIndex={0}
      aria-label="Enter THE POSTER"
    >
      {LINES.map((l) => (
        <div className="intro-headline" key={l.text}>
          <VerticalCutReveal
            text={l.text}
            splitBy="characters"
            reverse={l.reverse}
            staggerFrom={l.from}
            staggerDuration={0.04}
            baseDelay={l.base}
          />
        </div>
      ))}
    </div>
  );
}
