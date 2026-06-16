"use client";

// チェックアウトのヘッダー（プロト #checkout header + back-link）。
// ロゴ（クリックでトップ）/ 右に「Secure checkout」+ 言語トグル / 下に「← ショップに戻る」。
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";

export function CheckoutHeader() {
  const { t, toggleLocale } = useI18n();
  return (
    <>
      <header className="relative z-10 flex items-center justify-between px-5 pb-[14px] pt-5 min-[821px]:px-8 min-[821px]:pb-[18px] min-[821px]:pt-[26px]">
        <Link href="/" aria-label="THE POSTER" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- 軽量な単色SVGワードマーク（docs/06） */}
          <img src="/logo.svg" alt="THE POSTER" className="h-[15px] w-auto" />
        </Link>
        <div className="flex items-center gap-5">
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
            {t.metaCheckout}
          </span>
          <button
            type="button"
            onClick={toggleLocale}
            className="cursor-pointer rounded-full border border-hair px-3 py-[5px] text-[11px] tracking-[0.1em] text-muted transition-colors hover:border-ink hover:text-ink"
          >
            {t.langButton}
          </button>
        </div>
      </header>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 pt-1 text-[12px] tracking-[0.04em] text-subtle transition-colors hover:text-ink min-[821px]:px-8"
      >
        {t.back}
      </Link>
    </>
  );
}
