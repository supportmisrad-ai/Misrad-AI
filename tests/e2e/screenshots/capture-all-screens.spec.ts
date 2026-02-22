/**
 * Comprehensive Screenshot Capture Script
 * ========================================
 * Captures a full-page screenshot of every user-facing screen in MISRAD AI.
 * Outputs to the existing screenshots/ directory structure.
 *
 * Usage:
 *   1. Make sure dev server is running on port 4000
 *
 *   2. If no storageState exists yet, create one (login once):
 *      $env:E2E_MANUAL_LOGIN="1"; $env:E2E_LOGIN_HEADED="1"; $env:E2E_ORG_SLUG="misrad-ai-hq"; $env:E2E_USE_EXISTING_SERVER="1"; npx.cmd playwright test setup-auth.spec.ts
 *
 *   3. Then run this screenshot script:
 *      $env:E2E_USE_EXISTING_SERVER="1"; $env:E2E_SKIP_LOGIN="1"; $env:E2E_ORG_SLUG="misrad-ai-hq"; npx.cmd playwright test tests/e2e/screenshots/capture-all-screens.spec.ts --timeout 600000
 *
 *   Screenshots are saved to: screenshots/ (organized by module)
 */

import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// ─── Configuration ───────────────────────────────────────────────────────────

const ORG_SLUG = process.env.E2E_ORG_SLUG || 'misrad-ai-hq';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots');
const VIEWPORT = { width: 1920, height: 1080 };
const WAIT_AFTER_LOAD_MS = Number(process.env.SCREENSHOT_WAIT_MS || 2500);
const NETWORK_IDLE_TIMEOUT_MS = 8000;

// ─── Screen Definitions ──────────────────────────────────────────────────────

type ScreenDef = {
  /** Subfolder under screenshots/ */
  folder: string;
  /** File name (without extension) */
  name: string;
  /** URL path */
  path: string;
  /** Optional: selector to wait for before screenshot */
  waitFor?: string;
  /** Optional: client-side routed page (needs extra settle time) */
  clientRouted?: boolean;
};

function w(subPath: string): string {
  return `/w/${ORG_SLUG}${subPath}`;
}

