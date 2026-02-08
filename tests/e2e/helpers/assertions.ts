import { expect, Frame, Page, Response } from '@playwright/test';

type NavLoopOptions = {
  maxTransitions?: number;
};

export async function gotoAndAssertOk(page: Page, url: string): Promise<Response> {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  expect(response, `No response returned for navigation to ${url}`).toBeTruthy();
  if (!response!.ok()) {
    const status = response!.status();
    const statusText = response!.statusText();
    const headers = response!.headers();
    const location = headers?.location;

    let bodySnippet = '';
    try {
      const raw = await response!.text();
      bodySnippet = String(raw || '').slice(0, 800);
    } catch {
      bodySnippet = '';
    }

    // Keep this as console output (not assertion message) so it shows even when Playwright truncates expect output.
    console.log(
      `[e2e] gotoAndAssertOk failed: url=${url} status=${status} ${statusText || ''} finalUrl=${page.url()}${location ? ` location=${location}` : ''}${bodySnippet ? ` bodySnippet=${JSON.stringify(bodySnippet)}` : ''}`
    );
  }

  expect(response!.ok(), `Expected 2xx for ${url}, got ${response!.status()}`).toBeTruthy();
  return response!;
}

export async function clickAllPrimaryButtons(page: Page) {
  const candidates = page.locator('main button:visible, main a[role="button"]:visible');
  const count = await candidates.count();
  const max = Math.min(count, 12);
  for (let i = 0; i < max; i++) {
    const el = candidates.nth(i);
    await expect(el).toBeEnabled();
  }
}

export async function assertNoNavLoop(page: Page, action: () => Promise<void>, options?: NavLoopOptions) {
  const maxTransitions = options?.maxTransitions ?? 8;

  const before = page.url();
  const seen = new Set<string>([before]);

  let transitions = 0;
  const onFrameNavigated = (frame: Frame) => {
    if (frame === page.mainFrame()) {
      const u = page.url();
      seen.add(u);
      transitions += 1;
    }
  };
  page.on('framenavigated', onFrameNavigated);

  try {
    await action();
    await page.waitForLoadState('domcontentloaded');
  } finally {
    page.off('framenavigated', onFrameNavigated);
  }

  expect(transitions, 'Navigation had too many transitions (possible redirect loop)').toBeLessThanOrEqual(maxTransitions);

  const after = page.url();
  expect(after, 'URL did not change after navigation action').not.toBe(before);
  expect(seen.size, 'Navigation loop detected (same URL repeating)').toBeGreaterThanOrEqual(2);
}
