"use client";

// 縦に「切り上がる」テキスト演出（self-made / 依存なし）。
// 元アイデア（vertical cut reveal）を、framer-motion なし・Tailwind なしの
// 素CSSで作り直したもの。各文字を overflow:hidden のマスクで隠し、
// translateY(110%)→0 の CSS アニメを文字ごとに遅延（stagger）させて出す。
// スタイル本体は globals.css の .intro-reveal / .intro-mask / .intro-char。
import { cn } from "@/lib/utils";

type SplitBy = "characters" | "words";
type StaggerFrom = "first" | "last" | "center" | number;

export interface VerticalCutRevealProps {
  text: string;
  splitBy?: SplitBy;
  reverse?: boolean; // true で上から下りてくる
  staggerDuration?: number; // 文字間の遅延（秒）
  staggerFrom?: StaggerFrom; // first/last/center/任意index
  charDuration?: number; // 1文字のアニメ時間（秒）
  baseDelay?: number; // 開始までの基準遅延（秒）
  className?: string;
}

// Unicode / 絵文字対応の文字分割。
function splitChars(input: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(seg.segment(input), (s) => s.segment);
  }
  return Array.from(input);
}

// 単語分割（語間の半角スペースもトークンとして残す＝折り返し可能に）。
function splitWords(input: string): string[] {
  const parts = input.split(" ");
  const out: string[] = [];
  parts.forEach((w, i) => {
    out.push(w);
    if (i < parts.length - 1) out.push(" ");
  });
  return out;
}

export function VerticalCutReveal({
  text,
  splitBy = "characters",
  reverse = false,
  staggerDuration = 0.045,
  staggerFrom = "first",
  charDuration = 0.72,
  baseDelay = 0,
  className,
}: VerticalCutRevealProps) {
  const tokens = splitBy === "words" ? splitWords(text) : splitChars(text);
  // 空白以外＝アニメ対象の総数（stagger の基準）。
  const total = tokens.filter((t) => t.trim() !== "").length;

  const delayOf = (i: number): number => {
    if (staggerFrom === "first") return i * staggerDuration;
    if (staggerFrom === "last") return (total - 1 - i) * staggerDuration;
    if (staggerFrom === "center")
      return Math.abs(Math.floor(total / 2) - i) * staggerDuration;
    return Math.abs((staggerFrom as number) - i) * staggerDuration;
  };

  let animIndex = -1;
  return (
    <span
      className={cn("intro-reveal", reverse && "intro-reverse", className)}
      aria-label={text}
    >
      {tokens.map((tok, i) => {
        // 空白は隠さずそのまま（折り返し・字間のため）。
        if (tok.trim() === "") {
          return <span key={i}>{tok}</span>;
        }
        animIndex += 1;
        const delay = baseDelay + delayOf(animIndex);
        return (
          <span key={i} className="intro-mask" aria-hidden="true">
            <span
              className="intro-char"
              style={{
                animationDelay: `${delay}s`,
                animationDuration: `${charDuration}s`,
              }}
            >
              {tok}
            </span>
          </span>
        );
      })}
    </span>
  );
}
