const fs = require('fs');
const path = require('path');

function listMigrationSqlFiles(rootDir) {
  const out = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const abs = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      const p = path.join(abs, 'migration.sql');
      if (fs.existsSync(p)) out.push(p);
    }
  }
  out.sort();
  return out;
}

function stripBlockAndLineComments(sql) {
  const noBlock = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  return noBlock.replace(/^\s*--.*$/gm, '');
}

function stripSqlStrings(sql) {
  let i = 0;
  let out = '';

  while (i < sql.length) {
    const ch = sql[i];

    if (ch === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      out += "''";
      continue;
    }

    if (ch === '$') {
      const m = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const closeIdx = sql.indexOf(tag, i + tag.length);
        if (closeIdx !== -1) {
          i = closeIdx + tag.length;
          out += tag + tag;
          continue;
        }
      }
    }

    out += ch;
    i++;
  }

  return out;
}

function normalizeRef(ref) {
  const raw = String(ref || '').trim();
  if (!raw) return null;

  const parts = raw.split('.').filter(Boolean);
  if (parts.length === 1) return { schema: 'public', table: parts[0] };
  if (parts.length === 2) return { schema: parts[0], table: parts[1] };
  return null;
}

function canonicalKey(schema, table) {
  const s = String(schema || '').trim().toLowerCase();
  const t = String(table || '').trim().toLowerCase();
  if (!s || !t) return null;
  return `${s}.${t}`;
}

function extractTables(sql) {
  const results = {
    created: new Set(),
    referenced: new Set(),
  };

  const cleaned = stripSqlStrings(stripBlockAndLineComments(sql));

  const schemaTableRe = '(?:"?([a-zA-Z0-9_]+)"?\\.)?"?([a-zA-Z0-9_]+)"?';

  const createTableRe = new RegExp(`\\bcreate\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?${schemaTableRe}`, 'gi');
  const alterTableRe = new RegExp(`\\balter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?${schemaTableRe}`, 'gi');
  const createIndexRe = new RegExp(`\\bcreate\\s+(?:unique\\s+)?index\\s+[^;]*?\\bon\\s+${schemaTableRe}`, 'gi');
  const createPolicyRe = new RegExp(`\\bcreate\\s+policy\\s+[^;]*?\\bon\\s+${schemaTableRe}`, 'gi');
  const dropPolicyRe = new RegExp(`\\bdrop\\s+policy\\s+if\\s+exists\\s+[^;]*?\\bon\\s+${schemaTableRe}`, 'gi');

  function addCreated(schemaRaw, tableRaw) {
    const schema = schemaRaw ? String(schemaRaw) : 'public';
    const table = String(tableRaw);
    const key = canonicalKey(schema, table);
    if (!key) return;
    results.created.add(key);
  }

  function addReferenced(schemaRaw, tableRaw) {
    const schema = schemaRaw ? String(schemaRaw) : 'public';
    const table = String(tableRaw);
    const key = canonicalKey(schema, table);
    if (!key) return;
    results.referenced.add(key);
  }

  for (const m of cleaned.matchAll(createTableRe)) {
    addCreated(m[1], m[2]);
  }

  for (const m of cleaned.matchAll(alterTableRe)) {
    addReferenced(m[1], m[2]);
  }

  for (const m of cleaned.matchAll(createIndexRe)) {
    addReferenced(m[1], m[2]);
  }

  for (const m of cleaned.matchAll(createPolicyRe)) {
    addReferenced(m[1], m[2]);
  }

  for (const m of cleaned.matchAll(dropPolicyRe)) {
    addReferenced(m[1], m[2]);
  }

  return results;
}

function main() {
  const migrationsRoot = path.join(process.cwd(), 'prisma', 'migrations');
  if (!fs.existsSync(migrationsRoot)) {
    console.error(`[audit] prisma/migrations not found at: ${migrationsRoot}`);
    process.exit(1);
  }

  const files = listMigrationSqlFiles(migrationsRoot);
  const created = new Set();
  const referenced = new Set();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const res = extractTables(content);
    for (const k of res.created) created.add(k);
    for (const k of res.referenced) referenced.add(k);
  }

  const ignoredSchemas = new Set(['auth', 'storage', 'extensions', 'realtime', 'supabase_functions', 'pg_catalog', 'information_schema']);

  const missing = [];
  for (const ref of referenced) {
    const [schema] = String(ref).split('.', 2);
    if (ignoredSchemas.has(schema)) continue;
    if (!created.has(ref)) missing.push(ref);
  }

  missing.sort();

  const output = {
    migrationFilesScanned: files.length,
    createdTablesCount: created.size,
    referencedTablesCount: referenced.size,
    missingTablesCount: missing.length,
    missingTables: missing,
  };

  console.log(JSON.stringify(output, null, 2));

  if (missing.length > 0) {
    process.exitCode = 1;
  }
}

main();
