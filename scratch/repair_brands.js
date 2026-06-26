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
  console.log('--- Repair Exhibitor Brands ---');
  
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

  // 2. Fetch all approved applications
  console.log('Fetching approved applications...');
  const resApp = await fetch(`${supabaseUrl}/rest/v1/exhibitor_applications?status=eq.approved`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${token}`
    }
  });
  const approvedApps = await resApp.json();
  console.log(`Found ${approvedApps.length} approved applications.`);

  // 3. Process each approved application
  for (const app of approvedApps) {
    const email = app.contact_email.toLowerCase().trim();
    console.log(`Checking brand for: ${email} (${app.brand_name_zh})...`);

    const resBrand = await fetch(`${supabaseUrl}/rest/v1/exhibitor_brands?portal_email=eq.${encodeURIComponent(email)}`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${token}`
      }
    });
    const brands = await resBrand.json();

    if (brands.length > 0) {
      console.log(`-> Brand record already exists for ${email}. Skipping.`);
      continue;
    }

    console.log(`-> Missing brand record for ${email}. Creating...`);
    const insertBody = {
      application_id: app.id,
      brand_name_zh: app.brand_name_zh,
      brand_name_en: app.brand_name_en,
      zone_id: app.zone_id,
      booth_type: app.booth_type,
      is_micro_exposure: app.booth_type === 'T',
      portal_email: email
    };

    const resInsert = await fetch(`${supabaseUrl}/rest/v1/exhibitor_brands`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(insertBody)
    });
    const insertRes = await resInsert.json();

    if (insertRes.error || (insertRes.code && insertRes.message)) {
      console.error(`-> Failed to create brand for ${email}:`, insertRes);
    } else {
      console.log(`-> Successfully created brand for ${email}!`, insertRes[0]?.id);
    }
  }

  console.log('Done!');
}

run();
