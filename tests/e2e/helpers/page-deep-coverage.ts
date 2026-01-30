import type { Page } from '@playwright/test';
import { expect } from '../fixtures/guards';
import { gotoAndAssertOk } from './assertions';
import { deepClickAllInPage } from './deep-click';

type DeepCoverageOptions = {
  maxElements?: number;
  timeBudgetMs?: number;
};

export async function runPageDeepCoverage(page: Page, url: string, options?: DeepCoverageOptions) {
  const response = await gotoAndAssertOk(page, url);
  expect(response.ok(), `Expected 2xx for ${url}, got ${response.status()}`).toBeTruthy();

  await page.waitForLoadState('domcontentloaded');

  const after = page.url();
  const afterPath = new URL(after).pathname;
  if (after.includes('/login') || after.includes('/sign-in')) {
    throw new Error(`Unexpected redirect to auth page. Expected ${url}, got ${after}`);
  }
  if (afterPath === '/') {
    throw new Error(
      `Unexpected redirect to '/'. Expected ${url}, got ${after}. This usually means forbidden workspace access or wrong E2E_ORG_SLUG.`
    );
  }

  await deepClickAllInPage(page, {
    maxElements: options?.maxElements,
    timeBudgetMs: options?.timeBudgetMs ?? 12_000,
  });
}
