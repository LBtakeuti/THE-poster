// ローカル描画確認用のサンプル商品。supabase/seed.sql の 8 点と一致させる。
// Supabase 未接続時のフォールバックでのみ使用（実フェッチのコードパスは lib/products.ts に実装済み）。
// 画像は seed されないため、プロト同様にコードで絵柄を描く（comp/accent）。
import type { Product } from "@/lib/products-shared";

// プロトの paintCanvas が使う絵柄タイプ。サンプル限定の付帯情報。
export type PosterComposition = "sun" | "lowsun" | "arc" | "hills";

export type SampleExtras = {
  comp: PosterComposition;
  accent: string;
};

export const SAMPLE_EXTRAS: Record<string, SampleExtras> = {
  "morning-sun": { comp: "sun", accent: "#d8442b" },
  "still-water": { comp: "lowsun", accent: "#2f4d6e" },
  "first-light": { comp: "arc", accent: "#c98a2b" },
  "distant-hills": { comp: "hills", accent: "#5d7d63" },
  afterglow: { comp: "sun", accent: "#c25a3c" },
  ripple: { comp: "hills", accent: "#3a6b78" },
  "mountain-shade": { comp: "arc", accent: "#7a5a86" },
  "white-night": { comp: "lowsun", accent: "#444455" },
};

// seed.sql と同じ値（price_cents / edition_size / sold_count / status / sort_order）。
// id は UUID 形式の固定値（React key 等に使用。実 DB の id とは無関係）。
export const SAMPLE_PRODUCTS: Product[] = [
  mk("morning-sun", "余白 — Morning Sun", 4800, 20, 0, "active", 10),
  mk("still-water", "静寂 — Still Water", 4800, 20, 7, "active", 20),
  mk("first-light", "朝霧 — First Light", 5200, 12, 8, "active", 30),
  mk("distant-hills", "遠景 — Distant Hills", 4800, 20, 0, "active", 40),
  mk("afterglow", "余韻 — Afterglow", 4800, 20, 11, "active", 50),
  // ripple は売り切れ → archived（seed.sql で明示 archive）。
  mk("ripple", "漣 — Ripple", 5200, 15, 15, "archived", 60),
  mk("mountain-shade", "山影 — Mountain Shade", 4800, 20, 0, "active", 70),
  mk("white-night", "白夜 — White Night", 5400, 10, 4, "active", 80),
];

function mk(
  slug: string,
  title: string,
  price_cents: number,
  edition_size: number,
  sold_count: number,
  status: Product["status"],
  sort_order: number,
): Product {
  return {
    id: `sample-${slug}`,
    slug,
    title,
    description_ja: null,
    description_en: null,
    price_cents,
    currency: "usd",
    edition_size,
    sold_count,
    image_path: null,
    status,
    sort_order,
  };
}
