#!/usr/bin/env node
/**
 * Perfectionist Schema Merger v7 (FINAL)
 * =======================================
 * Fixes from v6:
 *  1. Type translation targets parts[1] specifically, not first string match
 *  2. Deduplicates rescued fields by checking if relation FK column already exists
 *  3. Handles field name = type name case (e.g., "team_members team_members @relation")
 */

const fs = require('fs');
const path = require('path');

function parseSchema(content) {
  const result = { header: [], models: {}, enums: {} };
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('generator ') || trimmed.startsWith('datasource ')) {
      const block = [lines[i]]; i++;
      while (i < lines.length && lines[i].trim() !== '}') { block.push(lines[i]); i++; }
      if (i < lines.length) block.push(lines[i]);
      result.header.push(block.join('\n')); i++; continue;
    }
    if (trimmed.startsWith('model ')) {
      const nm = trimmed.match(/^model\s+(\w+)\s*\{/);
      if (!nm) { i++; continue; }
      const modelName = nm[1];
      const comments = []; let ci = i - 1;
      while (ci >= 0 && lines[ci].trim().startsWith('///')) { comments.unshift(lines[ci]); ci--; }
      const bodyLines = []; i++;
      while (i < lines.length && lines[i].trim() !== '}') { bodyLines.push(lines[i]); i++; }
      i++;
      const fields = [], indexes = []; let tableName = modelName;
      bodyLines.forEach(bl => {
        const bt = bl.trim();
        if (!bt || bt.startsWith('//')) return;
        const mm = bt.match(/@@map\("([^"]+)"\)/);
        if (mm) { tableName = mm[1]; indexes.push(bt); return; }
        if (bt.startsWith('@@')) { indexes.push(bt); return; }
        const parts = bt.split(/\s+/);
        if (parts.length >= 2) {
          const fm = bt.match(/@map\("([^"]+)"\)/);
          const bareType = parts[1].replace(/[?\[\]]/g, '');
          const builtins = ['String','Int','Float','Boolean','DateTime','Json','BigInt','Decimal','Bytes'];
          fields.push({
            name: parts[0], type: parts[1], bareType,
            dbColumn: (fm ? fm[1] : parts[0]).toLowerCase(),
            isRelation: bt.includes('@relation'),
            isModelRef: !builtins.includes(bareType) && !bareType.startsWith('Unsupported'),
            raw: bt
          });
        }
      });
      result.models[modelName] = { name: modelName, tableName: tableName.toLowerCase(), comments, fields, indexes, bodyLines };
      continue;
    }
    if (trimmed.startsWith('enum ')) {
      const nm = trimmed.match(/^enum\s+(\w+)\s*\{/);
      if (!nm) { i++; continue; }
      const comments = []; let ci = i - 1;
      while (ci >= 0 && lines[ci].trim().startsWith('///')) { comments.unshift(lines[ci]); ci--; }
      const values = []; i++;
      while (i < lines.length && lines[i].trim() !== '}') {
        const v = lines[i].trim(); if (v && !v.startsWith('//')) values.push(v); i++;
      }
      i++;
      result.enums[nm[1]] = { name: nm[1], values, comments };
      continue;
    }
    i++;
  }
  return result;
}

function buildTableMap(models) {
  const m = {}; Object.values(models).forEach(x => { m[x.tableName] = x.name; }); return m;
}

/**
 * Reconstruct a field line with the type at position [1] translated.
 * Also translates fields inside @relation(fields: [...]).
 */
