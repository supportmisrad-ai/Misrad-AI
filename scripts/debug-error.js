const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://jlgoeqhlkxyhlfnijyxu.supabase.co';
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function debugError() {
  const supabase = createClient(PROD_URL, PROD_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('🔍 DEBUGGING bot_leads_extended\n');
  
  // Try different approaches
  console.log('1. Trying select with explicit columns...');
  const { data: d1, error: e1 } = await supabase
    .from('bot_leads_extended')
    .select('id, phone, name');
  console.log('   Result:', e1 ? `ERROR: ${e1.code} - ${e1.message}` : `✅ Success, ${d1?.length || 0} rows`);
  
  console.log('\n2. Trying select count...');
  const { count, error: e2 } = await supabase
    .from('bot_leads_extended')
    .select('*', { count: 'exact', head: true });
  console.log('   Result:', e2 ? `ERROR: ${e2.code} - ${e2.message}` : `✅ Count: ${count}`);
  
  console.log('\n3. Trying raw SQL via rpc...');
  try {
    const { data: d3, error: e3 } = await supabase.rpc('exec_sql', {
      sql: 'SELECT COUNT(*) FROM bot_leads_extended'
    });
    console.log('   Result:', e3 ? `ERROR: ${e3.code} - ${e3.message}` : `✅ Count: ${d3}`);
  } catch (e) {
    console.log('   RPC not available:', e.message);
  }
  
  console.log('\n4. Checking if table exists in information_schema...');
  const { data: tables, error: e4 } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'bot_leads_extended');
  console.log('   Result:', e4 ? `ERROR: ${e4.message}` : `Found: ${tables?.length ? 'YES' : 'NO'}`);
  
  console.log('\n5. List ALL tables starting with bot_...');
  const { data: botTables, error: e5 } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .ilike('table_name', 'bot_%');
  console.log('   Result:', e5 ? `ERROR: ${e5.message}` : `Tables: ${botTables?.map(t => t.table_name).join(', ') || 'NONE'}`);
}

debugError().catch(console.error);
