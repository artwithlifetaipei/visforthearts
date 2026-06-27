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
  console.log('=== Exhibitor Database Diagnosis ===');
  
  console.log('\n1. Querying all exhibitor_applications:');
  const { data: apps, error: appsErr } = await supabase
    .from('exhibitor_applications')
    .select('*');
  if (appsErr) {
    console.error('Failed to query exhibitor_applications:', appsErr);
  } else {
    console.log(`Found ${apps.length} applications:`);
    apps.forEach(a => {
      console.log(`- ID: ${a.id}, Brand: ${a.brand_name_zh} (${a.contact_email}), Status: ${a.status}`);
    });
  }

  console.log('\n2. Querying all exhibitor_brands:');
  const { data: brands, error: brandsErr } = await supabase
    .from('exhibitor_brands')
    .select('*');
  if (brandsErr) {
    console.error('Failed to query exhibitor_brands:', brandsErr);
  } else {
    console.log(`Found ${brands.length} brands:`);
    brands.forEach(b => {
      console.log(`- ID: ${b.id}, Brand: ${b.brand_name_zh} (${b.portal_email}), ApplicationID: ${b.application_id}`);
    });
  }
}

main();