function rebuildFieldLine(rawLine, colMap, prodToDevName, allFinalModels, allEnumNames) {
  const trimmed = rawLine.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return null;

  const fieldName = parts[0];
  const rawType = parts[1];
  const bareType = rawType.replace(/[?\[\]]/g, '');
  const builtins = ['String','Int','Float','Boolean','DateTime','Json','BigInt','Decimal','Bytes'];

  // Skip builtins, Unsupported, and enums
  if (builtins.includes(bareType) || bareType.startsWith('Unsupported') || allEnumNames.has(bareType)) {
    return trimmed;
  }

  // Translate the type
  const finalType = prodToDevName[bareType] || bareType;
  if (!allFinalModels.has(finalType)) return null;

  // Rebuild the type with modifiers (?, [])
  const newType = rawType.replace(bareType, finalType);

  // Rebuild the line: replace ONLY the type at position [1]
  // Find the exact position of the type in the original line
  let result = trimmed;
  if (bareType !== finalType) {
    // Find where parts[1] starts in the trimmed line
    const fieldNameEnd = trimmed.indexOf(fieldName) + fieldName.length;
    const typeStart = trimmed.indexOf(rawType, fieldNameEnd);
    if (typeStart >= 0) {
      result = trimmed.substring(0, typeStart) + newType + trimmed.substring(typeStart + rawType.length);
    }
  }

  // Translate fields inside @relation(fields: [...])
  const fieldsMatch = result.match(/@relation\([^)]*fields:\s*\[([^\]]+)\]/);
  if (fieldsMatch) {
    const refs = fieldsMatch[1].split(',').map(f => f.trim());
    const translated = [];
    for (const ref of refs) {
      const prismaName = colMap[ref.toLowerCase()];
      if (!prismaName) return null;
      translated.push(prismaName);
    }
    result = result.replace(fieldsMatch[1], translated.join(', '));
  }

  return result;
}

function translateIndexLine(idx, colMap, sigs) {
  const t = idx.trim();
  const fm = t.match(/@@(?:index|unique|id)\(\[([^\]]+)\]/);
  if (!fm) return null;
  const entries = fm[1].split(',').map(f => f.trim());
  const translated = [];
  for (const e of entries) {
    const m = e.match(/^(\w+)(.*)/);
    if (!m) return null;
    const pn = colMap[m[1].toLowerCase()];
    if (!pn) return null;
    translated.push(pn + m[2]);
  }
  const type = t.startsWith('@@id') ? 'id' : t.startsWith('@@unique') ? 'unique' : 'index';
  const sig = `${type}:${translated.map(x => x.replace(/\(.*\)/, '')).join(',')}`;
  if (sigs.has(sig)) return null;
  sigs.add(sig);
  const mm = t.match(/map:\s*"([^"]+)"/);
  return `@@${type}([${translated.join(', ')}]${mm ? `, map: "${mm[1]}"` : ''})`;
}

