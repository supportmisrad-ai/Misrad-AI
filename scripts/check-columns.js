const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://jlgoeqhlkxyhlfnijyxu.supabase.co';
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY;

const CRITICAL_TABLES = [
  'bot_leads_extended',
  'bot_conversations',
  'bot_media',
  'bot_outgoing_messages',
  'bot_survey_responses',
  'organizations',
  'clients',
  'business_clients',
  'client_clients',
  'nexus_tasks',
  'booking_services',
  'notifications',
  'subscriptions'
];

async function checkColumns() {
  const supabase = createClient(PROD_URL, PROD_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('🔍 CHECKING TABLE COLUMNS\n');
  
  for (const table of CRITICAL_TABLES) {
    // Try to select a single row to see what columns exist
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.log(`❌ ${table}: TABLE DOES NOT EXIST`);
      } else if (error.code === '42501' || error.message?.includes('permission denied')) {
        console.log(`🔒 ${table}: PERMISSION DENIED (RLS/policy)`);
      } else {
        console.log(`⚠️  ${table}: ${error.code || error.message}`);
      }
    } else {
      // Get column names from the returned data
      const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
      if (columns.length > 0) {
        console.log(`✅ ${table}: ${columns.length} columns`);
        console.log(`   Columns: ${columns.slice(0, 10).join(', ')}${columns.length > 10 ? '...' : ''}`);
      } else {
        // Table exists but empty - try to get schema info
        const { data: allData } = await supabase.from(table).select('*').limit(0);
        console.log(`✅ ${table}: EXISTS (empty table)`);
      }
    }
  }
}

checkColumns().catch(console.error);
