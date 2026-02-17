#!/usr/bin/env node

/**
 * Bundle Size Analyzer
 * Finds large files that might be causing webpack serialization warnings
 */

const fs = require('fs');
const path = require('path');

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];
const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'build', '.git'];
const SIZE_THRESHOLD = 50 * 1024; // 50KB

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function hasLargeStrings(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for very long string literals
    const stringMatches = content.match(/['"`]([^'"`]{1000,})['"`]/g);
    if (stringMatches && stringMatches.length > 0) {
      return {
        hasLargeStrings: true,
        count: stringMatches.length,
        maxLength: Math.max(...stringMatches.map(s => s.length)),
      };
    }

    // Check for large object literals
    const lines = content.split('\n');
    let inObject = false;
    let objectLines = 0;
    let maxObjectLines = 0;

    for (const line of lines) {
      if (line.includes('{') && (line.includes('const') || line.includes('export'))) {
        inObject = true;
        objectLines = 1;
      } else if (inObject) {
        objectLines++;
        if (line.includes('}')) {
          maxObjectLines = Math.max(maxObjectLines, objectLines);
          inObject = false;
          objectLines = 0;
        }
      }
    }

    if (maxObjectLines > 100) {
      return {
        hasLargeObjects: true,
        maxObjectLines,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function scanDirectory(dir, results = []) {
  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);

      // Skip excluded directories
      if (EXCLUDE_DIRS.includes(item)) {
        continue;
      }

      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        scanDirectory(fullPath, results);
      } else if (stats.isFile()) {
        const ext = path.extname(item);
        if (EXTENSIONS.includes(ext)) {
          const size = stats.size;

          if (size > SIZE_THRESHOLD) {
            const issues = hasLargeStrings(fullPath);
            results.push({
              path: fullPath,
              size,
              sizeKB: (size / 1024).toFixed(2),
              issues,
            });
          }
        }
      }
    }
  } catch (error) {
    // Ignore permission errors
  }

  return results;
}

function main() {
  console.log('🔍 Analyzing bundle for large files...\n');

  const rootDir = path.join(__dirname, '..');
  const results = scanDirectory(rootDir);

  // Sort by size
  results.sort((a, b) => b.size - a.size);

  console.log(`Found ${results.length} files larger than ${SIZE_THRESHOLD / 1024}KB:\n`);

  // Show top 20
  const top = results.slice(0, 20);

  for (const file of top) {
    const relativePath = path.relative(rootDir, file.path);
    console.log(`📦 ${file.sizeKB} KB - ${relativePath}`);

    if (file.issues) {
      if (file.issues.hasLargeStrings) {
        console.log(`   ⚠️  Contains ${file.issues.count} large string(s), max length: ${file.issues.maxLength}`);
      }
      if (file.issues.hasLargeObjects) {
        console.log(`   ⚠️  Contains large object literal (${file.issues.maxObjectLines} lines)`);
      }
    }
    console.log('');
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('1. Move large JSON data to separate .json files');
  console.log('2. Use dynamic imports for large components');
  console.log('3. Extract SVG strings to separate files');
  console.log('4. Use lazy loading for translation files');
  console.log('5. Consider code splitting for large modules\n');
}

main();
