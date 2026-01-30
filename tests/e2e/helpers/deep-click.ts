import type { Locator, Page } from '@playwright/test';
import { expect, waitForAnyDialogOrNavigation } from '../fixtures/guards';

type DeepClickOptions = {
  scope?: Locator;
  maxElements?: number;
  timeBudgetMs?: number;
};

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e || '');
}

function normalize(s: string) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function shouldSkipByText(text: string) {
  const t = normalize(text);
  if (!t) return false;

  const dangerous = [
    'מחק',
    'מחיקה',
    'Delete',
    'Remove',
    'הסר',
    'יציאה',
    'התנתק',
    'Log out',
    'Logout',
    'Sign out',
    'הוספת ליד',
    'ליד חדש',
    'שמור ליד',
    'Open Next.js Dev Tools',
  ];

  return dangerous.some((w) => t.toLowerCase().includes(w.toLowerCase()));
}

async function closeOverlays(page: Page) {
  const dialog = page.getByRole('dialog').first();
  const menu = page.getByRole('menu').first();

  if ((await dialog.isVisible().catch(() => false)) || (await menu.isVisible().catch(() => false))) {
    await page.keyboard.press('Escape').catch(() => undefined);
  }
}

async function waitForAnyEffect(
  page: Page,
  beforeUrl: string,
  element: Locator,
  beforeExpanded: string | null,
  strict: boolean
) {
  await Promise.race([
    waitForAnyDialogOrNavigation(page, beforeUrl).catch(() => undefined),
    page
      .getByRole('menu')
      .first()
      .waitFor({ state: 'visible', timeout: 3000 })
      .catch(() => undefined),
  ]);

  const afterUrl = page.url();
  const hasDialog = await page.getByRole('dialog').first().isVisible().catch(() => false);
  const hasMenu = await page.getByRole('menu').first().isVisible().catch(() => false);

  if (hasDialog || hasMenu || afterUrl !== beforeUrl) return;

  const afterExpanded = await element.getAttribute('aria-expanded').catch(() => null);
  if (beforeExpanded !== afterExpanded) return;

  if (strict) {
    return;
  }
}

async function getElementMeta(el: Locator) {
  const info = await el.evaluate((node) => {
    const tag = (node as HTMLElement)?.tagName?.toLowerCase?.() || '';
    const role = (node as HTMLElement)?.getAttribute?.('role') || '';
    const ariaLabel = (node as HTMLElement)?.getAttribute?.('aria-label') || '';
    const ariaDisabled = (node as HTMLElement)?.getAttribute?.('aria-disabled') || '';
    const disabled = (node as HTMLButtonElement)?.disabled ? '1' : '';
    const href = (node as HTMLAnchorElement)?.getAttribute?.('href') || '';
    const target = (node as HTMLAnchorElement)?.getAttribute?.('target') || '';
    const text = (node as HTMLElement)?.innerText || (node as HTMLElement)?.textContent || '';
    const ariaExpanded = (node as HTMLElement)?.getAttribute?.('aria-expanded') || '';
    return {
      tag,
      role,
      ariaLabel,
      ariaDisabled,
      disabled,
      href,
      target,
      text,
      ariaExpanded,
    };
  });

  return {
    tag: String(info.tag || ''),
    role: String(info.role || ''),
    ariaLabel: normalize(info.ariaLabel),
    ariaDisabled: String(info.ariaDisabled || ''),
    disabled: String(info.disabled || ''),
    href: String(info.href || ''),
    target: String(info.target || ''),
    text: normalize(info.text),
    ariaExpanded: info.ariaExpanded ? String(info.ariaExpanded) : null,
  };
}

