/**
 * Comprehensive Schema Gap Analyzer
 * Compares codebase requirements against schema and PROD DB
 */

const fs = require('fs');
const dotenv = require('dotenv');

// Load scan results
const scanResults = JSON.parse(fs.readFileSync('scripts/codebase-scan-results.json', 'utf8'));

// Load PROD env
const prodContent = fs.readFileSync('.env.prod_backup', 'utf8');
const prodEnv = dotenv.parse(prodContent);
process.env.DATABASE_URL = prodEnv.DIRECT_URL;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Parse schema.prisma to extract all models
function parseSchema(schemaContent) {
  const models = {};
  const lines = schemaContent.split(/\r?\n/);
  let currentModel = null;
  
  for (const line of lines) {
    // Model declaration
    const modelMatch = line.match(/^model\s+(\w+)\s*{/);
    if (modelMatch) {
      currentModel = modelMatch[1];
      models[currentModel] = { fields: [], dbName: currentModel };
      continue;
    }
    
    // @@map for table name mapping
    const mapMatch = line.match(/@@map\("([^"]+)"\)/);
    if (mapMatch && currentModel) {
      models[currentModel].dbName = mapMatch[1];
    }
    
    // Field definition (simplified)
    if (currentModel && line.trim().startsWith('')) {
      const fieldMatch = line.match(/^\s+(\w+)\s+(\w+)/);
      if (fieldMatch && !line.includes('//')) {
        models[currentModel].fields.push(fieldMatch[1]);
      }
    }
    
    // End of model
    if (line.trim() === '}' && currentModel) {
      currentModel = null;
    }
  }
  
  return models;
}

async function checkTableExists(tableName) {
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${tableName}
      ) as e
    `;
    return result[0].e;
  } catch(e) {
    return false;
  }
}

async function checkColumnExists(tableName, columnName) {
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
        AND column_name = ${columnName}
      ) as e
    `;
    return result[0].e;
  } catch(e) {
    return false;
  }
}

function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

async function main() {
  console.log('🔍 COMPREHENSIVE SCHEMA GAP ANALYSIS');
  console.log('=' .repeat(70));
  console.log();
  
  // Parse schema
  const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const schemaModels = parseSchema(schemaContent);
  
  console.log(`📊 Codebase tables: ${scanResults.summary.totalTables}`);
  console.log(`📊 Schema models: ${Object.keys(schemaModels).length}`);
  console.log();
  
  // Categorize gaps
  const missingInSchema = []; // Tables in code but not in schema
  const missingInProd = [];   // Tables in schema but not in PROD
  const needsVerification = []; // Tables that exist but need field check
  
  // Check 1: Tables used in code vs schema
  for (const codeTable of scanResults.tables) {
    // Convert camelCase to PascalCase for schema comparison
    const pascalTable = codeTable.charAt(0).toUpperCase() + codeTable.slice(1);
    
    // Check if exists in schema (by model name or @@map)
    let inSchema = false;
    for (const [modelName, modelData] of Object.entries(schemaModels)) {
      if (modelName === pascalTable || modelData.dbName === codeTable) {
        inSchema = true;
        break;
      }
    }
    
    if (!inSchema) {
      missingInSchema.push(codeTable);
    } else {
      needsVerification.push(codeTable);
    }
  }
  
  // Check 2: Schema tables vs PROD DB
  console.log('🔍 Checking schema vs PROD DB...\n');
  
  for (const [modelName, modelData] of Object.entries(schemaModels)) {
    const exists = await checkTableExists(modelData.dbName);
    if (!exists) {
      missingInProd.push({ model: modelName, table: modelData.dbName });
    }
  }
  
  // Report findings
  console.log('📋 FINDINGS');
  console.log('-'.repeat(70));
  
  if (missingInSchema.length > 0) {
    console.log(`\n❌ TABLES IN CODE BUT MISSING FROM SCHEMA (${missingInSchema.length}):`);
    missingInSchema.forEach(t => console.log(`   - ${t}`));
  }
  
  if (missingInProd.length > 0) {
    console.log(`\n❌ TABLES IN SCHEMA BUT MISSING FROM PROD DB (${missingInProd.length}):`);
    missingInProd.forEach(({ model, table }) => console.log(`   - ${model} → ${table}`));
  }
  
  console.log(`\n✅ Tables needing field verification: ${needsVerification.length}`);
  
  // Save results
  const outputPath = 'scripts/schema-gap-analysis.json';
  fs.writeFileSync(outputPath, JSON.stringify({
    summary: {
      codeTables: scanResults.summary.totalTables,
      schemaModels: Object.keys(schemaModels).length,
      missingInSchema: missingInSchema.length,
      missingInProd: missingInProd.length
    },
    missingInSchema,
    missingInProd,
    needsFieldCheck: needsVerification
  }, null, 2));
  
  console.log(`\n✅ Analysis saved to: ${outputPath}`);
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
