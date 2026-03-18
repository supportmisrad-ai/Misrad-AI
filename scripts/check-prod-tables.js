const { createClient } = require('@supabase/supabase-js');

async function checkProdTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jlgoeqhlkxyhlfnijyxu.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  // Check all bot-related tables
  const tables = [
    'bot_leads',
    'bot_leads_extended', 
    'bot_conversations',
    'bot_conversations_extended',
    'bot_media',
    'bot_outgoing_messages',
    'bot_survey_responses',
    'bot_campaigns',
    'bot_lottery',
    'bot_referrals',
    'bot_coupons',
    'bot_affiliates',
    'bot_analytics',
    'bot_conversions'
  ];
  
  console.log('🔍 Checking PROD Database Tables:\n');
  
  const missing = [];
  const existing = [];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${table}: NOT EXISTS`);
      missing.push(table);
    } else {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      console.log(`✅ ${table}: EXISTS (${count || 0} rows)`);
      existing.push(table);
    }
  }
  
  console.log('\n📊 SUMMARY:');
  console.log(`Total tables checked: ${tables.length}`);
  console.log(`✅ Existing: ${existing.length}`);
  console.log(`❌ Missing: ${missing.length}`);
  
  if (missing.length > 0) {
    console.log('\n❌ Missing tables:');
    missing.forEach(t => console.log(`  - ${t}`));
  }
  
  // Check _prisma_migrations
  const { data: migrations, error: migError } = await supabase
    .from('_prisma_migrations')
    .select('migration_name, finished_at')
    .order('finished_at', { ascending: false })
    .limit(10);
    
  if (!migError && migrations) {
    console.log('\n📜 Last 5 Migrations:');
    migrations.slice(0, 5).forEach(m => {
      console.log(`  - ${m.migration_name} (${m.finished_at})`);
    });
  }
}

checkProdTables().catch(console.error);
