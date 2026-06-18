"use client";

// ストアのグリッド本体。プロト .grid / .card を踏襲。
// - PC4列 / スマホ2列（max-width:820px で2列）。
// - 各カード: 上に回る3Dポスター（PosterCard）、下に 作品名 / sub・価格 / 残り N/M / Buy / 残量バー。
// - 在庫0(=purchasable false): Buy 無効 + "Archived" + ポスター褪色（Poster 側で opacity 低下）。
import { useEffect, useState } from "react";
import Link from "next/link";
import { PosterCanvas } from "@/components/poster/PosterCanvas";
import { PosterCard } from "@/components/poster/PosterCard";
import { useI18n } from "@/lib/i18n/context";
import { money } from "@/lib/format";
import { isPurchasable, remaining, type Product } from "@/lib/products-shared";
import { SAMPLE_EXTRAS } from "@/lib/sample-products";

type StoreGridProps = {
  products: Product[];
  // image_path から組み立てた公開URL（実画像）。未設定はサンプル絵柄で描画。
  imageUrls: Record<string, string | null>;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export function StoreGrid({ products, imageUrls }: StoreGridProps) {
  const { t, locale } = useI18n();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <>
      <PosterCanvas />
      <div className="store-grid">
        {products.map((p) => {
          const purchasable = isPurchasable(p);
          const left = remaining(p);
          const extras = SAMPLE_EXTRAS[p.slug];
          return (
            <article key={p.id} className="store-card">
              <PosterCard
                title={p.title}
                editionSize={p.edition_size}
                sold={!purchasable}
                reducedMotion={reducedMotion}
                imageUrl={imageUrls[p.id] ?? null}
                comp={extras?.comp}
                accent={extras?.accent}
              />
              <div className="px-1 pb-[14px] pt-[2px]">
                <div className="text-sm font-semibold tracking-[0.02em]">
                  {p.title}
                </div>
                <div className="mt-[5px] text-[10px] uppercase tracking-[0.18em] text-muted">
                  Riso · A2 · {money(p.price_cents, locale, p.currency)}
                </div>
                <div className="mt-[11px] flex items-center justify-between gap-[10px]">
                  <span className="whitespace-nowrap text-[11px] tabular-nums tracking-[0.04em] text-subtle">
                    {renderStock(t.stockLeft(left, p.edition_size), left)}
                  </span>
                  {purchasable ? (
                    // Buy → /checkout に商品 slug を引き継ぐ（数量は checkout 側で 1〜残数）。
                    <Link
                      href={`/checkout?slug=${encodeURIComponent(p.slug)}`}
                      className="buy-button"
                    >
                      {t.buy}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed whitespace-nowrap rounded-full border border-hair bg-transparent px-[18px] py-2 text-[10px] uppercase tracking-[0.12em] text-muted"
                    >
                      {t.archived}
                    </button>
                  )}
                </div>
                <div className="mt-[10px] h-[2px] w-full overflow-hidden rounded-sm bg-hair">
                  <i
                    className="block h-full bg-ink transition-[width] duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
                    style={{ width: `${(left / p.edition_size) * 100}%` }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

// 残数テキスト中の数字だけ太字にする（プロト syncCard 相当・言語非依存）。
function renderStock(full: string, left: number) {
  const n = String(left);
  const idx = full.indexOf(n);
  if (idx < 0) return full;
  return (
    <>
      {full.slice(0, idx)}
      <b className="font-semibold text-ink">{n}</b>
      {full.slice(idx + n.length)}
    </>
  );
}
