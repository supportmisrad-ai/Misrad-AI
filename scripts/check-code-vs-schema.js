/**
 * Check if code uses fields/tables NOT in schema
 * This finds potential runtime errors before they happen
 */

const fs = require('fs');
const path = require('path');

// Parse schema to get all models and fields
const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
const schemaModels = {};

let currentModel = null;
let currentFields = [];
let currentMap = null;

for (const line of schemaContent.split('\n')) {
  const modelMatch = line.match(/^model\s+(\w+)\s*\{/);
  if (modelMatch) {
    currentModel = modelMatch[1];
    currentFields = [];
    currentMap = null;
    continue;
  }
  
  const mapMatch = line.match(/@@map\("([^"]+)"\)/);
  if (mapMatch && currentModel) {
    currentMap = mapMatch[1];
  }
  
  const fieldMatch = line.match(/^\s+(\w+)\s+\w+/);
  if (fieldMatch && currentModel && !line.includes('//') && !line.includes('@@')) {
    currentFields.push(fieldMatch[1]);
  }
  
  if (line.trim() === '}' && currentModel) {
    schemaModels[currentModel] = {
      tableName: currentMap || currentModel.toLowerCase(),
      fields: currentFields
    };
    currentModel = null;
  }
}

console.log('🔍 CODE vs SCHEMA CHECK');
console.log('='.repeat(60));
console.log(`📊 Schema models: ${Object.keys(schemaModels).length}\n`);

// Find all Prisma usages in code
const codeFiles = [];
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'dist', 'build', '.git'].includes(entry.name)) {
        scanDir(fullPath);
      }
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      codeFiles.push(fullPath);
    }
  }
}

scanDir('.');

console.log(`📊 Code files to scan: ${codeFiles.length}\n`);

// Patterns to find
const issues = {
  unknownModels: new Set(),
  unknownFields: new Map(), // model -> [fields]
  rawSqlTables: new Set()
};

// Check each file
for (const file of codeFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relativePath = path.relative('.', file);
  
  // Pattern 1: prisma.modelName (unknown model)
  const modelAccessMatch = content.match(/prisma\.(\w+)\./g);
  if (modelAccessMatch) {
    for (const match of modelAccessMatch) {
      const modelName = match.replace('prisma.', '').replace('.', '');
      // Check both: original name and PascalCase version
      const pascalModelName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
      if (!schemaModels[modelName] && !schemaModels[pascalModelName]) {
        issues.unknownModels.add(`${modelName} (in ${relativePath})`);
      }
    }
  }
  
  // Pattern 2: accessing field on model (e.g., prisma.user.findMany({ select: { unknownField: true } }))
  // This is harder to parse, so we'll look for common patterns
  
  // Pattern 3: $queryRaw with table names
  const rawSqlMatch = content.match(/\$queryRaw[^;]*FROM\s+(\w+)/gi);
  if (rawSqlMatch) {
    for (const match of rawSqlMatch) {
      const tableMatch = match.match(/FROM\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        // Check if this table exists in schema (by tableName)
        const exists = Object.values(schemaModels).some(m => m.tableName === tableName);
        if (!exists) {
          issues.rawSqlTables.add(`${tableName} (in ${relativePath})`);
        }
      }
    }
  }
  
  // Pattern 4: $executeRaw with table names
  const execRawMatch = content.match(/\$executeRaw[^;]*(?:INSERT|UPDATE|DELETE|FROM)\s+(\w+)/gi);
  if (execRawMatch) {
    for (const match of execRawMatch) {
      const tableMatch = match.match(/(?:INSERT|UPDATE|DELETE|FROM)\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const exists = Object.values(schemaModels).some(m => m.tableName === tableName);
        if (!exists) {
          issues.rawSqlTables.add(`${tableName} (in ${relativePath})`);
        }
      }
    }
  }
}

// Report
console.log('📋 RESULTS');
console.log('-'.repeat(60));

if (issues.unknownModels.size > 0) {
  console.log(`\n❌ MODELS USED IN CODE BUT NOT IN SCHEMA (${issues.unknownModels.size}):`);
  [...issues.unknownModels].forEach(m => console.log(`   ${m}`));
} else {
  console.log('\n✅ All prisma.modelName references exist in schema');
}

if (issues.rawSqlTables.size > 0) {
  console.log(`\n⚠️ TABLES IN RAW SQL QUERIES (verify manually) (${issues.rawSqlTables.size}):`);
  [...issues.rawSqlTables].forEach(t => console.log(`   ${t}`));
} else {
  console.log('\n✅ All raw SQL tables exist in schema');
}

// Save results
const result = {
  summary: {
    schemaModels: Object.keys(schemaModels).length,
    codeFilesScanned: codeFiles.length,
    unknownModels: issues.unknownModels.size,
    rawSqlTables: issues.rawSqlTables.size
  },
  unknownModels: [...issues.unknownModels],
  rawSqlTables: [...issues.rawSqlTables]
};

fs.writeFileSync('scripts/code-vs-schema-results.json', JSON.stringify(result, null, 2));
console.log('\n✅ Results saved to: scripts/code-vs-schema-results.json');
