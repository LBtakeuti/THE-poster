// 管理画面用の products 取得（全 status）。admin RLS で読み書きが通る（service role 不要）。
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/products-shared";

const ADMIN_COLUMNS =
  "id, slug, title, description_ja, description_en, price_cents, currency, edition_size, sold_count, image_path, status, sort_order";

/** 全 status の商品を sort_order 昇順で取得（管理一覧用）。 */
export async function listAdminProducts(): Promise<Product[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_COLUMNS)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data as Product[];
}

/** 1 件取得（編集用）。 */
export async function getAdminProduct(id: string): Promise<Product | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Product;
}

/** title から slug を自動生成する（英数とハイフン。日本語は除去されるため fallback 付き）。 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || `poster-${Date.now().toString(36)}`;
}
