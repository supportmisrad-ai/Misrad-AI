import { test } from '../fixtures/guards';
import { runPageDeepCoverage } from '../helpers/page-deep-coverage';
import type { Page } from '@playwright/test';
import { assertNoNavLoop } from '../helpers/assertions';

test.describe('Client: workspace module', () => {
  const orgSlug = process.env.E2E_ORG_SLUG;

  test.skip(!orgSlug, 'E2E_ORG_SLUG is required');

  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);

  test('dashboard deep coverage', async ({ page }: { page: Page }) => {
    await runPageDeepCoverage(page, `/w/${encodeURIComponent(String(orgSlug))}/client/dashboard`, { maxElements: 10 });
  });

  test('clients deep coverage', async ({ page }: { page: Page }) => {
    await runPageDeepCoverage(page, `/w/${encodeURIComponent(String(orgSlug))}/client/clients`, { maxElements: 8 });
  });

  test('hub deep coverage', async ({ page }: { page: Page }) => {
    await runPageDeepCoverage(page, `/w/${encodeURIComponent(String(orgSlug))}/client/hub`, { maxElements: 8 });
  });

  test('workflows deep coverage', async ({ page }: { page: Page }) => {
    await runPageDeepCoverage(page, `/w/${encodeURIComponent(String(orgSlug))}/client/workflows`, { maxElements: 8 });
  });

  test('root redirect does not loop', async ({ page }: { page: Page }) => {
    await assertNoNavLoop(page, async () => {
      await page.goto(`/w/${encodeURIComponent(String(orgSlug))}/client`, { waitUntil: 'domcontentloaded' });
    });

    await page.waitForURL(
      (url) => {
        const p = url.pathname || '';
        return p.endsWith('/client/dashboard') || p.includes('/client/dashboard');
      },
      { timeout: 30_000 }
    );
  });
});
