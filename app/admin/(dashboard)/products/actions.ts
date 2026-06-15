"use server";

// 商品 CRUD のサーバーアクション（docs/07）。admin RLS 経由（service role 不使用）。
// ガード:
//  - edition_size は sold_count 未満にできない（不変条件 7・DB CHECK と整合）。
//  - 手動アーカイブ（active/draft → archived）。
//  - アーカイブ解除（archived → active）は残数>0 のときのみ。
//  - slug は必須・unique（重複時はエラー文言で案内）。
//  - 削除は物理削除。order_items から FK 参照されていれば restrict で弾かれ、案内文言を返す。
//  - 画像は Storage 'posters' にアップロードし image_path を保存。
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
import { getAdminProduct, slugify } from "@/lib/admin/products";

export type ProductFormState = { error: string | null };

const POSTERS_BUCKET = "posters";

// フォームから商品入力を取り出して検証する（new/edit 共通）。
function parseProductForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const priceDollars = String(formData.get("price") ?? "").trim();
  const editionSize = Number(formData.get("edition_size"));
  const descJa = String(formData.get("description_ja") ?? "").trim();
  const descEn = String(formData.get("description_en") ?? "").trim();

  return {
    title,
    slug: slugInput ? slugify(slugInput) : slugify(title),
    // 表示はドル等、保存は cents。小数2桁まで受けて整数 cents へ。
    priceCents: Math.round(Number(priceDollars) * 100),
    editionSize,
    descriptionJa: descJa || null,
    descriptionEn: descEn || null,
  };
}

function validateBase(p: ReturnType<typeof parseProductForm>): string | null {
  if (!p.title) return "作品名は必須です。";
  if (!Number.isFinite(p.priceCents) || p.priceCents < 0)
    return "価格を正しく入力してください。";
  if (!Number.isInteger(p.editionSize) || p.editionSize <= 0)
    return "販売上限（限定枚数）は 1 以上で入力してください。";
  return null;
}

async function uploadImageIfPresent(
  formData: FormData,
  slug: string,
): Promise<{ imagePath?: string; error?: string }> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return {};

  const supabase = await createClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${slug}/${Date.now().toString(36)}.${ext}`;
  const { error } = await supabase.storage
    .from(POSTERS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) return { error: "画像のアップロードに失敗しました。" };
  return { imagePath: path };
}

export async function createProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();
  const parsed = parseProductForm(formData);
  const baseErr = validateBase(parsed);
  if (baseErr) return { error: baseErr };

  const supabase = await createClient();
  const upload = await uploadImageIfPresent(formData, parsed.slug);
  if (upload.error) return { error: upload.error };

  // 「公開する」で active、それ以外は draft。
  const status = formData.get("publish") ? "active" : "draft";

  const { error } = await supabase.from("products").insert({
    slug: parsed.slug,
    title: parsed.title,
    description_ja: parsed.descriptionJa,
    description_en: parsed.descriptionEn,
    price_cents: parsed.priceCents,
    edition_size: parsed.editionSize,
    image_path: upload.imagePath ?? null,
    status,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "この slug は既に使われています。別の slug にしてください。" };
    }
    return { error: "保存に失敗しました。入力内容をご確認ください。" };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "対象の商品が見つかりません。" };

  const current = await getAdminProduct(id);
  if (!current) return { error: "対象の商品が見つかりません。" };

  const parsed = parseProductForm(formData);
  const baseErr = validateBase(parsed);
  if (baseErr) return { error: baseErr };

  // edition_size は sold_count 未満にできない（DB CHECK と整合）。
  if (parsed.editionSize < current.sold_count) {
    return {
      error: `販売上限は既に売れた数（${current.sold_count}）以上にしてください。`,
    };
  }

  const supabase = await createClient();
  const upload = await uploadImageIfPresent(formData, parsed.slug);
  if (upload.error) return { error: upload.error };

  const patch: Record<string, unknown> = {
    slug: parsed.slug,
    title: parsed.title,
    description_ja: parsed.descriptionJa,
    description_en: parsed.descriptionEn,
    price_cents: parsed.priceCents,
    edition_size: parsed.editionSize,
  };
  // 画像は差し替え時のみ更新（未選択なら既存を維持）。
  if (upload.imagePath) patch.image_path = upload.imagePath;
  // 「公開する」を押した場合のみ active 化（draft 維持の保存と区別）。
  if (formData.get("publish")) patch.status = "active";

  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { error: "この slug は既に使われています。別の slug にしてください。" };
    }
    return { error: "更新に失敗しました。入力内容をご確認ください。" };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  redirect("/admin/products");
}

/** 手動アーカイブ（active/draft → archived）。売り切れ前でも販売停止できる。 */
export async function archiveProductAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("products").update({ status: "archived" }).eq("id", id);
  revalidatePath("/admin/products");
}

/** アーカイブ解除（archived → active）。残数>0 のときのみ。 */
export async function unarchiveProductAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const current = await getAdminProduct(id);
  if (!current) return;
  // 残数なし（完売）は解除しない（自動アーカイブ trigger と矛盾させない）。
  if (current.edition_size - current.sold_count <= 0) return;
  const supabase = await createClient();
  await supabase.from("products").update({ status: "active" }).eq("id", id);
  revalidatePath("/admin/products");
}

/** 物理削除。order_items から参照されていれば FK restrict で弾かれ案内する。 */
export async function deleteProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "対象の商品が見つかりません。" };

  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    // 23503 = foreign_key_violation（order_items から参照あり）。
    if (error.code === "23503") {
      return {
        error:
          "過去の注文があるため削除できません。代わりにアーカイブしてください。",
      };
    }
    return { error: "削除に失敗しました。" };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}
