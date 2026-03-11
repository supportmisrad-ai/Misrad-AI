const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function addForeignKeys() {
  const envPath = path.join(__dirname, '..', '.env.prod_backup');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const dbUrlMatch = envContent.match(/^DATABASE_URL=(.+)$/m);
  
  process.env.DATABASE_URL = dbUrlMatch[1].trim().replace(/['"]/g, '');
  const prisma = new PrismaClient();
  
  console.log('Checking and adding foreign key constraints...\n');
  
  const constraints = [
    { name: 'client_cycles_organization_id_fkey', sql: `ALTER TABLE "client_cycles" ADD CONSTRAINT "client_cycles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE` },
    { name: 'cycle_clients_cycle_id_fkey', sql: `ALTER TABLE "cycle_clients" ADD CONSTRAINT "cycle_clients_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "client_cycles"("id") ON DELETE CASCADE` },
    { name: 'cycle_clients_client_id_fkey', sql: `ALTER TABLE "cycle_clients" ADD CONSTRAINT "cycle_clients_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE` },
    { name: 'cycle_tasks_cycle_id_fkey', sql: `ALTER TABLE "cycle_tasks" ADD CONSTRAINT "cycle_tasks_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "client_cycles"("id") ON DELETE CASCADE` },
    { name: 'cycle_task_completions_task_id_fkey', sql: `ALTER TABLE "cycle_task_completions" ADD CONSTRAINT "cycle_task_completions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "cycle_tasks"("id") ON DELETE CASCADE` },
    { name: 'cycle_task_completions_client_id_fkey', sql: `ALTER TABLE "cycle_task_completions" ADD CONSTRAINT "cycle_task_completions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE` },
    { name: 'cycle_assets_cycle_id_fkey', sql: `ALTER TABLE "cycle_assets" ADD CONSTRAINT "cycle_assets_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "client_cycles"("id") ON DELETE CASCADE` },
  ];
  
  for (const { name, sql } of constraints) {
    try {
      // Check if constraint exists
      const exists = await prisma.$queryRaw`
        SELECT 1 FROM pg_constraint WHERE conname = ${name}
      `;
      
      if (exists.length > 0) {
        console.log('⊘ Already exists:', name);
        continue;
      }
      
      // Add constraint
      await prisma.$executeRawUnsafe(sql);
      console.log('✓ FK added:', name);
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('⊘ Already exists:', name);
      } else {
        console.error('✗ Failed:', name, '-', e.message);
      }
    }
  }
  
  await prisma.$disconnect();
  console.log('\nDone!');
}

addForeignKeys();
