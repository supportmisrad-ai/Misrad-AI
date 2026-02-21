/**
 * Misrad AI - Full System Screenshot Capture
 *
 * Captures all screens in every module at full desktop width.
 *
 * Usage:
 *   node scripts/capture-screenshots.js
 *
 * Env vars (all optional):
 *   SCREENSHOT_BASE_URL        default: http://localhost:4000
 *   SCREENSHOT_ORG_SLUG        default: tests
 *   SCREENSHOT_STORAGE_STATE   default: tests/e2e/.auth/storageState.json
 *   SCREENSHOT_OUTPUT_DIR      default: screenshots
 *   SCREENSHOT_HEADLESS        default: false  (set to 1 for headless)
 */

'use strict';

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL   = (process.env.SCREENSHOT_BASE_URL   || 'http://localhost:4000').replace(/\/$/, '');
const ORG_SLUG   = process.env.SCREENSHOT_ORG_SLUG   || 'misrad-ai-hq';
const SS_PATH    = process.env.SCREENSHOT_STORAGE_STATE || 'tests/e2e/.auth/storageState.json';
const OUTPUT_DIR = process.env.SCREENSHOT_OUTPUT_DIR  || 'screenshots';
const HEADLESS   = ['1','true'].includes(String(process.env.SCREENSHOT_HEADLESS || '').toLowerCase());

const W = 1440;
const H = 900;
const NAV_TIMEOUT  = 45_000;
const LOAD_WAIT_MS = 2_200;

// ---------------------------------------------------------------------------
// Route manifest
// ---------------------------------------------------------------------------
const w = (sub) => `/w/${ORG_SLUG}${sub}`;

