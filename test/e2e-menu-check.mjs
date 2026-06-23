/**
 * ハンバーガーメニュー E2E 確認スクリプト
 * 確認項目:
 *   1. PC幅(1280x800) と SP幅(390x844) 双方で .menu-toggle が表示されること
 *   2. .menu-toggle クリック → .poster-menu が開き「INSTAGRAM」テキストが1つだけ
 *      表示されること（LINKEDIN/X/メールが無いこと）
 *   3. INSTAGRAM リンクの href が instagram.com を指すこと
 *   4a. .menu-toggle（×化・aria-expanded=true）クリックでメニューが閉じること
 *   4b. 背景クリックでメニューが閉じること
 *   5. console エラーが 0 件であること
 *   6. 既存ヘッダー（ロゴ /logo.svg・言語切替ボタン）が表示されていること（回帰確認）
 *
 * 実行: node test/e2e-menu-check.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DESKTOP = '/Users/keitakeuchi/Desktop';
const URL = 'http://localhost:3137/';
const GPU_ARGS = [
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--ignore-gpu-blocklist',
  '--enable-webgl',
];

const results = [];
let pass = 0;
let fail = 0;

function check(label, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL';
  if (ok) pass++; else fail++;
  results.push({ label, status, detail });
  console.log(`  [${status}] ${label}${detail ? ' — ' + detail : ''}`);
}

async function setupPage(context) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto(URL, { waitUntil: 'networkidle' });
  // IntroOverlay をスキップ
  await page.evaluate(() => sessionStorage.setItem('introSeen', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // タイトル確認
  const title = await page.title();
  if (title !== 'THE POSTER') {
    console.warn(`    WARNING: title="${title}" (expected "THE POSTER")`);
  }

  return { page, consoleErrors, pageErrors };
}

async function runTests(browser) {
  const viewports = [
    { label: 'PC (1280x800)', width: 1280, height: 800 },
    { label: 'SP (390x844)', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    console.log(`\n--- Viewport: ${vp.label} ---`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const { page, consoleErrors, pageErrors } = await setupPage(context);

    // --- SC1: .menu-toggle が表示されること ---
    const toggleVisible = await page.locator('.menu-toggle').isVisible();
    check(`[SC1/${vp.label}] .menu-toggle が表示されること`, toggleVisible);

    // スクリーンショット（初期状態）
    const ssLabel = vp.label.replace(/[^a-z0-9]/gi, '_');
    const ssPath = path.join(DESKTOP, `menu-check-${ssLabel}-initial.png`);
    await page.screenshot({ path: ssPath, fullPage: false });
    console.log(`    Screenshot: ${ssPath}`);

    // --- SC2 & SC3: メニューを開く ---
    await page.locator('.menu-toggle').click();
    await page.waitForTimeout(800);

    const menuVisible = await page.locator('.poster-menu').isVisible();
    check(`[SC2/${vp.label}] .poster-menu が開くこと`, menuVisible);

    const menuInfo = await page.evaluate(() => {
      const menu = document.querySelector('.poster-menu');
      if (!menu) return { text: '', links: [] };
      const text = menu.innerText || menu.textContent || '';
      const links = Array.from(menu.querySelectorAll('a')).map(a => ({
        text: (a.innerText || a.textContent || '').trim(),
        href: a.getAttribute('href') || '',
      }));
      return { text, links };
    });

    const instagramLinks = menuInfo.links.filter(l =>
      /instagram/i.test(l.text) || /instagram\.com/i.test(l.href)
    );
    const instagramCount = instagramLinks.length;
    check(
      `[SC2/${vp.label}] INSTAGRAM テキストが1つだけ表示されること`,
      instagramCount === 1,
      `count=${instagramCount}`
    );

    const hasLinkedIn = /linkedin/i.test(menuInfo.text);
    const hasX = /\bx\b/i.test(menuInfo.text) && menuInfo.links.some(l => /twitter\.com|x\.com/i.test(l.href));
    const hasEmail = /mailto:/i.test(JSON.stringify(menuInfo.links));
    check(
      `[SC2/${vp.label}] LINKEDIN/X/メールが表示されないこと`,
      !hasLinkedIn && !hasX && !hasEmail,
      `linkedin=${hasLinkedIn} x=${hasX} email=${hasEmail}`
    );

    // --- SC3: href が instagram.com を指すこと ---
    const instagramHref = instagramLinks[0]?.href || '';
    check(
      `[SC3/${vp.label}] INSTAGRAM href が instagram.com を指すこと`,
      /instagram\.com/i.test(instagramHref),
      `href="${instagramHref}"`
    );

    // スクリーンショット（メニュー開状態）
    const ssOpenPath = path.join(DESKTOP, `menu-check-${ssLabel}-open.png`);
    await page.screenshot({ path: ssOpenPath, fullPage: false });
    console.log(`    Screenshot: ${ssOpenPath}`);

    // --- SC4a: .menu-toggle（×化）クリックで閉じること ---
    const ariaExpanded = await page.locator('.menu-toggle').getAttribute('aria-expanded');
    check(
      `[SC4a/${vp.label}] aria-expanded=true になっていること`,
      ariaExpanded === 'true',
      `aria-expanded="${ariaExpanded}"`
    );

    await page.locator('.menu-toggle').click();
    await page.waitForTimeout(800);
    const menuClosedAfterToggle = !(await page.locator('.poster-menu').isVisible());
    check(`[SC4a/${vp.label}] .menu-toggle クリックでメニューが閉じること`, menuClosedAfterToggle);

    // --- SC4b: 背景クリックで閉じること ---
    // 再度開く
    await page.locator('.menu-toggle').click();
    await page.waitForTimeout(800);
    const menuReopened = await page.locator('.poster-menu').isVisible();
    check(`[SC4b/${vp.label}] 背景クリック前にメニューが再度開いていること`, menuReopened);

    if (menuReopened) {
      // .poster-menu の外側（背景部分）をクリック — ページ左端を狙う
      await page.mouse.click(10, vp.height / 2);
      await page.waitForTimeout(800);
      const menuClosedAfterBg = !(await page.locator('.poster-menu').isVisible());
      check(`[SC4b/${vp.label}] 背景クリックでメニューが閉じること`, menuClosedAfterBg);
    } else {
      check(`[SC4b/${vp.label}] 背景クリックでメニューが閉じること`, false, 'メニューが再開しなかったためスキップ');
    }

    // --- SC5: console エラーが 0 件 ---
    check(
      `[SC5/${vp.label}] console エラーが 0 件であること`,
      consoleErrors.length === 0,
      consoleErrors.length > 0 ? consoleErrors.slice(0, 3).join(' | ') : ''
    );
    if (pageErrors.length > 0) {
      console.log(`    pageErrors: ${pageErrors.join(' | ')}`);
    }

    // --- SC6: ヘッダー回帰確認 ---
    const logoImg = await page.locator('img[src*="logo.svg"], img[alt*="logo"], img[alt*="POSTER"]').first();
    const logoVisible = await logoImg.isVisible().catch(() => false);
    // SVG直接埋め込みも考慮
    const logoSvgVisible = await page.locator('img[src="/logo.svg"]').isVisible().catch(() => false);
    const headerLogo = logoVisible || logoSvgVisible;

    // 言語切替ボタン（テキストにJA/EN等が含まれる、またはlang-toggle的なクラス）
    const langBtnCount = await page.locator('button').filter({ hasText: /^(EN|JA|日本語|English)$/i }).count();
    const hasLangBtn = langBtnCount > 0;

    check(
      `[SC6/${vp.label}] ヘッダーロゴ（logo.svg）が表示されていること`,
      headerLogo,
      `logoVisible=${logoVisible} logoSvgVisible=${logoSvgVisible}`
    );
    check(
      `[SC6/${vp.label}] 言語切替ボタンが表示されていること`,
      hasLangBtn,
      `count=${langBtnCount}`
    );

    await context.close();
  }
}

async function main() {
  console.log('\n========== E2E: ハンバーガーメニュー確認 ==========');
  const browser = await chromium.launch({ headless: true, args: GPU_ARGS });

  try {
    await runTests(browser);
  } finally {
    await browser.close();
  }

  console.log('\n========== 結果サマリー ==========');
  results.forEach(r => {
    const mark = r.status === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`  [${mark}] ${r.label}${r.detail ? ' — ' + r.detail : ''}`);
  });
  console.log(`\n  合計: ${pass + fail} 件 / PASS: ${pass} / FAIL: ${fail}`);
  console.log('====================================\n');

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
