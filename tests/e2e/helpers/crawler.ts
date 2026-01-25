import { Page } from '@playwright/test';
import { expect, waitForAnyDialogOrNavigation } from '../fixtures/guards';

type CrawlOptions = {
  maxNavItems?: number;
  clickPrimaryCta?: boolean;
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

  // Ensure sidebar exists (desktop)
  const sidebar = page.locator('#main-sidebar');
  await expect(sidebar, 'Expected sidebar #main-sidebar to exist').toBeVisible({ timeout: 15_000 });

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
    const beforeUrl = page.url();

    await page.getByRole('button', { name: label }).first().click();
    await page.waitForLoadState('domcontentloaded');

    await assertNotFoundUi(page);

    if (clickPrimaryCta) {
      await tryClickPrimaryCta(page);
    }

    // sanity: avoid being stuck on same URL after navigation click
    expect(page.url(), `Sidebar click did not navigate for item: ${label}`).not.toBe(beforeUrl);
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
  await primary.click();

  await waitForAnyDialogOrNavigation(page, beforeUrl);

  // If dialog opened, close it best-effort (Esc)
  const dialog = page.getByRole('dialog').first();
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape').catch(() => undefined);
  }
}
