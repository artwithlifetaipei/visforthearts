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
  console.log('Testing Sign In for artwithlifetaipei@gmail.com with mock password:');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'artwithlifetaipei@gmail.com',
    password: 'wrongpassword' // We expect 'Invalid login credentials'
  });

  if (error) {
    console.log('Got Expected Error:', error.message, 'Status:', error.status);
  } else {
    console.log('Login Succeeded somehow? Session:', data.session ? 'Yes' : 'No');
  }

  console.log('\nTesting Sign Up for a random email:');
  const randEmail = `test_${Math.floor(Math.random() * 100000)}@test.com`;
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: randEmail,
    password: 'testpassword123'
  });

  if (signUpErr) {
    console.log('SignUp Error:', signUpErr.message, 'Status:', signUpErr.status);
  } else {
    console.log('SignUp Success! User:', signUpData.user?.email);
  }
}

main();