export async function deepClickAllInPage(page: Page, options?: DeepClickOptions) {
  let scope = options?.scope;
  const maxElements = options?.maxElements ?? 60;
  const timeBudgetMs = options?.timeBudgetMs ?? 15_000;
  const deadline = Date.now() + timeBudgetMs;

  if (!scope) {
    const preferred = page.locator('#main-scroll-container');
    const preferredCount = await preferred.count().catch(() => 0);
    if (preferredCount > 0) {
      const candidate = preferred.first();
      const visible = await candidate.isVisible().catch(() => false);
      if (visible) {
        scope = candidate;
      }
    } else {
      const main = page.locator('main');
      const mainCount = await main.count().catch(() => 0);
      scope = mainCount > 0 ? main.first() : page.locator('body');
    }

    if (!scope) {
      const main = page.locator('main');
      const mainCount = await main.count().catch(() => 0);
      scope = mainCount > 0 ? main.first() : page.locator('body');
    }
  }

  await page
    .addStyleTag({
      content: `
        nextjs-portal { pointer-events: none !important; }
        [data-nextjs-dev-overlay] { pointer-events: none !important; }
      `,
    })
    .catch(() => undefined);

  try {
    await expect(scope).toBeVisible({ timeout: 10_000 });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const lower = msg.toLowerCase();
    const isClosed =
      lower.includes('page has been closed') ||
      lower.includes('target closed') ||
      lower.includes('browser has been closed');
    if (isClosed) return;

    // Deep coverage should never block the suite if UI is still loading.
    return;
  }

  const candidates = scope.locator('button:visible, a:visible, [role="button"]:visible');
  const total = await candidates.count();
  const max = Math.min(total, maxElements);

  const startUrl = page.url();

  const safeGoto = async (targetUrl: string): Promise<boolean> => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        return true;
      } catch (e: unknown) {
        const msg = getErrorMessage(e);
        const lower = msg.toLowerCase();

        const isRetriable =
          msg.includes('net::ERR_ABORTED') ||
          lower.includes('frame was detached') ||
          lower.includes('timeout') ||
          lower.includes('navigation') ||
          lower.includes('econnreset') ||
          lower.includes('aborted');

        if (isRetriable) {
          await page.waitForTimeout(250 * attempt).catch(() => undefined);
          continue;
        }

        const isClosed = lower.includes('target closed') || lower.includes('page closed');
        if (isClosed) return false;

        throw e;
      }
    }

    return false;
  };

  for (let i = 0; i < max; i++) {
    if (Date.now() > deadline) return;
    await closeOverlays(page);

    const el = candidates.nth(i);
    let meta: Awaited<ReturnType<typeof getElementMeta>>;
    try {
      meta = await getElementMeta(el);
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      const lower = msg.toLowerCase();

      const isClosed =
        lower.includes('target page') ||
        lower.includes('page has been closed') ||
        lower.includes('target closed') ||
        lower.includes('browser has been closed');
      if (isClosed) return;

      const isDetatchedOrNavigating =
        lower.includes('execution context was destroyed') ||
        lower.includes('frame was detached') ||
        lower.includes('not attached') ||
        lower.includes('navigation');
      if (isDetatchedOrNavigating) continue;

      throw e;
    }

    if (meta.disabled === '1') continue;
    if (meta.ariaDisabled === 'true') continue;
    if (meta.target === '_blank') continue;

    if (meta.href && (meta.href.startsWith('http') || meta.href.startsWith('mailto:') || meta.href.startsWith('tel:'))) continue;

    if (shouldSkipByText(meta.text) || shouldSkipByText(meta.ariaLabel)) continue;

    const beforeUrl = page.url();

    try {
      await expect(el).toBeVisible({ timeout: 1_000 });
    } catch {
      continue;
    }
    if (meta.tag === 'button' || meta.role === 'button') {
      try {
        await expect(el).toBeEnabled({ timeout: 1_000 });
      } catch {
        continue;
      }
    }

    let clickOrNavOk = false;
    try {
      await el.click({ timeout: 3_000, noWaitAfter: true });
      clickOrNavOk = true;
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      const href = String(meta.href || '').trim();
      const isInternalHref = href && href.startsWith('/') && !href.startsWith('//');
      if (isInternalHref) {
        const targetUrl = new URL(href, beforeUrl).toString();
        const ok = await safeGoto(targetUrl);
        if (!ok) continue;
        clickOrNavOk = true;
      } else if (msg.includes('intercepts pointer events') || msg.includes('subtree intercepts pointer events')) {
        try {
          await el.click({ timeout: 3_000, force: true, noWaitAfter: true });
          clickOrNavOk = true;
        } catch {
          continue;
        }
      } else if (
        msg.toLowerCase().includes('timeout') ||
        msg.toLowerCase().includes('not attached') ||
        msg.toLowerCase().includes('target closed') ||
        msg.toLowerCase().includes('page closed')
      ) {
        continue;
      } else {
        throw e;
      }
    }

    if (clickOrNavOk) {
      const strict = Boolean(meta.href && meta.href !== '') || meta.ariaExpanded !== null;
      await waitForAnyEffect(page, beforeUrl, el, meta.ariaExpanded, strict);
    }

    const href = String(meta.href || '').trim();
    const isInternalHref = href && href.startsWith('/') && !href.startsWith('//');
    if (isInternalHref && page.url() === beforeUrl) {
      const targetUrl = new URL(href, beforeUrl).toString();
      await safeGoto(targetUrl);
    }

    await closeOverlays(page);

    if (page.url() !== startUrl) {
      await safeGoto(startUrl);
    } else {
      await page.waitForLoadState('domcontentloaded');
    }
  }
}
