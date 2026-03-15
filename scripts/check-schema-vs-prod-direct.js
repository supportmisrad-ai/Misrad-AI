/**
 * Direct Schema vs PROD DB Check
 * Finds missing tables and columns that will cause runtime errors
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Load PROD env
const prodContent = fs.readFileSync('.env.prod_backup', 'utf8');
const lines = prodContent.split(/\r?\n/);
const directUrlLine = lines.find(l => l.startsWith('DIRECT_URL='));
const DATABASE_URL = directUrlLine ? directUrlLine.split('=')[1].trim().replace(/"/g, '') : null;

if (!DATABASE_URL) {
  console.error('❌ DIRECT_URL not found in .env.prod_backup');
  process.exit(1);
}

console.log('🔍 SCHEMA vs PROD DB - DIRECT CHECK');
console.log('='.repeat(60));
console.log();

// Get all tables from PROD DB
const getTablesSQL = `
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name;
`;

const tablesResult = execSync(
  `npx prisma db execute --stdin --url "${DATABASE_URL}"`,
  { input: getTablesSQL, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
);

const prodTables = tablesResult
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.includes('table_name') && !l.startsWith('('))
  .sort();

console.log(`📊 PROD DB tables: ${prodTables.length}`);
console.log();

// Get all columns for each table
const tableColumns = {};
for (const table of prodTables) {
  const getColumnsSQL = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = '${table}'
    ORDER BY column_name;
  `;
  
  try {
    const colsResult = execSync(
      `npx prisma db execute --stdin --url "${DATABASE_URL}"`,
      { input: getColumnsSQL, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    tableColumns[table] = colsResult
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.includes('column_name') && !l.startsWith('('))
      .sort();
  } catch (e) {
    console.log(`⚠️ Error checking columns for ${table}`);
  }
}

// Parse schema.prisma for models and their @@map
const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
const schemaModels = {};

let currentModel = null;
let currentFields = [];
let currentMap = null;

for (const line of schemaContent.split('\n')) {
  // Model start
  const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
  if (modelMatch) {
    currentModel = modelMatch[1];
    currentFields = [];
    currentMap = null;
    continue;
  }
  
  // @@map
  const mapMatch = line.match(/@@map\("([^"]+)"\)/);
  if (mapMatch && currentModel) {
    currentMap = mapMatch[1];
  }
  
  // Field line (simplified - captures field name)
  const fieldMatch = line.match(/^\s+(\w+)\s+\w+/);
  if (fieldMatch && currentModel && !line.includes('//') && !line.includes('@@')) {
    currentFields.push(fieldMatch[1]);
  }
  
  // Model end
  if (line.trim() === '}' && currentModel) {
    const tableName = currentMap || currentModel.toLowerCase();
    schemaModels[currentModel] = {
      tableName,
      fields: currentFields
    };
    currentModel = null;
  }
}

console.log(`📊 Schema models: ${Object.keys(schemaModels).length}`);
console.log();

// Compare and find gaps
const missingTables = [];
const missingColumns = [];

for (const [modelName, modelData] of Object.entries(schemaModels)) {
  const { tableName, fields } = modelData;
  
  // Check if table exists
  if (!prodTables.includes(tableName)) {
    missingTables.push({ model: modelName, table: tableName });
    continue;
  }
  
  // Check columns
  const prodCols = tableColumns[tableName] || [];
  const missingCols = fields.filter(f => !prodCols.includes(f));
  
  if (missingCols.length > 0) {
    missingColumns.push({ 
      model: modelName, 
      table: tableName, 
      missing: missingCols 
    });
  }
}

// Report
console.log('📋 RESULTS');
console.log('-'.repeat(60));

if (missingTables.length > 0) {
  console.log(`\n❌ MISSING TABLES IN PROD (${missingTables.length}):`);
  missingTables.forEach(({ model, table }) => {
    console.log(`   ${model} → ${table}`);
  });
} else {
  console.log('\n✅ All schema tables exist in PROD');
}

if (missingColumns.length > 0) {
  console.log(`\n❌ MISSING COLUMNS IN PROD:`);
  missingColumns.forEach(({ model, table, missing }) => {
    console.log(`   ${model}.${table}: ${missing.join(', ')}`);
  });
} else {
  console.log('\n✅ All schema columns exist in PROD');
}

// Save results
const result = {
  summary: {
    schemaModels: Object.keys(schemaModels).length,
    prodTables: prodTables.length,
    missingTables: missingTables.length,
    missingColumns: missingColumns.length
  },
  missingTables,
  missingColumns,
  prodTables,
  schemaModels
};

fs.writeFileSync('scripts/schema-vs-prod-results.json', JSON.stringify(result, null, 2));
console.log('\n✅ Results saved to: scripts/schema-vs-prod-results.json');
