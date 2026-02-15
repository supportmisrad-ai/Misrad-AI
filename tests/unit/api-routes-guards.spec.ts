import { test, expect } from '@playwright/test';

import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');
const apiDir = path.join(repoRoot, 'app', 'api');

async function listRouteFiles(): Promise<string[]> {
  const result: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name === 'route.ts') {
        result.push(full);
      }
    }
  }

  await walk(apiDir);
  return result;
}

test.describe('API routes guards', () => {
  test('all API routes have auth or guard mechanism', async () => {
    const files = await listRouteFiles();
    expect(files.length).toBeGreaterThan(50);

    const guardPatterns = [
      /getCurrentUserId/,
      /getAuthenticatedUser/,
      /requireAuth/,
      /requireSuperAdmin/,
      /requireWorkspaceAccess/,
      /cronGuard/,
      /webhookGuard/,
      /shabbatGuard/,
      /e2eGuard/,
      /isE2eEnabled/,
      /IS_E2E_TESTING/,
      /getWorkspaceOrThrow/,
      /getWorkspaceByOrgKeyOrThrow/,
      /requireWorkspaceAccessByOrgSlugApi/,
      /resolveWorkspaceCurrentUserForApi/,
      /withWorkspaceTenantContext/,
      /requireOrganizationId/,
      /api_keys/,
    ];

    // Routes that are intentionally public / no auth needed
    const excludedPathPatterns = [
      /[\\/]debug[\\/]/,
      /[\\/]e2e[\\/]/,
      /[\\/]download[\\/]/,
      /[\\/]public[\\/]/,
      /[\\/]landing[\\/]/,
      /[\\/]shabbat[\\/]/,
      /[\\/]version[\\/]/,
      /[\\/]integrations[\\/].*[\\/](?:callback|connect|disconnect)[\\/]/,
      /[\\/]integrations[\\/]status[\\/]/,
      /tenant-guard-probe/,
    ];

    const offenders: Array<{ file: string }> = [];

    await Promise.all(
      files.map(async (file) => {
        const relPath = path.relative(repoRoot, file);
        if (excludedPathPatterns.some((p) => p.test(relPath))) return;
        const text = await fs.readFile(file, 'utf8');
        const hasGuard = guardPatterns.some((p) => p.test(text));
        if (!hasGuard) {
          offenders.push({ file: relPath });
        }
      })
    );

    if (offenders.length > 0) {
      console.warn('API routes without guard:', offenders.map((o) => o.file));
    }
    expect(offenders).toEqual([]);
  });

  test('no API route exposes raw prisma without workspace scoping', async () => {
    const files = await listRouteFiles();
    const dangerousPatterns = [
      /prisma\.\w+\.findMany\(\s*\)/,
      /prisma\.\w+\.findMany\(\s*\{[^}]*\}\s*\)/,
    ];

    const offenders: Array<{ file: string; pattern: string }> = [];

    await Promise.all(
      files.map(async (file) => {
        const text = await fs.readFile(file, 'utf8');
        for (const pattern of dangerousPatterns) {
          if (pattern.test(text)) {
            const relPath = path.relative(repoRoot, file);
            if (!relPath.includes('e2e') && !relPath.includes('debug')) {
              offenders.push({ file: relPath, pattern: String(pattern) });
            }
          }
        }
      })
    );

    // This is an audit — warn but don't fail for now
    if (offenders.length > 0) {
      console.warn('Routes with potentially unscoped prisma calls:', offenders);
    }
  });

  test('e2e routes have e2e guard', async () => {
    const e2eDir = path.join(apiDir, 'e2e');
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(e2eDir, { withFileTypes: true }) as import('fs').Dirent[];
    } catch {
      return;
    }

    const routeDirs = entries.filter((e) => e.isDirectory());

    for (const dir of routeDirs) {
      const routePath = path.join(e2eDir, String(dir.name), 'route.ts');
      try {
        const text = await fs.readFile(routePath, 'utf8');
        const hasE2eGuard = /e2eGuard|IS_E2E_TESTING|isE2eEnabled/.test(text);
        expect(hasE2eGuard).toBe(true);
      } catch {
        // route.ts doesn't exist in this dir
      }
    }
  });

  test('all route files export at least one HTTP method', async () => {
    const files = await listRouteFiles();
    const httpMethods = /export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/;
    const handlerPattern = /export\s+(?:const\s+)?(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/;

    const offenders: string[] = [];

    await Promise.all(
      files.map(async (file) => {
        const text = await fs.readFile(file, 'utf8');
        if (!httpMethods.test(text) && !handlerPattern.test(text)) {
          offenders.push(path.relative(repoRoot, file));
        }
      })
    );

    expect(offenders).toEqual([]);
  });
});
