const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Running SQL Peek...');
    const result = await prisma.$queryRawUnsafe('SELECT n.nspname AS schema_name, c.relname AS table_name, c.reltuples::bigint AS estimated_rows FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = \'public\' AND c.relkind = \'r\' ORDER BY c.reltuples DESC, c.relname ASC;');
    console.table(result);
    
    console.log('\nChecking for clients in various tables...');
    const tables = ['clients', 'social_clients', 'client_clients'];
    for (const table of tables) {
      try {
        const count = await prisma.$queryRawUnsafe('SELECT count(*) as count FROM "' + table + '"');
        console.log('Table ' + table + ': ' + count[0].count + ' rows');
      } catch (e) {
        console.log('Table ' + table + ' does not exist or error: ' + e.message.split('\n')[0]);
      }
    }
  } catch (e) {
    console.error('Error running peek:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
