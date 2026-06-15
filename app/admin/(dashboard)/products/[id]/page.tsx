// 商品の編集 `/admin/products/[id]`。
import { notFound } from "next/navigation";
import { getAdminProduct } from "@/lib/admin/products";
import { ProductForm } from "../ProductForm";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getAdminProduct(id);
  if (!product) notFound();
  return <ProductForm product={product} />;
}
