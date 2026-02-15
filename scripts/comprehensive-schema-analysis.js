#!/usr/bin/env node
/**
 * ניתוח מקיף של הבדלי הסכימה בין Production למה שיש לנו
 * כולל זיהוי מודולים, relations, וטבלאות זבל
 */

const fs = require('fs');
const path = require('path');

// קריאת קובץ סכימה וחילוץ models
function extractModels(schemaContent) {
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/gs;
  const models = {};
  let match;
  
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    
    // חילוץ @@map
    const mapMatch = modelBody.match(/@@map\("([^"]+)"\)/);
    const tableName = mapMatch ? mapMatch[1] : modelName.toLowerCase();
    
    // חילוץ foreign keys (relations)
    const relations = [];
    const fkRegex = /@relation[^)]*fields:\s*\[([^\]]+)\]/g;
    let fkMatch;
    while ((fkMatch = fkRegex.exec(modelBody)) !== null) {
      relations.push(fkMatch[1].trim());
    }
    
    // חילוץ references
    const references = [];
    const refRegex = /(\w+)\s+(\w+)\??(?:\[\])?\s+@relation/g;
    let refMatch;
    while ((refMatch = refRegex.exec(modelBody)) !== null) {
      references.push(refMatch[1]); // שם המודל המקושר
    }
    
    models[modelName] = {
      tableName,
      relations,
      references: [...new Set(references)],
      body: modelBody
    };
  }
  
  return models;
}

// קיבוץ לפי prefixes (מודולים)
function groupByModule(models) {
  const modules = {
    'nexus': [],
    'socialmedia': [],
    'system': [],
    'client': [],
    'operations': [],
    'misrad': [],
    'finance': [],
    'core': [],
    'organization': [],
    'other': []
  };
  
  Object.keys(models).forEach(modelName => {
    const lower = modelName.toLowerCase();
    
    if (lower.startsWith('nexus')) modules.nexus.push(modelName);
    else if (lower.startsWith('socialmedia')) modules.socialmedia.push(modelName);
    else if (lower.startsWith('system')) modules.system.push(modelName);
    else if (lower.startsWith('client')) modules.client.push(modelName);
    else if (lower.startsWith('operations')) modules.operations.push(modelName);
    else if (lower.startsWith('misrad')) modules.misrad.push(modelName);
    else if (lower.startsWith('finance')) modules.finance.push(modelName);
    else if (lower.includes('organization') || lower.includes('org_')) modules.organization.push(modelName);
    else if (lower.startsWith('core') || lower.startsWith('global')) modules.core.push(modelName);
    else modules.other.push(modelName);
  });
  
  return modules;
}

// זיהוי טבלאות זבל
function identifyGarbageTables(models) {
  const garbage = [];
  const suspicious = [];
  
  Object.keys(models).forEach(modelName => {
    const lower = modelName.toLowerCase();
    const tableName = models[modelName].tableName.toLowerCase();
    
    // דפוסים של זבל מובהק
    if (
      lower.includes('_backup') ||
      lower.includes('_old') ||
      lower.includes('_temp') ||
      lower.includes('_test') ||
      lower.includes('_copy') ||
      lower.startsWith('tmp_') ||
      lower.startsWith('temp_') ||
      lower.startsWith('test_')
    ) {
      garbage.push({ model: modelName, reason: 'backup/temp/test table' });
    }
    // דפוסים חשודים
    else if (
      lower.includes('_migration') ||
      lower.includes('_archive') ||
      lower.includes('_deprecated')
    ) {
      suspicious.push({ model: modelName, reason: 'possibly deprecated' });
    }
  });
  
  return { garbage, suspicious };
}

// בדיקת קשר ל-organizations
function findOrganizationRelations(models) {
  const connected = [];
  const notConnected = [];
  
  Object.keys(models).forEach(modelName => {
    const model = models[modelName];
    const body = model.body.toLowerCase();
    
    const hasOrgRelation = 
      body.includes('organization_id') ||
      body.includes('organizationid') ||
      body.includes('org_id') ||
      model.references.some(ref => ref.toLowerCase().includes('organization'));
    
    if (hasOrgRelation) {
      connected.push(modelName);
    } else {
      notConnected.push(modelName);
    }
  });
  
  return { connected, notConnected };
}

console.log('🔍 ניתוח מקיף של הסכימה מ-Production\n');
console.log('='.repeat(80) + '\n');

