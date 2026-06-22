"use client";

// 詳細ページの情報パート（戻る／作品名／Riso·A2·価格／残数／購入 or SOLD OUT）。
// i18n を使うため client。表記は一覧（StoreGrid）と揃える。
import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { money } from "@/lib/format";
import { isPurchasable, remaining, type Product } from "@/lib/products-shared";

export function PosterDetailInfo({ product }: { product: Product }) {
  const { t, locale } = useI18n();
  const purchasable = isPurchasable(product);
  const left = remaining(product);

  return (
    <div className="poster-detail-info">
      <Link href="/" className="poster-detail-back">
        {t.back}
      </Link>
      <div className="poster-detail-title">{product.title}</div>
      <div className="poster-detail-sub">
        Riso · A2 · {money(product.price_cents, locale, product.currency)}
      </div>
      <div className="poster-detail-buyrow">
        <span className="whitespace-nowrap text-[12px] tabular-nums tracking-[0.04em] text-subtle">
          {t.stockLeft(left, product.edition_size)}
        </span>
        {purchasable ? (
          <Link
            href={`/checkout?slug=${encodeURIComponent(product.slug)}`}
            className="buy-button"
          >
            {t.buy}
          </Link>
        ) : (
          <span className="sold-badge">SOLD OUT</span>
        )}
      </div>
    </div>
  );
}
