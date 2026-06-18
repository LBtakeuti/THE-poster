"use client";

// ストアヘッダー: 公式SVGロゴ（クリックでトップ）/ 右に「Limited prints」+ 言語トグル。
// プロト header のレイアウトを踏襲（白基調、極薄区切りなし、余白広め）。
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export function Header() {
  const { t, toggleLocale } = useI18n();

  return (
    <header className="store-header relative z-10 flex items-center justify-end px-5 pb-[14px] pt-5 min-[821px]:px-8 min-[821px]:pb-[18px] min-[821px]:pt-[26px]">
      <Link
        href="/"
        aria-label="THE POSTER"
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 translate-y-[calc(-50%+8px)] items-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 軽量な単色SVGワードマーク（docs/06） */}
        <img src="/logo.svg" alt="THE POSTER" className="h-[26px] w-auto min-[821px]:h-[40px]" />
      </Link>
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={toggleLocale}
          className="lang-button"
        >
          {t.langButton}
        </button>
      </div>
    </header>
  );
}
