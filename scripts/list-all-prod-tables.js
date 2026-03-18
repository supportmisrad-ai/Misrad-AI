const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://jlgoeqhlkxyhlfnijyxu.supabase.co';
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getAllProdTables() {
  const supabase = createClient(PROD_URL, PROD_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  // Query PostgreSQL information_schema for all tables
  const { data: tables, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        t.table_name,
        (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `
  });
  
  if (error) {
    console.error('Error querying tables:', error);
    
    // Fallback: try querying _prisma_migrations to see what was applied
    const { data: migrations, error: migError } = await supabase
      .from('_prisma_migrations')
      .select('migration_name')
      .order('finished_at', { ascending: false });
      
    if (!migError) {
      console.log('\n📜 Last migrations in PROD:');
      migrations.slice(0, 20).forEach(m => console.log(`  - ${m.migration_name}`));
    }
    return;
  }
  
  console.log(`\n📊 PROD Database has ${tables.length} tables:\n`);
  tables.forEach(t => {
    console.log(`  - ${t.table_name} (${t.column_count} columns)`);
  });
  
  return tables.map(t => t.table_name);
}

getAllProdTables().catch(console.error);
