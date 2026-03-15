const fs = require('fs');
const dotenv = require('dotenv');

// Load PROD env
const prodContent = fs.readFileSync('.env.prod_backup', 'utf8');
const prodEnv = dotenv.parse(prodContent);
process.env.DATABASE_URL = prodEnv.DIRECT_URL;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking schema vs PROD DB...\n');
  
  // Get all tables from PROD DB
  const dbTables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  const dbTableNames = dbTables.map(t => t.table_name);
  
  // Read schema and extract all models with @@map
  const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');
  const lines = schemaContent.split(/\r?\n/);
  
  const schemaTables = [];
  let currentModel = null;
  
  for (const line of lines) {
    // Check for model declaration
    const modelMatch = line.match(/model\s+(\w+)/);
    if (modelMatch) {
      currentModel = {
        model: modelMatch[1],
        table: modelMatch[1] // default
      };
    }
    
    // Check for @@map
    const mapMatch = line.match(/@@map\("([^"]+)"\)/);
    if (mapMatch && currentModel) {
      currentModel.table = mapMatch[1];
    }
    
    // End of model (closing brace)
    if (line.trim() === '}' && currentModel) {
      schemaTables.push(currentModel);
      currentModel = null;
    }
  }
  
  console.log(`Schema models: ${schemaTables.length}`);
  console.log(`DB tables: ${dbTableNames.length}\n`);
  
  // Find missing tables
  const missing = [];
  for (const { model, table } of schemaTables) {
    if (!dbTableNames.includes(table)) {
      missing.push({ model, table });
    }
  }
  
  // Find extra tables in DB (not in schema)
  const schemaTableNames = schemaTables.map(s => s.table);
  const extra = [];
  for (const table of dbTableNames) {
    if (!schemaTableNames.includes(table) && !table.startsWith('_')) {
      extra.push(table);
    }
  }
  
  if (missing.length > 0) {
    console.log('❌ TABLES IN SCHEMA BUT MISSING IN PROD DB:');
    missing.forEach(({ model, table }) => {
      console.log(`   - ${model} → ${table}`);
    });
    console.log(`\nTotal missing: ${missing.length}\n`);
  } else {
    console.log('✅ All schema tables exist in PROD DB\n');
  }
  
  if (extra.length > 0) {
    console.log('⚠️  TABLES IN DB BUT NOT IN SCHEMA (orphaned):');
    extra.slice(0, 20).forEach(t => console.log(`   - ${t}`));
    if (extra.length > 20) console.log(`   ... and ${extra.length - 20} more`);
  }
  
  await prisma.$disconnect();
  
  // Return missing count for CI
  process.exit(missing.length > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
