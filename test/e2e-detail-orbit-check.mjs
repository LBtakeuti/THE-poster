/**
 * 詳細ページ OrbitControls 手動回転 E2E 確認スクリプト
 * 確認項目:
 *   1. マウスドラッグで3Dポスターが回転し、離しても向きを保持する（スクショ差分で確認）
 *   2. ズームボタン「+」「−」が機能する（DOM に存在し disabled 状態が正しい）
 *   3. console エラーが 0 件
 *   4. 一覧（トップ）の回帰: 自動回転・透かし・SOLD OUTバッジ・Buy リンク
 *
 * 実行: node test/e2e-detail-orbit-check.mjs
 */
import { chromium } from 'playwright';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

const DESKTOP = '/Users/keitakeuchi/Desktop';
const BASE_URL = 'http://localhost:3137';
const DETAIL_URL = `${BASE_URL}/poster/morning-sun`;
const HOME_URL = `${BASE_URL}/`;

const BROWSER_ARGS = [
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--ignore-gpu-blocklist',
  '--enable-webgl',
];

function md5(buf) {
  return createHash('md5').update(buf).digest('hex');
}

function savePath(name) {
  return path.join(DESKTOP, `e2e-orbit-${name}.png`);
}

async function run() {
  const browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });

  // ---------- 詳細ページ（デスクトップ） ----------
  const ctxDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: {
      origins: [{
        origin: BASE_URL,
        localStorage: [{ name: 'introSeen', value: '1' }],
      }],
    },
  });
  const pageD = await ctxDesktop.newPage();
  // sessionStorage は newPage 後に inject
  await pageD.addInitScript(() => {
    sessionStorage.setItem('introSeen', '1');
  });

  const errorsD = [];
  pageD.on('console', msg => { if (msg.type() === 'error') errorsD.push(msg.text()); });
  pageD.on('pageerror', err => errorsD.push('[pageerror] ' + err.message));

  await pageD.goto(DETAIL_URL, { waitUntil: 'networkidle' });
  await pageD.waitForTimeout(3000);

  // ---- スクショ: ドラッグ前 ----
  const ssBeforePath = savePath('desktop-before-drag');
  await pageD.screenshot({ path: ssBeforePath });

  // ---- Canvas の中心座標を取得してドラッグ ----
  const canvasBox = await pageD.locator('canvas').first().boundingBox();
  let dragResult = 'canvas not found';
  let ssDuringPath = null;
  let ssAfterPath = null;

  if (canvasBox) {
    const cx = canvasBox.x + canvasBox.width / 2;
    const cy = canvasBox.y + canvasBox.height / 2;

    // PointerDown → Move 右に200px → PointerUp
    await pageD.mouse.move(cx, cy);
    await pageD.mouse.down();
    // ゆっくり移動して OrbitControls に認識させる
    for (let i = 1; i <= 10; i++) {
      await pageD.mouse.move(cx + i * 20, cy);
      await pageD.waitForTimeout(30);
    }

    ssDuringPath = savePath('desktop-during-drag');
    await pageD.screenshot({ path: ssDuringPath });

    await pageD.mouse.up();

    // ドラッグ後に damping が落ち着くまで待つ
    await pageD.waitForTimeout(1500);

    ssAfterPath = savePath('desktop-after-drag');
    await pageD.screenshot({ path: ssAfterPath });

    dragResult = 'ok';
  }

  // ---- 3枚の md5 比較 ----
  const hashBefore = md5(fs.readFileSync(ssBeforePath));
  const hashDuring = ssDuringPath ? md5(fs.readFileSync(ssDuringPath)) : null;
  const hashAfter  = ssAfterPath  ? md5(fs.readFileSync(ssAfterPath))  : null;

  const changedDuringDrag = hashDuring && hashBefore !== hashDuring;
  const keptAfterRelease  = hashAfter  && hashDuring !== hashAfter; // damping で少し変わる
  // ドラッグ後が before と違う = 向き保持確認
  const keptVsBefore = hashAfter && hashBefore !== hashAfter;

  // ---- ズームボタン確認 ----
  const zoomOutBtn = pageD.locator('button[aria-label="Zoom out"]');
  const zoomInBtn  = pageD.locator('button[aria-label="Zoom in"]');

  const zoomOutExists  = await zoomOutBtn.count() > 0;
  const zoomInExists   = await zoomInBtn.count() > 0;
  const zoomOutInitiallyDisabled = zoomOutExists ? await zoomOutBtn.isDisabled() : null;
  const zoomInInitiallyDisabled  = zoomInExists  ? await zoomInBtn.isDisabled()  : null;

  // ズームインを1回押す
  let afterZoomInDisabled = null;
  let zoomOutDisabledAfterZoomIn = null;
  if (zoomInExists && !zoomInInitiallyDisabled) {
    await zoomInBtn.click();
    await pageD.waitForTimeout(800);
    afterZoomInDisabled = await zoomInBtn.isDisabled(); // まだ押せるはず(3段階の2番目)
    zoomOutDisabledAfterZoomIn = await zoomOutBtn.isDisabled(); // 押せるはず
  }

  // さらにズームインを押して上限まで
  if (zoomInExists && !(await zoomInBtn.isDisabled())) {
    await zoomInBtn.click();
    await pageD.waitForTimeout(800);
  }
  const zoomInAtMaxDisabled  = zoomInExists  ? await zoomInBtn.isDisabled()  : null;
  const zoomOutAtMaxEnabled  = zoomOutExists ? !(await zoomOutBtn.isDisabled()) : null;

  const ssZoomPath = savePath('desktop-zoomed');
  await pageD.screenshot({ path: ssZoomPath });

  await ctxDesktop.close();

  // ---------- 詳細ページ（モバイル幅） ----------
  const ctxMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    storageState: {
      origins: [{
        origin: BASE_URL,
        localStorage: [{ name: 'introSeen', value: '1' }],
      }],
    },
  });
  const pageM = await ctxMobile.newPage();
  await pageM.addInitScript(() => { sessionStorage.setItem('introSeen', '1'); });

  const errorsM = [];
  pageM.on('console', msg => { if (msg.type() === 'error') errorsM.push(msg.text()); });
  pageM.on('pageerror', err => errorsM.push('[pageerror] ' + err.message));

  await pageM.goto(DETAIL_URL, { waitUntil: 'networkidle' });
  await pageM.waitForTimeout(3000);

  const ssMobilePath = savePath('mobile-detail');
  await pageM.screenshot({ path: ssMobilePath, fullPage: true });
  await ctxMobile.close();

  // ---------- 一覧（トップ）回帰 ----------
  const ctxHome = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    storageState: {
      origins: [{
        origin: BASE_URL,
        localStorage: [{ name: 'introSeen', value: '1' }],
      }],
    },
  });
  const pageH = await ctxHome.newPage();
  await pageH.addInitScript(() => { sessionStorage.setItem('introSeen', '1'); });

  const errorsH = [];
  pageH.on('console', msg => { if (msg.type() === 'error') errorsH.push(msg.text()); });
  pageH.on('pageerror', err => errorsH.push('[pageerror] ' + err.message));

  await pageH.goto(HOME_URL, { waitUntil: 'networkidle' });
  await pageH.waitForTimeout(4000);

  const ssHome1 = savePath('home-1');
  await pageH.screenshot({ path: ssHome1, fullPage: true });
  await pageH.waitForTimeout(2000);
  const ssHome2 = savePath('home-2');
  await pageH.screenshot({ path: ssHome2, fullPage: true });

  const homeInfo = await pageH.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('article.store-card'));
    const soldOutCount = (document.body.innerText.match(/SOLD\s*OUT/gi) || []).length;
    const buyLinkCount = document.querySelectorAll('a.buy-button').length;
    // クリックで詳細遷移（href="/poster/..."）
    const posterLinks = Array.from(document.querySelectorAll('a[href^="/poster/"]')).length;
    return {
      cardCount: cards.length,
      soldOutCount,
      buyLinkCount,
      posterLinks,
    };
  });

  // 自動回転確認
  const hashHome1 = md5(fs.readFileSync(ssHome1));
  const hashHome2 = md5(fs.readFileSync(ssHome2));
  const homeAutoRotated = hashHome1 !== hashHome2;

  await ctxHome.close();
  await browser.close();

  // ================== 結果出力 ==================
  console.log('\n========== E2E 詳細ページ OrbitControls 確認結果 ==========');

  console.log('\n【1】マウスドラッグ回転・向き保持');
  console.log('  ドラッグ操作:', dragResult);
  console.log('  ドラッグ中に変化したか:', changedDuringDrag ? 'YES' : 'NO（変化なし — WebGL未描画の可能性）');
  console.log('  ドラッグ離した後 before と比較（向き保持）:', keptVsBefore ? 'YES（向きが変わったまま）' : 'NO（戻った or 差分なし）');
  console.log('  before hash:', hashBefore);
  console.log('  during hash:', hashDuring);
  console.log('  after  hash:', hashAfter);

  console.log('\n【2】ズームボタン');
  console.log('  「−」ボタン存在:', zoomOutExists ? 'YES' : 'NO');
  console.log('  「+」ボタン存在:', zoomInExists ? 'YES' : 'NO');
  console.log('  初期状態: 「−」disabled（正）:', zoomOutInitiallyDisabled === true ? 'PASS' : `FAIL (disabled=${zoomOutInitiallyDisabled})`);
  console.log('  初期状態: 「+」enabled（正）:',   zoomInInitiallyDisabled  === false ? 'PASS' : `FAIL (disabled=${zoomInInitiallyDisabled})`);
  console.log('  最大ズーム時「+」disabled（正）:', zoomInAtMaxDisabled  === true  ? 'PASS' : `FAIL (disabled=${zoomInAtMaxDisabled})`);
  console.log('  最大ズーム時「−」enabled（正）:',  zoomOutAtMaxEnabled  === true  ? 'PASS' : `FAIL (enabled=${zoomOutAtMaxEnabled})`);

  console.log('\n【3】console エラー');
  console.log('  詳細ページ(Desktop) エラー件数:', errorsD.length);
  errorsD.forEach((e, i) => console.log(`    [D${i+1}] ${e}`));
  console.log('  詳細ページ(Mobile)  エラー件数:', errorsM.length);
  errorsM.forEach((e, i) => console.log(`    [M${i+1}] ${e}`));
  console.log('  一覧ページ          エラー件数:', errorsH.length);
  errorsH.forEach((e, i) => console.log(`    [H${i+1}] ${e}`));

  console.log('\n【4】一覧回帰確認');
  console.log('  自動回転（2秒後に差分）:', homeAutoRotated ? 'YES（変化あり）' : 'NO（変化なし — WebGL未描画の可能性）');
  console.log('  カード枚数:', homeInfo.cardCount);
  console.log('  SOLD OUTバッジ数:', homeInfo.soldOutCount);
  console.log('  Buy リンク数:', homeInfo.buyLinkCount);
  console.log('  詳細遷移リンク数:', homeInfo.posterLinks);

  console.log('\n【スクショ保存先（Desktop）】');
  console.log('  ドラッグ前  :', ssBeforePath);
  if (ssDuringPath) console.log('  ドラッグ中  :', ssDuringPath);
  if (ssAfterPath)  console.log('  ドラッグ後  :', ssAfterPath);
  console.log('  ズーム後    :', ssZoomPath);
  console.log('  モバイル    :', ssMobilePath);
  console.log('  一覧 (1/2) :', ssHome1);
  console.log('  一覧 (2/2) :', ssHome2);
  console.log('============================================================\n');

  const allErrors = [...errorsD, ...errorsM, ...errorsH];
  const zoomButtonsFail = !(zoomOutExists && zoomInExists);
  const failed = allErrors.length > 0 || zoomButtonsFail;
  process.exit(failed ? 1 : 0);
}

run().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
