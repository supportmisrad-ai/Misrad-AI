const { PrismaClient, Prisma } = require('@prisma/client');

if (process.env.NODE_ENV === 'production') {
  console.error('This script is dev-only and must not run in production.');
  process.exit(1);
}

const prisma = new PrismaClient();

function quotePgIdentifier(identifier) {
  const s = String(identifier);
  if (!/^[a-z_][a-z0-9_]*$/i.test(s)) {
    throw new Error(`Invalid SQL identifier: ${s}`);
  }
  return `"${s.replace(/"/g, '""')}"`;
}

async function main() {
  try {
    console.log('Running SQL Peek...');
    const result = await prisma.$queryRaw(
      Prisma.sql`SELECT n.nspname AS schema_name, c.relname AS table_name, c.reltuples::bigint AS estimated_rows FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.reltuples DESC, c.relname ASC;`
    );
    console.table(result);
    
    console.log('\nChecking for clients in various tables...');
    const tables = ['clients', 'social_clients', 'client_clients'];
    for (const table of tables) {
      try {
        const quoted = quotePgIdentifier(table);
        const count = await prisma.$queryRaw(
          Prisma.sql`SELECT count(*) as count FROM ${Prisma.raw(quoted)}`
        );
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
