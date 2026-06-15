// `/admin` は商品一覧へ送る（admin 判定は遷移先 layout で行う）。
import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  redirect("/admin/products");
}
