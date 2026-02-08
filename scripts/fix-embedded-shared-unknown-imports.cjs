import { asObject } from '@/lib/shared/unknown';
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

function detectEol(src) {
  return src.includes('\r\n') ? '\r\n' : '\n';
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);

    if (e.isDirectory()) {
      const name = e.name;
      if (name === 'node_modules' || name === '.next' || name === 'dist' || name === 'out' || name === '.git') continue;
      if (name === 'android') continue;
      if (name === 'prisma' && full.endsWith(path.join('prisma', 'migrations'))) continue;
      walk(full, out);
      continue;
    }

    if (!e.isFile()) continue;
    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) continue;

    out.push(full);
  }
}

function applyFixes(originalSrc) {
  const eol = detectEol(originalSrc);
  let src = originalSrc;

  // Case 1: the shared-unknown import was injected into the middle of a quoted module path,
  // and the remainder of the original path is pushed to the next line (e.g. "attenda" + "nce';").
  // Example:
  //   import { x } from '@/app/actions/attenda//   nce';
  //     const embeddedWithSuffixRe =
    /(import\s+[^;\r\n]*\sfrom\s+)(['"])([^'"\r\n]*?)(?=import\s*\{)import\s*\{([^}]*)\}\s*from\s+(['"])@\/lib\/shared\/unknown\5;\s*\r?\n\s*([^'"\r\n]*)\2;?/g;

  src = src.replace(
    embeddedWithSuffixRe,
    (_m, importPrefix, quote, pathPrefix, unknownParts, unknownQuote, pathSuffix) => {
      const fixedFirstImport = `${importPrefix}${quote}${pathPrefix}${pathSuffix}${quote};`;
      const fixedUnknownImport = `import { ${unknownParts.trim()} } from ${unknownQuote}@/lib/shared/unknown${unknownQuote};`;
      return `${fixedFirstImport}${eol}${fixedUnknownImport}`;
    }
  );

  // Case 2: the shared-unknown import was concatenated right after a valid import
  // (closing quote exists, but semicolon/newline is missing).
  // Example:
  //   import prisma from '@/lib/prisma';
  //     const concatenatedAfterClosedImportRe =
    /(import\s+[^;\r\n]*\sfrom\s+['"][^'"\r\n]+['"])\s*import\s*\{([^}]*)\}\s*from\s+(['"])@\/lib\/shared\/unknown\3;?/g;

  src = src.replace(
    concatenatedAfterClosedImportRe,
    (_m, firstImport, unknownParts, unknownQuote) => {
      const fixedFirstImport = `${firstImport};`;
      const fixedUnknownImport = `import { ${unknownParts.trim()} } from ${unknownQuote}@/lib/shared/unknown${unknownQuote};`;
      return `${fixedFirstImport}${eol}${fixedUnknownImport}`;
    }
  );

  return src;
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');

  const files = [];
  walk(REPO_ROOT, files);

  const results = {
    scanned: 0,
    changed: 0,
  };

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8');
    results.scanned++;

    if (path.basename(filePath) === 'fix-embedded-shared-unknown-imports.cjs') continue;

    if (!raw.includes("@/lib/shared/unknown")) continue;

    const next = applyFixes(raw);
    if (next === raw) continue;

    results.changed++;
    if (!checkOnly) fs.writeFileSync(filePath, next, 'utf8');
  }

  const mode = checkOnly ? 'CHECK' : 'WRITE';
  console.log(`[fix-embedded-shared-unknown-imports] Mode=${mode}`);
  console.log(`[fix-embedded-shared-unknown-imports] Scanned=${results.scanned} Changed=${results.changed}`);
}

main();
