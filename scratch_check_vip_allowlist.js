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
  const email = 'visvipteam@gmail.com';
  
  // 1. 查詢 vip_allowlist
  const { data: allowed, error } = await supabase
    .from('vip_allowlist')
    .select('*')
    .eq('email', email);
    
  console.log('--- Checking email:', email);
  console.log('vip_allowlist data:', allowed);
  console.log('vip_allowlist error:', error);

  // 1.1 忽略大小寫查詢
  const { data: allowedLower, error: errorLower } = await supabase
    .from('vip_allowlist')
    .select('*')
    .ilike('email', email);
  console.log('vip_allowlist ilike data:', allowedLower);
  
  // 2. 列出所有 VIP allowlist，看看有多少資料，以便了解總體情況
  const { data: allList, error: errorAll } = await supabase
    .from('vip_allowlist')
    .select('*');
  console.log('--- All VIP allowlist entries count:', allList ? allList.length : 0);
  console.log('All entries:', allList);
}

check();
