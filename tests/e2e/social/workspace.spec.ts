import { test } from '../fixtures/guards';
import { runPageDeepCoverage } from '../helpers/page-deep-coverage';
import type { Page } from '@playwright/test';

test.describe('Social: /social/workspace', () => {
  const orgSlug = process.env.E2E_ORG_SLUG;
  test.skip(!orgSlug, 'E2E_ORG_SLUG is required');

  test('deep coverage', async ({ page }: { page: Page }) => {
    await runPageDeepCoverage(page, `/w/${encodeURIComponent(String(orgSlug))}/social/workspace`);
  });
});
