const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://jlgoeqhlkxyhlfnijyxu.supabase.co';
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY;

const CRITICAL_TABLES = [
  // Bot leads
  'bot_leads', 'bot_leads_extended', 'bot_conversations',
  'bot_media', 'bot_outgoing_messages', 'bot_survey_responses',
  // Core
  'organizations', 'social_users', 'users', 'clients',
  // Business
  'business_clients', 'business_client_contacts',
  // Client OS
  'client_clients', 'client_contacts',
  // Finance
  'invoices', 'payments', 'expenses',
  // Nexus
  'nexus_tasks', 'nexus_projects', 'nexus_time_entries',
  // Booking
  'booking_services', 'booking_appointments',
  // AI
  'ai_chats', 'ai_messages', 'ai_tower_usage',
  // Support
  'tickets', 'ticket_comments',
  // Email
  'email_templates', 'email_logs',
  // Attendance
  'attendance_records', 'attendance_time_entries',
  // Social
  'social_posts', 'social_accounts',
  // Other
  'notifications', 'subscriptions', 'plans',
  'campaigns', 'webhooks', 'api_keys',
  'documents', 'workflows', 'forms',
  'tags', 'activities', 'settings',
  'employees', 'departments', 'locations'
];

async function quickProdCheck() {
  const supabase = createClient(PROD_URL, PROD_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('🔍 PROD DB - Critical Tables Check\n');
  
  const existing = [];
  const missing = [];
  
  for (const table of CRITICAL_TABLES) {
    const { error } = await supabase.from(table).select('id', { head: true, count: 'exact' });
    if (error?.code === '42P01') {
      missing.push(table);
      console.log(`❌ ${table}`);
    } else if (!error) {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      existing.push(table);
      console.log(`✅ ${table} (${count || 0})`);
    } else {
      console.log(`⚠️ ${table}: ${error.code}`);
    }
  }
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`  ✅ ${existing.length} tables exist`);
  console.log(`  ❌ ${missing.length} tables MISSING`);
  
  if (missing.length > 0) {
    console.log(`\n❌ CRITICAL MISSING TABLES:`);
    missing.forEach(t => console.log(`  - ${t}`));
  }
  
  // Check migrations
  const { data: migrations } = await supabase
    .from('_prisma_migrations')
    .select('migration_name')
    .order('finished_at', { ascending: false })
    .limit(10);
    
  console.log(`\n📜 Last 5 migrations:`);
  migrations?.slice(0, 5).forEach(m => console.log(`  - ${m.migration_name}`));
}

quickProdCheck().catch(console.error);
