// lib/i18n/context.tsx の resolveLocaleFromAcceptLanguage のユニットテスト。
// 仕様(docs/09): 'ja' 始まり（大文字小文字無視）なら 'ja'、それ以外/未指定/null/空 は 'en'。
// 純粋関数につき React レンダリング不要（関数のみ import）。各ケース独立。
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { resolveLocaleFromAcceptLanguage } = require("../i18n/context.tsx");

test("'ja' → ja", () => {
  assert.equal(resolveLocaleFromAcceptLanguage("ja"), "ja");
});

test("'ja-JP' → ja", () => {
  assert.equal(resolveLocaleFromAcceptLanguage("ja-JP"), "ja");
});

test("'JA,en'（大文字始まり）→ ja", () => {
  assert.equal(resolveLocaleFromAcceptLanguage("JA,en"), "ja");
});

test("'JA-jp'（大文字小文字混在）→ ja", () => {
  assert.equal(resolveLocaleFromAcceptLanguage("JA-jp"), "ja");
});

test("'en-US' → en", () => {
  assert.equal(resolveLocaleFromAcceptLanguage("en-US"), "en");
});

test("'fr' → en", () => {
  assert.equal(resolveLocaleFromAcceptLanguage("fr"), "en");
});

test("空文字 '' → en", () => {
  assert.equal(resolveLocaleFromAcceptLanguage(""), "en");
});

test("null → en", () => {
  assert.equal(resolveLocaleFromAcceptLanguage(null), "en");
});

test("undefined → en", () => {
  assert.equal(resolveLocaleFromAcceptLanguage(undefined), "en");
});
