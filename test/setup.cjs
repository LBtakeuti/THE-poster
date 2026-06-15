// テスト用トランスパイル設定（テスト専用 / 実装コードには影響しない）。
// vitest はネットワーク不通のため未導入。Node 標準の test runner（node:test）と、
// node_modules に既存の sucrase の require フックで .ts/.tsx を解決する。
// 使い方: npm test （package.json の "test" スクリプト参照）。
const { addHook } = require("../node_modules/sucrase/dist/register.js");

// require() 経由の .ts / .tsx をオンザフライでトランスパイルする。
addHook(".ts", { transforms: ["imports", "typescript"] });
addHook(".tsx", { transforms: ["imports", "typescript", "jsx"] });
