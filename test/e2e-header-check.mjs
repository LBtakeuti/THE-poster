/**
 * ヘッダーレイアウト修正 E2E 確認スクリプト
 * SC1: .store-logo の height が SP≈26px、PC≈40px（特大でない・画面横幅内）
 * SC2: ロゴが概ね中央、言語ボタン(.lang-button)が右端寄り
 * SC3: console/pageエラー 0件
 * SC4: ハンバーガーメニュー回帰（SP右下固定・クリック開閉）
 */
import { chromium } from 'playwright';
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
let pass = 0, fail = 0;

function check(label, ok, detail = '') {
  const status = ok ? 'PASS' : 'FAIL';
  if (ok) pass++; else fail++;
  results.push({ label, status, detail });
  console.log(`  [${status}] ${label}${detail ? ' — ' + detail : ''}`);
}

async function setupPage(context) {
  const page = await context.newPage();
  const consoleErrors = [], pageErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => pageErrors.push(err.message));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => sessionStorage.setItem('introSeen', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const title = await page.title();
  if (title !== 'THE POSTER') console.warn(`    WARNING: title="${title}"`);
  return { page, consoleErrors, pageErrors };
}

async function shortClick(toggleEl) {
  await toggleEl.dispatchEvent('pointerdown', { clientX: 50, clientY: 50, pointerId: 1 });
  await new Promise(r => setTimeout(r, 50));
  await toggleEl.dispatchEvent('pointerup', { clientX: 50, clientY: 50, pointerId: 1 });
}

