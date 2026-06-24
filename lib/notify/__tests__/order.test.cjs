// lib/notify/order.ts の純ロジック（buildItemLines / buildOrderEmailHtml）のユニットテスト。
// server-only / sendEmail / notifyAdminLine はスタブして副作用なしで検証する。
// 各ケースは独立実行可能。本番データには一切触れない。
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Module = require("module");

// require() が解決する前にスタブを登録する。
// Node の Module キャッシュに偽モジュールを直接挿入することで
// server-only / email / line への実際の require を差し替える。
// @/ エイリアスの実パスを解決するヘルパ
const path = require("path");
const projectRoot = path.resolve(__dirname, "../../..");

function aliasToReal(request) {
  if (request.startsWith("@/")) {
    return path.join(projectRoot, request.slice(2));
  }
  return null;
}

const stubModules = {
  "server-only": {},
  "@/lib/notify/email": { sendEmail: async () => {} },
  "@/lib/notify/line": { notifyAdminLine: async () => {} },
};

const _origResolve = Module._resolveFilename.bind(Module);
Module._resolveFilename = function (request, ...rest) {
  if (Object.prototype.hasOwnProperty.call(stubModules, request)) {
    return request; // キャッシュキーとして使う仮パス
  }
  // @/ エイリアスを実パスに変換
  const real = aliasToReal(request);
  if (real) return _origResolve(real, ...rest);
  return _origResolve(request, ...rest);
};

// スタブをキャッシュに登録しておく
for (const [key, exports] of Object.entries(stubModules)) {
  require.cache[key] = {
    id: key,
    filename: key,
    loaded: true,
    exports,
    parent: null,
    children: [],
    paths: [],
  };
}

// スタブ登録後に対象モジュールを require する
const { buildItemLines, buildOrderEmailHtml } = require("../order.ts");

// ---- buildItemLines -------------------------------------------------------

test("buildItemLines: 空配列は例外なく空文字を返す", () => {
  assert.equal(buildItemLines([]), "");
});

test("buildItemLines: 1明細 — タイトル・数量・金額が含まれる", () => {
  const result = buildItemLines([
    { title_snapshot: "Poster A", quantity: 1, unit_price_cents: 4800 },
  ]);
  // 行数は1
  assert.equal(result.split("\n").length, 1);
  // タイトル
  assert.ok(result.includes("Poster A"), `タイトルが含まれない: ${result}`);
  // 数量
  assert.ok(result.includes("× 1"), `数量が含まれない: ${result}`);
  // 金額（JPY 4800円 → ¥4,800）
  assert.ok(result.includes("4,800"), `金額が含まれない: ${result}`);
});

test("buildItemLines: 数量2×単価4800 → 合計9600円", () => {
  const result = buildItemLines([
    { title_snapshot: "Poster B", quantity: 2, unit_price_cents: 4800 },
  ]);
  // 単価×数量=9600
  assert.ok(result.includes("9,600"), `合計金額が含まれない: ${result}`);
  assert.ok(result.includes("× 2"), `数量が含まれない: ${result}`);
});

test("buildItemLines: 複数明細 — 行数と区切りが正しい", () => {
  const result = buildItemLines([
    { title_snapshot: "Poster A", quantity: 1, unit_price_cents: 4800 },
    { title_snapshot: "Poster B", quantity: 2, unit_price_cents: 3000 },
    { title_snapshot: "Poster C", quantity: 1, unit_price_cents: 12000 },
  ]);
  const lines = result.split("\n");
  // 3行（改行で区切られている）
  assert.equal(lines.length, 3, `行数が3でない: ${JSON.stringify(lines)}`);
  // 各行にタイトルが含まれる
  assert.ok(lines[0].includes("Poster A"));
  assert.ok(lines[1].includes("Poster B"));
  assert.ok(lines[2].includes("Poster C"));
  // 2行目: 3000×2=6000
  assert.ok(lines[1].includes("6,000"), `2行目の金額が不正: ${lines[1]}`);
  // 3行目: 12000×1=12000
  assert.ok(lines[2].includes("12,000"), `3行目の金額が不正: ${lines[2]}`);
});

test("buildItemLines: 行フォーマットが `タイトル × 数量 — 金額` の形式", () => {
  const result = buildItemLines([
    { title_snapshot: "Art X", quantity: 3, unit_price_cents: 2000 },
  ]);
  // × と — が含まれる
  assert.ok(result.includes("×"), `× が含まれない: ${result}`);
  assert.ok(result.includes("—"), `— が含まれない: ${result}`);
});

// ---- buildOrderEmailHtml --------------------------------------------------

test("buildOrderEmailHtml: orderId が本文に含まれる", () => {
  const html = buildOrderEmailHtml({
    orderId: "order-abc-123",
    lines: "Poster A × 1 — ¥4,800",
    total: "¥4,800",
  });
  assert.ok(html.includes("order-abc-123"), `orderId が含まれない`);
});

test("buildOrderEmailHtml: total が本文に含まれる", () => {
  const html = buildOrderEmailHtml({
    orderId: "order-xyz",
    lines: "Poster A × 1 — ¥4,800",
    total: "¥9,600",
  });
  assert.ok(html.includes("¥9,600"), `total が含まれない`);
});

test("buildOrderEmailHtml: lines が <li> に分割される", () => {
  const html = buildOrderEmailHtml({
    orderId: "order-1",
    lines: "Poster A × 1 — ¥4,800\nPoster B × 2 — ¥6,000",
    total: "¥10,800",
  });
  const liCount = (html.match(/<li/g) || []).length;
  assert.equal(liCount, 2, `<li> 数が 2 でない: ${liCount}`);
});

test("buildOrderEmailHtml: & がエスケープされる（&amp;）", () => {
  const html = buildOrderEmailHtml({
    orderId: "order-1",
    lines: "A & B × 1 — ¥4,800",
    total: "¥4,800",
  });
  assert.ok(html.includes("&amp;"), `& がエスケープされない`);
  // 生の & が <li> の中に残っていないこと（属性値などの正常な箇所は除く）
  // lines 由来の & は必ず &amp; になる
  assert.ok(!html.includes(">A & B<"), `生の & が li に残っている`);
});

test("buildOrderEmailHtml: < がエスケープされる（&lt;）", () => {
  const html = buildOrderEmailHtml({
    orderId: "order-1",
    lines: "<script> × 1 — ¥4,800",
    total: "¥4,800",
  });
  assert.ok(html.includes("&lt;"), `< がエスケープされない`);
});

test("buildOrderEmailHtml: > がエスケープされる（&gt;）", () => {
  const html = buildOrderEmailHtml({
    orderId: "order-1",
    lines: "A>B × 1 — ¥4,800",
    total: "¥4,800",
  });
  assert.ok(html.includes("&gt;"), `> がエスケープされない`);
});

test("buildOrderEmailHtml: 空 lines でも例外なく HTML が返る", () => {
  const html = buildOrderEmailHtml({
    orderId: "order-empty",
    lines: "",
    total: "¥0",
  });
  assert.ok(typeof html === "string" && html.length > 0, `空文字が返った`);
  assert.ok(html.includes("order-empty"), `orderId が含まれない`);
});