function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     🔄 Perfectionist Schema Merger v7 (FINAL)            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const dev = parseSchema(fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf-8'));
  const prod = parseSchema(fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prod-pulled.prisma'), 'utf-8'));

  console.log(`📖 DEV: ${Object.keys(dev.models).length} models, ${Object.keys(dev.enums).length} enums`);
  console.log(`   PROD: ${Object.keys(prod.models).length} models, ${Object.keys(prod.enums).length} enums`);

  const devTM = buildTableMap(dev.models), prodTM = buildTableMap(prod.models);
  const prodToDevName = {};
  const allTables = new Set([...Object.keys(devTM), ...Object.keys(prodTM)]);
  for (const t of allTables) { const d = devTM[t], p = prodTM[t]; if (d && p) prodToDevName[p] = d; }

  const allFinalModels = new Set();
  for (const t of allTables) allFinalModels.add(devTM[t] || prodTM[t]);
  const allEnumNames = new Set([...Object.keys(dev.enums), ...Object.keys(prod.enums)]);

  console.log(`   🔗 ${Object.keys(prodToDevName).filter(k => k !== prodToDevName[k]).length} model name translations\n`);

  const legacy = [], core = [], newOnly = [];
  const allRescued = [];
  let skippedFields = 0, skippedIdx = 0;

  for (const tableName of allTables) {
    const devName = devTM[tableName], prodName = prodTM[tableName];

    if (devName && prodName) {
      const devModel = dev.models[devName], prodModel = prod.models[prodName];

      // Column map: dbCol/fieldName → prismaField
      const colMap = {};
      devModel.fields.forEach(f => { colMap[f.dbColumn] = f.name; colMap[f.name.toLowerCase()] = f.name; });

      // Sets for dedup
      const devCols = new Set(devModel.fields.map(f => f.dbColumn));
      const devFieldNames = new Set(devModel.fields.map(f => f.name));
      // Track which FK columns are already used in relations (both DB and Prisma names)
      const devRelFKCols = new Set();
      devModel.fields.filter(f => f.isRelation).forEach(f => {
        const fkMatch = f.raw.match(/fields:\s*\[([^\]]+)\]/);
        if (fkMatch) {
          fkMatch[1].split(',').map(x => x.trim()).forEach(c => {
            devRelFKCols.add(c);                   // Prisma name: clientId
            devRelFKCols.add(c.toLowerCase());     // lowercase: clientid
            // Also add the DB column name via reverse lookup
            const dbName = Object.entries(colMap).find(([k, v]) => v === c);
            if (dbName) devRelFKCols.add(dbName[0]); // DB name: client_id
          });
        }
      });

      const missingLines = [];

      prodModel.fields.forEach(f => {
        // Skip if field name already exists in DEV
        if (devFieldNames.has(f.name)) return;
        // Skip if db column already exists in DEV (data field)
        if (!f.isRelation && !f.isModelRef && devCols.has(f.dbColumn)) return;

        // For relations: skip if the FK column is already used in a DEV relation
        if (f.isRelation) {
          const fkMatch = f.raw.match(/fields:\s*\[([^\]]+)\]/);
          if (fkMatch) {
            const fkCols = fkMatch[1].split(',').map(x => x.trim().toLowerCase());
            if (fkCols.every(c => devRelFKCols.has(c) || devCols.has(colMap[c] ? colMap[c].toLowerCase() : c))) {
              // FK column already used — this is a duplicate relation, skip
              return;
            }
          }
        }

        // For model references (ModelType[], ModelType?, or @relation back-refs):
        // check if DEV already has a field pointing to the same target model
        if (f.isModelRef) {
          // For @relation fields: only dedup back-refs (no fields:[...])
          // Forward relations with fields:[...] are handled by FK dedup above
          const hasFK = f.isRelation && f.raw.match(/fields:\s*\[/);
          if (!hasFK) {
            const targetModel = prodToDevName[f.bareType] || f.bareType;
            const alreadyHasRef = devModel.fields.some(df => {
              if (!df.isModelRef) return false;
              return df.bareType === targetModel;
            });
            if (alreadyHasRef) return;
          }
        }

        // Translate the field line
        const translated = rebuildFieldLine(f.raw, colMap, prodToDevName, allFinalModels, allEnumNames);
        if (!translated) { skippedFields++; return; }

        let line = translated;

        // Make data fields optional if needed
        if (!f.isRelation && !f.isModelRef) {
          const tParts = line.split(/\s+/);
          if (tParts.length >= 2 && !tParts[1].includes('?') && !tParts[1].includes('[]') &&
              !line.includes('@default') && !line.includes('@id')) {
            line = line.replace(tParts[1], tParts[1] + '?');
          }
          // Add to column map
          colMap[f.dbColumn] = f.name;
          colMap[f.name.toLowerCase()] = f.name;
        }

        missingLines.push('  ' + line);
        allRescued.push({
          table: devModel.tableName, devModel: devModel.name,
          column: f.isRelation || f.isModelRef ? `[relation] ${f.name}` : f.dbColumn,
          field: f.name, type: f.type
        });
      });

      // Indexes
      const sigs = new Set();
      devModel.indexes.forEach(idx => {
        const m = idx.match(/@@(?:index|unique|id)\(\[([^\]]+)\]/);
        if (m) {
          const type = idx.startsWith('@@id') ? 'id' : idx.startsWith('@@unique') ? 'unique' : 'index';
          sigs.add(`${type}:${m[1].split(',').map(f => f.trim().replace(/\(.*\)/, '')).join(',')}`);
        }
      });
      const idxLines = [];
      prodModel.indexes.forEach(idx => {
        if (idx.includes('@@map')) return;
        const t = translateIndexLine(idx, colMap, sigs);
        if (t) idxLines.push('  ' + t); else skippedIdx++;
      });

      // Merge body
      let mb = [...devModel.bodyLines];
      if (missingLines.length > 0 || idxLines.length > 0) {
        let ins = mb.findIndex(l => l.trim().startsWith('@@'));
        if (ins < 0) ins = mb.length;
        const adds = [];
        if (missingLines.length > 0) adds.push('', '  // ──── Rescued from Production ────', ...missingLines);
        if (idxLines.length > 0) adds.push('', '  // ──── Indexes from Production (translated) ────', ...idxLines);
        mb.splice(ins, 0, ...adds);
      }
      core.push({ ...devModel, bodyLines: mb });

    } else if (prodName) {
      const prodModel = prod.models[prodName];
      const cleanedBody = prodModel.bodyLines.filter(line => {
        const t = line.trim();
        if (!t || t.startsWith('//') || t.startsWith('@@')) return true;
        const parts = t.split(/\s+/);
        if (parts.length < 2) return true;
        const bareType = parts[1].replace(/[?\[\]]/g, '');
        const builtins = ['String','Int','Float','Boolean','DateTime','Json','BigInt','Decimal','Bytes'];
        if (builtins.includes(bareType) || bareType.startsWith('Unsupported') || allEnumNames.has(bareType)) return true;
        const finalType = prodToDevName[bareType] || bareType;
        return allFinalModels.has(finalType);
      }).map(line => {
        const t = line.trim();
        if (!t || t.startsWith('//') || t.startsWith('@@')) return line;
        const parts = t.split(/\s+/);
        if (parts.length < 2) return line;
        const bareType = parts[1].replace(/[?\[\]]/g, '');
        const builtins = ['String','Int','Float','Boolean','DateTime','Json','BigInt','Decimal','Bytes'];
        if (builtins.includes(bareType) || bareType.startsWith('Unsupported') || allEnumNames.has(bareType)) return line;

        const finalType = prodToDevName[bareType] || bareType;
        if (bareType === finalType) return line;

        // Replace type at position [1] specifically
        const indent = line.match(/^(\s*)/)[1];
        const rebuilt = rebuildFieldLine(t, {}, prodToDevName, allFinalModels, allEnumNames);
        return rebuilt ? indent + rebuilt : line;
      });
      legacy.push({ ...prodModel, bodyLines: cleanedBody });

    } else {
      newOnly.push({ ...dev.models[devName] });
    }
  }

  console.log(`📊 Results:`);
  console.log(`   📦 LEGACY: ${legacy.length} | 🔄 CORE: ${core.length} | 🆕 NEW: ${newOnly.length}`);
  console.log(`   📊 Total: ${legacy.length + core.length + newOnly.length}`);
  console.log(`   🔥 Rescued: ${allRescued.length} | ⏭️ Skipped: ${skippedFields} fields, ${skippedIdx} indexes`);

  // Enums
  const finalEnums = {};
  for (const name of allEnumNames) {
    const de = dev.enums[name], pe = prod.enums[name];
    finalEnums[name] = de && pe ? { ...de, values: [...new Set([...de.values, ...pe.values])] } : (de || pe);
  }
  console.log(`   🏷️ Enums: ${Object.keys(finalEnums).length}`);

  // Sanity
  console.log('\n🔍 Sanity Check...');
  const all = [...core, ...legacy, ...newOnly];
  const mN = new Set(all.map(m => m.name));
  console.log(mN.size === all.length ? `   ✅ No duplicate models (${all.length})` : '   ❌ Duplicates!');

  let brokenRels = 0;
  const builtins = ['String','Int','Float','Boolean','DateTime','Json','BigInt','Decimal','Bytes'];
  all.forEach(m => {
    m.bodyLines.forEach(bl => {
      const t = bl.trim();
      if (!t || t.startsWith('//') || t.startsWith('@@')) return;
      const parts = t.split(/\s+/);
      if (parts.length < 2) return;
      const bareType = parts[1].replace(/[?\[\]]/g, '');
      if (builtins.includes(bareType) || bareType.startsWith('Unsupported') || allEnumNames.has(bareType)) return;
      if (!mN.has(bareType)) brokenRels++;
    });
  });
  console.log(brokenRels === 0 ? '   ✅ No broken relations' : `   ⚠️ ${brokenRels} broken relations`);

  // Write
  console.log('\n💾 Writing...');
  const out = [];
  out.push('// ═══════════════════════════════════════════════════════════════════');
  out.push('// schema.final.prisma — MERGED SCHEMA (Production + DEV)');
  out.push(`// Generated: ${new Date().toISOString()}`);
  out.push(`// Models: ${all.length} | Enums: ${Object.keys(finalEnums).length}`);
  out.push(`// LEGACY: ${legacy.length} | CORE: ${core.length} | NEW: ${newOnly.length}`);
  out.push('// ═══════════════════════════════════════════════════════════════════');
  out.push('', dev.header.join('\n\n'), '');

  const se = Object.values(finalEnums).sort((a, b) => a.name.localeCompare(b.name));
  if (se.length > 0) {
    out.push('// ─── ENUMS ───────────────────────────────────────────────────────', '');
    se.forEach(e => {
      if (e.comments.length > 0) out.push(e.comments.join('\n'));
      out.push(`enum ${e.name} {`); e.values.forEach(v => out.push(`  ${v}`)); out.push('}', '');
    });
  }

  const wm = m => {
    if (m.comments.length > 0) out.push(m.comments.join('\n'));
    out.push(`model ${m.name} {`); m.bodyLines.forEach(l => out.push(l)); out.push('}', '');
  };

  out.push('// ═══════════════════════════════════════════════════════════════════',
    `// CORE MODELS (${core.length})`, '// ═══════════════════════════════════════════════════════════════════', '');
  core.sort((a, b) => a.name.localeCompare(b.name)).forEach(wm);

  if (newOnly.length > 0) {
    out.push('// ═══════════════════════════════════════════════════════════════════',
      `// NEW MODELS (${newOnly.length})`, '// ═══════════════════════════════════════════════════════════════════', '');
    newOnly.sort((a, b) => a.name.localeCompare(b.name)).forEach(wm);
  }

  out.push('// ═══════════════════════════════════════════════════════════════════',
    `// LEGACY MODELS (${legacy.length})`, '// ═══════════════════════════════════════════════════════════════════', '');
  legacy.sort((a, b) => a.name.localeCompare(b.name)).forEach(wm);

  const content = out.join('\n');
  fs.writeFileSync(path.join(__dirname, '..', 'prisma', 'schema.final.prisma'), content);
  console.log(`   ✅ prisma/schema.final.prisma (${content.split('\n').length} lines)`);

  // Audit
  const a = ['# 📋 Schema Merge Audit Log (v7 FINAL)', '',
    `**Generated:** ${new Date().toISOString()}`, '',
    '## Summary', '', '| Metric | Value |', '|--------|-------|',
    `| LEGACY | ${legacy.length} |`, `| CORE | ${core.length} |`, `| NEW | ${newOnly.length} |`,
    `| **Total** | **${all.length}** |`, `| Enums | ${Object.keys(finalEnums).length} |`,
    `| Rescued | ${allRescued.length} |`, `| Skipped fields | ${skippedFields} |`,
    `| Skipped indexes | ${skippedIdx} |`, `| Broken relations | ${brokenRels} |`, ''];

  if (allRescued.length > 0) {
    a.push('## 🔥 Rescued Columns', '', '| Table | DEV Model | Column | Field | Type |', '|-------|-----------|--------|-------|------|');
    allRescued.forEach(r => a.push(`| \`${r.table}\` | \`${r.devModel}\` | \`${r.column}\` | \`${r.field}\` | \`${r.type}\` |`));
    a.push('');
  }

  a.push('## 🔗 Model Name Translations', '', '| Prod | → DEV |', '|------|-------|');
  Object.entries(prodToDevName).sort().filter(([p, d]) => p !== d).forEach(([p, d]) => a.push(`| \`${p}\` | \`${d}\` |`));
  a.push('');

  a.push('## 🔄 CORE', '');
  core.sort((x, y) => x.name.localeCompare(y.name)).forEach(m => {
    const r = allRescued.filter(x => x.devModel === m.name);
    a.push(`- \`${m.name}\`${r.length > 0 ? ` ⚠️ ${r.length} rescued` : ' ✅'}`);
  });
  a.push('', '## 📦 LEGACY', '');
  legacy.sort((x, y) => x.name.localeCompare(y.name)).forEach(m => a.push(`- \`${m.name}\``));
  a.push('');
  if (newOnly.length > 0) {
    a.push('## 🆕 NEW', '');
    newOnly.sort((x, y) => x.name.localeCompare(y.name)).forEach(m => a.push(`- \`${m.name}\``));
    a.push('');
  }
  a.push('## 🔜 Next Steps', '',
    '1. `npx prisma validate --schema=prisma/schema.final.prisma`',
    '2. Review rescued columns', '3. `copy prisma\\schema.final.prisma prisma\\schema.prisma`',
    '4. `npx prisma generate`');

  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'SCHEMA_MERGE_AUDIT_LOG.md'), a.join('\n'));
  console.log('   ✅ docs/SCHEMA_MERGE_AUDIT_LOG.md');

  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  ✅ Merge v7 complete! ${all.length} models, ${Object.keys(finalEnums).length} enums, ${allRescued.length} rescued  ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
}

main();
