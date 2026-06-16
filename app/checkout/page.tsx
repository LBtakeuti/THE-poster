// チェックアウト `/checkout`（docs/06・05）。
// ストアの Buy から商品 slug と数量を引き継ぐ（?slug=...&qty=...）。
// 商品はサーバーで取得（公開情報）。金額の最終確定は API/webhook がサーバー価格で行う。
import { notFound } from "next/navigation";
import { getStoreProducts } from "@/lib/products";
import { isPurchasable } from "@/lib/products-shared";
import { SHIPPING_CENTS } from "@/lib/checkout/shipping";
import { CheckoutHeader } from "@/components/checkout/CheckoutHeader";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; qty?: string }>;
}) {
  const { slug } = await searchParams;
  if (!slug) notFound();

  const { products } = await getStoreProducts();
  const product = products.find((p) => p.slug === slug);
  // 購入不可（存在しない/非公開/在庫0）はストアへ戻す扱い。
  if (!product || !isPurchasable(product)) notFound();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

  return (
    <main className="min-h-screen">
      <CheckoutHeader />
      <CheckoutForm
        product={product}
        shippingCents={SHIPPING_CENTS}
        siteUrl={siteUrl}
      />
    </main>
  );
}
