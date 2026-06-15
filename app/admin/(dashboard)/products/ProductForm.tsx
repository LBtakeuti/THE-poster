"use client";

// 商品の追加・編集フォーム（new/edit 共通）。docs/07 の最小セット。
// 保存（draft維持）/ 公開する（active）/ 削除 を提供。価格は表示ドル・保存cents。
import { useActionState } from "react";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  type ProductFormState,
} from "./actions";
import type { Product } from "@/lib/products-shared";

const initial: ProductFormState = { error: null };

export function ProductForm({ product }: { product?: Product }) {
  const isEdit = Boolean(product);
  const [state, formAction, pending] = useActionState(
    isEdit ? updateProductAction : createProductAction,
    initial,
  );
  const [delState, deleteAction, delPending] = useActionState(
    deleteProductAction,
    initial,
  );

  return (
    <div className="max-w-[620px]">
      <h1 className="mb-6 text-lg font-semibold tracking-[0.01em]">
        {isEdit ? "商品を編集" : "商品を追加"}
      </h1>

      <form action={formAction} className="flex flex-col gap-4">
        {isEdit ? <input type="hidden" name="id" value={product!.id} /> : null}

        <Field label="作品名" required>
          <input
            name="title"
            defaultValue={product?.title ?? ""}
            required
            className={inputCls}
          />
        </Field>

        <Field label="slug（空なら作品名から自動生成・編集可）">
          <input
            name="slug"
            defaultValue={product?.slug ?? ""}
            placeholder="morning-sun"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="価格（ドル）" required>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product ? (product.price_cents / 100).toString() : ""}
              required
              className={inputCls}
            />
          </Field>
          <Field label="販売上限（限定枚数）" required>
            <input
              name="edition_size"
              type="number"
              min={product?.sold_count || 1}
              step="1"
              defaultValue={product?.edition_size ?? ""}
              required
              className={inputCls}
            />
          </Field>
        </div>

        {isEdit ? (
          <p className="-mt-2 text-[11px] text-muted">
            既に {product!.sold_count} 枚販売済み。販売上限はこれ未満にできません。
          </p>
        ) : null}

        <Field label="画像（Storage posters へ。1枚）">
          <input
            name="image"
            type="file"
            accept="image/*"
            className="text-[12px] text-subtle file:mr-3 file:rounded-full file:border file:border-hair file:bg-white file:px-3 file:py-1 file:text-[11px]"
          />
          {product?.image_path ? (
            <span className="mt-1 block text-[11px] text-muted">
              現在: {product.image_path}（未選択なら維持）
            </span>
          ) : null}
        </Field>

        <Field label="説明（日本語・任意）">
          <textarea
            name="description_ja"
            defaultValue={product?.description_ja ?? ""}
            rows={2}
            className={inputCls}
          />
        </Field>
        <Field label="説明（英語・任意）">
          <textarea
            name="description_en"
            defaultValue={product?.description_en ?? ""}
            rows={2}
            className={inputCls}
          />
        </Field>

        {state.error ? (
          <p className="text-[12px] text-danger">{state.error}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl border border-line px-5 py-3 text-[13px] font-medium transition hover:border-ink disabled:opacity-45"
          >
            {pending ? "処理中…" : "保存（下書き）"}
          </button>
          <button
            type="submit"
            name="publish"
            value="1"
            disabled={pending}
            className="rounded-xl bg-ink px-5 py-3 text-[13px] font-semibold text-white transition hover:-translate-y-px disabled:opacity-45"
          >
            公開する
          </button>
        </div>
      </form>

      {isEdit ? (
        <form action={deleteAction} className="mt-10 border-t border-hair pt-6">
          <input type="hidden" name="id" value={product!.id} />
          {delState.error ? (
            <p className="mb-3 text-[12px] text-danger">{delState.error}</p>
          ) : null}
          <button
            type="submit"
            disabled={delPending}
            // 物理削除。過去注文があると FK restrict で弾かれ、案内文言が出る。
            onClick={(e) => {
              if (!confirm("この商品を削除しますか？（過去の注文がある場合は削除できません）"))
                e.preventDefault();
            }}
            className="text-[12px] text-danger underline-offset-2 hover:underline disabled:opacity-45"
          >
            {delPending ? "削除中…" : "この商品を削除"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

const inputCls =
  "w-full rounded-[10px] border border-line bg-white px-[13px] py-3 text-sm text-ink outline-none transition focus:border-ink focus:shadow-[0_0_0_3px_rgba(23,21,19,.06)]";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="text-[11px] tracking-[0.04em] text-subtle">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
