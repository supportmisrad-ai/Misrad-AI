import { chromium, ConsoleMessage, FullConfig, Response } from '@playwright/test';
import fs from 'node:fs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getJwtExp(jwt: string): number | null {
  try {
    const parts = String(jwt || '').split('.');
    if (parts.length < 2) return null;
    const payloadRaw = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const payloadJson = Buffer.from(payloadRaw, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson || '{}') as Record<string, unknown>;
    const exp = payload?.exp;
    const expNum = typeof exp === 'number' ? exp : Number(exp);
    return Number.isFinite(expNum) ? expNum : null;
  } catch {
    return null;
  }
}

async function globalSetup(config: FullConfig) {
  const isAuthSetupRun =
    String(process.env.E2E_SETUP_AUTH || '').toLowerCase() === '1' ||
    String(process.env.E2E_SETUP_AUTH || '').toLowerCase() === 'true';
  if (isAuthSetupRun) {
    return;
  }

  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4000';
  const appHost = new URL(baseURL).hostname;
  const e2eKey = process.env.E2E_API_KEY;
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  const orgSlug = process.env.E2E_ORG_SLUG;
  const skipLogin = String(process.env.E2E_SKIP_LOGIN || '').toLowerCase() === '1' || String(process.env.E2E_SKIP_LOGIN || '').toLowerCase() === 'true';
  let refreshStorageState =
    String(process.env.E2E_REFRESH_STORAGE_STATE || '').toLowerCase() === '1' ||
    String(process.env.E2E_REFRESH_STORAGE_STATE || '').toLowerCase() === 'true';
  const manualLogin =
    String(process.env.E2E_MANUAL_LOGIN || '').toLowerCase() === '1' ||
    String(process.env.E2E_MANUAL_LOGIN || '').toLowerCase() === 'true';

  const firstProject = config.projects[0];
  const storageStatePath =
    typeof firstProject?.use?.storageState === 'string'
      ? firstProject.use.storageState
      : 'tests/e2e/.auth/storageState.json';

  const storageStateExists = fs.existsSync(storageStatePath);
  if (!refreshStorageState && storageStateExists) {
    try {
      const raw = fs.readFileSync(storageStatePath, 'utf-8');
      const parsed: unknown = JSON.parse(raw || '{}');
      const cookiesValue = isRecord(parsed) ? parsed.cookies : undefined;
      const cookies = Array.isArray(cookiesValue) ? cookiesValue : [];
      const hasClerkAuthCookie = cookies.some((c: unknown) => {
        if (!isRecord(c)) return false;
        const domain = String(c.domain || '').replace(/^\./, '');
        const isAppCookie = domain === String(appHost || '').replace(/^\./, '');
        if (!isAppCookie) return false;
        const value = String(c.value || '');
        if (!value) return false;
        const name = String(c.name || '');
        return name === '__session' || name === '__clerk_db_jwt' || name.startsWith('__clerk_db_jwt_');
      });

      const nowSec = Math.floor(Date.now() / 1000);
      const hasRefreshCookie = cookies.some((c: unknown) => {
        if (!isRecord(c)) return false;
        const domain = String(c.domain || '').replace(/^\./, '');
        const isAppCookie = domain === String(appHost || '').replace(/^\./, '');
        if (!isAppCookie) return false;
        const name = String(c.name || '');
        const value = String(c.value || '');
        return name.startsWith('__refresh_') && Boolean(value);
      });

      const sessionCookie = cookies.find((c: unknown) => {
        if (!isRecord(c)) return false;
        const domain = String(c.domain || '').replace(/^\./, '');
        const isAppCookie = domain === String(appHost || '').replace(/^\./, '');
        if (!isAppCookie) return false;
        return String(c.name || '') === '__session' && Boolean(String(c.value || ''));
      }) as Record<string, unknown> | undefined;

      const sessionJwt = sessionCookie ? String(sessionCookie.value || '') : '';
      const exp = sessionJwt ? getJwtExp(sessionJwt) : null;
      const hasValidSession = Boolean((exp && exp > nowSec + 60) || hasRefreshCookie);

      if (hasClerkAuthCookie && hasValidSession) {
        const key = String(e2eKey || '').trim();
        if (!key) {
          return;
        }

        const cookieHeader = cookies
          .filter((c: unknown) => {
            if (!isRecord(c)) return false;
            const domain = String(c.domain || '').replace(/^\./, '');
            const isAppCookie = domain === String(appHost || '').replace(/^\./, '');
            if (!isAppCookie) return false;
            return Boolean(String(c.name || '')) && Boolean(String(c.value || ''));
          })
          .map((c: unknown) => {
            const rc = c as Record<string, unknown>;
            return `${String(rc.name)}=${String(rc.value)}`;
          })
          .join('; ');

        try {
          const res = await fetch(`${baseURL}/api/e2e/whoami`, {
            headers: {
              'x-e2e-key': key,
              ...(cookieHeader ? { cookie: cookieHeader } : {}),
            },
          });
          if (res.status === 200) {
            return;
          }
        } catch {
          // fall through
        }

        refreshStorageState = true;
      }
    } catch {
      // fall through
    }
  }

  if (!refreshStorageState) {
    // If storageState is missing/expired, prefer self-healing login rather than failing before tests run.
    // This avoids Playwright reporting "1 error was not a part of any test".
    refreshStorageState = true;
  }

  if (!manualLogin && (!email || !password)) {
    throw new Error('Missing E2E_EMAIL or E2E_PASSWORD env vars');
  }

  const headedLogin =
    String(process.env.E2E_LOGIN_HEADED || '').toLowerCase() === '1' ||
    String(process.env.E2E_LOGIN_HEADED || '').toLowerCase() === 'true';
  const slowMo = Number(process.env.E2E_LOGIN_SLOWMO || 0) || 0;

  const useRealChromeForManualLogin = Boolean(manualLogin && headedLogin);

  const browser = await chromium.launch({
    headless: !headedLogin,
    slowMo,
    channel: useRealChromeForManualLogin ? 'chrome' : undefined,
    ignoreDefaultArgs: useRealChromeForManualLogin ? ['--enable-automation'] : undefined,
    args: useRealChromeForManualLogin ? ['--disable-blink-features=AutomationControlled'] : undefined,
  });
  const context = await browser.newContext();
  if (useRealChromeForManualLogin) {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
  }
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  const networkErrors: Array<{ status: number; method: string; url: string }> = [];

  const onConsole = (msg: ConsoleMessage) => {
    try {
      if (msg.type() === 'error') {
        consoleErrors.push(String(msg.text() || 'console error'));
      }
    } catch {
      return;
    }
  };

  const onResponse = (response: Response) => {
    try {
      const status = response.status();
      if (status < 400) return;

      const req = response.request();
      const url = String(response.url() || '');
      const method = String(req.method() || '');

      if (url.includes('/_next/')) return;
      if (url.includes('chrome-extension://')) return;

      networkErrors.push({ status, method, url });
    } catch {
      return;
    }
  };

  if (!skipLogin) {
    page.on('console', onConsole);
    page.on('response', onResponse);

    if (manualLogin) {
      const afterLoginPath =
        process.env.E2E_AFTER_LOGIN_PATH || (orgSlug ? `/w/${encodeURIComponent(String(orgSlug))}/system` : '/');
      const target = `${baseURL}/sign-in?redirect_url=${encodeURIComponent(afterLoginPath)}`;

      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120_000 });

      const start = Date.now();
      const authCookieTimeoutMs = 10 * 60_000;

      const safeWait = async (ms: number) => {
        if (page.isClosed()) {
          throw new Error('Manual login window was closed before authentication completed');
        }
        await page.waitForTimeout(ms);
      };

      const hasClerkAuthCookie = async () => {
        const cookies = await page.context().cookies();
        return cookies.some((c) => {
          const domain = String(c.domain || '').replace(/^\./, '');
          const isAppCookie = domain === appHost;
          if (!isAppCookie) return false;
          if (!c.value) return false;
          return c.name === '__session' || c.name === '__clerk_db_jwt' || c.name.startsWith('__clerk_db_jwt_');
        });
      };

      const hasClerkSessionCookie = async () => {
        const cookies = await page.context().cookies();
        return cookies.some((c) => {
          const domain = String(c.domain || '').replace(/^\./, '');
          return domain === appHost && c.name === '__session' && Boolean(c.value);
        });
      };

      while (Date.now() - start < authCookieTimeoutMs) {
        if (await hasClerkAuthCookie().catch(() => false)) break;
        await safeWait(500);
      }

      if (!(await hasClerkAuthCookie().catch(() => false))) {
        throw new Error(`Manual login did not produce Clerk auth cookies within timeout. Current URL: ${page.url()}`);
      }

      // __clerk_db_jwt alone is not enough for server-side Clerk auth.
      // Wait for __session cookie on the app host to ensure Next.js server will recognize the session.
      const sessionStart = Date.now();
      while (Date.now() - sessionStart < authCookieTimeoutMs) {
        if (await hasClerkSessionCookie().catch(() => false)) break;
        await safeWait(500);
      }

      if (!(await hasClerkSessionCookie().catch(() => false))) {
        const cookies = await page.context().cookies().catch(() => []);
        const appCookies = cookies
          .filter((c) => String(c.domain || '').replace(/^\./, '') === appHost)
          .map((c) => `${c.name}@${c.domain}`)
          .join(', ');
        throw new Error(
          `Manual login did not produce Clerk __session cookie within timeout. Current URL: ${page.url()} App cookies: ${appCookies || '(none)'}`
        );
      }

      // Now that we are authenticated, explicitly navigate to the desired post-login page.
      if (afterLoginPath !== '/') {
        await page.goto(`${baseURL}${afterLoginPath}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });

        // Some environments redirect to /login (legacy) before the client navigates to the workspace.
        // Give the client a chance to finish the redirect before declaring failure.
        await page
          .waitForURL(
            (url) => {
              const p = url.pathname || '';
              return !p.startsWith('/login') && !p.startsWith('/sign-in');
            },
            { waitUntil: 'domcontentloaded', timeout: 60_000 }
          )
          .catch(() => undefined);

        const after = page.url();
        const afterPath = new URL(after).pathname;
        if (after.includes('/login') || after.includes('/sign-in') || afterPath === '/' || afterPath.startsWith('/workspaces')) {
          const cookies = await page.context().cookies().catch(() => []);
          const appCookies = cookies
            .filter((c) => String(c.domain || '').replace(/^\./, '') === appHost)
            .map((c) => `${c.name}@${c.domain}`)
            .join(', ');
          throw new Error(
            `Authenticated, but could not access '${afterLoginPath}'. Got '${after}'. This usually means the E2E user has no access to org '${String(orgSlug || '')}' (redirect to /workspaces), or that the server still does not recognize the session. App cookies: ${appCookies || '(none)'}`
          );
        }
      }
    } else {
      const emailValue = String(email || '').trim();
      const passwordValue = String(password || '').trim();

      const afterLoginPath =
        process.env.E2E_AFTER_LOGIN_PATH || (orgSlug ? `/w/${encodeURIComponent(String(orgSlug))}/system` : '/');
      const signInTarget = `${baseURL}/sign-in?redirect_url=${encodeURIComponent(afterLoginPath)}`;

      const attemptLogin = async () => {
        await page.goto(signInTarget, { waitUntil: 'domcontentloaded', timeout: 120_000 });

        const googleBtn = page.getByRole('button', { name: 'המשך עם Google' });
        await googleBtn.waitFor({ state: 'visible', timeout: 120_000 });
        await googleBtn.waitFor({ state: 'attached', timeout: 120_000 });

        await page
          .waitForFunction(() => {
            const btn = Array.from(document.querySelectorAll('button')).find((b) =>
              (b.textContent || '').includes('המשך עם Google')
            ) as HTMLButtonElement | undefined;
            return Boolean(btn && !btn.disabled);
          })
          .catch(() => undefined);

        await googleBtn
          .evaluate((btn) => {
            if ((btn as HTMLButtonElement).disabled) throw new Error('Google button still disabled (Clerk not loaded)');
          })
          .catch(() => undefined);

      const passwordInput = page.getByPlaceholder('הקלד סיסמה...');
      const inPasswordStep = await passwordInput.isVisible().catch(() => false);
      if (!inPasswordStep) {
        const emailInput = page.locator('input[type="email"]');
        await emailInput.waitFor({ state: 'visible', timeout: 60_000 });
        await emailInput.fill(emailValue);
        await page.getByRole('button', { name: 'המשך', exact: true }).click();
        await passwordInput.waitFor({ state: 'visible', timeout: 60_000 });
      }

      await passwordInput.fill(passwordValue);

      const observedEmail = await page.locator('body').locator(`text=${emailValue}`).first().isVisible().catch(() => false);
      if (!observedEmail) {
        throw new Error('Email not reflected on password step (unexpected login UI state)');
      }

      const submit = page.getByRole('button', { name: /כניסה למערכת/ });
      await submit.waitFor({ state: 'visible', timeout: 60_000 });
      await submit.waitFor({ state: 'attached', timeout: 60_000 });
      await submit.evaluate((btn) => {
        if ((btn as HTMLButtonElement).disabled) throw new Error('Submit button disabled (Clerk not loaded)');
      });

      await page
        .waitForFunction(() => {
          const btn = Array.from(document.querySelectorAll('button')).find((b) =>
            (b.textContent || '').includes('כניסה למערכת')
          ) as HTMLButtonElement | undefined;
          return Boolean(btn && !btn.disabled);
        })
        .catch(() => undefined);

      await submit.click();

      const navigated = page.waitForURL(
        (url) => {
          const p = url.pathname || '';
          return !p.startsWith('/login') && !p.startsWith('/sign-in');
        },
        { waitUntil: 'domcontentloaded', timeout: 30_000 }
      );

      const errorText = page
        .locator(
          'role=alert, text=/ההתחברות נכשלה|שגיאה בהתחברות|נא לבדוק את הפרטים|נדרשת סיסמה|נדרש אימות|אימות דו-שלבי|ההתחברות לא הושלמה|סטטוס:/i'
        )
        .first()
        .waitFor({ state: 'visible', timeout: 30_000 });

      await Promise.race([navigated, errorText]).catch(() => undefined);
    };

    await attemptLogin();

    const errorNow = await page
      .locator(
        'role=alert, text=/ההתחברות נכשלה|שגיאה בהתחברות|נא לבדוק את הפרטים|נדרשת סיסמה|נדרש אימות|אימות דו-שלבי|ההתחברות לא הושלמה|סטטוס:/i'
      )
      .first()
      .isVisible()
      .catch(() => false);

    if (errorNow || page.url().includes('/login') || page.url().includes('/sign-in')) {
      await attemptLogin();
    }

    }
  }

  try {
    if (skipLogin) {
      if (fs.existsSync(storageStatePath)) {
        const size = fs.statSync(storageStatePath).size;
        if (size > 20) {
          try {
            const raw = fs.readFileSync(storageStatePath, 'utf-8');
            const parsed: unknown = JSON.parse(raw || '{}');
            const cookiesValue = isRecord(parsed) ? parsed.cookies : undefined;
            const cookies = Array.isArray(cookiesValue) ? cookiesValue : [];
            const hasClerkAuthCookie = cookies.some(
              (c: unknown) => {
                if (!isRecord(c)) return false;
                const domain = String(c.domain || '').replace(/^\./, '');
                const isAppCookie = domain === appHost;
                if (!isAppCookie) return false;
                const value = String(c.value || '');
                if (!value) return false;
                const name = String(c.name || '');
                return name === '__session' || name === '__clerk_db_jwt' || name.startsWith('__clerk_db_jwt_');
              }
            );
            if (hasClerkAuthCookie) {
              await browser.close();
              return;
            }
          } catch {
            // fall through to error below
          }
        }
      }

      await browser.close();
      throw new Error(
        `E2E_SKIP_LOGIN=1 אך לא נמצא storageState תקין בנתיב: ${storageStatePath}. הרץ פעם אחת עם E2E_MANUAL_LOGIN=1 כדי להתחבר וליצור storageState ואז הרץ שוב עם E2E_SKIP_LOGIN=1.`
      );
    }

    const navigated = page.waitForURL(
      (url) => {
        const p = url.pathname || '';
        return !p.startsWith('/login') && !p.startsWith('/sign-in');
      },
      { waitUntil: 'domcontentloaded', timeout: 90_000 }
    );

    const errorText = page
      .locator(
        'role=alert, text=/ההתחברות נכשלה|שגיאה בהתחברות|נא לבדוק את הפרטים|נדרשת סיסמה|נדרש אימות|אימות דו-שלבי|ההתחברות לא הושלמה|סטטוס:/i'
      )
      .first()
      .waitFor({ state: 'visible', timeout: 90_000 });

    await Promise.race([navigated, errorText]);

    if (page.url().includes('/login') || page.url().includes('/sign-in')) {
      const errMsg = await page
        .locator(
          'role=alert, text=/ההתחברות נכשלה|שגיאה בהתחברות|נא לבדוק את הפרטים|נדרשת סיסמה|נדרש אימות|אימות דו-שלבי|ההתחברות לא הושלמה|סטטוס:/i'
        )
        .first()
        .innerText()
        .catch(() => '');
      throw new Error(errMsg || 'Login did not redirect');
    }
  } catch {
    const alertText = await page
      .locator(
        'role=alert, text=/ההתחברות נכשלה|שגיאה בהתחברות|נא לבדוק את הפרטים|נדרשת סיסמה|נדרש אימות|אימות דו-שלבי|ההתחברות לא הושלמה|סטטוס:/i'
      )
      .first()
      .innerText()
      .catch(() => '');

    const consoleDetails = consoleErrors.slice(-30).join('\n');
    const networkDetails = networkErrors
      .slice(-40)
      .map((n) => `${n.status} ${n.method} ${n.url}`)
      .join('\n');

    await page.screenshot({ path: 'test-results/global-setup-login-failed.png', fullPage: true });

    throw new Error(
      `Login failed or did not redirect. Current URL: ${page.url()} Alert: ${alertText}. Screenshot: test-results/global-setup-login-failed.png\n\nConsole errors (last 30):\n${consoleDetails || '(none)'}\n\nNetwork errors 4xx/5xx (last 40):\n${networkDetails || '(none)'}`
    );
  }

  page.off('console', onConsole);
  page.off('response', onResponse);

  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(async () => {
    await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => undefined);
  });

  const cookies = await page.context().cookies();
  const hasClerkAuthCookie = cookies.some((c) => c.name === '__session' || c.name === '__clerk_db_jwt' || c.name.startsWith('__clerk_db_jwt_'));
  if (!hasClerkAuthCookie) {
    const cookieNames = cookies.map((c) => c.name).join(', ');
    throw new Error(`Login did not create a recognizable Clerk auth cookie. Cookies: ${cookieNames}`);
  }

  await page.context().storageState({ path: storageStatePath });
  await browser.close();
}

export default globalSetup;