const ALL_SCREENS: ScreenDef[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // 00-auth — Auth & Entry (public, no login needed)
  // ══════════════════════════════════════════════════════════════════════════
  { folder: '00-auth', name: '01-login', path: '/login' },
  { folder: '00-auth', name: '02-sign-in', path: '/sign-in' },
  { folder: '00-auth', name: '03-sign-up', path: '/sign-up' },

  // ══════════════════════════════════════════════════════════════════════════
  // 01-lobby — Lobby, Support & Billing
  // ══════════════════════════════════════════════════════════════════════════
  { folder: '01-lobby', name: '01-lobby', path: w('/lobby') },
  { folder: '01-lobby', name: '02-support-home', path: w('/support') },
  { folder: '01-lobby', name: '03-support-tickets', path: w('/support/tickets/new'), waitFor: 'main' },
  { folder: '01-lobby', name: '04-billing', path: w('/billing') },

  // ══════════════════════════════════════════════════════════════════════════
  // 02-system — System Module (all sidebar items)
  // ══════════════════════════════════════════════════════════════════════════
  { folder: '02-system', name: '01-home', path: w('/system') },
  { folder: '02-system', name: '02-headquarters', path: w('/system/headquarters') },
  { folder: '02-system', name: '03-hub', path: w('/system/hub') },
  { folder: '02-system', name: '04-sales-leads', path: w('/system/sales_leads') },
  { folder: '02-system', name: '05-sales-pipeline', path: w('/system/sales_pipeline') },
  { folder: '02-system', name: '06-calendar', path: w('/system/calendar') },
  { folder: '02-system', name: '07-tasks', path: w('/system/tasks') },
  { folder: '02-system', name: '08-analytics', path: w('/system/analytics') },
  { folder: '02-system', name: '09-ai-analytics', path: w('/system/ai_analytics') },
  { folder: '02-system', name: '10-reports', path: w('/system/reports') },
  { folder: '02-system', name: '11-comms', path: w('/system/comms') },
  { folder: '02-system', name: '12-dialer', path: w('/system/dialer') },
  { folder: '02-system', name: '13-notifications', path: w('/system/notifications') },
  { folder: '02-system', name: '14-notifications-center', path: w('/system/notifications_center') },
  { folder: '02-system', name: '15-settings', path: w('/system/settings') },
  { folder: '02-system', name: '16-system-config', path: w('/system/system') },
  { folder: '02-system', name: '17-me', path: w('/system/me') },

  // ══════════════════════════════════════════════════════════════════════════
  // 03-client — Client OS Module
  // ══════════════════════════════════════════════════════════════════════════
  { folder: '03-client', name: '01-home', path: w('/client') },
  { folder: '03-client', name: '02-dashboard', path: w('/client/dashboard') },
  { folder: '03-client', name: '03-clients', path: w('/client/clients') },
  { folder: '03-client', name: '04-hub', path: w('/client/hub') },
  { folder: '03-client', name: '05-workflows', path: w('/client/workflows') },
  { folder: '03-client', name: '06-client-portal', path: w('/client/client-portal') },
  { folder: '03-client', name: '07-portal', path: w('/client/portal') },
  { folder: '03-client', name: '08-cycles', path: w('/client/cycles') },
  { folder: '03-client', name: '09-email', path: w('/client/email') },
  { folder: '03-client', name: '10-forms', path: w('/client/forms') },
  { folder: '03-client', name: '11-feedback', path: w('/client/feedback') },
  { folder: '03-client', name: '12-intelligence', path: w('/client/intelligence') },
  { folder: '03-client', name: '13-analyzer', path: w('/client/analyzer') },
  { folder: '03-client', name: '14-me', path: w('/client/me') },

  // ══════════════════════════════════════════════════════════════════════════
  // 04-finance — Finance Module
  // ══════════════════════════════════════════════════════════════════════════
  { folder: '04-finance', name: '01-home', path: w('/finance') },
  { folder: '04-finance', name: '02-overview', path: w('/finance/overview') },
  { folder: '04-finance', name: '03-invoices', path: w('/finance/invoices') },
  { folder: '04-finance', name: '04-expenses', path: w('/finance/expenses') },
  { folder: '04-finance', name: '05-me', path: w('/finance/me') },

  // ══════════════════════════════════════════════════════════════════════════
  // 05-social — Social Module
  // ══════════════════════════════════════════════════════════════════════════
  { folder: '05-social', name: '01-home', path: w('/social') },
  { folder: '05-social', name: '02-dashboard', path: w('/social/dashboard') },
  { folder: '05-social', name: '03-calendar', path: w('/social/calendar') },
  { folder: '05-social', name: '04-machine', path: w('/social/machine') },
  { folder: '05-social', name: '05-collection', path: w('/social/collection') },
  { folder: '05-social', name: '06-hub', path: w('/social/hub') },
  { folder: '05-social', name: '07-analytics', path: w('/social/analytics') },
  { folder: '05-social', name: '08-campaigns', path: w('/social/campaigns') },
  { folder: '05-social', name: '09-inbox', path: w('/social/inbox') },
  { folder: '05-social', name: '10-clients', path: w('/social/clients') },
  { folder: '05-social', name: '11-team', path: w('/social/team') },
  { folder: '05-social', name: '12-workspace', path: w('/social/workspace') },
  { folder: '05-social', name: '13-settings', path: w('/social/settings') },
  { folder: '05-social', name: '14-agency-insights', path: w('/social/agency-insights') },
  { folder: '05-social', name: '15-me', path: w('/social/me') },
  { folder: '05-social', name: '16-admin', path: w('/social/admin') },
  { folder: '05-social', name: '17-shabbat-preview', path: w('/social/admin/shabbat-preview') },

  // ══════════════════════════════════════════════════════════════════════════
  // 06-operations — Operations Module
  // ══════════════════════════════════════════════════════════════════════════
  { folder: '06-operations', name: '01-home', path: w('/operations') },
  { folder: '06-operations', name: '02-projects', path: w('/operations/projects') },
  { folder: '06-operations', name: '03-new-project', path: w('/operations/projects/new') },
  { folder: '06-operations', name: '04-work-orders', path: w('/operations/work-orders') },
  { folder: '06-operations', name: '05-new-work-order', path: w('/operations/work-orders/new') },
  { folder: '06-operations', name: '06-contractors', path: w('/operations/contractors') },
  { folder: '06-operations', name: '07-inventory', path: w('/operations/inventory') },
  { folder: '06-operations', name: '08-attendance-reports', path: w('/operations/attendance-reports') },
  { folder: '06-operations', name: '09-settings', path: w('/operations/settings') },
  { folder: '06-operations', name: '10-me', path: w('/operations/me') },

  // ══════════════════════════════════════════════════════════════════════════
  // 07-nexus — Nexus Module (client-side routing via NexusWorkspaceApp)
  // ══════════════════════════════════════════════════════════════════════════
  { folder: '07-nexus', name: '01-home', path: w('/nexus'), clientRouted: true },
  { folder: '07-nexus', name: '02-tasks', path: w('/nexus/tasks'), clientRouted: true },
  { folder: '07-nexus', name: '03-calendar', path: w('/nexus/calendar'), clientRouted: true },
  { folder: '07-nexus', name: '04-clients', path: w('/nexus/clients'), clientRouted: true },
  { folder: '07-nexus', name: '05-team', path: w('/nexus/team'), clientRouted: true },
  { folder: '07-nexus', name: '06-reports', path: w('/nexus/reports'), clientRouted: true },
  { folder: '07-nexus', name: '07-assets', path: w('/nexus/assets'), clientRouted: true },
  { folder: '07-nexus', name: '08-brain', path: w('/nexus/brain'), clientRouted: true },
  { folder: '07-nexus', name: '09-trash', path: w('/nexus/trash'), clientRouted: true },
  { folder: '07-nexus', name: '10-sales', path: w('/nexus/sales'), clientRouted: true },
  { folder: '07-nexus', name: '11-sales-pipeline', path: w('/nexus/sales/pipeline'), clientRouted: true },
  { folder: '07-nexus', name: '12-sales-targets', path: w('/nexus/sales/targets'), clientRouted: true },
  { folder: '07-nexus', name: '13-settings', path: w('/nexus/settings'), clientRouted: true },
  { folder: '07-nexus', name: '14-me', path: w('/nexus/me'), clientRouted: true },

  // ══════════════════════════════════════════════════════════════════════════
  // 08-account — Account / Personal Area
  // ══════════════════════════════════════════════════════════════════════════
  { folder: '08-account', name: '01-me', path: '/me' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function waitForPageReady(page: import('@playwright/test').Page, screen: ScreenDef) {
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);

  // Best-effort network idle
  await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_TIMEOUT_MS }).catch(() => undefined);

  // Specific selector wait
  if (screen.waitFor) {
    await page.locator(screen.waitFor).first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => undefined);
  }

  // Client-side routed pages need extra time for React hydration + client routing
  if (screen.clientRouted) {
    await page.waitForTimeout(1500);
  }

  // General settle time for animations, lazy loading, skeleton screens
  await page.waitForTimeout(WAIT_AFTER_LOAD_MS);
}

