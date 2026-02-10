import { test } from '../fixtures/guards';
import { gotoAndAssertOk } from '../helpers/assertions';
import { tryClickPrimaryCta } from '../helpers/crawler';

import type { Page } from '@playwright/test';

test.describe('Admin module', () => {
  test.skip(process.env.E2E_TEST_ADMIN !== '1', 'Set E2E_TEST_ADMIN=1 to enable admin tests');

  const routes = ['/app/admin', '/app/admin/customers', '/app/admin/users', '/app/admin/organizations'];

  for (const url of routes) {
    test(`page loads: ${url}`, async ({ page }: { page: Page }) => {
      await gotoAndAssertOk(page, url);
      await tryClickPrimaryCta(page);
    });
  }
});
