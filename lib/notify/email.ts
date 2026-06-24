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
