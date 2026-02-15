#!/usr/bin/env node
/**
 * ניתוח הבדלים בין schema.prisma (נוכחי) ל-schema.prod-pulled.prisma (מה שבפועל ב-Production)
 */

const fs = require('fs');
const path = require('path');

function extractModels(schemaContent) {
  const modelRegex = /model\s+(\w+)\s*{[^}]*}/gs;
  const models = new Set();
  let match;
  
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    models.add(match[1]);
  }
  
  return models;
}

function extractTableMapping(schemaContent) {
  const modelRegex = /model\s+(\w+)\s*{[^}]*?@@map\("([^"]+)"\)[^}]*}/gs;
  const mapping = {};
  let match;
  
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    mapping[match[1]] = match[2]; // model name -> table name
  }
  
  return mapping;
}

console.log('🔍 ניתוח הבדלי סכימה: Production vs Current\n');
console.log('='.repeat(70) + '\n');

try {
  // קריאת הקבצים
  const currentSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  const pulledSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prod-pulled.prisma');

  const currentSchema = fs.readFileSync(currentSchemaPath, 'utf-8');
  const pulledSchema = fs.readFileSync(pulledSchemaPath, 'utf-8');

  // חילוץ models
  const currentModels = extractModels(currentSchema);
  const pulledModels = extractModels(pulledSchema);

  console.log('📊 סטטיסטיקות:\n');
  console.log(`   Current schema:  ${currentModels.size} models`);
  console.log(`   Production DB:   ${pulledModels.size} models`);
  console.log('');

  // מציאת הבדלים
  const missingInCurrent = [...pulledModels].filter(m => !currentModels.has(m));
  const extraInCurrent = [...currentModels].filter(m => !pulledModels.has(m));

  // חילוץ mappings
  const currentMapping = extractTableMapping(currentSchema);
  const pulledMapping = extractTableMapping(pulledSchema);

  console.log('⚠️  טבלאות שקיימות ב-PRODUCTION אבל חסרות בסכימה הנוכחית:\n');
  console.log(`   סה"כ: ${missingInCurrent.length} טבלאות\n`);

  if (missingInCurrent.length > 0) {
    // קיבוץ לפי prefixes (מודולים)
    const byModule = {};
    missingInCurrent.forEach(model => {
      const prefix = model.split('_')[0];
      if (!byModule[prefix]) byModule[prefix] = [];
      byModule[prefix].push(model);
    });

    Object.keys(byModule).sort().forEach(module => {
      console.log(`\n   📦 ${module.toUpperCase()} Module (${byModule[module].length} tables):`);
      byModule[module].forEach(model => {
        const tableName = pulledMapping[model] || model.toLowerCase();
        console.log(`      - ${model} (@map("${tableName}"))`);
      });
    });
    console.log('');
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ טבלאות שקיימות בסכימה הנוכחית אבל לא ב-Production:\n');
  console.log(`   סה"כ: ${extraInCurrent.length} טבלאות\n`);

  if (extraInCurrent.length > 0) {
    extraInCurrent.forEach(model => {
      const tableName = currentMapping[model] || model.toLowerCase();
      console.log(`   - ${model} (@map("${tableName}"))`);
    });
    console.log('');
  }

  // שמירת תוצאות לקובץ JSON
  const results = {
    timestamp: new Date().toISOString(),
    current_schema_models: currentModels.size,
    production_db_models: pulledModels.size,
    missing_in_current: missingInCurrent,
    extra_in_current: extraInCurrent,
    by_module: {}
  };

  // קיבוץ לפי מודולים
  missingInCurrent.forEach(model => {
    const prefix = model.split('_')[0];
    if (!results.by_module[prefix]) results.by_module[prefix] = [];
    results.by_module[prefix].push(model);
  });

  const outputPath = path.join(__dirname, '..', 'docs', 'SCHEMA_DIFF_REPORT.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 דו"ח מלא נשמר ב: docs/SCHEMA_DIFF_REPORT.json\n`);

  process.exit(0);

} catch (error) {
  console.error('❌ שגיאה:', error.message);
  process.exit(1);
}
