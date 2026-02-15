require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    // Get all triggers on organizations table
    const triggers = await prisma.$queryRawUnsafe(`
      SELECT trigger_name, event_manipulation, action_statement, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'organizations'
    `);
    console.log('Triggers on organizations table:');
    triggers.forEach(t => {
      console.log(`\n--- ${t.trigger_name} ---`);
      console.log(`Timing: ${t.action_timing} ${t.event_manipulation}`);
      console.log(`Action: ${t.action_statement}`);
    });

    // Get the trigger function definition
    const funcs = await prisma.$queryRawUnsafe(`
      SELECT p.proname, pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname LIKE '%trial%'
    `);
    console.log('\n\nTrigger functions:');
    funcs.forEach(f => {
      console.log(`\n=== ${f.proname} ===`);
      console.log(f.definition);
    });
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