const SCREENS = [
  // ── Auth / Entry ──────────────────────────────────────────────────────────
  { folder: '00-auth',       name: '01-login',          url: '/login',       waitFor: 'load' },
  { folder: '00-auth',       name: '02-sign-in',        url: '/sign-in',     waitFor: 'load' },

  // ── Lobby & Support ───────────────────────────────────────────────────────
  { folder: '01-lobby',      name: '01-lobby',          url: w('/lobby') },
  { folder: '01-lobby',      name: '02-support-home',   url: w('/support') },
  { folder: '01-lobby',      name: '03-support-tickets',url: w('/support/tickets') },

  // ── System Module ─────────────────────────────────────────────────────────
  { folder: '02-system',     name: '01-home',                  url: w('/system') },
  { folder: '02-system',     name: '02-headquarters',          url: w('/system/headquarters') },
  { folder: '02-system',     name: '03-hub',                   url: w('/system/hub') },
  { folder: '02-system',     name: '04-sales-leads',           url: w('/system/sales_leads') },
  { folder: '02-system',     name: '05-sales-pipeline',        url: w('/system/sales_pipeline') },
  { folder: '02-system',     name: '06-calendar',              url: w('/system/calendar') },
  { folder: '02-system',     name: '07-tasks',                 url: w('/system/tasks') },
  { folder: '02-system',     name: '08-analytics',             url: w('/system/analytics') },
  { folder: '02-system',     name: '09-ai-analytics',          url: w('/system/ai_analytics') },
  { folder: '02-system',     name: '10-reports',               url: w('/system/reports') },
  { folder: '02-system',     name: '11-comms',                 url: w('/system/comms') },
  { folder: '02-system',     name: '12-dialer',                url: w('/system/dialer') },
  { folder: '02-system',     name: '13-notifications',         url: w('/system/notifications') },
  { folder: '02-system',     name: '14-notifications-center',  url: w('/system/notifications_center') },
  { folder: '02-system',     name: '15-settings',              url: w('/system/settings') },
  { folder: '02-system',     name: '16-system-config',         url: w('/system/system') },
  { folder: '02-system',     name: '17-me',                    url: w('/system/me') },

  // ── Client Module ─────────────────────────────────────────────────────────
  { folder: '03-client',     name: '01-home',           url: w('/client') },
  { folder: '03-client',     name: '02-dashboard',      url: w('/client/dashboard') },
  { folder: '03-client',     name: '03-clients',        url: w('/client/clients') },
  { folder: '03-client',     name: '04-hub',            url: w('/client/hub') },
  { folder: '03-client',     name: '05-workflows',      url: w('/client/workflows') },
  { folder: '03-client',     name: '06-client-portal',  url: w('/client/client-portal') },
  { folder: '03-client',     name: '07-portal',         url: w('/client/portal') },
  { folder: '03-client',     name: '08-me',             url: w('/client/me') },

  // ── Finance Module ────────────────────────────────────────────────────────
  { folder: '04-finance',    name: '01-home',           url: w('/finance') },
  { folder: '04-finance',    name: '02-overview',       url: w('/finance/overview') },
  { folder: '04-finance',    name: '03-invoices',       url: w('/finance/invoices') },
  { folder: '04-finance',    name: '04-expenses',       url: w('/finance/expenses') },
  { folder: '04-finance',    name: '05-me',             url: w('/finance/me') },

  // ── Social Module ─────────────────────────────────────────────────────────
  { folder: '05-social',     name: '01-home',           url: w('/social') },
  { folder: '05-social',     name: '02-dashboard',      url: w('/social/dashboard') },
  { folder: '05-social',     name: '03-calendar',       url: w('/social/calendar') },
  { folder: '05-social',     name: '04-machine',        url: w('/social/machine') },
  { folder: '05-social',     name: '05-collection',     url: w('/social/collection') },
  { folder: '05-social',     name: '06-hub',            url: w('/social/hub') },
  { folder: '05-social',     name: '07-analytics',      url: w('/social/analytics') },
  { folder: '05-social',     name: '08-campaigns',      url: w('/social/campaigns') },
  { folder: '05-social',     name: '09-inbox',          url: w('/social/inbox') },
  { folder: '05-social',     name: '10-clients',        url: w('/social/clients') },
  { folder: '05-social',     name: '11-team',           url: w('/social/team') },
  { folder: '05-social',     name: '12-workspace',      url: w('/social/workspace') },
  { folder: '05-social',     name: '13-settings',       url: w('/social/settings') },
  { folder: '05-social',     name: '14-agency-insights',url: w('/social/agency-insights') },
  { folder: '05-social',     name: '15-me',             url: w('/social/me') },
  { folder: '05-social',     name: '16-admin',          url: w('/social/admin') },
  { folder: '05-social',     name: '17-shabbat-preview',url: w('/social/admin/shabbat-preview') },

  // ── Operations Module ─────────────────────────────────────────────────────
  { folder: '06-operations', name: '01-home',           url: w('/operations') },
  { folder: '06-operations', name: '02-projects',       url: w('/operations/projects') },
  { folder: '06-operations', name: '03-new-project',    url: w('/operations/projects/new') },
  { folder: '06-operations', name: '04-work-orders',    url: w('/operations/work-orders') },
  { folder: '06-operations', name: '05-new-work-order', url: w('/operations/work-orders/new') },
  { folder: '06-operations', name: '06-contractors',    url: w('/operations/contractors') },
  { folder: '06-operations', name: '07-inventory',      url: w('/operations/inventory') },
  { folder: '06-operations', name: '08-settings',       url: w('/operations/settings') },
  { folder: '06-operations', name: '09-me',             url: w('/operations/me') },

  // ── Nexus Module ──────────────────────────────────────────────────────────
  { folder: '07-nexus',      name: '01-home',           url: w('/nexus') },

  // ── Personal Account ──────────────────────────────────────────────────────
  { folder: '08-account',    name: '01-me',             url: '/me' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function pad(n, len = 2) {
  return String(n).padStart(len, '0');
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(LOAD_WAIT_MS);
}

async function scrollToTop(page) {
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
}

async function shot(page, filePath) {
  await page.screenshot({ path: filePath, fullPage: true });
}

// ---------------------------------------------------------------------------
// Try to capture AI assistant widget open state
// ---------------------------------------------------------------------------
async function tryCaptureAiWidget(page, baseFilePath) {
  // The AiAssistantWidget / AiWidget uses a floating button with Bot/MessageCircle/Sparkles icon.
  // Try common selectors.
  const selectors = [
    'button[aria-label*="AI"]',
    'button[aria-label*="Assistant"]',
    'button[aria-label*="עוזר"]',
    'button[aria-label*="צ\'אט"]',
    '[data-testid="ai-widget-toggle"]',
    '[data-testid="ai-chat-toggle"]',
  ];
  for (const sel of selectors) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        await btn.click();
        await page.waitForTimeout(1200);
        const widgetPath = baseFilePath.replace('.png', '-ai-widget-open.png');
        await page.screenshot({ path: widgetPath, fullPage: true });
        console.log(`    💬 AI widget captured → ${path.basename(widgetPath)}`);
        // Close it
        const closeBtn = page.locator('[data-testid="ai-widget-close"], button[aria-label="סגור"]').first();
        if (await closeBtn.isVisible({ timeout: 1000 })) await closeBtn.click().catch(() => {});
        await page.keyboard.press('Escape').catch(() => {});
        return;
      }
    } catch { /* skip */ }
  }
}

