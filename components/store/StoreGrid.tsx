"use client";

// ストアのグリッド本体。プロト .grid / .card を踏襲。
// - PC4列 / スマホ2列（max-width:820px で2列）。
// - 各カード: 上に回る3Dポスター（PosterCard）、下に 作品名 / sub・価格 / 残り N/M / Buy / 残量バー。
// - 在庫0(=purchasable false): Buy 無効 + "Archived" + ポスター褪色（Poster 側で opacity 低下）。
import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PosterCanvas } from "@/components/poster/PosterCanvas";
import { PosterCard } from "@/components/poster/PosterCard";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { useI18n } from "@/lib/i18n/context";
import { money } from "@/lib/format";
import { isPurchasable, remaining, type Product } from "@/lib/products-shared";
import { SAMPLE_EXTRAS } from "@/lib/sample-products";

type StoreGridProps = {
  products: Product[];
  // image_path から組み立てた公開URL（実画像）。未設定はサンプル絵柄で描画。
  imageUrls: Record<string, string | null>;
};

export function StoreGrid({ products, imageUrls }: StoreGridProps) {
  const { t, locale } = useI18n();
  const reducedMotion = usePrefersReducedMotion();

  // 購入可能を先・売り切れを後ろへ（安定ソートで元の並び順は保つ）。
  const ordered = [...products].sort(
    (a, b) => Number(isPurchasable(b)) - Number(isPurchasable(a)),
  );

  return (
    <>
      <PosterCanvas />
      <div className="store-grid">
        {ordered.map((p) => {
          const purchasable = isPurchasable(p);
          const left = remaining(p);
          const extras = SAMPLE_EXTRAS[p.slug];
          return (
            <article key={p.id} className="store-card">
              <PosterCardLink slug={p.slug}>
                <PosterCard
                  title={p.title}
                  editionSize={p.edition_size}
                  sold={!purchasable}
                  reducedMotion={reducedMotion}
                  imageUrl={imageUrls[p.id] ?? null}
                  comp={extras?.comp}
                  accent={extras?.accent}
                />
              </PosterCardLink>
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
                    <span className="sold-badge">SOLD OUT</span>
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

// 3D ポスター領域のクリック/タップで詳細 /poster/[slug] へ遷移する。
// ドラッグ回転と競合しないよう、pointerdown→pointerup の移動量が小さい時だけクリック扱い。
function PosterCardLink({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    // 移動量が小さければ「クリック」とみなして遷移（ドラッグ回転は遷移しない）。
    const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y);
    if (moved < 6) {
      router.push(`/poster/${encodeURIComponent(slug)}`);
    }
  };

  return (
    <div
      className="poster-card-link"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {children}
    </div>
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
