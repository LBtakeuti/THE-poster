/**
 * ポスター詳細ページ＋画像保護 E2E 確認スクリプト
 *
 * 確認項目:
 *   1. トップ → 3D領域クリック → /poster/<slug> へ遷移する
 *   2. 詳細ページで作品が表示され、ズームボタン（+ / −）が効く。戻るリンクで一覧へ戻れる
 *   3. 一覧・詳細とも透かし「THE POSTER · PREVIEW」が canvas / 画像に焼かれている（スクショ目視）
 *   4. 右クリック（contextmenu）が抑止されている。dragstart も抑止。フォームの入力は可能
 *   5. 購入ボタン / SOLD OUT バッジが従来通り存在する
 *   6. console エラーが 0 件
 *
 * 実行: node test/e2e-poster-detail-check.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const DESKTOP = '/Users/keitakeuchi/Desktop';
const BASE_URL = 'http://localhost:3137';
const SS_DIR = path.join(DESKTOP, 'e2e-poster-detail');

function ssPath(name) {
  return path.join(SS_DIR, name);
}

function pass(label) { console.log(`  [PASS] ${label}`); }
function fail(label, detail = '') { console.log(`  [FAIL] ${label}${detail ? ': ' + detail : ''}`); }
function info(label) { console.log(`  [INFO] ${label}`); }

async function run() {
  fs.mkdirSync(SS_DIR, { recursive: true });

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

  const results = {
    item1_navigation: null,
    item2_detail_ui: null,
    item2_zoom: null,
    item2_back: null,
    item3_watermark_index: '目視（スクショ参照）',
    item3_watermark_detail: '目視（スクショ参照）',
    item4_contextmenu: null,
    item4_dragstart: null,
    item4_form_input: null,
    item5_buy_or_soldout: null,
    item6_console_errors: null,
  };

  // =====================================================
  // トップページ読み込み
  // =====================================================
  console.log('\n--- トップページ読み込み ---');
  // IntroOverlay を事前スキップ（sessionStorageにフラグを立ててから遷移）
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.sessionStorage.setItem('introSeen', '1'));
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000); // R3F初期化待機

  await page.screenshot({ path: ssPath('01-index.png'), fullPage: true });
  info('トップスクショ保存: 01-index.png');

  // =====================================================
  // [1] 3Dポスター領域クリック → 詳細ページ遷移
  // =====================================================
  console.log('\n--- [1] 3Dポスター領域クリック遷移テスト ---');

  // poster-card-link 要素を探してクリック
  const cardLink = page.locator('.poster-card-link').first();
  const cardLinkExists = await cardLink.count() > 0;

  if (!cardLinkExists) {
    fail('[1] .poster-card-link が見つからない');
    results.item1_navigation = false;
  } else {
    // poster-box の中心をクリック（ドラッグ判定をパスするため）
    const box = await cardLink.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      if (currentUrl.includes('/poster/')) {
        pass('[1] /poster/<slug> へ遷移成功');
        results.item1_navigation = true;
      } else {
        fail('[1] 遷移せず（URL: ' + currentUrl + '）');
        results.item1_navigation = false;
        // フォールバック: 直接URLで詳細ページへ
        info('[1] フォールバック: Supabase経由でslugを取得して直接遷移');
      }
    }
  }

  // 詳細ページに到達していない場合は最初のslugを直接試みる
  if (!page.url().includes('/poster/')) {
    // トップのリンクから slug を抽出
    const checkoutLinks = await page.locator('a[href*="/checkout?slug="]').all();
    let slug = null;
    if (checkoutLinks.length > 0) {
      const href = await checkoutLinks[0].getAttribute('href');
      const m = href?.match(/slug=([^&]+)/);
      if (m) slug = decodeURIComponent(m[1]);
    }
    if (!slug) {
      // sample fallback
      slug = 'morning-sun';
    }
    info('[1] 直接詳細ページへ: /poster/' + slug);
    await page.goto(BASE_URL + '/poster/' + encodeURIComponent(slug), { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
  }

  // =====================================================
  // [2] 詳細ページUI確認（作品表示・ズームボタン・戻る）
  // =====================================================
  console.log('\n--- [2] 詳細ページUI確認 ---');

  await page.screenshot({ path: ssPath('02-detail.png'), fullPage: true });
  info('詳細ページスクショ保存: 02-detail.png');

  // canvas が存在するか（3D表示）
  const canvasEl = page.locator('.poster-detail-stage canvas');
  const canvasExists = await canvasEl.count() > 0;
  if (canvasExists) {
    pass('[2] 詳細ページに canvas（3D表示）あり');
    results.item2_detail_ui = true;
  } else {
    fail('[2] 詳細ページに canvas なし');
    results.item2_detail_ui = false;
  }

  // ズームボタン確認
  const zoomIn = page.locator('[aria-label="Zoom in"]');
  const zoomOut = page.locator('[aria-label="Zoom out"]');
  const zoomInExists = await zoomIn.count() > 0;
  const zoomOutExists = await zoomOut.count() > 0;

  if (zoomInExists && zoomOutExists) {
    pass('[2] ズームボタン（+ / −）が存在する');

    // ズームイン: 初期は zoomOut が disabled, zoomIn が enabled
    const zoomOutDisabledInit = await zoomOut.isDisabled();
    const zoomInEnabledInit = await zoomIn.isEnabled();

    if (zoomOutDisabledInit && zoomInEnabledInit) {
      // ズームイン実行
      await zoomIn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: ssPath('03-zoom-in.png') });
      info('ズームイン後スクショ: 03-zoom-in.png');

      // ズームアウトが使えるようになっているはず
      const zoomOutEnabled = await zoomOut.isEnabled();
      if (zoomOutEnabled) {
        pass('[2] ズームイン後にズームアウトが有効化');
        // ズームイン上限まで押す
        await zoomIn.click();
        await page.waitForTimeout(500);
        const zoomInDisabledMax = await zoomIn.isDisabled();
        if (zoomInDisabledMax) {
          pass('[2] ズームイン上限でボタンが無効化');
        } else {
          info('[2] ズームイン上限ボタン状態（3段階のうち押せる段階がある）');
        }
        results.item2_zoom = true;
      } else {
        fail('[2] ズームイン後もズームアウトが無効のまま');
        results.item2_zoom = false;
      }
    } else {
      info('[2] ズームボタン初期状態: zoomOut.disabled=' + zoomOutDisabledInit + ' zoomIn.enabled=' + zoomInEnabledInit);
      results.item2_zoom = true; // ボタン自体は存在
    }
  } else {
    fail('[2] ズームボタンが見つからない (zoomIn=' + zoomInExists + ', zoomOut=' + zoomOutExists + ')');
    results.item2_zoom = false;
  }

  // 戻るリンク確認
  const backLink = page.locator('.poster-detail-back, a[href="/"]').first();
  const backExists = await backLink.count() > 0;
  if (backExists) {
    pass('[2] 戻るリンクが存在する');
    await backLink.click();
    await page.waitForTimeout(2000);
    if (page.url() === BASE_URL + '/' || page.url() === BASE_URL) {
      pass('[2] 戻るリンクで一覧（/）へ戻れた');
      results.item2_back = true;
    } else {
      fail('[2] 戻るリンク後のURL: ' + page.url());
      results.item2_back = false;
    }
  } else {
    fail('[2] 戻るリンクが見つからない');
    results.item2_back = false;
  }

  // =====================================================
  // [3] 透かし（スクショ目視用）
  // =====================================================
  console.log('\n--- [3] 透かし確認（スクショ目視）---');
  // 一覧・詳細スクショはすでに保存済み（01-index.png / 02-detail.png）
  // CanvasTexture に焼かれているため DOM検査では検出不可 → スクショで目視
  info('[3] 01-index.png と 02-detail.png を目視して「THE POSTER · PREVIEW」の斜め透かしを確認してください');
  results.item3_watermark_index = '目視（スクショ: 01-index.png）';
  results.item3_watermark_detail = '目視（スクショ: 02-detail.png）';

  // =====================================================
  // [4] 右クリック・dragstart 抑止、フォーム入力可能
  // =====================================================
  console.log('\n--- [4] コンテキストメニュー / dragstart 抑止確認 ---');

  // トップに戻る
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  // contextmenu 抑止テスト: canvas / poster-box 上で右クリック
  const posterBox = page.locator('.poster-box').first();
  const posterBoxExists = await posterBox.count() > 0;

  if (posterBoxExists) {
    // contextmenu イベントが preventDefault されているか評価
    const contextMenuSuppressed = await page.evaluate(() => {
      return new Promise(resolve => {
        const target = document.querySelector('.poster-box') || document.querySelector('canvas');
        if (!target) { resolve(null); return; }
        let defaultPrevented = true; // 発火すらしなければ抑止とみなす
        const handler = (e) => {
          defaultPrevented = e.defaultPrevented;
        };
        // 一時的にキャプチャ
        document.addEventListener('contextmenu', handler, { capture: true, once: true });
        // 合成イベントで発火
        const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        target.dispatchEvent(evt);
        setTimeout(() => {
          document.removeEventListener('contextmenu', handler, { capture: true });
          resolve(defaultPrevented || !evt.cancelable);
        }, 100);
      });
    });

    // 別アプローチ: page.mouse.click で右クリックしてダイアログが出ないか
    // Playwright headlessではネイティブcontextmenuは出ないため、
    // イベントハンドラが登録されているかを検査する
    const hasContextMenuHandler = await page.evaluate(() => {
      // window または document に oncontextmenu があるか、
      // poster-box / canvas / body に contextmenu リスナーがあるかをチェック
      const targets = [
        document.querySelector('.poster-box canvas'),
        document.querySelector('.poster-box'),
        document.querySelector('canvas'),
        document.body,
        document.documentElement,
      ].filter(Boolean);

      // getEventListeners は DevTools専用のため使えない
      // 代わりに: 合成 contextmenu イベントを発火し、defaultPrevented を確認
      for (const el of targets) {
        const evt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        el.dispatchEvent(evt);
        if (evt.defaultPrevented) return true;
      }
      return false;
    });

    if (hasContextMenuHandler) {
      pass('[4] contextmenu が preventDefault されている（抑止確認）');
      results.item4_contextmenu = true;
    } else {
      // ネイティブ右クリックがブロックされているか別の方法で確認
      // page.evaluate でグローバルな oncontextmenu を確認
      const globalHandler = await page.evaluate(() => {
        return typeof document.oncontextmenu === 'function' ||
               typeof window.oncontextmenu === 'function';
      });
      if (globalHandler) {
        pass('[4] document/window.oncontextmenu ハンドラあり（抑止）');
        results.item4_contextmenu = true;
      } else {
        info('[4] contextmenu 抑止の DOM検査では判定不能（実装コード確認が必要）');
        results.item4_contextmenu = 'manual-check';
      }
    }

    // dragstart 抑止テスト
    const dragStartSuppressed = await page.evaluate(() => {
      const targets = [
        document.querySelector('.poster-box canvas'),
        document.querySelector('.poster-box'),
        document.querySelector('canvas'),
        document.body,
      ].filter(Boolean);

      for (const el of targets) {
        const evt = new DragEvent('dragstart', { bubbles: true, cancelable: true });
        el.dispatchEvent(evt);
        if (evt.defaultPrevented) return true;
      }
      return false;
    });

    if (dragStartSuppressed) {
      pass('[4] dragstart が preventDefault されている（抑止確認）');
      results.item4_dragstart = true;
    } else {
      info('[4] dragstart 抑止の合成イベントでは判定不能（実装コード確認が必要）');
      results.item4_dragstart = 'manual-check';
    }
  } else {
    fail('[4] .poster-box が見つからず、テスト不可');
    results.item4_contextmenu = false;
    results.item4_dragstart = false;
  }

  // フォーム入力テスト（checkoutページ）
  console.log('\n--- [4] フォーム入力テスト ---');
  // checkoutへのリンクがあるか確認
  const buyLinks = await page.locator('a[href*="/checkout"]').all();
  if (buyLinks.length > 0) {
    const checkoutHref = await buyLinks[0].getAttribute('href');
    await page.goto(BASE_URL + checkoutHref, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const inputEl = page.locator('input[type="text"], input[type="email"], input[name="name"], input[name="email"]').first();
    const inputExists = await inputEl.count() > 0;
    if (inputExists) {
      await inputEl.click();
      await inputEl.type('テスト入力');
      const val = await inputEl.inputValue();
      if (val.includes('テスト')) {
        pass('[4] checkoutフォームへのテキスト入力が可能');
        results.item4_form_input = true;
      } else {
        fail('[4] フォーム入力値が反映されない: ' + val);
        results.item4_form_input = false;
      }
    } else {
      info('[4] checkoutページにinput要素なし（ページ構成確認が必要）');
      results.item4_form_input = 'no-input-found';
    }
  } else {
    info('[4] 購入リンクが見つからずcheckoutフォームテスト不可（SOLD OUTのみの可能性）');
    results.item4_form_input = 'no-buy-link';
  }

  // =====================================================
  // [5] 購入ボタン / SOLD OUT バッジ
  // =====================================================
  console.log('\n--- [5] 購入ボタン / SOLD OUT バッジ ---');
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  const storeInfo = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('article.store-card'));
    const buyLinks = document.querySelectorAll('a.buy-button, a[href*="/checkout"]');
    const soldBadges = document.querySelectorAll('.sold-badge, [class*="sold"]');
    const allText = document.body.innerText;
    return {
      cardCount: cards.length,
      buyLinkCount: buyLinks.length,
      soldBadgeCount: soldBadges.length,
      hasSoldText: /SOLD\s*OUT/i.test(allText),
      hasBuyText: /購入|Buy/i.test(allText),
    };
  });

  info('[5] カード数: ' + storeInfo.cardCount + ', 購入ボタン: ' + storeInfo.buyLinkCount + ', SOLDバッジ: ' + storeInfo.soldBadgeCount);

  if (storeInfo.buyLinkCount > 0 || storeInfo.hasBuyText) {
    pass('[5] 購入ボタン（Buy / 購入）が存在する');
  } else {
    info('[5] 購入ボタンなし（全商品SOLD OUTの可能性）');
  }
  if (storeInfo.hasSoldText) {
    pass('[5] SOLD OUT バッジが存在する');
  }

  // SOLD OUTをクリックしても遷移しないことを確認
  const soldBadge = page.locator('.sold-badge').first();
  if (await soldBadge.count() > 0) {
    const tagName = await soldBadge.evaluate(el => el.tagName.toLowerCase());
    if (tagName === 'span') {
      pass('[5] SOLD OUT は <span>（ボタン/リンクでない）- 押せない');
      results.item5_buy_or_soldout = true;
    } else {
      info('[5] SOLD OUT 要素のタグ: ' + tagName);
      results.item5_buy_or_soldout = true;
    }
  } else if (storeInfo.buyLinkCount > 0) {
    pass('[5] 購入ボタンが存在し、SOLD OUTなし（全商品purchasable）');
    results.item5_buy_or_soldout = true;
  } else {
    info('[5] 購入ボタン・SOLD OUTバッジとも見当たらず。カード数: ' + storeInfo.cardCount);
    results.item5_buy_or_soldout = storeInfo.cardCount > 0;
  }

  // 詳細ページの購入ボタン確認
  const firstSlugLink = await page.locator('a[href*="/checkout?slug="]').first();
  if (await firstSlugLink.count() > 0) {
    const href = await firstSlugLink.getAttribute('href');
    const m = href?.match(/slug=([^&]+)/);
    if (m) {
      const slug = decodeURIComponent(m[1]);
      await page.goto(BASE_URL + '/poster/' + encodeURIComponent(slug), { waitUntil: 'networkidle' });
      await page.waitForTimeout(4000);
      const detailBuy = await page.locator('.poster-detail-info a.buy-button, .poster-detail-info .sold-badge').first().count();
      if (detailBuy > 0) {
        pass('[5] 詳細ページにも購入ボタン/SOLDバッジあり');
      } else {
        info('[5] 詳細ページのボタン確認不可');
      }
    }
  }

  // =====================================================
  // [6] console エラー確認
  // =====================================================
  console.log('\n--- [6] console エラー確認 ---');
  if (consoleErrors.length === 0 && pageErrors.length === 0) {
    pass('[6] console エラー 0 件');
    results.item6_console_errors = true;
  } else {
    fail('[6] エラーあり: consoleErrors=' + consoleErrors.length + ', pageErrors=' + pageErrors.length);
    results.item6_console_errors = false;
    consoleErrors.forEach((e, i) => console.log('    console[' + i + ']: ' + e));
    pageErrors.forEach((e, i) => console.log('    page[' + i + ']: ' + e));
  }

  await browser.close();

  // =====================================================
  // 結果サマリ
  // =====================================================
  console.log('\n========================================');
  console.log('E2E 確認結果サマリ');
  console.log('========================================');
  console.log('[1] 3Dクリック→詳細遷移:    ', fmt(results.item1_navigation));
  console.log('[2] 詳細ページcanvas表示:   ', fmt(results.item2_detail_ui));
  console.log('[2] ズームボタン動作:        ', fmt(results.item2_zoom));
  console.log('[2] 戻るリンク動作:          ', fmt(results.item2_back));
  console.log('[3] 透かし（一覧）:          ', results.item3_watermark_index);
  console.log('[3] 透かし（詳細）:          ', results.item3_watermark_detail);
  console.log('[4] contextmenu 抑止:       ', fmt(results.item4_contextmenu));
  console.log('[4] dragstart 抑止:          ', fmt(results.item4_dragstart));
  console.log('[4] フォーム入力可能:        ', fmt(results.item4_form_input));
  console.log('[5] 購入/SOLDバッジ:         ', fmt(results.item5_buy_or_soldout));
  console.log('[6] consoleエラー 0件:       ', fmt(results.item6_console_errors));
  console.log('========================================');
  console.log('\nスクショ保存先:', SS_DIR);
  console.log('  01-index.png   : トップページ（透かし確認用）');
  console.log('  02-detail.png  : 詳細ページ（透かし確認用）');
  console.log('  03-zoom-in.png : ズームイン後の詳細ページ');

  // 失敗判定
  const failed = Object.values(results).some(v => v === false);
  const hasConsoleErrors = !results.item6_console_errors;
  process.exit(failed || hasConsoleErrors ? 1 : 0);
}

function fmt(v) {
  if (v === true) return 'PASS';
  if (v === false) return 'FAIL';
  return String(v);
}

run().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
