#!/usr/bin/env node
/**
 * Raw SQL Table Audit
 * ===================
 * Scans all .ts/.tsx files for raw SQL queries and extracts table names.
 * Compares against schema.prisma to ensure all referenced tables exist.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// 1. Parse schema.prisma to get all table names
function getSchemaTableNames() {
  const content = fs.readFileSync(path.join(ROOT, 'prisma', 'schema.prisma'), 'utf-8');
  const tables = new Set();

  const lines = content.split('\n');
  let currentModel = null;
  for (const line of lines) {
    const modelMatch = line.trim().match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) currentModel = modelMatch[1];

    const mapMatch = line.trim().match(/@@map\("([^"]+)"\)/);
    if (mapMatch && currentModel) {
      tables.add(mapMatch[1].toLowerCase());
      tables.add(currentModel.toLowerCase());
      currentModel = null;
    }

    if (line.trim() === '}' && currentModel) {
      tables.add(currentModel.toLowerCase());
      currentModel = null;
    }
  }

  return tables;
}

// 2. Find all raw SQL in code
function findRawSqlFiles() {
  try {
    const result = execSync(
      'git grep -l "queryRaw\\|executeRaw\\|\\$queryRawUnsafe\\|\\$executeRawUnsafe\\|Prisma.sql" -- "*.ts" "*.tsx"',
      { cwd: ROOT, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    return result.trim().split('\n').filter(Boolean);
  } catch (e) {
    return [];
  }
}

// 3. Extract table names from SQL strings in a file
function extractTablesFromFile(filePath) {
  const content = fs.readFileSync(path.join(ROOT, filePath), 'utf-8');
  const tables = new Set();

  // Match FROM/JOIN/INTO/UPDATE table_name patterns in template literals and strings
  const sqlPatterns = [
    /FROM\s+([a-z_][a-z0-9_]*)/gi,
    /JOIN\s+([a-z_][a-z0-9_]*)/gi,
    /INTO\s+([a-z_][a-z0-9_]*)/gi,
    /UPDATE\s+([a-z_][a-z0-9_]*)/gi,
    /INSERT\s+INTO\s+([a-z_][a-z0-9_]*)/gi,
    /DELETE\s+FROM\s+([a-z_][a-z0-9_]*)/gi,
  ];

  // SQL keywords to exclude
  const keywords = new Set([
    'select', 'from', 'where', 'and', 'or', 'not', 'in', 'is', 'null',
    'true', 'false', 'as', 'on', 'set', 'values', 'returning', 'exists',
    'case', 'when', 'then', 'else', 'end', 'asc', 'desc', 'limit',
    'offset', 'group', 'order', 'by', 'having', 'distinct', 'count',
    'sum', 'avg', 'min', 'max', 'coalesce', 'cast', 'lower', 'upper',
    'now', 'current_timestamp', 'interval', 'date', 'time', 'timestamp',
    'text', 'int', 'integer', 'boolean', 'uuid', 'varchar', 'bigint',
    'decimal', 'float', 'jsonb', 'json', 'timestamptz', 'information_schema',
    'pg_catalog', 'lateral', 'cross', 'left', 'right', 'inner', 'outer',
    'full', 'natural', 'using', 'do', 'nothing', 'conflict', 'excluded',
    'with', 'recursive', 'union', 'all', 'except', 'intersect',
  ]);

  for (const pattern of sqlPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const tableName = match[1].toLowerCase();
      if (!keywords.has(tableName) && tableName.length > 1) {
        tables.add(tableName);
      }
    }
  }

  return tables;
}

// Main
function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     🔍 Raw SQL Table Audit                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const schemaTables = getSchemaTableNames();
  console.log(`📋 Schema tables: ${schemaTables.size}\n`);

  const files = findRawSqlFiles();
  console.log(`📂 Files with raw SQL: ${files.length}\n`);

  const allTables = new Map(); // tableName -> [files]
  const missingTables = new Map(); // tableName -> [files]
  const matchedTables = new Map();

  for (const file of files) {
    const tables = extractTablesFromFile(file);
    for (const table of tables) {
      if (!allTables.has(table)) allTables.set(table, []);
      allTables.get(table).push(file);

      if (schemaTables.has(table)) {
        if (!matchedTables.has(table)) matchedTables.set(table, []);
        matchedTables.get(table).push(file);
      } else {
        if (!missingTables.has(table)) missingTables.set(table, []);
        missingTables.get(table).push(file);
      }
    }
  }

  console.log(`📊 Results:`);
  console.log(`   ✅ Tables found in schema: ${matchedTables.size}`);
  console.log(`   ❌ Tables NOT in schema:   ${missingTables.size}`);
  console.log(`   📊 Total unique tables:    ${allTables.size}\n`);

  if (matchedTables.size > 0) {
    console.log('✅ Tables in Raw SQL that MATCH schema:\n');
    [...matchedTables.keys()].sort().forEach(t => {
      const files = matchedTables.get(t);
      console.log(`   ✅ ${t} (${files.length} files)`);
    });
    console.log('');
  }

  if (missingTables.size > 0) {
    console.log('❌ Tables in Raw SQL NOT FOUND in schema:\n');
    [...missingTables.keys()].sort().forEach(t => {
      const files = missingTables.get(t);
      console.log(`   ❌ ${t}`);
      files.forEach(f => console.log(`      → ${f}`));
    });
    console.log('');
  } else {
    console.log('🎉 All Raw SQL tables match the schema!\n');
  }

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    schemaTableCount: schemaTables.size,
    filesWithRawSql: files.length,
    matched: Object.fromEntries(matchedTables),
    missing: Object.fromEntries(missingTables),
    allTables: Object.fromEntries(allTables),
  };

  const reportPath = path.join(ROOT, 'docs', 'RAW_SQL_AUDIT_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`💾 Full report: docs/RAW_SQL_AUDIT_REPORT.json\n`);
}

main();
