const { PrismaClient } = require('@prisma/client');

async function main() {
  const p = new PrismaClient({
    datasources: { db: { url: process.env.DIRECT_URL } }
  });

  try {
    // Get all tables
    const tables = await p.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`Checking ${tables.length} tables for duplicate columns...\n`);

    for (const table of tables) {
      const tableName = table.table_name;
      
      // Get column counts
      const columns = await p.$queryRawUnsafe(`
        SELECT column_name, COUNT(*) as count
        FROM information_schema.columns 
        WHERE table_name = $1
        GROUP BY column_name
        HAVING COUNT(*) > 1
      `, tableName);

      if (columns.length > 0) {
        console.log(`❌ ${tableName} - HAS DUPLICATES:`);
        columns.forEach(col => {
          console.log(`   - ${col.column_name} (${col.count} times)`);
        });
        console.log('');
      }
    }

    console.log('✅ Check complete');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await p.$disconnect();
  }
}

main();
