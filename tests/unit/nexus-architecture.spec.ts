import { test, expect } from '@playwright/test';

import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');

async function readUtf8(p: string): Promise<string> {
  return fs.readFile(p, 'utf8');
}

async function listInternalNexusActionFiles(): Promise<string[]> {
  const dir = path.join(repoRoot, 'app', 'actions', 'nexus', '_internal');
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => name.endsWith('.ts'))
    .filter((name) => !name.endsWith('.pure.ts'))
    .filter((name) => name !== 'utils.ts' && name !== 'mappers.ts')
    .map((name) => path.join(dir, name));
}

test.describe('nexus architecture', () => {
  test('internal actions do not import prisma directly', async () => {
    const files = await listInternalNexusActionFiles();
    expect(files.length).toBeGreaterThan(0);

    const offenders: Array<{ file: string; reason: string }> = [];

    await Promise.all(
      files.map(async (file) => {
        const text = await readUtf8(file);

        if (/(^|\n)\s*import\s+prisma\s+from\s+['"]@\/lib\/prisma['"];?/m.test(text)) {
          offenders.push({ file, reason: "imports prisma from '@/lib/prisma'" });
        }

        if (/\bprisma\./.test(text)) {
          offenders.push({ file, reason: 'uses prisma.*' });
        }
      })
    );

    expect(offenders).toEqual([]);
  });

  test('nexus.ts is a facade (no prisma direct usage)', async () => {
    const file = path.join(repoRoot, 'app', 'actions', 'nexus.ts');
    const text = await readUtf8(file);

    expect(text).not.toMatch(/(^|\n)\s*import\s+prisma\s+from\s+['"]@\/lib\/prisma['"];?/m);
    expect(text).not.toMatch(/\bprisma\./);

    expect(text).toMatch(/from '\.\/nexus\/_internal\//);
  });
});
