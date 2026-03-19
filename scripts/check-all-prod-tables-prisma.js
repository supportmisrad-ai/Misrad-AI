const { PrismaClient } = require('@prisma/client');

async function checkAllProdTables() {
  // Use DIRECT_URL for direct connection
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl) {
    console.error('Missing DIRECT_URL');
    process.exit(1);
  }
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  try {
    console.log('🔍 Connecting to PROD DB via DIRECT_URL...\n');
    
    // Get all tables from information_schema
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log(`Found ${tables.length} tables\n`);
    
    const existing = [];
    const missing = [];
    const tableCounts = {};
    
    // Check each table
    for (const { table_name } of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) as count FROM "${table_name}"`
        );
        
        const count = parseInt(result[0]?.count || '0');
        console.log(`✅ ${table_name}: EXISTS (${count} rows)`);
        existing.push(table_name);
        tableCounts[table_name] = count;
      } catch (err) {
        console.log(`❌ ${table_name}: ERROR - ${err.message}`);
        missing.push(table_name);
      }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`Total tables: ${tables.length}`);
    console.log(`✅ Accessible: ${existing.length}`);
    console.log(`❌ Inaccessible: ${missing.length}`);
    
    // Show tables with data
    const tablesWithData = existing.filter(t => tableCounts[t] > 0);
    if (tablesWithData.length > 0) {
      console.log('\n📋 Tables with data:');
      tablesWithData.forEach(t => {
        console.log(`  - ${t}: ${tableCounts[t]} rows`);
      });
    }
    
    // Show empty tables
    const emptyTables = existing.filter(t => tableCounts[t] === 0);
    if (emptyTables.length > 0) {
      console.log('\n📭 Empty tables (0 rows):');
      emptyTables.forEach(t => console.log(`  - ${t}`));
    }
    
    if (missing.length > 0) {
      console.log('\n❌ Inaccessible tables:');
      missing.forEach(t => console.log(`  - ${t}`));
    }
    
    // Check migrations
    try {
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at 
        FROM _prisma_migrations 
        ORDER BY finished_at DESC 
        LIMIT 5
      `;
      
      if (migrations.length > 0) {
        console.log('\n📜 Last 5 Migrations:');
        migrations.forEach(m => {
          console.log(`  - ${m.migration_name} (${m.finished_at})`);
        });
      }
    } catch (e) {
      console.log('\n⚠️ Could not check migrations');
    }
    
  } catch (error) {
    console.error('Connection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllProdTables().catch(console.error);
