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
  console.log('--- Delete Test Brand "888" ---');
  
  // 1. Login as Admin
  const adminEmail = 'artwithlifetaipei@gmail.com';
  const adminPassword = 'Kuo76443173';
  
  console.log(`Logging in as Admin: ${adminEmail}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (authError) {
    console.error('Failed to log in as admin:', authError.message);
    return;
  }

  const token = authData.session.access_token;
  console.log('Logged in successfully!');

  // 2. Delete exhibitor_brands record where portal_email = 'artwithlifetaipei@gmail.com' and brand_name_zh = '888'
  console.log('Deleting from exhibitor_brands...');
  const resDelBrand = await fetch(`${supabaseUrl}/rest/v1/exhibitor_brands?portal_email=eq.artwithlifetaipei%40gmail.com&brand_name_zh=eq.888`, {
    method: 'DELETE',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (resDelBrand.ok) {
    console.log('Successfully deleted from exhibitor_brands.');
  } else {
    console.error('Failed to delete from exhibitor_brands:', await resDelBrand.text());
  }

  // 3. Delete exhibitor_applications record where contact_email = 'artwithlifetaipei@gmail.com' and brand_name_zh = '888'
  console.log('Deleting from exhibitor_applications...');
  const resDelApp = await fetch(`${supabaseUrl}/rest/v1/exhibitor_applications?contact_email=eq.artwithlifetaipei%40gmail.com&brand_name_zh=eq.888`, {
    method: 'DELETE',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${token}`
    }
  });

  if (resDelApp.ok) {
    console.log('Successfully deleted from exhibitor_applications.');
  } else {
    console.error('Failed to delete from exhibitor_applications:', await resDelApp.text());
  }

  console.log('Verification: checking if data is gone...');
  const resCheck = await fetch(`${supabaseUrl}/rest/v1/exhibitor_brands?select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${token}`
    }
  });
  const brands = await resCheck.json();
  console.log('Current brands count:', brands.length);
  console.table(brands);
}

run();
