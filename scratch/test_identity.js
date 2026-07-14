const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
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

async function test() {
  console.log('--- Testing identity_type field on users table ---');
  // Try to upsert a dummy record with identity_type
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: '00000000-0000-0000-0000-000000000000', // dummy uuid
      email: 'test@example.com',
      birthdate: '1990-01-01',
      identity_type: '資深收藏家'
    });

  console.log('Data:', data);
  console.log('Error:', error);
}

test();
