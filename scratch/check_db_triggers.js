const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('--- Checking for Tables, RLS, and Schema Info via RPC or public table inspection ---');
  
  // We can query information_schema or pg_trigger if Supabase allows reading pg_catalog tables via anon client
  // But usually RLS/permissions block reading system catalogs for anon users unless they are exposed in a RPC.
  // Let\'s try to run a query on `users` table to see if it\'s empty or what fields it has,
  // and check if we can write to it.
  
  const randId = '00000000-0000-0000-0000-000000000000';
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Failed to query public.users table:', error);
  } else {
    console.log('Query public.users successful! Samples:', data);
  }
}

main();
