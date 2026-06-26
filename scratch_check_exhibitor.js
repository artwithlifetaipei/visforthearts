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

async function check() {
  const email = 'amelie@theartpressasia.com';
  
  // 1. 查詢 exhibitor_brands
  console.log('--- Checking exhibitor_brands for:', email);
  const { data: brands, error: errorBrands } = await supabase
    .from('exhibitor_brands')
    .select('*')
    .eq('portal_email', email);
  console.log('exhibitor_brands data:', brands);
  console.log('exhibitor_brands error:', errorBrands);
  
  // 忽略大小寫查詢 exhibitor_brands
  const { data: brandsLower } = await supabase
    .from('exhibitor_brands')
    .select('*')
    .ilike('portal_email', email);
  console.log('exhibitor_brands (ilike) data:', brandsLower);

  // 2. 查詢 exhibitor_applications
  console.log('\n--- Checking exhibitor_applications for:', email);
  const { data: apps, error: errorApps } = await supabase
    .from('exhibitor_applications')
    .select('*')
    .eq('contact_email', email);
  console.log('exhibitor_applications data:', apps);
  console.log('exhibitor_applications error:', errorApps);

  // 忽略大小寫查詢 exhibitor_applications
  const { data: appsLower } = await supabase
    .from('exhibitor_applications')
    .select('*')
    .ilike('contact_email', email);
  console.log('exhibitor_applications (ilike) data:', appsLower);
}

check();
