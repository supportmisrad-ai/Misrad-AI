import { test as base } from '@playwright/test';

type ConsoleIssue = { type: string; text: string };

export const test = base.extend<{ consoleIssues: ConsoleIssue[] }>({
  consoleIssues: async ({ page }, runFixture) => {
    const issues: ConsoleIssue[] = [];

    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error') {
        issues.push({ type, text: msg.text() });
      }
    });

    page.on('pageerror', (err) => {
      issues.push({ type: 'pageerror', text: String(err?.message || err) });
    });

    await runFixture(issues);

    if (issues.length > 0) {
      const details = issues.map((i) => `[${i.type}] ${i.text}`).join('\n');
      throw new Error(`Console/page errors detected:\n${details}`);
    }
  },
});

export const expect = test.expect;
