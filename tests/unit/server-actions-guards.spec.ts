import { test, expect } from '@playwright/test';

import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');
const actionsDir = path.join(repoRoot, 'app', 'actions');

async function listServerActionFiles(): Promise<string[]> {
  const result: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.pure.ts')) {
        const text = await fs.readFile(full, 'utf8');
        if (text.includes("'use server'") || text.includes('"use server"')) {
          result.push(full);
        }
      }
    }
  }

  await walk(actionsDir);
  return result;
}

test.describe('server actions guards', () => {
  test('all server actions import auth guard', async () => {
    const files = await listServerActionFiles();
    expect(files.length).toBeGreaterThan(50);

    const offenders: Array<{ file: string; reason: string }> = [];

    const authPatterns = [
      /requireAuth/,
      /getAuthenticatedUser/,
      /requireSuperAdmin/,
      /getCurrentUserId/,
      /requireWorkspaceAccess/,
      /requireSuperAdminOrReturn/,
      /cronGuard/,
      /webhookGuard/,
      /resolveWorkspaceCurrentUserForApi/,
      /withWorkspaceTenantContext/,
      /requireOrganizationId/,
      /auth\(\)/,
      /from\s+['"@]clerk/,
      /createErrorResponse/,
    ];

    await Promise.all(
      files.map(async (file) => {
        const text = await fs.readFile(file, 'utf8');
        const hasGuard = authPatterns.some((p) => p.test(text));
        if (!hasGuard) {
          offenders.push({ file: path.relative(repoRoot, file), reason: 'missing auth guard import' });
        }
      })
    );

    if (offenders.length > 0) {
      console.warn('Unguarded server actions:', offenders);
    }
    expect(offenders).toEqual([]);
  });

  test('all server actions have use server directive', async () => {
    const files = await listServerActionFiles();
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      expect(text).toMatch(/(^|\n)\s*['"]use server['"]/);
    }
  });

  test('no server action imports prisma in _internal files (except allowed)', async () => {
    const internalDir = path.join(actionsDir, 'nexus', '_internal');
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(internalDir, { withFileTypes: true }) as import('fs').Dirent[];
    } catch {
      return;
    }
    const tsFiles = entries
      .filter((e) => e.isFile() && String(e.name).endsWith('.ts'))
      .filter((e) => !String(e.name).endsWith('.pure.ts') && String(e.name) !== 'utils.ts' && String(e.name) !== 'mappers.ts')
      .map((e) => path.join(internalDir, String(e.name)));

    const offenders: string[] = [];
    for (const file of tsFiles) {
      const text = await fs.readFile(file, 'utf8');
      if (/import\s+prisma\s+from\s+['"]@\/lib\/prisma['"]/.test(text)) {
        offenders.push(path.relative(repoRoot, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
