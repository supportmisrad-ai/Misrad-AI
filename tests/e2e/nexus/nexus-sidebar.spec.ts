import { test } from '../fixtures/guards';
import { gotoAndAssertOk } from '../helpers/assertions';
import { crawlSidebarAndValidate } from '../helpers/crawler';
import type { Page } from '@playwright/test';

const orgSlug = process.env.E2E_ORG_SLUG;

test.describe('Nexus: all sidebar tabs (crawler)', () => {
  test.skip(!orgSlug, 'E2E_ORG_SLUG is required');

  const base = () => `/w/${encodeURIComponent(String(orgSlug))}/nexus`;

  test('deep coverage: sidebar tabs + primary CTA + no 404/500', async ({ page }: { page: Page }) => {
    await gotoAndAssertOk(page, `${base()}`);
    await crawlSidebarAndValidate(page, { clickPrimaryCta: true });
  });
});