async function captureScreen(
  page: import('@playwright/test').Page,
  screen: ScreenDef,
  baseURL: string,
) {
  const folderPath = path.join(SCREENSHOT_DIR, screen.folder);
  ensureDir(folderPath);

  const filePath = path.join(folderPath, `${screen.name}.png`);
  const url = `${baseURL}${screen.path}`;

  // Navigate
  const response = await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  }).catch(() => null);

  const status = response?.status() ?? 'no-response';
  const finalUrl = page.url();
  console.log(`  [screenshot] ${screen.folder}/${screen.name}.png | status=${status} | final=${finalUrl}`);

  // Wait for full render
  await waitForPageReady(page, screen);

  // Close any open overlays/dialogs/menus before capture
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(300);

  // Capture full-page screenshot
  await page.screenshot({
    path: filePath,
    fullPage: true,
    timeout: 30_000,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Capture All Screens', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
  });

  // Auth screens (public — use fresh context without storageState)
  test('00-auth: Login & Sign-up screens', async ({ browser }) => {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4000';

    const screens = ALL_SCREENS.filter((s) => s.folder === '00-auth');
    for (const screen of screens) {
      await captureScreen(page, screen, baseURL);
    }
    await context.close();
  });

  // Lobby
  test('01-lobby: Lobby, Support & Billing', async ({ page, baseURL }) => {
    for (const screen of ALL_SCREENS.filter((s) => s.folder === '01-lobby')) {
      await captureScreen(page, screen, baseURL || '');
    }
  });

  // System
  test('02-system: System module - all screens', async ({ page, baseURL }) => {
    for (const screen of ALL_SCREENS.filter((s) => s.folder === '02-system')) {
      await captureScreen(page, screen, baseURL || '');
    }
  });

  // Client
  test('03-client: Client module - all screens', async ({ page, baseURL }) => {
    for (const screen of ALL_SCREENS.filter((s) => s.folder === '03-client')) {
      await captureScreen(page, screen, baseURL || '');
    }
  });

  // Finance
  test('04-finance: Finance module - all screens', async ({ page, baseURL }) => {
    for (const screen of ALL_SCREENS.filter((s) => s.folder === '04-finance')) {
      await captureScreen(page, screen, baseURL || '');
    }
  });

  // Social
  test('05-social: Social module - all screens', async ({ page, baseURL }) => {
    for (const screen of ALL_SCREENS.filter((s) => s.folder === '05-social')) {
      await captureScreen(page, screen, baseURL || '');
    }
  });

  // Operations
  test('06-operations: Operations module - all screens', async ({ page, baseURL }) => {
    for (const screen of ALL_SCREENS.filter((s) => s.folder === '06-operations')) {
      await captureScreen(page, screen, baseURL || '');
    }
  });

  // Nexus
  test('07-nexus: Nexus module - all screens', async ({ page, baseURL }) => {
    for (const screen of ALL_SCREENS.filter((s) => s.folder === '07-nexus')) {
      await captureScreen(page, screen, baseURL || '');
    }
  });

  // Account
  test('08-account: Personal area / Me', async ({ page, baseURL }) => {
    for (const screen of ALL_SCREENS.filter((s) => s.folder === '08-account')) {
      await captureScreen(page, screen, baseURL || '');
    }
  });
});
