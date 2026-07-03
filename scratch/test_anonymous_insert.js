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
// IMPORTANT: Use the ANON key to simulate front-end visitor
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const testEmail = `anon.test.${Date.now()}@example.com`;
  console.log(`Testing anonymous insert for: ${testEmail}`);
  
  const { data, error } = await supabase
    .from('vip_allowlist')
    .insert({
      email: testEmail,
      name: 'Anon Test User',
      status: 'Pending',
      tier: 'VIP',
      role: 'VIP',
      rsvp_status: 'Unconfirmed'
    })
    .select();

  if (error) {
    console.error('Anonymous insert failed!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Error Details:', error.details);
  } else {
    console.log('Anonymous insert succeeded!');
    console.log('Inserted Data:', data);
    
    // Cleanup the test record
    console.log('Cleaning up...');
    // We use service client to delete since anon shouldn't have delete rights
    const adminSupabase = createClient(supabaseUrl, env.NEXT_PUBLIC_SUPABASE_ANON_KEY); // Or direct SQL if we had service role
  }
}

main();