async function main() {
  console.log('\n========== E2E: ヘッダーレイアウト修正確認 ==========');
  const browser = await chromium.launch({ headless: true, args: GPU_ARGS });

  try {
    const viewports = [
      { label: 'SP (390x844)', width: 390, height: 844, expectedH: 26, hTol: 6 },
      { label: 'PC (1280x800)', width: 1280, height: 800, expectedH: 40, hTol: 6 },
    ];

    for (const vp of viewports) {
      console.log(`\n--- Viewport: ${vp.label} ---`);
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const { page, consoleErrors, pageErrors } = await setupPage(context);
      const ssLabel = vp.label.replace(/[^a-z0-9]/gi, '_');

      // --- SC1: ロゴ高さ・横幅確認 ---
      const logoBox = await page.locator('.store-logo').boundingBox();
      console.log(`    .store-logo boundingBox: ${JSON.stringify(logoBox)}`);

      const heightOk = logoBox && Math.abs(logoBox.height - vp.expectedH) <= vp.hTol;
      check(
        `[SC1/${vp.label}] .store-logo の高さが約${vp.expectedH}px(±${vp.hTol}px)であること`,
        !!heightOk,
        logoBox ? `height=${logoBox.height.toFixed(1)}px 期待=${vp.expectedH}px` : 'boundingBox取得失敗'
      );

      const widthOk = logoBox && logoBox.width <= vp.width;
      check(
        `[SC1/${vp.label}] .store-logo の幅が画面幅(${vp.width}px)内に収まること`,
        !!widthOk,
        logoBox ? `width=${logoBox.width.toFixed(1)}px` : 'boundingBox取得失敗'
      );

      // ロゴの右端が画面外に出ていないこと
      const logoRight = logoBox ? logoBox.x + logoBox.width : null;
      check(
        `[SC1/${vp.label}] ロゴ右端が画面外にはみ出していないこと`,
        logoRight !== null && logoRight <= vp.width,
        logoRight !== null ? `right=${logoRight.toFixed(1)}px (画面幅=${vp.width}px)` : ''
      );

      // --- SC2: ロゴ中央・言語ボタン右端寄り ---
      // ヘッダー全体の幅を取得
      const headerBox = await page.locator('header').first().boundingBox();
      console.log(`    header boundingBox: ${JSON.stringify(headerBox)}`);

      // ロゴ中央確認: ロゴ中心X がヘッダー中心X の ±40% 以内
      const logoCenterX = logoBox ? logoBox.x + logoBox.width / 2 : null;
      const headerCenterX = headerBox ? headerBox.x + headerBox.width / 2 : null;
      const centerTol = (headerBox?.width ?? vp.width) * 0.4;
      const logoCentered = logoCenterX !== null && headerCenterX !== null &&
        Math.abs(logoCenterX - headerCenterX) <= centerTol;
      check(
        `[SC2/${vp.label}] ロゴがヘッダー内で概ね中央にあること`,
        !!logoCentered,
        logoCenterX !== null
          ? `logo中心X=${logoCenterX.toFixed(1)} header中心X=${headerCenterX?.toFixed(1)} 許容±${centerTol.toFixed(0)}px`
          : 'boundingBox取得失敗'
      );

      // 言語ボタン右端寄り確認: ボタン右端がヘッダー右端から 60px 以内
      const langBox = await page.locator('.lang-button').first().boundingBox();
      console.log(`    .lang-button boundingBox: ${JSON.stringify(langBox)}`);

      const langRight = langBox ? langBox.x + langBox.width : null;
      const headerRight = headerBox ? headerBox.x + headerBox.width : vp.width;
      const langRightMargin = langRight !== null ? headerRight - langRight : null;
      check(
        `[SC2/${vp.label}] 言語ボタンがヘッダー右端寄り(右端から60px以内)であること`,
        langRightMargin !== null && langRightMargin <= 60,
        langRightMargin !== null
          ? `langRight=${langRight?.toFixed(1)} headerRight=${headerRight.toFixed(1)} margin=${langRightMargin.toFixed(1)}px`
          : 'boundingBox取得失敗'
      );

      // スクリーンショット
      const ss = path.join(DESKTOP, `header-check-${ssLabel}.png`);
      await page.screenshot({ path: ss, fullPage: false });
      console.log(`    Screenshot: ${ss}`);

      // --- SC3: console/pageエラー 0件 ---
      check(
        `[SC3/${vp.label}] console エラーが 0 件であること`,
        consoleErrors.length === 0,
        consoleErrors.length > 0 ? consoleErrors.slice(0, 3).join(' | ') : ''
      );
      check(
        `[SC3/${vp.label}] pageエラーが 0 件であること`,
        pageErrors.length === 0,
        pageErrors.length > 0 ? pageErrors.slice(0, 3).join(' | ') : ''
      );

      // --- SC4: ハンバーガーメニュー回帰 ---
      const toggleEl = page.locator('.menu-toggle');
      const toggleVisible = await toggleEl.isVisible();
      check(`[SC4/${vp.label}] .menu-toggle が表示されていること`, toggleVisible);

      if (toggleVisible) {
        // SP: 右下固定位置確認
        if (vp.width <= 640) {
          const toggleBox = await toggleEl.boundingBox();
          const expectedX = vp.width - 40 - 12; // 338
          const expectedY = vp.height - 40 - 12; // 792
          const fixedOk = toggleBox &&
            Math.abs(toggleBox.x - expectedX) <= 5 &&
            Math.abs(toggleBox.y - expectedY) <= 5;
          check(
            `[SC4/${vp.label}] SP: .menu-toggle が右下固定(left≈${expectedX} top≈${expectedY})であること`,
            !!fixedOk,
            toggleBox ? `left=${toggleBox.x.toFixed(1)} top=${toggleBox.y.toFixed(1)}` : 'boundingBox取得失敗'
          );
        }

        // 短クリックでメニュー開閉
        await shortClick(toggleEl);
        await page.waitForTimeout(800);
        const menuOpen = await page.locator('.poster-menu').isVisible();
        check(`[SC4/${vp.label}] 短クリックで .poster-menu が開くこと`, menuOpen);

        if (menuOpen) {
          await shortClick(toggleEl);
          await page.waitForTimeout(800);
          const menuClosed = !(await page.locator('.poster-menu').isVisible());
          check(`[SC4/${vp.label}] 再クリックで .poster-menu が閉じること`, menuClosed);
        }
      }

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

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
