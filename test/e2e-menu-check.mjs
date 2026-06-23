/**
 * ハンバーガーメニュー E2E 確認スクリプト
 * 確認項目:
 *   SC1: SP幅(390x844)で2回ロード → .menu-toggle が右下固定(ランダムでない)こと。
 *        期待値: left ≈ innerWidth-BTN-MARGIN = 338, top ≈ innerHeight-BTN-MARGIN = 792。
 *   SC2: PC幅(1280x800)で2回ロード → 位置がランダム(毎回同じでない)こと。
 *   SC3: SP・PCとも短クリックで .poster-menu が開き INSTAGRAM が1つだけ表示されること。
 *        LINKEDIN/X/メールが無いこと。
 *   SC4: SP・PCとも30px超ドラッグで .poster-menu が開かず、位置が移動すること。
 *   SC5: 開いた状態で .menu-toggle 短クリック / 背景クリックで閉じること。
 *   SC6: console/pageエラーが 0 件であること。
 *   SC7: 既存ヘッダー(logo.svg・言語切替)が回帰なく表示されること。
 *
 * 実行: node test/e2e-menu-check.mjs
 */
import { chromium } from 'playwright';
import path from 'path';

const DESKTOP = '/Users/keitakeuchi/Desktop';
const URL = 'http://localhost:3137/';
const BTN = 40;
const MARGIN = 12;
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
  await page.evaluate(() => sessionStorage.setItem('introSeen', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const title = await page.title();
  if (title !== 'THE POSTER') {
    console.warn(`    WARNING: title="${title}" (expected "THE POSTER")`);
  }

  return { page, consoleErrors, pageErrors };
}

async function getToggleBox(page) {
  return page.locator('.menu-toggle').boundingBox();
}

/** ポインターイベントで短クリックを模擬（移動なし） */
async function shortClick(toggleEl) {
  await toggleEl.dispatchEvent('pointerdown', { clientX: 50, clientY: 50, pointerId: 1 });
  await new Promise(r => setTimeout(r, 50));
  await toggleEl.dispatchEvent('pointerup', { clientX: 50, clientY: 50, pointerId: 1 });
}

async function main() {
  console.log('\n========== E2E: ハンバーガーメニュー確認（SP右下固定・PCランダム対応版）==========');
  const browser = await chromium.launch({ headless: true, args: GPU_ARGS });

  try {
    // ===== SC1: SP幅で2回ロード → 右下固定(ランダムでない) =====
    console.log('\n--- SC1: SP(390x844) 右下固定確認 (2回ロード比較) ---');
    {
      const spW = 390, spH = 844;
      const expectedX = spW - BTN - MARGIN; // 338
      const expectedY = spH - BTN - MARGIN; // 792
      const tolerance = 5; // px
      const positions = [];

      for (let i = 0; i < 2; i++) {
        const ctx = await browser.newContext({ viewport: { width: spW, height: spH } });
        const { page } = await setupPage(ctx);
        const box = await getToggleBox(page);
        positions.push(box);
        console.log(`    load${i + 1}: left=${box ? box.x.toFixed(1) : 'N/A'} top=${box ? box.y.toFixed(1) : 'N/A'} (期待: left≈${expectedX} top≈${expectedY})`);
        await ctx.close();
      }

      const [p1, p2] = positions;
      const p1Near = p1 && Math.abs(p1.x - expectedX) <= tolerance && Math.abs(p1.y - expectedY) <= tolerance;
      const p2Near = p2 && Math.abs(p2.x - expectedX) <= tolerance && Math.abs(p2.y - expectedY) <= tolerance;
      check(
        '[SC1] SP: load1 が右下固定値(±5px)であること',
        !!p1Near,
        p1 ? `left=${p1.x.toFixed(1)} top=${p1.y.toFixed(1)} 期待=(${expectedX},${expectedY})` : 'boundingBox取得失敗'
      );
      check(
        '[SC1] SP: load2 が右下固定値(±5px)であること',
        !!p2Near,
        p2 ? `left=${p2.x.toFixed(1)} top=${p2.y.toFixed(1)} 期待=(${expectedX},${expectedY})` : 'boundingBox取得失敗'
      );

      const samePos = p1 && p2 && Math.abs(p1.x - p2.x) <= tolerance && Math.abs(p1.y - p2.y) <= tolerance;
      check(
        '[SC1] SP: 2回ロードで位置が固定(ランダムでない)であること',
        !!samePos,
        p1 && p2 ? `差分 dx=${Math.abs(p1.x - p2.x).toFixed(1)} dy=${Math.abs(p1.y - p2.y).toFixed(1)}` : ''
      );
    }

    // ===== SC2: PC幅で2回ロード → ランダム(毎回異なる) =====
    console.log('\n--- SC2: PC(1280x800) ランダム配置確認 (2回ロード比較) ---');
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
      const samePos = p1 && p2 && Math.abs(p1.x - p2.x) < 2 && Math.abs(p1.y - p2.y) < 2;
      check(
        '[SC2] PC: 2回ロードで .menu-toggle の位置がランダムに変化すること',
        !samePos,
        samePos
          ? '2回とも同じ位置(稀に起きる偶然の一致の可能性あり)'
          : `差分 dx=${p1 && p2 ? Math.abs(p1.x - p2.x).toFixed(1) : 'N/A'} dy=${p1 && p2 ? Math.abs(p1.y - p2.y).toFixed(1) : 'N/A'}`
      );
    }

    // ===== SC3〜SC7: SP・PC それぞれで操作系シナリオを確認 =====
    const viewports = [
      { label: 'SP (390x844)', width: 390, height: 844 },
      { label: 'PC (1280x800)', width: 1280, height: 800 },
    ];

    for (const vp of viewports) {
      console.log(`\n--- 操作確認: ${vp.label} ---`);
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const { page, consoleErrors, pageErrors } = await setupPage(context);
      const ssLabel = vp.label.replace(/[^a-z0-9]/gi, '_');
      const toggleEl = page.locator('.menu-toggle');

      const toggleVisible = await toggleEl.isVisible();
      check(`[前提/${vp.label}] .menu-toggle が表示されること`, toggleVisible);

      const ssInit = path.join(DESKTOP, `menu-check-${ssLabel}-initial.png`);
      await page.screenshot({ path: ssInit, fullPage: false });
      console.log(`    Screenshot: ${ssInit}`);

      // ===== SC3: 短クリックでメニューが開き INSTAGRAM のみ =====
      await shortClick(toggleEl);
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
        `[SC3/${vp.label}] INSTAGRAM が1つだけ表示されること`,
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

      const ssOpen = path.join(DESKTOP, `menu-check-${ssLabel}-open.png`);
      await page.screenshot({ path: ssOpen, fullPage: false });
      console.log(`    Screenshot: ${ssOpen}`);

      // メニューを閉じる
      await shortClick(toggleEl);
      await page.waitForTimeout(800);

      // ===== SC4: ドラッグで移動・メニューが開かない =====
      const boxBefore = await getToggleBox(page);
      // ドラッグ開始点はボタン中央。移動方向はボタンが右下端でもclampで弾かれないよう
      // ボタン位置に応じて左上 or 右下を選ぶ。
      const startX = (boxBefore?.x ?? 100) + 20;
      const startY = (boxBefore?.y ?? 100) + 20;
      // ボタンが画面右下寄り(x > viewport/2)なら左上方向に移動、そうでなければ右下方向
      const dragDx = (boxBefore && boxBefore.x > vp.width / 2) ? -40 : 40;
      const dragDy = (boxBefore && boxBefore.y > vp.height / 2) ? -30 : 30;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + dragDx * 0.25, startY + dragDy * 0.25, { steps: 3 });
      await page.mouse.move(startX + dragDx * 0.6, startY + dragDy * 0.6, { steps: 3 });
      await page.mouse.move(startX + dragDx, startY + dragDy, { steps: 3 });
      await page.mouse.up();
      await page.waitForTimeout(800);

      const menuAfterDrag = await page.locator('.poster-menu').isVisible();
      check(
        `[SC4/${vp.label}] ドラッグ後に .poster-menu が開かないこと`,
        !menuAfterDrag,
        `menuVisible=${menuAfterDrag}`
      );

      const boxAfter = await getToggleBox(page);
      const moved = boxBefore && boxAfter &&
        (Math.abs(boxAfter.x - boxBefore.x) > 3 || Math.abs(boxAfter.y - boxBefore.y) > 3);
      check(
        `[SC4/${vp.label}] ドラッグ後に .menu-toggle の位置が移動していること`,
        !!moved,
        boxBefore && boxAfter
          ? `before=(${boxBefore.x.toFixed(1)},${boxBefore.y.toFixed(1)}) after=(${boxAfter.x.toFixed(1)},${boxAfter.y.toFixed(1)})`
          : 'boundingBox取得失敗'
      );

      const ssDrag = path.join(DESKTOP, `menu-check-${ssLabel}-afterdrag.png`);
      await page.screenshot({ path: ssDrag, fullPage: false });
      console.log(`    Screenshot: ${ssDrag}`);

      // ===== SC5a: .menu-toggle 短クリックで閉じる =====
      await shortClick(toggleEl);
      await page.waitForTimeout(800);
      const reopened5a = await page.locator('.poster-menu').isVisible();
      check(`[SC5a/${vp.label}] 閉じ確認前にメニューが開いていること`, reopened5a);

      if (reopened5a) {
        const ariaExpanded = await toggleEl.getAttribute('aria-expanded');
        check(
          `[SC5a/${vp.label}] aria-expanded=true になっていること`,
          ariaExpanded === 'true',
          `aria-expanded="${ariaExpanded}"`
        );
        await shortClick(toggleEl);
        await page.waitForTimeout(800);
        const closedAfterToggle = !(await page.locator('.poster-menu').isVisible());
        check(`[SC5a/${vp.label}] .menu-toggle 短クリックでメニューが閉じること`, closedAfterToggle);
      } else {
        check(`[SC5a/${vp.label}] .menu-toggle 短クリックでメニューが閉じること`, false, 'メニューが開かなかったためスキップ');
      }

      // ===== SC5b: 背景クリックで閉じる =====
      await shortClick(toggleEl);
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

      // ===== SC6: console/pageエラー 0件 =====
      check(
        `[SC6/${vp.label}] console エラーが 0 件であること`,
        consoleErrors.length === 0,
        consoleErrors.length > 0 ? consoleErrors.slice(0, 3).join(' | ') : ''
      );
      check(
        `[SC6/${vp.label}] pageエラーが 0 件であること`,
        pageErrors.length === 0,
        pageErrors.length > 0 ? pageErrors.slice(0, 3).join(' | ') : ''
      );

      // ===== SC7: ヘッダー回帰確認 =====
      const logoVisible = await page.locator('img[src*="logo.svg"], img[alt*="logo"], img[alt*="POSTER"]').first().isVisible().catch(() => false);
      const logoSvgVisible = await page.locator('img[src="/logo.svg"]').isVisible().catch(() => false);
      check(
        `[SC7/${vp.label}] ヘッダーロゴ(logo.svg)が表示されていること`,
        logoVisible || logoSvgVisible,
        `logoVisible=${logoVisible} logoSvgVisible=${logoSvgVisible}`
      );

      const langBtnCount = await page.locator('button').filter({ hasText: /^(EN|JA|日本語|English)$/i }).count();
      check(
        `[SC7/${vp.label}] 言語切替ボタンが表示されていること`,
        langBtnCount > 0,
        `count=${langBtnCount}`
      );

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log('\n========== 結果サマリー ==========');
  results.forEach(r => {
    console.log(`  [${r.status}] ${r.label}${r.detail ? ' — ' + r.detail : ''}`);
  });
  console.log(`\n  合計: ${pass + fail} 件 / PASS: ${pass} / FAIL: ${fail}`);
  console.log('====================================\n');

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
