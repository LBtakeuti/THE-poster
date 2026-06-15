// products の型と純粋な派生ロジック（サーバー/クライアント両方から安全に import 可能）。
// ※ ここには next/headers など server 専用の依存を入れない。

export type ProductStatus = "draft" | "active" | "archived";

export type Product = {
  id: string;
  slug: string;
  title: string;
  description_ja: string | null;
  description_en: string | null;
  price_cents: number;
  currency: string;
  edition_size: number;
  sold_count: number;
  image_path: string | null;
  status: ProductStatus;
  sort_order: number;
};

/** 残数（派生値）。remaining = edition_size - sold_count（docs/03）。 */
export function remaining(
  p: Pick<Product, "edition_size" | "sold_count">,
): number {
  return Math.max(0, p.edition_size - p.sold_count);
}

/** 購入可否: status=active かつ 残数>0（docs/03）。 */
export function isPurchasable(p: Product): boolean {
  return p.status === "active" && remaining(p) > 0;
}
