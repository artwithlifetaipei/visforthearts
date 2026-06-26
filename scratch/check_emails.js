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

async function run() {
  // Let's try to fetch approved application for amelie@theartpressasia.com
  const email = 'amelie@theartpressasia.com';
  const resApp = await fetch(`${supabaseUrl}/rest/v1/exhibitor_applications?contact_email=eq.${email}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const apps = await resApp.json();
  if (apps.length === 0) {
    console.log('No application found');
    return;
  }
  const app = apps[0];
  console.log('Found application:', app.id);

  // Try to insert brand record
  const insertBody = {
    application_id: app.id,
    brand_name_zh: app.brand_name_zh,
    brand_name_en: app.brand_name_en,
    zone_id: app.zone_id,
    booth_type: app.booth_type,
    is_micro_exposure: app.booth_type === 'T',
    portal_email: email
  };

  console.log('Attempting insert with anon key...');
  const resInsert = await fetch(`${supabaseUrl}/rest/v1/exhibitor_brands`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(insertBody)
  });
  const insertRes = await resInsert.json();
  console.log('Insert response:', insertRes);
}

run();
