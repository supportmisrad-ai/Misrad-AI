const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function peek() {
  try {
    console.log('--- SQL PEEK ---');
    
    // 1. List all tables and estimated row counts
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables_info');
    
    // If RPC doesn't exist, try raw query via postgrest (limited) or just check specific tables
    const candidateTables = [
      'clients',
      'misrad_clients',
      'social_clients',
      'nexus_clients',
      'client_clients',
      'organizations',
    ];

    if (tablesError) {
      console.log('RPC get_tables_info not found, checking specific tables...');
      for (const table of candidateTables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
          console.log(
            `Table ${table}: Error or not found (${error.message})` +
              (error.code ? ` [code=${error.code}]` : '')
          );
        } else {
          console.log(`Table ${table}: ${count} rows${count == null ? ' (count header missing)' : ''}`);
        }
      }
    } else {
      console.table(tables);
    }

    // Samples
    for (const table of candidateTables) {
      console.log(`\n--- SAMPLE FROM ${table} ---`);
      const { data: sample, error } = await supabase.from(table).select('*').limit(3);
      if (error) {
        console.log(
          `Could not read from ${table} table (${error.message})` +
            (error.code ? ` [code=${error.code}]` : '')
        );
      } else {
        console.log(`Found ${sample.length} samples in ${table}:`);
        console.log(JSON.stringify(sample, null, 2));
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

peek();
