# 作業指示書: 購入通知（購入者へメール＝Resend / 管理者へLINE＝Messaging API）

## 目的
決済成功（`payment_intent.succeeded` → 在庫確定成功）時に、
1. 購入者へ THE POSTER ブランドの確認メールを送る（Resend）。
2. 管理者の LINE へ新規注文通知を送る（LINE Messaging API push）。

## 設計方針（厳守）
- 通知は **Webhook の在庫確定成功後**（`app/api/stripe/webhook/route.ts` の status=paid 確定後）に行う。
- 通知の失敗は **絶対に webhook を失敗させない**（try/catch でログのみ。必ず 200 を返す）。Stripe再送＝二重決済処理を防ぐため。
- **鍵が無ければ何もしない（no-op）**。env 未設定でもビルド・既存フローが壊れないこと（接続前でも安全）。
- 秘密鍵はサーバー専用（`NEXT_PUBLIC_` を付けない・不変条件3）。送信処理ファイルは `import "server-only"` を先頭に置く。
- 金額表示は `lib/format.ts` の `money(cents, 'ja')` を使う（JPYは円そのまま。×100しない）。

## 追加する環境変数（`.env.local.example` に追記。値は空でよい）
```
# --- 通知: 購入者メール（Resend） ---
RESEND_API_KEY=
# 例: "THE POSTER <orders@example.com>"（送信元。ドメイン認証済みアドレス）
ORDER_FROM_EMAIL=

# --- 通知: 管理者LINE（Messaging API） ---
LINE_CHANNEL_ACCESS_TOKEN=
LINE_ADMIN_USER_ID=
```

## 受け入れ条件
1. 上記 env が未設定でも tsc/lint が通り、既存の webhook フローが壊れない（通知は no-op）。
2. env 設定時、payment_intent.succeeded の在庫確定成功後に購入者メール＋管理者LINEが送られる実装になっている。
3. 通知処理が例外を投げても webhook は 200 を返す（commit成功時）。
4. tsc 0 / lint 0。

---

## 手順

### 1. 新規 `lib/notify/email.ts`
```ts
import "server-only";

// Resend HTTP API でメール送信。鍵が無ければ何もしない（no-op）。
export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_FROM_EMAIL;
  if (!apiKey || !from) return; // 未設定なら何もしない
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: args.to, subject: args.subject, html: args.html }),
    });
    if (!res.ok) {
      console.error("[email] send failed", res.status, await res.text());
    }
  } catch (e) {
    console.error("[email] send error", e);
  }
}
```

### 2. 新規 `lib/notify/line.ts`
```ts
import "server-only";

// LINE Messaging API で管理者へ push。鍵が無ければ何もしない（no-op）。
export async function notifyAdminLine(text: string): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_ADMIN_USER_ID;
  if (!token || !to) return; // 未設定なら何もしない
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text: text.slice(0, 4900) }],
      }),
    });
    if (!res.ok) {
      console.error("[line] push failed", res.status, await res.text());
    }
  } catch (e) {
    console.error("[line] push error", e);
  }
}
```

### 3. 新規 `lib/notify/order.ts`（注文取得＋本文生成＋送信。本文生成2関数は export してテスト可能に）
```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { money } from "@/lib/format";
import { sendEmail } from "./email";
import { notifyAdminLine } from "./line";

interface OrderItemRow {
  quantity: number;
  unit_price_cents: number;
  title_snapshot: string;
}

export function buildItemLines(items: OrderItemRow[]): string {
  return items
    .map(
      (it) =>
        `${it.title_snapshot} × ${it.quantity} — ${money(it.unit_price_cents * it.quantity, "ja")}`,
    )
    .join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildOrderEmailHtml(args: {
  orderId: string;
  lines: string;
  total: string;
}): string {
  const itemsHtml = args.lines
    .split("\n")
    .filter(Boolean)
    .map((l) => `<li style="margin:4px 0;">${escapeHtml(l)}</li>`)
    .join("");
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;color:#171513;padding:8px;">
  <h1 style="font-size:18px;letter-spacing:0.04em;margin:0 0 12px;">THE POSTER</h1>
  <p>ご注文ありがとうございます。下記の内容で承りました。</p>
  <ul style="list-style:none;padding:0;">${itemsHtml}</ul>
  <p style="font-weight:600;">合計: ${escapeHtml(args.total)}</p>
  <p style="color:#9a948c;font-size:12px;">注文ID: ${escapeHtml(args.orderId)}</p>
  <p style="color:#9a948c;font-size:12px;">商品は3〜5営業日以内に発送します。</p>
  </body></html>`;
}

// 決済成功した注文の通知（購入者メール＋管理者LINE）。例外は呼び出し側で握る。
export async function notifyPaidOrder(db: SupabaseClient, orderId: string): Promise<void> {
  const { data: order } = await db
    .from("orders")
    .select(
      "id, email, amount_total_cents, order_items(quantity, unit_price_cents, title_snapshot)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const items = (order.order_items ?? []) as OrderItemRow[];
  const lines = buildItemLines(items);
  const total = money(order.amount_total_cents ?? 0, "ja");

  // 1) 購入者へ確認メール
  if (order.email) {
    await sendEmail({
      to: order.email,
      subject: "THE POSTER — ご注文ありがとうございます",
      html: buildOrderEmailHtml({ orderId: order.id, lines, total }),
    });
  }

  // 2) 管理者へ LINE 通知
  await notifyAdminLine(
    `🛒 新規注文\n注文ID: ${order.id}\n${lines}\n合計: ${total}\n購入者: ${order.email ?? "-"}`,
  );
}
```
※ `money` の第2引数 `'ja'` は型 `Locale`。型エラーになる場合は `lib/i18n/dictionary` の `Locale` を import して `"ja" as Locale` で渡す等、tsを通すこと。
※ `order.order_items` の型が Supabase 型推論で合わない場合は最小限の型注釈で通す（上記 OrderItemRow キャスト）。

### 4. `app/api/stripe/webhook/route.ts` の成功直後に通知を差し込む
- 先頭の import に追加: `import { notifyPaidOrder } from "@/lib/notify/order";`
- 「成功（commit_order_stock 内で status=paid に更新済み）。」のコメント行と `return NextResponse.json({ received: true });` の間に下記を挿入:
```ts
    // 通知（購入者メール＋管理者LINE）。失敗しても webhook は 200 を返す（Stripe再送＝二重処理を防ぐ）。
    try {
      await notifyPaidOrder(db, orderId);
    } catch (e) {
      console.error("[notify] failed", e);
    }
```
（payment_failed 側には入れない。）

### 5. コミット
- コミットメッセージ例: `feat: 決済成功時に購入者へメール・管理者へLINE通知（鍵未設定時はno-op）`
- 変更ファイル: lib/notify/email.ts / lib/notify/line.ts / lib/notify/order.ts / app/api/stripe/webhook/route.ts / .env.local.example / docs/instructions/order-notifications.md

## 報告に含めること
- 受け入れ条件の達否・コミットハッシュ（tsc/lint はリード側で実行）
- money の locale 型まわりで調整した場合はその内容
