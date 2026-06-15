// ストアページ `/`。products は サーバーコンポーネントで取得（active/archived、sort_order 順）。
// SEO とパフォーマンスのため一覧取得はサーバー側で行う（docs/06）。
// 見た目・操作感の正は reference/poster-store-prototype.html（ロゴのみ公式SVG）。
import { Header } from "@/components/store/Header";
import { StoreGrid } from "@/components/store/StoreGrid";
import { getStoreProducts, posterPublicUrl } from "@/lib/products";

export default async function HomePage() {
  const { products } = await getStoreProducts();

  // 実画像の公開URLをサーバー側で組み立てて渡す（image_path 未設定はサンプル絵柄で描画）。
  const imageUrls: Record<string, string | null> = {};
  for (const p of products) {
    imageUrls[p.id] = posterPublicUrl(p.image_path);
  }

  return (
    <main className="min-h-screen">
      <Header />
      <StoreGrid products={products} imageUrls={imageUrls} />
    </main>
  );
}
