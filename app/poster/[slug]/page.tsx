// ポスター詳細ページ /poster/[slug]（第一弾）。
// - slug で 1 件取得。null は notFound()。
// - 画像URL（公開URL、サンプルは sample-poster.png フォールバック）を組み立てて子に渡す。
// - 大きい 3D ビュー（PosterDetail）＋情報パート（PosterDetailInfo）。
import { notFound } from "next/navigation";
import { Header } from "@/components/store/Header";
import { PosterDetail } from "@/components/poster/PosterDetail";
import { PosterDetailInfo } from "@/components/poster/PosterDetailInfo";
import { getProductBySlug, posterPublicUrl } from "@/lib/products";
import { isPurchasable } from "@/lib/products-shared";
import { SAMPLE_EXTRAS } from "@/lib/sample-products";

export default async function PosterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // 実画像の公開URL。未設定はサンプル絵柄で描画（page.tsx と同じデモ扱い）。
  let imageUrl = posterPublicUrl(product.image_path);
  if (!imageUrl && product.id === "sample-morning-sun") {
    imageUrl = "/sample-poster.png";
  }

  const extras = SAMPLE_EXTRAS[product.slug];

  return (
    <main className="min-h-screen">
      <Header />
      <div className="poster-detail">
        <div className="poster-detail-layout">
          <PosterDetail
            title={product.title}
            editionSize={product.edition_size}
            sold={!isPurchasable(product)}
            imageUrl={imageUrl}
            comp={extras?.comp}
            accent={extras?.accent}
          />
          <PosterDetailInfo product={product} />
        </div>
      </div>
    </main>
  );
}
