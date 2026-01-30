import { test, chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

type WhoamiResponse = {
  ok: boolean;
  clerkUserId?: string;
  email?: string | null;
  error?: string;
};

function extractCookieValue(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`;
  const parts = String(cookieHeader || '').split(/;\s*/);
  for (const p of parts) {
    if (p.startsWith(prefix)) return p.slice(prefix.length);
  }
  return null;
}

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = String(jwt || '').split('.');
    if (parts.length < 2) return null;
    const payloadRaw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = Buffer.from(payloadRaw, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson || '{}');
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getSessionSubFromStorageState(storageStatePath: string): string | null {
  try {
    const raw = fs.readFileSync(storageStatePath, 'utf-8');
    const parsedUnknown = JSON.parse(raw || '{}') as unknown;
    const parsed =
      parsedUnknown && typeof parsedUnknown === 'object'
        ? (parsedUnknown as { cookies?: unknown })
        : ({ cookies: [] } as { cookies?: unknown });
    const cookies = Array.isArray(parsed.cookies) ? (parsed.cookies as Array<any>) : [];
    const sessionCookie = cookies.find((c) => c && typeof c === 'object' && String((c as any).name || '') === '__session');
    const jwt = String(sessionCookie?.value || '').trim();
    if (!jwt) return null;
    const payload = decodeJwtPayload(jwt);
    const sub = payload?.sub;
    return typeof sub === 'string' && sub.trim() ? sub.trim() : null;
  } catch {
    return null;
  }
}

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

  const e2eKey = String(process.env.E2E_API_KEY || '').trim();

  const email = String(process.env.E2E_AUTH_EMAIL || process.env.E2E_EMAIL || '').trim();
  const password = String(process.env.E2E_AUTH_PASSWORD || process.env.E2E_PASSWORD || '').trim();

  const timeoutMs = Number(process.env.E2E_AUTH_TIMEOUT_MS || 10 * 60_000);
  test.setTimeout(timeoutMs + 60_000);

  const orgSlug = process.env.E2E_ORG_SLUG;
  const afterLoginPath =
    process.env.E2E_AFTER_LOGIN_PATH ||
    (orgSlug ? `/w/${encodeURIComponent(String(orgSlug))}/client/dashboard` : '/');

  const headedLogin =
    String(process.env.E2E_LOGIN_HEADED || '').toLowerCase() === '1' ||
    String(process.env.E2E_LOGIN_HEADED || '').toLowerCase() === 'true';

  const manualLogin =
    String(process.env.E2E_MANUAL_LOGIN || '').toLowerCase() === '1' ||
    String(process.env.E2E_MANUAL_LOGIN || '').toLowerCase() === 'true';

  const allowWorkspacesLanding =
    String(process.env.E2E_ALLOW_WORKSPACES_LANDING || '').toLowerCase() === '1' ||
    String(process.env.E2E_ALLOW_WORKSPACES_LANDING || '').toLowerCase() === 'true';

  const storageStatePath = process.env.E2E_STORAGE_STATE || 'tests/e2e/.auth/storageState.json';

  const statePathLower = String(storageStatePath || '').toLowerCase();
  const inferredOtherStatePath = statePathLower.includes('attacker')
    ? String(process.env.E2E_VICTIM_STORAGE_STATE || '').trim()
    : statePathLower.includes('victim')
      ? String(process.env.E2E_ATTACKER_STORAGE_STATE || '').trim()
      : '';
  const inferredExpectedEmail = statePathLower.includes('attacker')
    ? String(process.env.E2E_ATTACKER_EMAIL || '').trim()
    : statePathLower.includes('victim')
      ? String(process.env.E2E_EMAIL || '').trim()
      : '';

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

  if (!manualLogin && email && password) {
    const passwordInput = page.getByPlaceholder(/הקלד סיסמה\.\.\.|enter your password/i);
    const emailInput = page.locator(
      'input[name="identifier"], input[autocomplete="email"], input[type="email"], input[type="text"]:not([name="password"])'
    );

    const anyIdentifierInput = page.locator('input:not([type="password"])');
    const switchToEmail = page.getByRole('button', { name: /אימייל|דוא"ל|email|use email|continue with email/i });

    await Promise.race([
      passwordInput.waitFor({ state: 'visible', timeout: 120_000 }).catch(() => null),
      emailInput.first().waitFor({ state: 'visible', timeout: 120_000 }).catch(() => null),
      page.getByRole('button', { name: /המשך עם Google|continue with google/i }).waitFor({ state: 'visible', timeout: 120_000 }).catch(() => null),
    ]);

    const inPasswordStep = await passwordInput.isVisible().catch(() => false);

    if (!inPasswordStep) {
      const isEmailVisible = await emailInput.first().isVisible().catch(() => false);
      if (!isEmailVisible) {
        const canSwitch = await switchToEmail.first().isVisible().catch(() => false);
        if (canSwitch) {
          await switchToEmail.first().click();
        }
      }

      if (await emailInput.first().isVisible().catch(() => false)) {
        await emailInput.first().fill(email);
      } else {
        await anyIdentifierInput.first().waitFor({ state: 'visible', timeout: 60_000 });
        await anyIdentifierInput.first().fill(email);
      }

      await page.getByRole('button', { name: /המשך|continue|next/i }).first().click();
      await passwordInput.waitFor({ state: 'visible', timeout: 60_000 });
    }

    await passwordInput.fill(password);

    const submit = page.getByRole('button', { name: /כניסה למערכת|sign in|log in/i });
    await submit.waitFor({ state: 'visible', timeout: 60_000 });
    await submit.click();
  }

  const start = Date.now();

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

  const hasRefreshCookie = async () => {
    const cookies = await context.cookies();
    return cookies.some((c) => {
      const domain = String(c.domain || '').replace(/^\./, '');
      return domain === appHost && c.name.startsWith('__refresh_') && Boolean(c.value);
    });
  };

  const requireRefreshCookie =
    String(process.env.E2E_REQUIRE_REFRESH_COOKIE || '').toLowerCase() === '1' ||
    String(process.env.E2E_REQUIRE_REFRESH_COOKIE || '').toLowerCase() === 'true';

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

  if (requireRefreshCookie) {
    const refreshStart = Date.now();
    while (Date.now() - refreshStart < timeoutMs) {
      if (await hasRefreshCookie().catch(() => false)) break;
      await page.waitForTimeout(500);
    }

    if (!(await hasRefreshCookie().catch(() => false))) {
      const cookies = await context.cookies().catch(() => []);
      const appCookies = cookies
        .filter((c) => String(c.domain || '').replace(/^\./, '') === appHost)
        .map((c) => `${c.name}@${c.domain}`)
        .join(', ');
      throw new Error(
        `Manual login did not produce Clerk __refresh_* cookie within timeout. Current URL: ${page.url()} App cookies: ${appCookies || '(none)'}`
      );
    }
  }

  // Validate the session is actually usable (avoid writing expired/invalid __session into storageState).
  if (!e2eKey) {
    throw new Error('Missing E2E_API_KEY env var (required to validate /api/e2e/whoami during setup-auth)');
  }
  const whoamiStart = Date.now();
  let lastStatus: number | null = null;
  let lastBody: string | null = null;
  let whoamiJson: WhoamiResponse | null = null;
  while (Date.now() - whoamiStart < timeoutMs) {
    try {
      const res = await page.request.get(`${baseURL}/api/e2e/whoami`, {
        headers: { 'x-e2e-key': e2eKey },
        timeout: 60_000,
      });
      lastStatus = res.status();
      lastBody = await res.text().catch(() => null);
      if (lastStatus === 200) {
        try {
          whoamiJson = (lastBody ? (JSON.parse(lastBody) as WhoamiResponse) : null) ?? null;
        } catch {
          whoamiJson = null;
        }
        break;
      }
    } catch (e: unknown) {
      lastStatus = null;
      lastBody = String(e instanceof Error ? e.message : e);
    }
    await page.waitForTimeout(500);
  }

  if (lastStatus !== 200) {
    throw new Error(
      `setup-auth: session cookie was set but whoami did not authenticate (status: ${String(lastStatus)} body: ${String(lastBody || '')}). This usually means the Clerk session is expired or not recognized by the server.`
    );
  }

  {
    const expectedEmailRaw = String(
      process.env.E2E_EXPECT_EMAIL || process.env.E2E_AUTH_EMAIL || inferredExpectedEmail || ''
    ).trim();
    if (expectedEmailRaw) {
      const expectedEmail = expectedEmailRaw.toLowerCase();
      const actualEmail = String(whoamiJson?.email || '').trim().toLowerCase();
      if (!actualEmail || actualEmail !== expectedEmail) {
        throw new Error(
          `setup-auth: authenticated user does not match expected email. expected='${expectedEmailRaw}' actual='${String(whoamiJson?.email || '')}'. Current URL: ${page.url()}`
        );
      }
    }
  }

  {
    const currentUserId = String(whoamiJson?.clerkUserId || '').trim();
    if (!currentUserId) {
      throw new Error(
        `setup-auth: whoami did not return clerkUserId (body: ${String(lastBody || '')}). Current URL: ${page.url()}`
      );
    }

    if (inferredOtherStatePath && inferredOtherStatePath !== storageStatePath && fs.existsSync(inferredOtherStatePath)) {
      const otherSub = getSessionSubFromStorageState(inferredOtherStatePath);
      if (otherSub && otherSub === currentUserId) {
        throw new Error(
          `setup-auth: this storageState would authenticate as the same Clerk user as the other storageState. current='${currentUserId}' other='${otherSub}'. Please sign in with a different account.`
        );
      }
    }
  }

  if (afterLoginPath !== '/') {
    await page.goto(`${baseURL}${afterLoginPath}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  }

  {
    const after = page.url();
    const afterPathname = new URL(after).pathname;
    if (!allowWorkspacesLanding && afterPathname.startsWith('/workspaces')) {
      throw new Error(
        `Authenticated, but landed on '${afterPathname}'. This usually means the E2E user has no workspace/org access, or E2E_ORG_SLUG is wrong. Current URL: ${after}`
      );
    }
  }

  await context.storageState({ path: storageStatePath });

  if (String(baseURL).startsWith('http://')) {
    try {
      const raw = fs.readFileSync(storageStatePath, 'utf-8');
      const parsedUnknown = JSON.parse(raw || '{}') as unknown;
      const parsed = (parsedUnknown && typeof parsedUnknown === 'object') ? (parsedUnknown as { cookies?: unknown }) : {};
      if (Array.isArray(parsed.cookies)) {
        parsed.cookies = (parsed.cookies as unknown[]).map((c) => {
          if (!c || typeof c !== 'object') return c;
          const cookie = c as Record<string, unknown>;

          const domain = String(cookie.domain || '').replace(/^\./, '');
          const isAppHost = domain === String(appHost || '').replace(/^\./, '');
          if (!isAppHost) return cookie;

          const name = String(cookie.name || '');
          const isClerkCookie = name === '__session' || name.startsWith('__clerk') || name.startsWith('__client') || name.startsWith('__refresh');
          if (!isClerkCookie) return cookie;

          return {
            ...cookie,
            secure: false,
            sameSite: cookie.sameSite === 'None' ? 'Lax' : cookie.sameSite,
          };
        });
        fs.writeFileSync(storageStatePath, JSON.stringify(parsed, null, 2));
      }
    } catch {
      // ignore
    }
  }
  await browser.close();
});
