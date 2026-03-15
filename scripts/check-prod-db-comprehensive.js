const fs = require('fs');
const dotenv = require('dotenv');

// Load PROD env
const prodContent = fs.readFileSync('.env.prod_backup', 'utf8');
const prodEnv = dotenv.parse(prodContent);

// Set env for Prisma
process.env.DATABASE_URL = prodEnv.DIRECT_URL;

const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = new PrismaClient();

// Define expected tables by module
const modules = {
  'Core': ['organizations', 'organization_users', 'nexus_users', 'profiles'],
  'Nexus': ['nexus_tasks', 'nexus_time_entries', 'nexus_team_events', 'nexus_leave_requests', 'nexus_event_attendance', 'nexus_clients', 'nexus_tenants', 'nexus_employee_invitation_links', 'nexus_onboarding_settings'],
  'Client': ['client_clients', 'team_members', 'team_member_clients'],
  'Billing': ['billing_invoices', 'billing_invoice_items', 'subscriptions', 'subscription_items', 'subscription_orders', 'subscription_payment_configs'],
  'Attendance': ['attendance_time_entries', 'attendance_monthly_reports', 'attendance_salary_configs', 'time_entries'],
  'Operations': ['operations_projects', 'operations_work_orders', 'operations_work_order_types', 'operations_work_order_checkins', 'operations_locations', 'operations_departments', 'operations_buildings', 'operations_vehicles', 'operations_technician_vehicle_assignments', 'operations_suppliers', 'operations_purchase_orders', 'operations_purchase_order_items', 'operations_inventory', 'operations_items', 'operations_contractor_tokens', 'operations_call_categories', 'operations_call_messages'],
  'Social': ['socialmedia_posts', 'socialmedia_published_posts', 'socialmedia_clients', 'socialmedia_platform_credentials', 'socialmedia_calendar_events', 'socialmedia_campaigns', 'socialmedia_conversations', 'socialmedia_messages', 'socialmedia_ai_opportunities', 'socialmedia_automation_rules'],
  'System': ['system_settings', 'system_leads', 'system_tasks', 'system_forms', 'system_call_analyses', 'system_assets', 'system_campaigns', 'system_content_items', 'system_students', 'system_partners', 'system_field_agents', 'system_invoices', 'system_support_tickets', 'system_automations', 'system_backups', 'system_calendar_events', 'system_pipeline_stages'],
  'Communication': ['notifications', 'web_push_subscriptions', 'webhook_configs'],
  'Finance': ['financial_transactions', 'expense_categories', 'expenses'],
  'Admin': ['activity_logs', 'impersonation_sessions', 'impersonation_audit_logs', 'site_analytics_sessions', 'site_analytics_page_views', 'site_analytics_events']
};

async function checkTable(tableName) {
  try {
    const exists = await prisma.$queryRaw`SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) as exists`;
    
    if (!exists[0].exists) {
      return { exists: false, count: 0 };
    }
    
    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as c FROM "${tableName}"`);
    return { exists: true, count: count[0].c };
  } catch(e) {
    return { exists: false, count: 0, error: e.message };
  }
}

async function checkColumns(tableName) {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position
    `;
    return columns;
  } catch(e) {
    return [];
  }
}

async function main() {
  console.log('🔍 PROD DB COMPREHENSIVE CHECK');
  console.log('================================\n');
  
  try {
    // Test connection
    const result = await prisma.$queryRaw`SELECT current_database() as db, version() as ver`;
    console.log('✅ Connected to:', result[0].db);
    console.log('   PostgreSQL:', result[0].ver.split(' ')[0], result[0].ver.split(' ')[1]);
    console.log();
    
    const missingTables = [];
    const emptyTables = [];
    const allTables = [];
    
    for (const [module, tables] of Object.entries(modules)) {
      console.log(`\n📦 ${module} Module`);
      console.log('-'.repeat(40));
      
      for (const table of tables) {
        const status = await checkTable(table);
        allTables.push({ module, table, ...status });
        
        if (!status.exists) {
          console.log(`   ❌ ${table}: MISSING`);
          missingTables.push({ module, table });
        } else if (status.count === 0) {
          console.log(`   ⚠️  ${table}: empty (${status.count} rows)`);
          emptyTables.push({ module, table });
        } else {
          console.log(`   ✅ ${table}: ${status.count} rows`);
        }
      }
    }
    
    // Summary
    console.log('\n\n📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total tables checked: ${allTables.length}`);
    console.log(`Missing tables: ${missingTables.length}`);
    console.log(`Empty tables: ${emptyTables.length}`);
    
    if (missingTables.length > 0) {
      console.log('\n❌ MISSING TABLES:');
      missingTables.forEach(({ module, table }) => {
        console.log(`   - [${module}] ${table}`);
      });
    }
    
    if (emptyTables.length > 0) {
      console.log('\n⚠️  EMPTY TABLES (may need seed):');
      emptyTables.forEach(({ module, table }) => {
        console.log(`   - [${module}] ${table}`);
      });
    }
    
    // Check migrations
    console.log('\n\n🔄 MIGRATIONS STATUS');
    console.log('-'.repeat(40));
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      WHERE rolled_back_at IS NULL
      ORDER BY finished_at DESC 
      LIMIT 10
    `;
    console.log(`Last ${migrations.length} migrations applied:`);
    migrations.forEach(m => {
      console.log(`   - ${m.migration_name} (${new Date(m.finished_at).toLocaleDateString()})`);
    });
    
    await prisma.$disconnect();
    
    // Exit with error code if missing tables found
    if (missingTables.length > 0) {
      console.log('\n❌ CRITICAL: Missing tables detected!');
      process.exit(1);
    } else {
      console.log('\n✅ All required tables exist in PROD DB');
    }
    
  } catch(e) {
    console.log('\n❌ Error:', e.message);
    process.exit(1);
  }
}

main();
