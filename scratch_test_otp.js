const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 簡單解析 .env.local
const envPath = path.join(__dirname, '.env.local');
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

async function testOtp() {
  const email = 'visvipteam@gmail.com';
  console.log('Sending OTP to:', email);
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: 'https://visforthearts.com/vip/onboarding',
        shouldCreateUser: true
      }
    });
    console.log('Result data:', data);
    console.log('Result error:', error);
  } catch (err) {
    console.error('Caught exception:', err);
  }
}

testOtp();
