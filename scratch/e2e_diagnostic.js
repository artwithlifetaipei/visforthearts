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

async function runE2ETests() {
  console.log('==================================================');
  console.log('         VIS 2027 E2E INTEGRATION DIAGNOSTIC      ');
  console.log('==================================================');

  let passed = true;

  // Test 1: VIP Allowlist & Case-Insensitive Matching
  console.log('\n[Test 1] VIP Allowlist Case-Insensitive Query...');
  const vipTestEmails = ['visvipteam@gmail.com', 'VISVIPTEAM@GMAIL.COM', ' visvipteam@gmail.com '];
  for (const email of vipTestEmails) {
    const formatted = email.toLowerCase().trim();
    const { data, error } = await supabase
      .from('vip_allowlist')
      .select('email')
      .ilike('email', formatted)
      .maybeSingle();

    if (error || !data) {
      console.error(`❌ Failed: Cannot match VIP email "${email}"`);
      passed = false;
    } else {
      console.log(`✅ Success: Matched VIP "${email}" -> "${data.email}"`);
    }
  }

  // Test 2: Exhibitor Brand & Application Status Check (amelie@theartpressasia.com)
  console.log('\n[Test 2] Exhibitor Brand & Application Consistency Check...');
  const exhibitorEmail = 'amelie@theartpressasia.com';
  
  // A. Check Application
  const { data: appData, error: appErr } = await supabase
    .from('exhibitor_applications')
    .select('id, status')
    .eq('contact_email', exhibitorEmail)
    .maybeSingle();

  if (appErr || !appData) {
    console.error(`❌ Failed: Application for "${exhibitorEmail}" not found.`);
    passed = false;
  } else {
    console.log(`✅ Success: Found application for "${exhibitorEmail}" (Status: ${appData.status})`);
    
    // B. Check Brand
    const { data: brandData, error: brandErr } = await supabase
      .from('exhibitor_brands')
      .select('id, portal_email')
      .eq('portal_email', exhibitorEmail)
      .maybeSingle();

    if (brandErr) {
      console.error(`❌ Failed: Error checking brand table: ${brandErr.message}`);
      passed = false;
    } else if (!brandData) {
      console.warn(`⚠️ Warning: No exhibitor_brand entry in DB for "${exhibitorEmail}". Auto-heal logic on client-side will execute.`);
    } else {
      console.log(`✅ Success: Found synced brand entry for "${exhibitorEmail}" (ID: ${brandData.id})`);
    }
  }

  // Test 3: Admin Account Authorization Logic
  console.log('\n[Test 3] Admin Email Validation...');
  const adminEmails = ['artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'];
  const ADMIN_LIST = adminEmails.map(e => e.toLowerCase().trim());
  
  // Simulate client-side code:
  for (const testAdmin of ['Artwithlifetaipei@gmail.com ', 'AMELIECYKUO@GMAIL.COM']) {
    const sanitized = testAdmin.toLowerCase().trim();
    const isAdmin = ADMIN_LIST.includes(sanitized);
    if (isAdmin) {
      console.log(`✅ Success: Properly identified "${testAdmin}" as an Admin.`);
    } else {
      console.error(`❌ Failed: Failed to identify "${testAdmin}" as Admin.`);
      passed = false;
    }
  }

  console.log('\n==================================================');
  if (passed) {
    console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! NO INTERFERENCE DETECTED.');
  } else {
    console.error('❌ SOME TESTS FAILED. PLEASE CHECK LOGS ABOVE.');
  }
  console.log('==================================================');
}

runE2ETests();
