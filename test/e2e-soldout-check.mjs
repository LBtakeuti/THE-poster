/**
 * 売り切れ表示変更 E2E 確認スクリプト
 * 確認項目:
 *   1. 全ポスターが回転している（2枚撮り・ハッシュ比較）
 *   2. 売り切れ商品がグリッド末尾に並ぶ
 *   3. 売り切れカードに "SOLD OUT" テキストが存在する
 *   4. 購入可能カードに "購入" or "Buy" テキストが存在する
 *   5. console エラーが 0 件
 *
 * 実行: node test/e2e-soldout-check.mjs
 */
import { chromium } from 'playwright';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

const DESKTOP = '/Users/keitakeuchi/Desktop';
const SS1 = path.join(DESKTOP, 'soldout-check-1.png');
const SS2 = path.join(DESKTOP, 'soldout-check-2.png');
const URL = 'http://localhost:3137/';

async function run() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
    ],
  });

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto(URL, { waitUntil: 'networkidle' });
  // ハイドレーション + 初回レンダー待機
  await page.waitForTimeout(4000);

  // --- スクリーンショット① ---
  await page.screenshot({ path: SS1, fullPage: true });

  // 2 秒待って回転確認用②
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SS2, fullPage: true });

  // --- ページ情報取得 ---
  const info = await page.evaluate(() => {
    // article.store-card がカード要素
    const cards = Array.from(document.querySelectorAll('article.store-card'));

    const cardData = cards.map((card, i) => {
      const cardText = card.innerText;
      const hasSoldOut = /SOLD\s*OUT/i.test(cardText);
      const hasBuyLink = /購入|Buy/i.test(cardText);
      const box = card.querySelector('.poster-box');
      const rect = box ? box.getBoundingClientRect() : card.getBoundingClientRect();
      return { index: i, hasSoldOut, hasBuyLink, top: rect.top, left: rect.left };
    });

    // DOM 上の全テキストから SOLD OUT を探す（バッジがカード外にある場合の保険）
    const allText = document.body.innerText;
    const soldOutCount = (allText.match(/SOLD\s*OUT/gi) || []).length;

    // .poster-box 総数
    const posterCount = document.querySelectorAll('.poster-box').length;

    // 末尾ソート確認: sold-out カードの top が buy カードの top より大きいか
    const soldOutCards = cardData.filter(c => c.hasSoldOut);
    const buyCards = cardData.filter(c => c.hasBuyLink && !c.hasSoldOut);
    const maxBuyTop = buyCards.length ? Math.max(...buyCards.map(c => c.top)) : null;
    const minSoldTop = soldOutCards.length ? Math.min(...soldOutCards.map(c => c.top)) : null;
    const sortedToBottom = (maxBuyTop !== null && minSoldTop !== null)
      ? minSoldTop > maxBuyTop - 10  // 10px のマージン
      : null;

    return {
      posterCount,
      cardCount: cards.length,
      cardData,
      soldOutCount,
      soldOutCardCount: soldOutCards.length,
      buyCardCount: buyCards.length,
      maxBuyTop,
      minSoldTop,
      sortedToBottom,
    };
  });

  // --- ハッシュ比較（回転確認）---
  const buf1 = fs.readFileSync(SS1);
  const buf2 = fs.readFileSync(SS2);
  const hash1 = createHash('md5').update(buf1).digest('hex');
  const hash2 = createHash('md5').update(buf2).digest('hex');
  const screenshotsIdentical = hash1 === hash2;

  await browser.close();

  // --- 結果出力 ---
  console.log('\n========== E2E 確認結果 ==========');
  console.log('[1] 回転確認（スクショ差分）');
  console.log('    SS1 MD5:', hash1);
  console.log('    SS2 MD5:', hash2);
  console.log('    変化あり:', screenshotsIdentical ? 'NO（同一 — 回転していない可能性）' : 'YES（変化あり）');

  console.log('\n[2] ポスター枚数(.poster-box):', info.posterCount, '/ カード枚数(article.store-card):', info.cardCount);

  console.log('\n[3] SOLD OUT バッジ');
  console.log('    ページ内 SOLD OUT テキスト出現回数:', info.soldOutCount);
  console.log('    SOLD OUT と判定したカード数:', info.soldOutCardCount);
  console.log('    購入可能カード数:', info.buyCardCount);

  console.log('\n[4] 末尾ソート確認');
  console.log('    購入可能カードの最大 top:', info.maxBuyTop);
  console.log('    SOLD OUT カードの最小 top:', info.minSoldTop);
  console.log('    末尾にまとまっているか:', info.sortedToBottom === null ? '判定不能（データ不足）' : info.sortedToBottom ? 'YES' : 'NO');

  console.log('\n[5] console エラー');
  console.log('    件数:', consoleErrors.length);
  if (consoleErrors.length) {
    consoleErrors.forEach((e, i) => console.log(`    [${i+1}] ${e}`));
  }
  if (pageErrors.length) {
    console.log('    pageErrors:', pageErrors);
  }

  console.log('\n[カード詳細]');
  info.cardData.forEach(c => {
    const tag = c.hasSoldOut ? 'SOLD_OUT' : c.hasBuyLink ? 'BUY' : 'UNKNOWN';
    console.log(`    index=${c.index} top=${Math.round(c.top)} ${tag}`);
  });

  console.log('\n[スクショ保存先]');
  console.log('    ', SS1);
  console.log('    ', SS2);
  console.log('=====================================\n');

  // 終了コード: エラーがあれば 1
  const failed = consoleErrors.length > 0 || pageErrors.length > 0;
  process.exit(failed ? 1 : 0);
}

run().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
