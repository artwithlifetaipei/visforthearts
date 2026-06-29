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
  console.log('Querying ticket_brands...');
  const { data: brands, error: err1 } = await supabase.from('ticket_brands').select('*');
  if (err1) {
    console.error('Error ticket_brands:', err1.message);
  } else {
    console.log('ticket_brands count:', brands.length);
  }

  console.log('Querying ticket_slots...');
  const { data: slots, error: err2 } = await supabase.from('ticket_slots').select('*');
  if (err2) {
    console.error('Error ticket_slots:', err2.message);
  } else {
    console.log('ticket_slots count:', slots.length);
  }
}

main();