try {
  const currentSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  const pulledSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.prod-pulled.prisma');

  console.log('📖 קורא קבצים...\n');
  const currentSchema = fs.readFileSync(currentSchemaPath, 'utf-8');
  const pulledSchema = fs.readFileSync(pulledSchemaPath, 'utf-8');

  const currentModels = extractModels(currentSchema);
  const pulledModels = extractModels(pulledSchema);

  console.log('📊 סטטיסטיקות בסיסיות:\n');
  console.log(`   ✅ Current schema:    ${Object.keys(currentModels).length} models`);
  console.log(`   🔍 Production DB:     ${Object.keys(pulledModels).length} models`);
  console.log(`   📈 הפרש:             ${Object.keys(pulledModels).length - Object.keys(currentModels).length} models\n`);
  
  // מציאת הבדלים
  const missingInCurrent = Object.keys(pulledModels).filter(m => !currentModels[m]);
  const extraInCurrent = Object.keys(currentModels).filter(m => !pulledModels[m]);
  
  console.log('='.repeat(80));
  console.log('\n⚠️  טבלאות שקיימות ב-PRODUCTION אבל חסרות בסכימה:\n');
  console.log(`   סה"כ: ${missingInCurrent.length} טבלאות\n`);

  // קיבוץ לפי מודולים
  const missingModels = {};
  missingInCurrent.forEach(m => missingModels[m] = pulledModels[m]);
  const missingByModule = groupByModule(missingModels);

  Object.keys(missingByModule).forEach(module => {
    if (missingByModule[module].length > 0) {
      console.log(`\n   📦 ${module.toUpperCase()} (${missingByModule[module].length} טבלאות):`);
      missingByModule[module].forEach(model => {
        const tableName = pulledModels[model].tableName;
        console.log(`      - ${model} → ${tableName}`);
      });
    }
  });

  // זיהוי זבל
  console.log('\n' + '='.repeat(80));
  console.log('\n🗑️  זיהוי טבלאות זבל:\n');
  
  const { garbage, suspicious } = identifyGarbageTables(missingModels);
  
  if (garbage.length > 0) {
    console.log(`   ❌ זבל מובהק (${garbage.length}):`);
    garbage.forEach(({ model, reason }) => {
      console.log(`      - ${model} (${reason})`);
    });
    console.log('');
  }
  
  if (suspicious.length > 0) {
    console.log(`   ⚠️  חשוד (${suspicious.length}):`);
    suspicious.forEach(({ model, reason }) => {
      console.log(`      - ${model} (${reason})`);
    });
    console.log('');
  }

  // ניתוח קשרים ל-organizations
  console.log('='.repeat(80));
  console.log('\n🔗 ניתוח קשרים ל-organizations:\n');
  
  const { connected, notConnected } = findOrganizationRelations(missingModels);
  
  console.log(`   ✅ מחוברות ל-organizations: ${connected.length} טבלאות`);
  console.log(`   ⚠️  לא מחוברות:              ${notConnected.length} טבלאות\n`);
  
  if (notConnected.length > 0 && notConnected.length <= 20) {
    console.log('   טבלאות ללא קשר ל-organizations (עשויות להיות global/system):');
    notConnected.forEach(model => {
      console.log(`      - ${model}`);
    });
    console.log('');
  }

  // דו"ח המלצות
  console.log('='.repeat(80));
  console.log('\n💡 המלצות:\n');
  
  const core = missingInCurrent.filter(m => !garbage.some(g => g.model === m) && connected.includes(m));
  const maybeGarbage = [...garbage.map(g => g.model), ...suspicious.map(s => s.model)];
  const global = notConnected.filter(m => !maybeGarbage.includes(m));
  
  console.log(`   🟢 CORE (חובה לשמור): ${core.length} טבלאות`);
  console.log(`      - מחוברות ל-organizations`);
  console.log(`      - לא זבל`);
  console.log(`      - חלק מליבת ה-CRM\n`);
  
  console.log(`   🟡 GLOBAL (לבדוק): ${global.length} טבלאות`);
  console.log(`      - אין קשר ישיר ל-organizations`);
  console.log(`      - יכול להיות system/global tables`);
  console.log(`      - צריך לבדוק שימוש בקוד\n`);
  
  console.log(`   🔴 GARBAGE (אפשר למחוק): ${maybeGarbage.length} טבלאות`);
  console.log(`      - backup/temp/test tables`);
  console.log(`      - deprecated tables\n`);

  // שמירה לקובץ
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      current_models: Object.keys(currentModels).length,
      production_models: Object.keys(pulledModels).length,
      missing_in_current: missingInCurrent.length,
      extra_in_current: extraInCurrent.length
    },
    missing_by_module: missingByModule,
    garbage_tables: garbage,
    suspicious_tables: suspicious,
    organization_connections: {
      connected: connected.length,
      not_connected: notConnected.length,
      not_connected_list: notConnected
    },
    recommendations: {
      core_tables: core,
      global_tables: global,
      garbage_tables: maybeGarbage
    }
  };

  const reportPath = path.join(__dirname, '..', 'docs', 'SCHEMA_ANALYSIS_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('='.repeat(80));
  console.log(`\n💾 דו"ח מלא נשמר: docs/SCHEMA_ANALYSIS_REPORT.json\n`);

} catch (error) {
  console.error('❌ שגיאה:', error.message);
  console.error(error.stack);
  process.exit(1);
}
