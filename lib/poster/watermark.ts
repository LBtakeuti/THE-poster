// 作品画像に「透かし（ウォーターマーク）」を焼くクライアント用ユーティリティ。
// 狙い：保存の手間を上げる＋盗っても使えないようプレビュー透かしを残す。
// 100%のダウンロード防止は不可能（Webの仕組み上）。本実装は第一弾。
// 第二弾（Supabase接続後）でサーバー側の透かし焼き＆中解像度化に置き換える想定。

// 文言は1箇所変更で差し替え可能にするため先頭に定数定義する。
export const WATERMARK_TEXT = "THE POSTER · PREVIEW";

/**
 * 元の絵（canvas または image）を新しい canvas に描き、
 * その上に斜め45度・半透明のテキストをタイル状に敷き詰めて返す。
 * - 透かし色: rgba(23,21,19,0.16) 程度（読めるが鑑賞を妨げすぎない濃さ）
 * - 回転: -30度（やや斜め）でタイル繰り返し
 */
export function applyWatermark(
  src: HTMLCanvasElement | HTMLImageElement,
  w: number,
  h: number,
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;

  // 元の絵をそのまま描画。
  ctx.drawImage(src, 0, 0, w, h);

  // 透かしの文字サイズ・タイル間隔は画像サイズに対して相対的に決める。
  const fontSize = Math.max(16, Math.round(w * 0.045));
  const stepX = fontSize * 11;
  const stepY = fontSize * 6;

  ctx.save();
  ctx.fillStyle = "rgba(23,21,19,0.16)";
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 画面中央を基準に -30 度回転してから、はみ出すくらい広めにタイルを敷く。
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-30 * Math.PI) / 180);

  // 回転後でも全面を覆えるよう、対角線ぶんの広さで走査する。
  const reach = Math.ceil(Math.hypot(w, h));
  for (let y = -reach; y <= reach; y += stepY) {
    // 行ごとに半分ずらしてレンガ積みにする（隙間を減らす）。
    const offset = (Math.round(y / stepY) % 2) * (stepX / 2);
    for (let x = -reach; x <= reach; x += stepX) {
      ctx.fillText(WATERMARK_TEXT, x + offset, y);
    }
  }
  ctx.restore();

  return out;
}
