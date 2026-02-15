#!/usr/bin/env node
/**
 * Codemod pass 2: Replace `: any` type annotations with `: unknown` or proper types.
 * 
 * Usage: node scripts/codemod-remove-colon-any.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
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

function transformFile(content) {
  let result = content;
  let changeCount = 0;

  // Pattern 1: let/const/var x: any = ... → let/const/var x: unknown = ...
  result = result.replace(
    /((?:let|const|var)\s+\w+):\s*any(\s*[=;])/g,
    (match, prefix, suffix) => {
      changeCount++;
      return `${prefix}: unknown${suffix}`;
    }
  );

  // Pattern 2: let/const x: any[] = ... → let/const x: unknown[] = ...
  result = result.replace(
    /((?:let|const|var)\s+\w+):\s*any\[\]/g,
    (match, prefix) => {
      changeCount++;
      return `${prefix}: unknown[]`;
    }
  );

  // Pattern 3: function param (x: any) in function declarations
  // function foo(x: any, y: any): ... → function foo(x: unknown, y: unknown): ...
  result = result.replace(
    /(\w+):\s*any(?=\s*[,)\]}])/g,
    (match, name) => {
      // Don't replace in type/interface declarations or in strings
      // Simple heuristic: if name is a common variable name, replace
      if (['type', 'interface', 'enum', 'class', 'extends', 'implements'].includes(name)) return match;
      changeCount++;
      return `${name}: unknown`;
    }
  );

  // Pattern 4: : any[] in params/returns
  result = result.replace(
    /(\w+):\s*any\[\](?=\s*[,)\]}])/g,
    (match, name) => {
      if (['type', 'interface', 'enum', 'class'].includes(name)) return match;
      changeCount++;
      return `${name}: unknown[]`;
    }
  );

  // Pattern 5: Record<string, any> → Record<string, unknown>
  result = result.replace(
    /Record<string,\s*any>/g,
    () => {
      changeCount++;
      return 'Record<string, unknown>';
    }
  );

  // Pattern 6: Promise<any> → Promise<unknown>
  result = result.replace(
    /Promise<any>/g,
    () => {
      changeCount++;
      return 'Promise<unknown>';
    }
  );

  // Pattern 7: Array<any> → Array<unknown>
  result = result.replace(
    /Array<any>/g,
    () => {
      changeCount++;
      return 'Array<unknown>';
    }
  );

  // Pattern 8: useState<any> → useState<unknown>
  result = result.replace(
    /useState<any>/g,
    () => {
      changeCount++;
      return 'useState<unknown>';
    }
  );

  // Pattern 9: as any remaining
  result = result.replace(
    /\bas any\b(?!\w)/g,
    () => {
      changeCount++;
      return 'as unknown';
    }
  );

  if (changeCount === 0) return null;
  return { newContent: result, changeCount };
}

function main() {
  const files = getAllTsFiles(['components', 'views', 'app', 'contexts', 'hooks', 'lib']);
  let totalChanges = 0;
  let filesChanged = 0;

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    if (!/ any/.test(content)) continue;

    const result = transformFile(content);
    if (!result) continue;

    const rel = path.relative(rootDir, filePath);
    totalChanges += result.changeCount;
    filesChanged++;

    if (!DRY_RUN) {
      fs.writeFileSync(filePath, result.newContent, 'utf8');
    }

    console.log(`  ${rel}: ${result.changeCount} fixed`);
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Fixed: ${totalChanges} in ${filesChanged} files`);

  // Count remaining
  let remaining = 0;
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = content.match(/\bany\b/g);
    if (matches) {
      // Filter to only actual `any` type usages (rough heuristic)
      const lines = content.split('\n');
      for (const line of lines) {
        if (/:\s*any\b|as any\b|<any>|any\[\]/.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
          remaining++;
        }
      }
    }
  }
  console.log(`Approximate remaining \`any\` type usages: ${remaining}`);
}

main();
