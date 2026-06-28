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
  console.log('Sending signInWithOtp with production redirect URL:');
  const { data, error } = await supabase.auth.signInWithOtp({
    email: 'visvipteam@gmail.com',
    options: {
      emailRedirectTo: 'https://www.visforthearts.com/vip/onboarding',
      shouldCreateUser: true
    }
  });

  if (error) {
    console.error('OTP send failed with production URL:', error.message, 'Status:', error.status);
  } else {
    console.log('OTP send succeeded with production URL! Data:', data);
  }
}

main();
