import { test, chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const overrideEnv =
  String(process.env.E2E_ENV_OVERRIDE || '').toLowerCase() === '1' ||
  String(process.env.E2E_ENV_OVERRIDE || '').toLowerCase() === 'true';

dotenv.config({ path: process.env.E2E_ENV_FILE || '.env.test', override: overrideEnv });
dotenv.config({ path: '.env.local', override: false });

function normalizeHost(hostname: string) {
  return String(hostname || '').replace(/:\d+$/, '');
}

test('setup auth storage state', async () => {
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4000';
  const appHost = normalizeHost(new URL(baseURL).hostname);

  const orgSlug = process.env.E2E_ORG_SLUG;
  const afterLoginPath =
    process.env.E2E_AFTER_LOGIN_PATH ||
    (orgSlug ? `/w/${encodeURIComponent(String(orgSlug))}/client/dashboard` : '/');

  const headedLogin =
    String(process.env.E2E_LOGIN_HEADED || '').toLowerCase() === '1' ||
    String(process.env.E2E_LOGIN_HEADED || '').toLowerCase() === 'true';

  const storageStatePath =
    process.env.E2E_STORAGE_STATE || 'tests/e2e/.auth/storageState.json';

  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });

  const browser = await chromium.launch({
    headless: !headedLogin,
    channel: headedLogin ? 'chrome' : undefined,
    ignoreDefaultArgs: headedLogin ? ['--enable-automation'] : undefined,
    args: headedLogin ? ['--disable-blink-features=AutomationControlled'] : undefined,
  });

  const context = await browser.newContext();
  if (headedLogin) {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  }

  const page = await context.newPage();

  const target = `${baseURL}/sign-in?redirect_url=${encodeURIComponent(afterLoginPath)}`;
  await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  const start = Date.now();
  const timeoutMs = 10 * 60_000;

  const hasClerkAuthCookie = async () => {
    const cookies = await context.cookies();
    return cookies.some((c) => {
      const domain = String(c.domain || '').replace(/^\./, '');
      const isAppCookie = domain === appHost;
      if (!isAppCookie) return false;
      if (!c.value) return false;
      return c.name === '__session' || c.name === '__clerk_db_jwt' || c.name.startsWith('__clerk_db_jwt_');
    });
  };

  const hasSessionCookie = async () => {
    const cookies = await context.cookies();
    return cookies.some((c) => {
      const domain = String(c.domain || '').replace(/^\./, '');
      return domain === appHost && c.name === '__session' && Boolean(c.value);
    });
  };

  while (Date.now() - start < timeoutMs) {
    if (await hasClerkAuthCookie().catch(() => false)) break;
    await page.waitForTimeout(500);
  }

  if (!(await hasClerkAuthCookie().catch(() => false))) {
    throw new Error(`Manual login did not produce Clerk auth cookies within timeout. Current URL: ${page.url()}`);
  }

  const sessionStart = Date.now();
  while (Date.now() - sessionStart < timeoutMs) {
    if (await hasSessionCookie().catch(() => false)) break;
    await page.waitForTimeout(500);
  }

  if (!(await hasSessionCookie().catch(() => false))) {
    const cookies = await context.cookies().catch(() => []);
    const appCookies = cookies
      .filter((c) => String(c.domain || '').replace(/^\./, '') === appHost)
      .map((c) => `${c.name}@${c.domain}`)
      .join(', ');
    throw new Error(
      `Manual login did not produce Clerk __session cookie within timeout. Current URL: ${page.url()} App cookies: ${appCookies || '(none)'}`
    );
  }

  if (afterLoginPath !== '/') {
    await page.goto(`${baseURL}${afterLoginPath}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  }

  await context.storageState({ path: storageStatePath });
  await browser.close();
});
