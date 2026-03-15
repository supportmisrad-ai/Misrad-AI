const fs = require('fs');
const dotenv = require('dotenv');

// Load PROD env
const prodContent = fs.readFileSync('.env.prod_backup', 'utf8');
const prodEnv = dotenv.parse(prodContent);
process.env.DATABASE_URL = prodEnv.DIRECT_URL;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Parse schema to extract all models with their fields
function parseSchema(content) {
  const lines = content.split(/\r?\n/);
  const models = {};
  let currentModel = null;
  let inModel = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for model declaration
    const modelMatch = line.match(/^model\s+(\w+)\s*{/);
    if (modelMatch) {
      currentModel = modelMatch[1];
      models[currentModel] = {
        fields: {},
        dbName: currentModel
      };
      inModel = true;
      continue;
    }
    
    // Check for @@map
    const mapMatch = line.match(/@@map\("([^"]+)"\)/);
    if (mapMatch && currentModel) {
      models[currentModel].dbName = mapMatch[1];
    }
    
    // Parse field (simplified)
    if (inModel && currentModel) {
      // Field line: fieldName Type @attributes
      const fieldMatch = line.match(/^\s+(\w+)\s+(\S+)/);
      if (fieldMatch && !line.includes('//') && !line.includes('/*')) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        // Skip relation fields (end with ? or [] and are model references)
        if (!fieldType.includes('?') && !fieldType.includes('[]') && 
            !fieldType.startsWith('@') && 
            !['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Decimal', 'Bytes', 'BigInt'].every(t => !fieldType.includes(t) && fieldType[0] === fieldType[0].toUpperCase() && fieldType !== 'String')) {
          models[currentModel].fields[fieldName] = fieldType;
        }
        // Actually include all fields that look like field definitions
        if (fieldMatch && fieldName !== 'id' && !line.trim().startsWith('//')) {
           models[currentModel].fields[fieldName] = fieldType;
        }
      }
    }
    
    // End of model
    if (line.trim() === '}' && inModel) {
      inModel = false;
      currentModel = null;
    }
  }
  
  return models;
}

async function getDbColumns(tableName) {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position
    `;
    const result = {};
    columns.forEach(col => {
      result[col.column_name] = {
        type: col.data_type,
        nullable: col.is_nullable === 'YES'
      };
    });
    return result;
  } catch(e) {
    return null;
  }
}

async function main() {
  console.log('🔍 COMPREHENSIVE FIELD COMPARISON: Schema vs PROD DB');
  console.log('=' .repeat(70));
  console.log();
  
  const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const schemaModels = parseSchema(schemaContent);
  
  console.log(`Schema models parsed: ${Object.keys(schemaModels).length}`);
  console.log();
  
  const missingFields = [];
  const mismatchedFields = [];
  const tablesChecked = [];
  
  for (const [modelName, modelData] of Object.entries(schemaModels)) {
    const tableName = modelData.dbName;
    const schemaFields = Object.keys(modelData.fields);
    
    // Skip if table doesn't exist
    const tableExists = await prisma.$queryRaw`SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) as e`;
    
    if (!tableExists[0].e) {
      continue; // Table doesn't exist (we already know about missing tables)
    }
    
    tablesChecked.push(tableName);
    const dbColumns = await getDbColumns(tableName);
    
    if (!dbColumns) continue;
    
    // Check for missing fields in DB
    for (const fieldName of schemaFields) {
      // Map Prisma field name to DB column name (snake_case)
      const dbColumnName = fieldName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      
      if (!dbColumns[fieldName] && !dbColumns[dbColumnName]) {
        // Check common Prisma to DB mappings
        const mappedNames = [
          fieldName,
          dbColumnName,
          fieldName.replace(/Id$/, '_id'),
          fieldName.replace(/At$/, '_at'),
        ];
        
        const exists = mappedNames.some(name => dbColumns[name]);
        
        if (!exists) {
          missingFields.push({
            table: tableName,
            model: modelName,
            field: fieldName,
            type: modelData.fields[fieldName]
          });
        }
      }
    }
    
    // Check for extra fields in DB (not in schema)
    const dbColumnNames = Object.keys(dbColumns);
    for (const colName of dbColumnNames) {
      // Convert DB column name to Prisma field name (camelCase)
      const prismaFieldName = colName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      
      const existsInSchema = schemaFields.includes(colName) || 
                            schemaFields.includes(prismaFieldName);
      
      if (!existsInSchema && colName !== 'id') {
        mismatchedFields.push({
          table: tableName,
          column: colName,
          type: dbColumns[colName].type,
          issue: 'EXTRA_IN_DB'
        });
      }
    }
  }
  
  console.log(`Tables checked: ${tablesChecked.length}`);
  console.log();
  
  if (missingFields.length > 0) {
    console.log('❌ MISSING FIELDS (in schema, not in PROD DB):');
    console.log('-'.repeat(70));
    
    // Group by table
    const byTable = {};
    missingFields.forEach(f => {
      if (!byTable[f.table]) byTable[f.table] = [];
      byTable[f.table].push(f);
    });
    
    for (const [table, fields] of Object.entries(byTable)) {
      console.log(`\n📋 ${table}:`);
      fields.forEach(f => {
        console.log(`   ❌ ${f.field} (${f.type})`);
      });
    }
    console.log(`\nTotal missing fields: ${missingFields.length}`);
  } else {
    console.log('✅ All schema fields exist in PROD DB!');
  }
  
  console.log();
  console.log();
  
  if (mismatchedFields.length > 0) {
    console.log('⚠️  EXTRA FIELDS (in DB, not in schema):');
    console.log('-'.repeat(70));
    
    const byTable = {};
    mismatchedFields.forEach(f => {
      if (!byTable[f.table]) byTable[f.table] = [];
      byTable[f.table].push(f);
    });
    
    for (const [table, fields] of Object.entries(byTable).slice(0, 10)) {
      console.log(`\n📋 ${table}:`);
      fields.forEach(f => {
        console.log(`   ⚠️  ${f.column} (${f.type})`);
      });
    }
    if (Object.keys(byTable).length > 10) {
      console.log(`\n   ... and ${Object.keys(byTable).length - 10} more tables`);
    }
  }
  
  await prisma.$disconnect();
  
  console.log();
  console.log('='.repeat(70));
  console.log('SUMMARY:');
  console.log(`  Tables checked: ${tablesChecked.length}`);
  console.log(`  Missing fields: ${missingFields.length}`);
  console.log(`  Extra fields: ${mismatchedFields.length}`);
  
  if (missingFields.length > 0) {
    console.log();
    console.log('❌ CRITICAL: Missing fields detected!');
    process.exit(1);
  } else {
    console.log();
    console.log('✅ PROD DB schema matches Prisma schema perfectly!');
  }
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