// ---------------------------------------------------------------------------
// Try to capture global search modal
// ---------------------------------------------------------------------------
async function tryCaptureSearchModal(page, baseFilePath) {
  try {
    // Most apps use Cmd/Ctrl+K for global search, or a search button
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(800);
    const modal = page.locator('[role="dialog"], [data-testid="global-search"]').first();
    if (await modal.isVisible({ timeout: 2000 })) {
      const searchPath = baseFilePath.replace('.png', '-search-open.png');
      await page.screenshot({ path: searchPath, fullPage: true });
      console.log(`    🔍 Search modal captured → ${path.basename(searchPath)}`);
      await page.keyboard.press('Escape').catch(() => {});
    }
  } catch { /* skip */ }
}

// ---------------------------------------------------------------------------
// Capture a single screen
// ---------------------------------------------------------------------------
async function captureScreen(page, screen, idx, total) {
  const folderPath = path.join(OUTPUT_DIR, screen.folder);
  ensureDir(folderPath);
  const filePath = path.join(folderPath, `${screen.name}.png`);

  const label = `[${pad(idx)}/${pad(total)}] ${screen.folder}/${screen.name}`;
  process.stdout.write(`  ${label} … `);

  try {
    await page.goto(`${BASE_URL}${screen.url}`, {
      waitUntil: (screen.waitFor || 'domcontentloaded'),
      timeout: NAV_TIMEOUT,
    });

    await settle(page);
    await scrollToTop(page);

    // Hide cookie banners / onboarding overlays that might cut off content
    await page.addStyleTag({
      content: `
        [data-testid="cookie-banner"],
        [id="cookie-banner"],
        .cookie-consent,
        [data-testid="onboarding-overlay"] {
          display: none !important;
        }
      `,
    }).catch(() => {});

    await shot(page, filePath);
    console.log('✅');
    return { ok: true, file: filePath };
  } catch (err) {
    console.log(`❌  ${err.message.split('\n')[0]}`);
    return { ok: false, url: screen.url, err: err.message };
  }
}

