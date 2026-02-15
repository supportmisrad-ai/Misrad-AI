#!/usr/bin/env node
/**
 * Codemod: Remove `as any` casts from components/views/app files.
 * 
 * Strategy:
 *  - Safe mechanical patterns are auto-fixed
 *  - Complex patterns are logged for manual review
 * 
 * Usage: node scripts/codemod-remove-as-any.cjs [--dry-run] [--file <path>]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const SINGLE_FILE = process.argv.includes('--file')
  ? process.argv[process.argv.indexOf('--file') + 1]
  : null;

const rootDir = path.join(__dirname, '..');

function getAllTsFiles(dirs) {
  const results = [];
  for (const dir of dirs) {
    const absDir = path.join(rootDir, dir);
    if (!fs.existsSync(absDir)) continue;
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      const fullPath = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getAllTsFiles([path.relative(rootDir, fullPath)]));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function transformFile(content, filePath) {
  let result = content;
  let changeCount = 0;

  // ========== PATTERN 1: (x as any).prop → (x as Record<string, unknown>).prop ==========
  // This handles things like (window as any).someGlobal, (obj as any).field
  result = result.replace(
    /\((\w+)\s+as\s+any\)\./g,
    (match, varName) => {
      // Special cases
      if (varName === 'window') {
        changeCount++;
        return `((window as unknown) as { [key: string]: unknown }).`;
      }
      if (varName === 'navigator' || varName === 'document') {
        changeCount++;
        return `((${varName} as unknown) as Record<string, unknown>).`;
      }
      changeCount++;
      return `(${varName} as Record<string, unknown>).`;
    }
  );

  // ========== PATTERN 2: (x.y as any).prop → (x.y as Record<string, unknown>).prop ==========
  result = result.replace(
    /\(([\w.]+)\s+as\s+any\)\./g,
    (match, expr) => {
      if (match.includes('as Record<string')) return match; // already fixed
      changeCount++;
      return `(${expr} as Record<string, unknown>).`;
    }
  );

  // ========== PATTERN 3: e.target.value as any → String(e.target.value) ==========
  // Form input values should be strings
  result = result.replace(
    /(\w+)\.target\.value\s+as\s+any/g,
    (match, eventVar) => {
      changeCount++;
      return `String(${eventVar}.target.value)`;
    }
  );

  // ========== PATTERN 4: (e as any) in event handlers → proper event type ==========
  // e as any where e is an event → e as unknown
  result = result.replace(
    /\(e\s+as\s+any\)/g,
    () => {
      changeCount++;
      return '(e as unknown)';
    }
  );

  // ========== PATTERN 5: callback (x: any) → (x: unknown) ==========
  // .find((c: any) => ...), .filter((item: any) => ...), .map((x: any) => ...)  
  result = result.replace(
    /\((\w+):\s*any\)\s*=>/g,
    (match, param) => {
      changeCount++;
      return `(${param}: unknown) =>`;
    }
  );

  // ========== PATTERN 6: (x: any, y: any) => ... ==========
  result = result.replace(
    /\((\w+):\s*any,\s*(\w+):\s*any\)\s*=>/g,
    (match, p1, p2) => {
      changeCount++;
      return `(${p1}: unknown, ${p2}: unknown) =>`;
    }
  );

  // ========== PATTERN 7: catch (e: any) → catch (e: unknown) ==========
  result = result.replace(
    /catch\s*\((\w+):\s*any\)/g,
    (match, param) => {
      changeCount++;
      return `catch (${param}: unknown)`;
    }
  );

  // ========== PATTERN 8: variable as any at end of expression (simple assignment) ==========
  // const x = something as any; → const x = something as unknown;
  // But only when it's a simple expression (not already handled above)
  result = result.replace(
    /(\w[\w.]*)\s+as\s+any([;\s,)\]}])/g,
    (match, expr, suffix) => {
      if (match.includes('as Record<string')) return match;
      if (match.includes('as unknown')) return match;
      changeCount++;
      return `${expr} as unknown${suffix}`;
    }
  );

  // ========== PATTERN 9: = {} as any → typed empty object ==========
  result = result.replace(
    /=\s*\{\}\s+as\s+any/g,
    () => {
      changeCount++;
      return '= {} as Record<string, unknown>';
    }
  );

  // ========== PATTERN 10: = [] as any → typed empty array ==========
  result = result.replace(
    /=\s*\[\]\s+as\s+any/g,
    () => {
      changeCount++;
      return '= [] as unknown[]';
    }
  );

  // ========== PATTERN 11: <Component prop={x as any} → prop={x as unknown} ==========
  result = result.replace(
    /=\{([^}]+)\s+as\s+any\}/g,
    (match, expr) => {
      if (match.includes('as Record<string')) return match;
      if (match.includes('as unknown')) return match;
      changeCount++;
      return `={${expr} as unknown}`;
    }
  );

  if (changeCount === 0) return null;
  return { newContent: result, changeCount };
}

function main() {
  let files;
  if (SINGLE_FILE) {
    files = [path.resolve(rootDir, SINGLE_FILE)];
  } else {
    files = getAllTsFiles(['components', 'views', 'app', 'contexts', 'hooks', 'lib']);
  }

  let totalChanges = 0;
  let filesChanged = 0;
  const remaining = [];

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes('as any') && !content.includes(': any')) continue;

    const result = transformFile(content, filePath);
    const rel = path.relative(rootDir, filePath);

    if (result) {
      totalChanges += result.changeCount;
      filesChanged++;
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, result.newContent, 'utf8');
      }
      
      // Count remaining `as any` in transformed content
      const remainingCount = (result.newContent.match(/as any/g) || []).length;
      if (remainingCount > 0) {
        remaining.push({ file: rel, count: remainingCount });
      }
      
      console.log(`  ${rel}: ${result.changeCount} fixed${remainingCount > 0 ? `, ${remainingCount} remaining` : ''}`);
    } else {
      // File has `as any` or `: any` but no patterns matched
      const anyCount = (content.match(/as any/g) || []).length;
      const colonAnyCount = (content.match(/:\s*any[^_\w]/g) || []).length;
      if (anyCount > 0 || colonAnyCount > 0) {
        remaining.push({ file: rel, count: anyCount + colonAnyCount });
      }
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Fixed: ${totalChanges} in ${filesChanged} files`);
  
  if (remaining.length > 0) {
    console.log(`\nRemaining \`as any\` / \`: any\` for manual review:`);
    remaining.sort((a, b) => b.count - a.count);
    for (const r of remaining.slice(0, 30)) {
      console.log(`  ${r.file}: ${r.count}`);
    }
    const totalRemaining = remaining.reduce((sum, r) => sum + r.count, 0);
    console.log(`  Total remaining: ${totalRemaining} in ${remaining.length} files`);
  }
}

main();
