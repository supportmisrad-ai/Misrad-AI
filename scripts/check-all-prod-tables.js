const { createClient } = require('@supabase/supabase-js');

async function checkAllProdTables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jlgoeqhlkxyhlfnijyxu.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  // Get ALL tables from information_schema
  const { data: tables, error: tablesError } = await supabase
    .rpc('get_table_info', { schema_name: 'public' });
    
  if (tablesError) {
    // Fallback to manual query
    const { data: fallback } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .order('tablename');
    
    if (fallback) {
      await checkTablesList(fallback.map(t => t.tablename));
    }
    return;
  }
  
  await checkTablesList(tables.map(t => t.table_name));
}

async function checkTablesList(tableNames) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jlgoeqhlkxyhlfnijyxu.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('🔍 Checking ALL PROD Database Tables:\n');
  
  const missing = [];
  const existing = [];
  const tableCounts = {};
  
  for (const table of tableNames) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ERROR - ${error.message}`);
        missing.push(table);
      } else {
        console.log(`✅ ${table}: EXISTS (${count || 0} rows)`);
        existing.push(table);
        tableCounts[table] = count || 0;
      }
    } catch (err) {
      console.log(`❌ ${table}: NOT EXISTS`);
      missing.push(table);
    }
  }
  
  console.log('\n📊 SUMMARY:');
  console.log(`Total tables checked: ${tableNames.length}`);
  console.log(`✅ Existing: ${existing.length}`);
  console.log(`❌ Missing: ${missing.length}`);
  
  // Show tables with data
  const tablesWithData = existing.filter(t => tableCounts[t] > 0);
  if (tablesWithData.length > 0) {
    console.log('\n📋 Tables with data:');
    tablesWithData.forEach(t => {
      console.log(`  - ${t}: ${tableCounts[t]} rows`);
    });
  }
  
  // Show empty tables
  const emptyTables = existing.filter(t => tableCounts[t] === 0);
  if (emptyTables.length > 0) {
    console.log('\n📭 Empty tables (0 rows):');
    emptyTables.forEach(t => console.log(`  - ${t}`));
  }
  
  if (missing.length > 0) {
    console.log('\n❌ Missing tables:');
    missing.forEach(t => console.log(`  - ${t}`));
  }
  
  // Check migrations
  try {
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
  } catch (e) {
    console.log('\n⚠️ Could not check migrations');
  }
}

// Alternative approach using PostgreSQL system tables
async function checkAllTablesDirectly() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jlgoeqhlkxyhlfnijyxu.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  // Get all tables from pg_tables
  const { data: pgTables, error } = await supabase
    .from('pg_tables')
    .select('tablename, tableowner')
    .eq('schemaname', 'public')
    .order('tablename');
    
  if (error) {
    console.error('Failed to get tables:', error);
    return;
  }
  
  const tableNames = pgTables.map(t => t.tablename);
  await checkTablesList(tableNames);
}

checkAllTablesDirectly().catch(console.error);
