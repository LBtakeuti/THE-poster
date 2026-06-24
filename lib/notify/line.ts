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
