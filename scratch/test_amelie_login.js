const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  }
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1].trim().replace(/['"]/g, '');
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = 'amelie@theartpressasia.com';
  const passwords = [
    'vis2027exhibitor',
    'Kuo76443173',
    'amelie123',
    'password',
    '123456'
  ];

  console.log(`--- Testing login for ${email} ---`);
  
  for (const password of passwords) {
    console.log(`Trying password: "${password}"...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log(`-> Failed: ${error.message}`);
    } else {
      console.log('-> SUCCESS!', data.user.id);
      return;
    }
  }
}

run();
