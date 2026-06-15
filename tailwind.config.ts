import type { Config } from "tailwindcss";

// デザイントークンは docs/06-frontend-spec.md を正とする。
// 純白の paper、ink 基調、極薄の区切り線。クリームにしない。
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171513", // 文字・ボタン・線の基調
        paper: "#ffffff", // 背景。純白。
        hair: "#e8e5df", // 極薄の区切り線
        line: "#dcd8d0", // 入力欄の枠
        muted: "#9a948c", // 補助テキスト
        subtle: "#6b655c", // 読ませる二次テキスト（muted より濃い。試作 .stock/.field label 由来）
        danger: "#b3402b", // エラー/必須/破壊操作の意味色。/admin/* 限定（docs/06）。公開ページでは使わない。
      },
      fontFamily: {
        // 本文は system-ui 系サンセリフ。
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        // ポスター内の作品名（日本語）だけ明朝。
        mincho: ["Georgia", "Hiragino Mincho ProN", "Yu Mincho", "serif"],
      },
      letterSpacing: {
        logo: "0.30em",
      },
    },
  },
  plugins: [],
};

export default config;
