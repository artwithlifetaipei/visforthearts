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

async function simulate(email) {
  console.log('--- Simulating VIP Login for:', email);
  
  const formattedEmail = email.toLowerCase().trim();
  
  console.log('Step 1: Checking vip_allowlist...');
  try {
    const { data: allowed, error: checkError } = await supabase
      .from('vip_allowlist')
      .select('email')
      .ilike('email', formattedEmail)
      .maybeSingle();

    if (checkError) {
      console.error('VIP Allowlist check error:', checkError.message);
      return;
    }
    
    console.log('Allowed check result:', allowed);
    if (!allowed) {
      console.log('Not allowed!');
      return;
    }

    console.log('Step 2: Sign Out (simulated)...');
    try {
      await supabase.auth.signOut();
      console.log('Sign Out complete!');
    } catch (e) {
      console.log('Sign Out threw error:', e.message);
    }

    console.log('Step 3: Sending Magic Link OTP...');
    const { data: otpData, error: otpError } = await supabase.auth.signInWithOtp({
      email: formattedEmail,
      options: {
        emailRedirectTo: 'https://www.visforthearts.com/vip/onboarding',
        shouldCreateUser: true
      }
    });

    if (otpError) {
      console.error('OTP Send error:', otpError.message);
    } else {
      console.log('OTP Send succeeded! Data:', otpData);
    }
  } catch (err) {
    console.error('Catch-all error:', err.message);
  }
}

simulate('visvipteam@gmail.com');
