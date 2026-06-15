// products のサーバー側取得（ストア一覧用）。
// 一覧は status in ('active','archived') を sort_order 昇順で取得（docs/03・06）。
// 型・派生ロジックは client からも使うため lib/products-shared.ts に分離している。
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { SAMPLE_PRODUCTS } from "@/lib/sample-products";
import type { Product } from "@/lib/products-shared";

export type { Product, ProductStatus } from "@/lib/products-shared";
export { remaining, isPurchasable } from "@/lib/products-shared";

const STORE_COLUMNS =
  "id, slug, title, description_ja, description_en, price_cents, currency, edition_size, sold_count, image_path, status, sort_order";

/**
 * ストア表示用の products を取得する。
 * 実フェッチのコードパスは常に実装する。Supabase 未接続（env 未設定）や取得失敗時のみ
 * seed.sql 相当のサンプルにフォールバックしてローカル描画を可能にする。
 */
export async function getStoreProducts(): Promise<{
  products: Product[];
  usingSample: boolean;
}> {
  // env 未設定ならフェッチを試みずサンプルへ（ローカル描画確認用）。
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { products: SAMPLE_PRODUCTS, usingSample: true };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select(STORE_COLUMNS)
      .in("status", ["active", "archived"])
      .order("sort_order", { ascending: true });

    if (error || !data) {
      return { products: SAMPLE_PRODUCTS, usingSample: true };
    }
    return { products: data as Product[], usingSample: false };
  } catch {
    // ネットワーク/設定不備など想定外もサンプルで描画を止めない。
    return { products: SAMPLE_PRODUCTS, usingSample: true };
  }
}

/**
 * products.image_path（'posters' バケット内パス）から公開 URL を組み立てる。
 * image_path 未設定（サンプル等）は null を返し、呼び出し側でプレースホルダ描画する。
 */
export function posterPublicUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/posters/${imagePath}`;
}
