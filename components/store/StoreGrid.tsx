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

// scattered（段違い）用の決め打ちパラメータ。デスクトップ限定で適用（docs/06）。
// すべて決め打ち＝再読込で安定（ランダム禁止）。並び順・DOM・キーボード順は不変。
//
// 縦オフセット(px): 0〜約200の不規則値。長さ7は列数4と互いに素 → 列ごとに段差が揃わない。
const SCATTER_OFFSETS = [0, 96, 28, 168, 56, 12, 124];
// 大小スケール: 決め打ち2〜3段階。長さ5は列数4と互いに素。
// 【縮小のみ（<=1.0）】拡大(>1.0)はワイド画面でカード幅Wが伸びると 0.08W>gap や
// 縦の拡大分>gap-y で重なり得るため不採用（docs/06「崩壊させない」を全幅で確実に満たす）。
// transform: scale のため layout は不変。origin は上中央。
const SCATTER_SCALES = [1.0, 0.9, 1.0, 0.94, 0.86];

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
      <div className="relative z-[1] grid grid-cols-2 items-start gap-x-4 gap-y-[6px] px-[18px] pb-16 min-[821px]:grid-cols-4 min-[821px]:gap-x-[22px] min-[821px]:gap-y-6 min-[821px]:px-7 min-[821px]:pb-20">
        {products.map((p, index) => {
          const purchasable = isPurchasable(p);
          const left = remaining(p);
          const extras = SAMPLE_EXTRAS[p.slug];
          // 決め打ちの縦オフセット＋大小スケール（毎回ランダム禁止・再読込で安定）。
          // カードの通し index から固定パターンを引く。行が揃わないよう列周期(4)と
          // 互いに素な長さ(7/5)の配列にして、列ごとに同じ段差・同じ大小が並ばないようにする。
          const offset = SCATTER_OFFSETS[index % SCATTER_OFFSETS.length];
          const scale = SCATTER_SCALES[index % SCATTER_SCALES.length];
          return (
            <article
              key={p.id}
              className="flex flex-col scatter-card"
              style={
                {
                  "--scatter-offset": `${offset}px`,
                  "--scatter-scale": scale,
                } as React.CSSProperties
              }
            >
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
                      className="cursor-pointer whitespace-nowrap rounded-full border border-ink bg-ink px-[18px] py-2 text-[11px] font-medium tracking-[0.06em] text-white transition-transform hover:-translate-y-px"
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
