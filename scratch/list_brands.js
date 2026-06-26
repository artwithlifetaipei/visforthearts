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
  const adminEmail = 'artwithlifetaipei@gmail.com';
  const adminPassword = 'Kuo76443173';
  
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  const token = authData.session.access_token;
  
  const resBrand = await fetch(`${supabaseUrl}/rest/v1/exhibitor_brands?select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${token}`
    }
  });
  const brands = await resBrand.json();
  console.log('Current exhibitor_brands count:', brands.length);
  console.table(brands);
}

run();
