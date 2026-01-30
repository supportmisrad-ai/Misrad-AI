import { test } from '../fixtures/guards';
import type { Page, APIRequestContext } from '@playwright/test';

type ChainResult = {
  ok: boolean;
  leadId?: string;
  operationsProjectId?: string | null;
  systemInvoiceId?: string | null;
  error?: string;
  reason?: string;
};

async function callChain(request: APIRequestContext, orgSlug: string): Promise<ChainResult> {
  const key = process.env.E2E_API_KEY;
  if (!key) {
    throw new Error('Missing E2E_API_KEY env var');
  }

  const now = Date.now();
  const res = await request.post('/api/e2e/lead-won-chain', {
    timeout: 120_000,
    headers: { 'x-e2e-key': key },
    data: {
      orgSlug,
      lead: {
        name: `E2E Lead ${now}`,
        company: `E2E Company ${now}`,
        phone: `050${String(now).slice(-7)}`,
        email: `e2e+${now}@misrad.com`,
        value: 1234,
        installationAddress: 'תל אביב 1',
      },
    },
  });

  const json = (await res.json().catch(() => null)) as ChainResult | null;
  if (!res.ok()) {
    throw new Error(`E2E chain failed: HTTP ${res.status()} ${JSON.stringify(json)}`);
  }

  if (!json?.ok) {
    throw new Error(`E2E chain failed: ${JSON.stringify(json)}`);
  }

  return json;
}

test.describe('Critical flow: System -> WON -> Operations Project -> Finance Invoice', () => {
  const orgSlug = process.env.E2E_ORG_SLUG;

  test.setTimeout(180_000);

  test.skip(!orgSlug, 'E2E_ORG_SLUG is required');

  test('creates lead, closes WON, verifies project+invoice created', async ({ page, request }: { page: Page; request: APIRequestContext }) => {
    const result = await callChain(request, String(orgSlug));

    if (!result.operationsProjectId) {
      throw new Error(`Expected operationsProjectId to be created for lead ${result.leadId}`);
    }

    if (!result.systemInvoiceId) {
      throw new Error(`Expected systemInvoiceId to be created for lead ${result.leadId}`);
    }

    await page.waitForTimeout(1);
  });
});
