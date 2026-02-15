#!/usr/bin/env node
/**
 * Codemod: Replace console.log/error/warn in app/actions/ with structured logger.
 * 
 * Usage: node scripts/codemod-console-to-logger.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const actionsDir = path.join(__dirname, '..', 'app', 'actions');

function getAllTsFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Extract the "source" tag from the first console call's bracket prefix.
 * e.g. console.error('[operations] foo', e) -> 'operations'
 * Falls back to filename without extension.
 */
function inferSource(content, filePath) {
  const match = content.match(/console\.\w+\(\s*['"`]\[([^\]]+)\]/);
  if (match) return match[1];
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Transform a single file's content.
 * Returns { newContent, changeCount } or null if no changes.
 */
function transformFile(content, filePath) {
  const source = inferSource(content, filePath);
  let changeCount = 0;
  let result = content;

  // Pattern 1: console.error('[tag] message', error)
  // -> logger.error('tag', 'message', error)
  result = result.replace(
    /console\.error\(\s*['"`]\[([^\]]+)\]\s*([^'"`]*)['"`]\s*,\s*([^)]+)\)/g,
    (match, tag, msg, errArg) => {
      changeCount++;
      const cleanMsg = msg.trim().replace(/,\s*$/, '');
      const cleanErr = errArg.trim();
      // Check if errArg has multiple comma-separated args
      // If so, pack extras into an object
      return `logger.error('${tag}', '${cleanMsg}', ${cleanErr})`;
    }
  );

  // Pattern 2: console.error('[tag] message') (no error arg)
  // -> logger.error('tag', 'message')
  result = result.replace(
    /console\.error\(\s*['"`]\[([^\]]+)\]\s*([^'"`]*)['"`]\s*\)/g,
    (match, tag, msg) => {
      changeCount++;
      const cleanMsg = msg.trim();
      return `logger.error('${tag}', '${cleanMsg}')`;
    }
  );

  // Pattern 3: console.error('message', error) (no bracket tag)
  // -> logger.error('source', 'message', error)
  result = result.replace(
    /console\.error\(\s*['"`]([^[\]'"`]+)['"`]\s*,\s*([^)]+)\)/g,
    (match, msg, errArg) => {
      // Skip if already transformed
      if (match.startsWith('logger.')) return match;
      changeCount++;
      const cleanMsg = msg.trim().replace(/,\s*$/, '');
      return `logger.error('${source}', '${cleanMsg}', ${errArg.trim()})`;
    }
  );

  // Pattern 4: console.error('message') (no bracket, no error)
  // -> logger.error('source', 'message')
  result = result.replace(
    /console\.error\(\s*['"`]([^[\]'"`]+)['"`]\s*\)/g,
    (match, msg) => {
      if (match.startsWith('logger.')) return match;
      changeCount++;
      return `logger.error('${source}', '${msg.trim()}')`;
    }
  );

  // Pattern 5: console.log('[tag] message', ...args)
  // -> logger.debug('tag', 'message', { ...args })
  result = result.replace(
    /console\.log\(\s*['"`]\[([^\]]+)\]\s*([^'"`]*)['"`]\s*,\s*([^)]+)\)/g,
    (match, tag, msg, args) => {
      changeCount++;
      const cleanMsg = msg.trim().replace(/,\s*$/, '');
      return `logger.debug('${tag}', '${cleanMsg}', ${args.trim()})`;
    }
  );

  // Pattern 6: console.log('[tag] message')
  // -> logger.debug('tag', 'message')
  result = result.replace(
    /console\.log\(\s*['"`]\[([^\]]+)\]\s*([^'"`]*)['"`]\s*\)/g,
    (match, tag, msg) => {
      changeCount++;
      return `logger.debug('${tag}', '${msg.trim()}')`;
    }
  );

  // Pattern 7: console.log('message', ...args) no bracket
  result = result.replace(
    /console\.log\(\s*['"`]([^[\]'"`]+)['"`]\s*,\s*([^)]+)\)/g,
    (match, msg, args) => {
      if (match.startsWith('logger.')) return match;
      changeCount++;
      return `logger.debug('${source}', '${msg.trim()}', ${args.trim()})`;
    }
  );

  // Pattern 8: console.log('message')
  result = result.replace(
    /console\.log\(\s*['"`]([^[\]'"`]+)['"`]\s*\)/g,
    (match, msg) => {
      if (match.startsWith('logger.')) return match;
      changeCount++;
      return `logger.debug('${source}', '${msg.trim()}')`;
    }
  );

  // Pattern 9: console.warn('[tag] message', ...args)
  result = result.replace(
    /console\.warn\(\s*['"`]\[([^\]]+)\]\s*([^'"`]*)['"`]\s*,\s*([^)]+)\)/g,
    (match, tag, msg, args) => {
      changeCount++;
      const cleanMsg = msg.trim().replace(/,\s*$/, '');
      return `logger.warn('${tag}', '${cleanMsg}', ${args.trim()})`;
    }
  );

  // Pattern 10: console.warn('[tag] message')
  result = result.replace(
    /console\.warn\(\s*['"`]\[([^\]]+)\]\s*([^'"`]*)['"`]\s*\)/g,
    (match, tag, msg) => {
      changeCount++;
      return `logger.warn('${tag}', '${msg.trim()}')`;
    }
  );

  // Pattern 11: console.warn('message', ...args) no bracket
  result = result.replace(
    /console\.warn\(\s*['"`]([^[\]'"`]+)['"`]\s*,\s*([^)]+)\)/g,
    (match, msg, args) => {
      if (match.startsWith('logger.')) return match;
      changeCount++;
      return `logger.warn('${source}', '${msg.trim()}', ${args.trim()})`;
    }
  );

  // Pattern 12: console.warn('message')
  result = result.replace(
    /console\.warn\(\s*['"`]([^[\]'"`]+)['"`]\s*\)/g,
    (match, msg) => {
      if (match.startsWith('logger.')) return match;
      changeCount++;
      return `logger.warn('${source}', '${msg.trim()}')`;
    }
  );

  if (changeCount === 0) return null;

  // Add logger import if not present
  if (!result.includes("from '@/lib/server/logger'") && !result.includes('from "@/lib/server/logger"')) {
    // Insert after 'use server' directive or at top
    const useServerMatch = result.match(/^['"]use server['"];?\s*\n/);
    if (useServerMatch) {
      const insertPos = useServerMatch.index + useServerMatch[0].length;
      result = result.slice(0, insertPos) + "\nimport { logger } from '@/lib/server/logger';\n" + result.slice(insertPos);
    } else {
      result = "import { logger } from '@/lib/server/logger';\n" + result;
    }
  }

  return { newContent: result, changeCount };
}

function main() {
  const files = getAllTsFiles(actionsDir);
  let totalChanges = 0;
  let filesChanged = 0;

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip files with no console calls
    if (!/console\.(log|error|warn)\(/.test(content)) continue;

    const result = transformFile(content, filePath);
    if (!result) continue;

    const rel = path.relative(path.join(__dirname, '..'), filePath);
    console.log(`  ${rel}: ${result.changeCount} replacements`);
    totalChanges += result.changeCount;
    filesChanged++;

    if (!DRY_RUN) {
      fs.writeFileSync(filePath, result.newContent, 'utf8');
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Total: ${totalChanges} replacements in ${filesChanged} files`);
}

main();