// ---------------------------------------------------------------------------
// Extra interactive screenshots for key pages
// ---------------------------------------------------------------------------
async function captureExtras(page) {
  console.log('\n📸 Capturing extra UI states …\n');

  const extrasBase = path.join(OUTPUT_DIR, '09-extras');
  ensureDir(extrasBase);

  // 1. System home with AI widget open
  try {
    await page.goto(`${BASE_URL}${w('/system')}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await settle(page);
    await tryCaptureAiWidget(page, path.join(extrasBase, 'system-ai-widget.png'));
  } catch { /* skip */ }

  // 2. Global search modal (Ctrl+K)
  try {
    await page.goto(`${BASE_URL}${w('/system')}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await settle(page);
    await tryCaptureSearchModal(page, path.join(extrasBase, 'global-search.png'));
  } catch { /* skip */ }

  // 3. System sales_leads – try opening "New Lead" drawer/modal
  try {
    await page.goto(`${BASE_URL}${w('/system/sales_leads')}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await settle(page);
    const addBtn = page.locator('button:has-text("ליד"), button:has-text("הוסף"), button:has-text("חדש"), button[aria-label*="ליד"]').first();
    if (await addBtn.isVisible({ timeout: 3000 })) {
      await addBtn.click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(extrasBase, 'system-new-lead-modal.png'), fullPage: true });
      console.log('  ✅ New Lead modal');
      await page.keyboard.press('Escape').catch(() => {});
    }
  } catch { /* skip */ }

  // 4. Finance – new invoice form
  try {
    await page.goto(`${BASE_URL}${w('/finance/invoices')}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await settle(page);
    const addBtn = page.locator('button:has-text("חשבונית"), button:has-text("חדשה"), button:has-text("הוסף")').first();
    if (await addBtn.isVisible({ timeout: 3000 })) {
      await addBtn.click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(extrasBase, 'finance-new-invoice-modal.png'), fullPage: true });
      console.log('  ✅ New Invoice modal');
      await page.keyboard.press('Escape').catch(() => {});
    }
  } catch { /* skip */ }

  // 5. Client module – new client modal
  try {
    await page.goto(`${BASE_URL}${w('/client/clients')}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await settle(page);
    const addBtn = page.locator('button:has-text("לקוח"), button:has-text("הוסף"), button:has-text("חדש")').first();
    if (await addBtn.isVisible({ timeout: 3000 })) {
      await addBtn.click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(extrasBase, 'client-new-client-modal.png'), fullPage: true });
      console.log('  ✅ New Client modal');
      await page.keyboard.press('Escape').catch(() => {});
    }
  } catch { /* skip */ }

  // 6. Operations – new work order form (already has /new page, but capture the form loaded)
  try {
    await page.goto(`${BASE_URL}${w('/operations/work-orders/new')}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await settle(page);
    await page.screenshot({ path: path.join(extrasBase, 'operations-new-workorder-form.png'), fullPage: true });
    console.log('  ✅ New Work Order form');
  } catch { /* skip */ }

  // 7. Social machine – open compose if available
  try {
    await page.goto(`${BASE_URL}${w('/social/machine')}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await settle(page);
    const addBtn = page.locator('button:has-text("פוסט"), button:has-text("צור"), button:has-text("חדש")').first();
    if (await addBtn.isVisible({ timeout: 3000 })) {
      await addBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(extrasBase, 'social-compose-open.png'), fullPage: true });
      console.log('  ✅ Social compose open');
      await page.keyboard.press('Escape').catch(() => {});
    }
  } catch { /* skip */ }

  // 8. Support chat/ticket creation
  try {
    await page.goto(`${BASE_URL}${w('/support')}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await settle(page);
    const newTicketBtn = page.locator('button:has-text("פתח"), button:has-text("טיקט"), button:has-text("צור")').first();
    if (await newTicketBtn.isVisible({ timeout: 3000 })) {
      await newTicketBtn.click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(extrasBase, 'support-new-ticket-modal.png'), fullPage: true });
      console.log('  ✅ Support new ticket modal');
      await page.keyboard.press('Escape').catch(() => {});
    }
  } catch { /* skip */ }

  // 9. System sales pipeline – board view
  try {
    await page.goto(`${BASE_URL}${w('/system/sales_pipeline')}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await settle(page);
    await page.screenshot({ path: path.join(extrasBase, 'system-pipeline-board.png'), fullPage: true });
    console.log('  ✅ Pipeline board');
  } catch { /* skip */ }

  // 10. System calendar – month view scroll
  try {
    await page.goto(`${BASE_URL}${w('/system/calendar')}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await settle(page);
    await page.screenshot({ path: path.join(extrasBase, 'system-calendar-month.png'), fullPage: true });
    console.log('  ✅ Calendar month view');
  } catch { /* skip */ }
}

// ---------------------------------------------------------------------------
// Login helper (manual fallback)
// ---------------------------------------------------------------------------
async function manualLogin(_page) {
  console.log('\n⚠️  Session invalid / no storageState — opening real Chrome for login.');
  console.log('    👉  Log in to the app (use email or Google). The script waits for /w/.\n');

  // Use REAL system Chrome (not Playwright Chromium) so Google OAuth isn't rejected.
  const loginBrowser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const loginCtx = await loginBrowser.newContext({
    viewport: { width: W, height: H },
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
  });
  await loginCtx.addInitScript(() => {
    try { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); } catch {}
  });
  const page = await loginCtx.newPage();

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  // Wait up to 5 minutes for the user to actually reach a workspace page.
  // We must NOT proceed on intermediate pages like /workspaces/onboarding,
  // /sso-callback, /me, etc. — only when the URL contains /w/ (real workspace).
  const loginTimeout = 300_000;
  const pollInterval = 2_000;
  const deadline = Date.now() + loginTimeout;
  let lastPath = '';

  while (Date.now() < deadline) {
    await page.waitForTimeout(pollInterval);
    const currentUrl = new URL(page.url());
    const p = currentUrl.pathname || '';

    if (p !== lastPath) {
      lastPath = p;
      console.log(`    🔄  Current page: ${p}`);
    }

    // Success: user reached a workspace page
    if (p.startsWith('/w/')) {
      console.log('    ✅  Workspace reached!');
      break;
    }

    // If stuck on onboarding, let the user know
    if (p.includes('/onboarding')) {
      // Check if it auto-redirects (customer_account exists)
      await page.waitForTimeout(3000);
      const after = new URL(page.url()).pathname;
      if (after.startsWith('/w/')) {
        console.log('    ✅  Onboarding auto-redirected to workspace!');
        break;
      }
    }
  }

  if (!page.url().includes('/w/')) {
    await loginBrowser.close();
    throw new Error('Login timeout — never reached a /w/ workspace page. Please check the login flow manually.');
  }

  // Extra settle time after reaching workspace
  await page.waitForTimeout(3000);

  const dir = require('path').dirname(SS_PATH);
  if (!require('fs').existsSync(dir)) require('fs').mkdirSync(dir, { recursive: true });
  await loginCtx.storageState({ path: SS_PATH });
  console.log(`    ✅  Auth saved → ${SS_PATH}`);
  await loginBrowser.close();
  console.log('    ✅  Login browser closed — continuing with Playwright for screenshots.\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('═'.repeat(60));
  console.log('  MISRAD AI – Screenshot Capture');
  console.log('═'.repeat(60));
  console.log(`  Base URL : ${BASE_URL}`);
  console.log(`  Org Slug : ${ORG_SLUG}`);
  console.log(`  Auth     : ${SS_PATH}`);
  console.log(`  Output   : ${OUTPUT_DIR}/`);
  console.log(`  Screens  : ${SCREENS.length} pages + extras`);
  console.log('═'.repeat(60));
  console.log('');

  ensureDir(OUTPUT_DIR);

  const storageStateExists = fs.existsSync(SS_PATH);

  let browser = await chromium.launch({ headless: HEADLESS, slowMo: 0 });

  let context = await browser.newContext({
    viewport: { width: W, height: H },
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    ...(storageStateExists ? { storageState: SS_PATH } : {}),
  });

  let page = await context.newPage();

  // Silence console errors from the app
  page.on('console', (msg) => {
    if (msg.type() === 'error' && process.env.DEBUG_CONSOLE) {
      console.log(`  [browser:err] ${msg.text()}`);
    }
  });

  let needsLogin = false;

  if (!storageStateExists) {
    needsLogin = true;
  } else {
    // Quick check: try to reach a protected page; if not on /w/ → re-auth
    try {
      await page.goto(`${BASE_URL}${w('/lobby')}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
      await page.waitForTimeout(3000);
      const url = page.url();
      if (url.includes('/w/')) {
        console.log('  ✅  Session valid\n');
      } else {
        console.log(`  ⚠️  Session expired (landed on ${new URL(url).pathname}) – falling back to manual login …`);
        needsLogin = true;
      }
    } catch {
      console.log('  ⚠️  Could not verify session – falling back to manual login …\n');
      needsLogin = true;
    }
  }

  if (needsLogin) {
    await manualLogin(page);
    // manualLogin uses its own Chrome browser and saves storageState.
    // Close the current context/browser and reopen with the saved state.
    await browser.close();
    browser = await chromium.launch({ headless: HEADLESS, slowMo: 0 });
    context = await browser.newContext({
      viewport: { width: W, height: H },
      locale: 'he-IL',
      timezoneId: 'Asia/Jerusalem',
      storageState: SS_PATH,
    });
    page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error' && process.env.DEBUG_CONSOLE) {
        console.log(`  [browser:err] ${msg.text()}`);
      }
    });
    console.log('  ✅  New browser context loaded with saved auth\n');
  }

  // ── Main screens ──────────────────────────────────────────────────────────
  console.log(`Capturing ${SCREENS.length} screens …\n`);
  const failed = [];
  for (let i = 0; i < SCREENS.length; i++) {
    const result = await captureScreen(page, SCREENS[i], i + 1, SCREENS.length);
    if (!result.ok) failed.push(result);
  }

  // ── Extra UI states ───────────────────────────────────────────────────────
  await captureExtras(page);

  await browser.close();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('  SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  ✅  Success : ${SCREENS.length - failed.length} / ${SCREENS.length}`);
  if (failed.length) {
    console.log(`  ❌  Failed  : ${failed.length}`);
    failed.forEach((f) => console.log(`       ${f.url}  →  ${f.err.split('\n')[0]}`));
  }
  console.log(`\n  📁  Screenshots saved to: ${path.resolve(OUTPUT_DIR)}`);
  console.log('═'.repeat(60));
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
