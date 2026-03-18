const { createClient } = require('@supabase/supabase-js');

async function checkBotTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  // Check if tables exist
  const tables = ['bot_leads_extended', 'bot_conversations', 'bot_leads'];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ Table ${table}: ${error.message}`);
    } else {
      console.log(`✅ Table ${table} exists`);
    }
  }
  
  // Check bot_leads_extended count
  const { count, error: countError } = await supabase
    .from('bot_leads_extended')
    .select('*', { count: 'exact', head: true });
  
  if (!countError) {
    console.log(`\n📊 bot_leads_extended count: ${count}`);
  }
}

checkBotTables().catch(console.error);
