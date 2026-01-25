import { test as base, expect as baseExpect, ConsoleMessage, Page, Response } from '@playwright/test';

type ConsoleIssue = { type: string; text: string };

type NetworkIssue = {
  url: string;
  status: number;
  method: string;
};

function shouldIgnoreUrl(url: string) {
  // Best-effort ignore noisy/expected failures
  if (url.includes('chrome-extension://')) return true;
  if (url.includes('https://clerk')) return false;
  try {
    const u = new URL(url);
    const p = String(u.pathname || '');
    if (p.endsWith('.md')) return true;
    if (p.endsWith('context.md')) return true;
  } catch {
    // ignore
  }
  return false;
}

export const test = base.extend<{ consoleIssues: ConsoleIssue[]; networkIssues: NetworkIssue[] }>({
  consoleIssues: async (
    { page }: { page: Page },
    runFixture: (issues: ConsoleIssue[]) => Promise<void>
  ) => {
    const issues: ConsoleIssue[] = [];

    page.on('console', (msg: ConsoleMessage) => {
      const type = msg.type();
      if (type === 'error') {
        issues.push({ type, text: msg.text() });
      }
    });

    page.on('pageerror', (err: Error) => {
      issues.push({ type: 'pageerror', text: String(err?.message || err) });
    });

    await runFixture(issues);

    if (issues.length > 0) {
      const details = issues.map((i) => `[${i.type}] ${i.text}`).join('\n');
      throw new Error(`Console/page errors detected:\n${details}`);
    }
  },

  networkIssues: async (
    { page }: { page: Page },
    runFixture: (issues: NetworkIssue[]) => Promise<void>
  ) => {
    const issues: NetworkIssue[] = [];

    const onResponse = (response: Response) => {
      const status = response.status();
      if (status < 400) return;
      if (status !== 404 && status < 500) return;

      const req = response.request();
      const url = response.url();
      if (shouldIgnoreUrl(url)) return;

      issues.push({ url, status, method: req.method() });
    };

    page.on('response', onResponse);

    await runFixture(issues);

    page.off('response', onResponse);

    if (issues.length > 0) {
      const details = issues
        .slice(0, 40)
        .map((i) => `${i.status} ${i.method} ${i.url}`)
        .join('\n');
      throw new Error(`Network errors detected (404/5xx):\n${details}`);
    }
  },
});

export const expect = baseExpect;

export async function waitForAnyDialogOrNavigation(page: Page, beforeUrl: string) {
  const dialog = page.getByRole('dialog').first();
  await Promise.race([
    dialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined),
    page.waitForURL((url: URL) => url.toString() !== beforeUrl, { timeout: 5000 }).catch(() => undefined),
  ]);

  const afterUrl = page.url();
  const hasDialog = await dialog.isVisible().catch(() => false);
  if (!hasDialog && afterUrl === beforeUrl) {
    throw new Error('CTA click did not open a dialog and did not navigate');
  }
}
