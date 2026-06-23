/**
 * ハンバーガーメニュー E2E 確認スクリプト
 * 確認項目:
 *   SC1: .menu-toggle が表示され、白系下地であること。位置が画面内(余白12px以上)であること。
 *   SC2: ランダム配置の確認 — 同一URLを2回ロードし、left/top が毎回同じでないこと。
 *   SC3: 短いクリックで .poster-menu が開き、INSTAGRAM が1つだけ出ること。
 *        LINKEDIN/X/メールが無いこと。
 *   SC4: ドラッグ(30px超)で .poster-menu が開かないこと。.menu-toggle 位置が移動すること。
 *   SC5: 開いた状態で .menu-toggle 短クリック / 背景クリックで閉じること。
 *   SC6: console エラーが 0 件であること。
 *   SC7: 既存ヘッダー(logo.svg・言語切替)が表示されていること(回帰確認)。
 *
 * 実行: node test/e2e-menu-check.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DESKTOP = '/Users/keitakeuchi/Desktop';
const URL = 'http://localhost:3137/';
const MARGIN = 12;
const BTN = 40;
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

/** .menu-toggle の boundingBox を取得 */
async function getToggleBox(page) {
  return page.locator('.menu-toggle').boundingBox();
}

async function runTests(browser) {
  const viewports = [
    { label: 'PC (1280x800)', width: 1280, height: 800 },
    { label: 'SP (390x844)', width: 390, height: 844 },
  ];

  // ===== SC2: ランダム配置確認(PCのみ・2回ロード比較) =====
  console.log('\n--- SC2: ランダム配置確認 (PC 2回ロード比較) ---');
  {
    const positions = [];
    for (let i = 0; i < 2; i++) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const { page } = await setupPage(ctx);
      const box = await getToggleBox(page);
      positions.push(box);
      console.log(`    load${i + 1}: left=${box ? box.x.toFixed(1) : 'N/A'} top=${box ? box.y.toFixed(1) : 'N/A'}`);
      await ctx.close();
    }
    const [p1, p2] = positions;
    const samePos =
      p1 && p2 &&
      Math.abs(p1.x - p2.x) < 2 &&
      Math.abs(p1.y - p2.y) < 2;
    // 稀に同じ値になる確率はあるため、一致でも警告扱いにして PASS にする
    // （厳密に FAIL にはしない）
    check(
      '[SC2] 2回ロードで .menu-toggle の位置がランダムに変化すること',
      !samePos,
      samePos
        ? '2回とも同じ位置(稀に起きる偶然の一致の可能性あり)'
        : `差分 dx=${p1 && p2 ? Math.abs(p1.x - p2.x).toFixed(1) : 'N/A'} dy=${p1 && p2 ? Math.abs(p1.y - p2.y).toFixed(1) : 'N/A'}`
    );
  }

  for (const vp of viewports) {
    console.log(`\n--- Viewport: ${vp.label} ---`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const { page, consoleErrors, pageErrors } = await setupPage(context);

    const ssLabel = vp.label.replace(/[^a-z0-9]/gi, '_');

    // ===== SC1: 表示・白系下地・画面内位置 =====
    const toggleVisible = await page.locator('.menu-toggle').isVisible();
    check(`[SC1/${vp.label}] .menu-toggle が表示されること`, toggleVisible);

    if (toggleVisible) {
      // 白系下地の確認（computed background-color が透明でない）
      const bgColor = await page.locator('.menu-toggle').evaluate(el => {
        return window.getComputedStyle(el).backgroundColor;
      });
      const isOpaque = bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';
      check(
        `[SC1/${vp.label}] .menu-toggle の background が透明でない（白系下地）こと`,
        isOpaque,
        `backgroundColor="${bgColor}"`
      );

      // 位置が画面内かつ余白12px以上
      const box = await getToggleBox(page);
      const inBounds = box &&
        box.x >= MARGIN &&
        box.y >= MARGIN &&
        (box.x + BTN) <= (vp.width - MARGIN) &&
        (box.y + BTN) <= (vp.height - MARGIN);
      check(
        `[SC1/${vp.label}] .menu-toggle の位置が画面内(余白${MARGIN}px以上)であること`,
        !!inBounds,
        box
          ? `left=${box.x.toFixed(1)} top=${box.y.toFixed(1)} viewport=${vp.width}x${vp.height}`
          : 'boundingBox取得失敗'
      );
    }

    // スクリーンショット（初期状態）
    const ssPath = path.join(DESKTOP, `menu-check-${ssLabel}-initial.png`);
    await page.screenshot({ path: ssPath, fullPage: false });
    console.log(`    Screenshot: ${ssPath}`);

    // ===== SC3: 短いクリックでメニューが開く =====
    // pointerdown → pointerup（移動なし）でクリック扱い
    const toggleEl = page.locator('.menu-toggle');
    await toggleEl.dispatchEvent('pointerdown', { clientX: 50, clientY: 50, pointerId: 1 });
    await page.waitForTimeout(50);
    await toggleEl.dispatchEvent('pointerup', { clientX: 50, clientY: 50, pointerId: 1 });
    await page.waitForTimeout(800);

    const menuVisible = await page.locator('.poster-menu').isVisible();
    check(`[SC3/${vp.label}] 短クリックで .poster-menu が開くこと`, menuVisible);

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
    check(
      `[SC3/${vp.label}] INSTAGRAM テキストが1つだけ表示されること`,
      instagramLinks.length === 1,
      `count=${instagramLinks.length}`
    );

    const hasLinkedIn = /linkedin/i.test(menuInfo.text);
    const hasX = /\bx\b/i.test(menuInfo.text) && menuInfo.links.some(l => /twitter\.com|x\.com/i.test(l.href));
    const hasEmail = /mailto:/i.test(JSON.stringify(menuInfo.links));
    check(
      `[SC3/${vp.label}] LINKEDIN/X/メールが表示されないこと`,
      !hasLinkedIn && !hasX && !hasEmail,
      `linkedin=${hasLinkedIn} x=${hasX} email=${hasEmail}`
    );

    // スクリーンショット（メニュー開状態）
    const ssOpenPath = path.join(DESKTOP, `menu-check-${ssLabel}-open.png`);
    await page.screenshot({ path: ssOpenPath, fullPage: false });
    console.log(`    Screenshot: ${ssOpenPath}`);

    // ===== SC4: ドラッグ操作でメニューが開かない ＋ 位置が移動すること =====
    // メニューを閉じる
    if (await page.locator('.poster-menu').isVisible()) {
      await toggleEl.dispatchEvent('pointerdown', { clientX: 50, clientY: 50, pointerId: 1 });
      await page.waitForTimeout(50);
      await toggleEl.dispatchEvent('pointerup', { clientX: 50, clientY: 50, pointerId: 1 });
      await page.waitForTimeout(800);
    }

    const boxBefore = await getToggleBox(page);

    // ドラッグ: 30px以上移動してから離す
    const startX = (boxBefore?.x ?? 100) + 20;
    const startY = (boxBefore?.y ?? 100) + 20;
    const endX = startX + 40;
    const endY = startY + 30;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 10, startY + 5, { steps: 3 });
    await page.mouse.move(startX + 25, startY + 15, { steps: 3 });
    await page.mouse.move(endX, endY, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(800);

    const menuAfterDrag = await page.locator('.poster-menu').isVisible();
    check(
      `[SC4/${vp.label}] ドラッグ後に .poster-menu が開かないこと`,
      !menuAfterDrag,
      `menuVisible=${menuAfterDrag}`
    );

    const boxAfter = await getToggleBox(page);
    const moved =
      boxBefore && boxAfter &&
      (Math.abs(boxAfter.x - boxBefore.x) > 3 || Math.abs(boxAfter.y - boxBefore.y) > 3);
    check(
      `[SC4/${vp.label}] ドラッグ後に .menu-toggle の位置が移動していること`,
      !!moved,
      boxBefore && boxAfter
        ? `before=(${boxBefore.x.toFixed(1)},${boxBefore.y.toFixed(1)}) after=(${boxAfter.x.toFixed(1)},${boxAfter.y.toFixed(1)})`
        : 'boundingBox取得失敗'
    );

    // スクリーンショット（ドラッグ後）
    const ssDragPath = path.join(DESKTOP, `menu-check-${ssLabel}-afterdrag.png`);
    await page.screenshot({ path: ssDragPath, fullPage: false });
    console.log(`    Screenshot: ${ssDragPath}`);

    // ===== SC5: 開いた状態で .menu-toggle 短クリック / 背景クリックで閉じること =====

    // SC5a: .menu-toggle 短クリックで閉じる
    // 先にメニューを開く（短クリック）
    await toggleEl.dispatchEvent('pointerdown', { clientX: 50, clientY: 50, pointerId: 1 });
    await page.waitForTimeout(50);
    await toggleEl.dispatchEvent('pointerup', { clientX: 50, clientY: 50, pointerId: 1 });
    await page.waitForTimeout(800);
    const reopened5a = await page.locator('.poster-menu').isVisible();
    check(`[SC5a/${vp.label}] 閉じ確認前にメニューが開いていること`, reopened5a);

    if (reopened5a) {
      const ariaExpanded = await page.locator('.menu-toggle').getAttribute('aria-expanded');
      check(
        `[SC5a/${vp.label}] aria-expanded=true になっていること`,
        ariaExpanded === 'true',
        `aria-expanded="${ariaExpanded}"`
      );

      await toggleEl.dispatchEvent('pointerdown', { clientX: 50, clientY: 50, pointerId: 1 });
      await page.waitForTimeout(50);
      await toggleEl.dispatchEvent('pointerup', { clientX: 50, clientY: 50, pointerId: 1 });
      await page.waitForTimeout(800);
      const closedAfterToggle = !(await page.locator('.poster-menu').isVisible());
      check(`[SC5a/${vp.label}] .menu-toggle 短クリックでメニューが閉じること`, closedAfterToggle);
    } else {
      check(`[SC5a/${vp.label}] .menu-toggle 短クリックでメニューが閉じること`, false, 'メニューが開かなかったためスキップ');
    }

    // SC5b: 背景クリックで閉じる
    await toggleEl.dispatchEvent('pointerdown', { clientX: 50, clientY: 50, pointerId: 1 });
    await page.waitForTimeout(50);
    await toggleEl.dispatchEvent('pointerup', { clientX: 50, clientY: 50, pointerId: 1 });
    await page.waitForTimeout(800);
    const reopened5b = await page.locator('.poster-menu').isVisible();
    check(`[SC5b/${vp.label}] 背景クリック前にメニューが開いていること`, reopened5b);

    if (reopened5b) {
      await page.mouse.click(10, vp.height / 2);
      await page.waitForTimeout(800);
      const closedAfterBg = !(await page.locator('.poster-menu').isVisible());
      check(`[SC5b/${vp.label}] 背景クリックでメニューが閉じること`, closedAfterBg);
    } else {
      check(`[SC5b/${vp.label}] 背景クリックでメニューが閉じること`, false, 'メニューが再開しなかったためスキップ');
    }

    // ===== SC6: console エラーが 0 件 =====
    check(
      `[SC6/${vp.label}] console エラーが 0 件であること`,
      consoleErrors.length === 0,
      consoleErrors.length > 0 ? consoleErrors.slice(0, 3).join(' | ') : ''
    );
    if (pageErrors.length > 0) {
      console.log(`    pageErrors: ${pageErrors.join(' | ')}`);
    }

    // ===== SC7: ヘッダー回帰確認 =====
    const logoVisible = await page.locator('img[src*="logo.svg"], img[alt*="logo"], img[alt*="POSTER"]').first().isVisible().catch(() => false);
    const logoSvgVisible = await page.locator('img[src="/logo.svg"]').isVisible().catch(() => false);
    const headerLogo = logoVisible || logoSvgVisible;

    const langBtnCount = await page.locator('button').filter({ hasText: /^(EN|JA|日本語|English)$/i }).count();
    const hasLangBtn = langBtnCount > 0;

    check(
      `[SC7/${vp.label}] ヘッダーロゴ（logo.svg）が表示されていること`,
      headerLogo,
      `logoVisible=${logoVisible} logoSvgVisible=${logoSvgVisible}`
    );
    check(
      `[SC7/${vp.label}] 言語切替ボタンが表示されていること`,
      hasLangBtn,
      `count=${langBtnCount}`
    );

    await context.close();
  }
}

async function main() {
  console.log('\n========== E2E: ハンバーガーメニュー確認（ドラッグ移動・ランダム配置対応版）==========');
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
