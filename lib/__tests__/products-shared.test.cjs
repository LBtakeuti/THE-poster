// lib/products-shared.ts の純ロジック（remaining / isPurchasable）のユニットテスト。
// 純粋関数につき DB/ネットワーク非依存。各ケースは独立実行可能。
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { remaining, isPurchasable } = require("../products-shared.ts");

// isPurchasable は Product 全体を受け取るが、ロジックは status と残数のみに依存する。
// テスト用に最小限の有効な Product を生成するヘルパ。
function makeProduct(overrides) {
  return {
    id: "p1",
    slug: "slug",
    title: "title",
    description_ja: null,
    description_en: null,
    price_cents: 1000,
    currency: "JPY",
    edition_size: 20,
    sold_count: 0,
    image_path: null,
    status: "active",
    sort_order: 0,
    ...overrides,
  };
}

test("remaining: 通常（20 - 7 = 13）", () => {
  assert.equal(remaining({ edition_size: 20, sold_count: 7 }), 13);
});

test("remaining: ちょうど完売（20 - 20 = 0）", () => {
  assert.equal(remaining({ edition_size: 20, sold_count: 20 }), 0);
});

test("remaining: 過剰 sold はクランプして 0（edition_size=10, sold_count=12 → 0）", () => {
  assert.equal(remaining({ edition_size: 10, sold_count: 12 }), 0);
});

test("remaining: 境界（0 - 0 = 0）", () => {
  assert.equal(remaining({ edition_size: 0, sold_count: 0 }), 0);
});

test("isPurchasable: active かつ 残>0 → true", () => {
  assert.equal(
    isPurchasable(makeProduct({ status: "active", edition_size: 20, sold_count: 7 })),
    true,
  );
});

test("isPurchasable: active かつ 残0 → false", () => {
  assert.equal(
    isPurchasable(makeProduct({ status: "active", edition_size: 20, sold_count: 20 })),
    false,
  );
});

test("isPurchasable: archived かつ 残>0 → false", () => {
  assert.equal(
    isPurchasable(makeProduct({ status: "archived", edition_size: 20, sold_count: 7 })),
    false,
  );
});

test("isPurchasable: draft → false", () => {
  assert.equal(
    isPurchasable(makeProduct({ status: "draft", edition_size: 20, sold_count: 0 })),
    false,
  );
});

test("isPurchasable: status='active' で sold==edition → false", () => {
  assert.equal(
    isPurchasable(makeProduct({ status: "active", edition_size: 20, sold_count: 20 })),
    false,
  );
});
