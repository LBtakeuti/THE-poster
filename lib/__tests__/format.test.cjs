// lib/format.ts の moneyLocalized（表示専用固定換算）のユニットテスト。
// 純粋関数につき DB/ネットワーク非依存。各ケースは独立実行可能。
// Intl の記号・桁区切りは実行環境依存のため、数値部分の包含チェックで検証する。
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { moneyLocalized } = require("../format.ts");

// Intl が返す文字列から数字と小数点・カンマのみ抽出して比較するヘルパ。
// 例: "¥7,200" → "7200"（カンマ除去）、"$48.00" → "48.00"
function extractNumeric(str) {
  // カンマ区切りを除去し、数字と小数点だけ残す。
  return str.replace(/,/g, "").match(/[\d.]+/)?.[0] ?? "";
}

// ─── 同一通貨（換算なし） ────────────────────────────────────────────

test("同一通貨: source=USD, locale=en → USD のまま整形（48.00 を含む）", () => {
  const result = moneyLocalized(4800, "USD", "en");
  assert.ok(
    extractNumeric(result) === "48.00",
    `expected "48.00" in "${result}"`,
  );
});

test("同一通貨: source=JPY, locale=ja → JPY のまま整形（7200 を含む）", () => {
  const result = moneyLocalized(7200, "JPY", "ja");
  assert.ok(
    extractNumeric(result) === "7200",
    `expected "7200" in "${result}"`,
  );
});

// ─── 換算: USD → JPY（locale=ja） ────────────────────────────────────

test("USD→JPY: 4800 cents($48) → ¥7200", () => {
  // $48 × 150 = 7200 円
  const result = moneyLocalized(4800, "USD", "ja");
  assert.ok(
    extractNumeric(result) === "7200",
    `expected "7200" in "${result}"`,
  );
});

test("USD→JPY: 100 cents($1) → ¥150", () => {
  const result = moneyLocalized(100, "USD", "ja");
  assert.ok(
    extractNumeric(result) === "150",
    `expected "150" in "${result}"`,
  );
});

test("USD→JPY: 0 cents → ¥0", () => {
  const result = moneyLocalized(0, "USD", "ja");
  assert.ok(
    extractNumeric(result) === "0",
    `expected "0" in "${result}"`,
  );
});

// ─── 換算: JPY → USD（locale=en） ────────────────────────────────────

test("JPY→USD: 7200 円 → $48.00", () => {
  // 7200 ÷ 150 = 48.00 ドル
  const result = moneyLocalized(7200, "JPY", "en");
  assert.ok(
    extractNumeric(result) === "48.00",
    `expected "48.00" in "${result}"`,
  );
});

test("JPY→USD: 150 円 → $1.00", () => {
  const result = moneyLocalized(150, "JPY", "en");
  assert.ok(
    extractNumeric(result) === "1.00",
    `expected "1.00" in "${result}"`,
  );
});

test("JPY→USD: 0 円 → $0.00", () => {
  const result = moneyLocalized(0, "JPY", "en");
  assert.ok(
    extractNumeric(result) === "0.00",
    `expected "0.00" in "${result}"`,
  );
});

// ─── 未知通貨（安全側: 換算せずそのまま整形） ───────────────────────

test("未知通貨: source=EUR, locale=en → 換算せず EUR のまま整形", () => {
  // EUR のレートは未定義 → fallback でそのまま money() を呼ぶ
  // 4200 cents = $42.00 相当だが EUR のまま: 42.00
  const result = moneyLocalized(4200, "EUR", "en");
  assert.ok(
    extractNumeric(result) === "42.00",
    `expected "42.00" in "${result}"`,
  );
});

test("未知通貨: source=EUR, locale=ja → 換算せず EUR のまま整形", () => {
  const result = moneyLocalized(4200, "EUR", "ja");
  assert.ok(
    extractNumeric(result) === "42.00",
    `expected "42.00" in "${result}"`,
  );
});

// ─── 通貨コードの大文字小文字正規化 ─────────────────────────────────

test("小文字 'usd': source=usd, locale=ja → USD→JPY 換算される", () => {
  const result = moneyLocalized(4800, "usd", "ja");
  assert.ok(
    extractNumeric(result) === "7200",
    `expected "7200" in "${result}"`,
  );
});
