// プロト試作の paintCanvas() / backCanvas() を移植。
// サンプル商品（実画像なし）の絵柄をコードで描く。実画像がある商品はテクスチャを直接使う。
import type { PosterComposition } from "@/lib/sample-products";

const W = 560;
const H = 792;

/** 作品の正面テクスチャを Canvas で描く（プロト paintCanvas 相当）。 */
export function paintFront(opts: {
  title: string;
  comp: PosterComposition;
  accent: string;
  editionSize: number;
}): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, W, H);
  // 微細なノイズで紙の質感だけ足す。
  for (let i = 0; i < 1400; i++) {
    x.fillStyle = "rgba(0,0,0," + Math.random() * 0.02 + ")";
    x.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }
  const m = 54;
  if (opts.comp === "sun") {
    x.fillStyle = opts.accent;
    x.beginPath();
    x.arc(W * 0.5, H * 0.36, 150, 0, 7);
    x.fill();
    x.fillStyle = "#171513";
    x.fillRect(m, H * 0.37, W - 2 * m, 4);
  } else if (opts.comp === "lowsun") {
    x.fillStyle = "#171513";
    x.fillRect(m, H * 0.5, W - 2 * m, 4);
    x.save();
    x.beginPath();
    x.rect(0, 0, W, H * 0.5);
    x.clip();
    x.fillStyle = opts.accent;
    x.beginPath();
    x.arc(W * 0.5, H * 0.5, 160, Math.PI, 0);
    x.fill();
    x.restore();
  } else if (opts.comp === "arc") {
    x.strokeStyle = opts.accent;
    x.lineWidth = 18;
    x.beginPath();
    x.arc(W * 0.5, H * 0.62, 150, Math.PI * 1.15, Math.PI * 1.85);
    x.stroke();
    x.fillStyle = "#171513";
    x.beginPath();
    x.arc(W * 0.5, H * 0.3, 7, 0, 7);
    x.fill();
  } else {
    // hills
    x.fillStyle = opts.accent;
    x.fillRect(m, H * 0.3, W - 2 * m, 3);
    x.strokeStyle = "#171513";
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(m, H * 0.5);
    x.quadraticCurveTo(W * 0.5, H * 0.44, W - m, H * 0.52);
    x.stroke();
    x.beginPath();
    x.moveTo(m, H * 0.58);
    x.quadraticCurveTo(W * 0.42, H * 0.53, W - m, H * 0.6);
    x.stroke();
  }
  const jp = opts.title.split(" — ")[0];
  const en = (opts.title.split(" — ")[1] || "").toUpperCase().split("").join(" ");
  x.fillStyle = "#171513";
  x.textAlign = "left";
  x.font = '600 72px Georgia,"Hiragino Mincho ProN",serif';
  x.fillText(jp, m, H * 0.8);
  x.font = "400 16px ui-sans-serif,sans-serif";
  x.fillStyle = "#5d574f";
  x.fillText(en, m + 3, H * 0.835);
  x.font = "400 14px ui-monospace,monospace";
  x.fillStyle = "#171513";
  x.fillText("No.01", m, H * 0.93);
  x.textAlign = "right";
  x.fillText("ed. " + opts.editionSize, W - m, H * 0.93);
  x.strokeStyle = "rgba(23,21,19,0.22)";
  x.lineWidth = 1.5;
  x.strokeRect(m * 0.62, m * 0.62, W - 1.24 * m, H - 1.24 * m);
  return c;
}

/** 裏面（白紙 + 透かしワードマーク）。プロト backCanvas 相当（名称は THE POSTER）。 */
export function paintBack(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, W, H);
  for (let i = 0; i < 1100; i++) {
    x.fillStyle = "rgba(0,0,0," + Math.random() * 0.02 + ")";
    x.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }
  x.translate(W / 2, H / 2);
  x.textAlign = "center";
  x.fillStyle = "rgba(23,21,19,0.28)";
  x.font = "600 22px ui-sans-serif,sans-serif";
  x.fillText("T H E   P O S T E R", 0, 0);
  return c;
}
