import { Page } from '@playwright/test';
import { expect, waitForAnyDialogOrNavigation } from '../fixtures/guards';

type CrawlOptions = {
  maxNavItems?: number;
  clickPrimaryCta?: boolean;
  timeBudgetMs?: number;
};

const CTA_LABELS = [
  'צור',
  'צור חדש',
  'חדש',
  'הוסף',
  'הוספה',
  'Create',
  'New',
  'Add',
  '+',
];

function normalize(s: string) {
  return s.replace(/\s+/g, ' ').trim();
}

async function assertNotFoundUi(page: Page) {
  const bodyText = normalize(await page.locator('body').innerText().catch(() => ''));
  expect(bodyText.includes('404') || bodyText.includes('דף לא נמצא'), 'Rendered a 404-like page').toBeFalsy();
}

export async function crawlSidebarAndValidate(page: Page, options?: CrawlOptions) {
  const maxNavItems = options?.maxNavItems ?? 50;
  const clickPrimaryCta = options?.clickPrimaryCta ?? true;
  const timeBudgetMs =
    options?.timeBudgetMs ?? (Number(process.env.E2E_CRAWLER_BUDGET_MS || 75_000) || 75_000);
  const startedAt = Date.now();

  // Ensure sidebar exists (desktop)
  const sidebar = page.locator('#main-sidebar');
  const sidebarVisible = await sidebar
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!sidebarVisible) {
    const u = page.url();
    if (u.includes('/login') || u.includes('/sign-in') || u.includes('/workspaces')) {
      throw new Error(`Expected sidebar #main-sidebar to exist, but got url=${u}`);
    }
    await assertNotFoundUi(page);
    return;
  }

  const navButtons = sidebar.locator('nav button[aria-label]');
  const count = await navButtons.count();
  expect(count, 'No sidebar nav items found').toBeGreaterThan(0);

  const labels: string[] = [];
  for (let i = 0; i < Math.min(count, maxNavItems); i++) {
    const label = await navButtons.nth(i).getAttribute('aria-label');
    if (label) labels.push(label);
  }

  // Click each sidebar item by accessible name (stable)
  for (const label of labels) {
    if (page.isClosed()) return;
    if (Date.now() - startedAt > timeBudgetMs) {
      return;
    }
    const beforeUrl = page.url();

    await page.keyboard.press('Escape').catch(() => undefined);
    await page
      .getByRole('button', { name: label })
      .first()
      .click({ timeout: 5_000 })
      .catch(() => undefined);
    await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => undefined);

    await assertNotFoundUi(page);

    if (clickPrimaryCta) {
      await tryClickPrimaryCta(page);
    }

    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => undefined);
    if (page.url().includes('/login') || page.url().includes('/sign-in') || page.url().includes('/workspaces')) {
      throw new Error(`Unexpected redirect while crawling sidebar: url=${page.url()} from=${beforeUrl}`);
    }
  }
}

export async function tryClickPrimaryCta(page: Page) {
  const beforeUrl = page.url();

  // 1) Heuristic: buttons with strong/black styling often are CTA
  const primary = page
    .locator('main button:visible')
    .filter({ hasText: new RegExp(CTA_LABELS.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')) })
    .first();

  if (!(await primary.isVisible().catch(() => false))) {
    return;
  }

  await expect(primary).toBeEnabled();
  await page.keyboard.press('Escape').catch(() => undefined);
  await primary.click({ timeout: 5000 }).catch(() => undefined);

  await waitForAnyDialogOrNavigation(page, beforeUrl);

  // If dialog opened, close it best-effort (Esc)
  const dialog = page.getByRole('dialog').first();
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape').catch(() => undefined);
  }
}
