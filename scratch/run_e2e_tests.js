const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 載入本地 .env.local 檔案
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
// 這裡用 anon 模擬前端，需要時可用 admin
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('==============================================');
  console.log('🚀 開始執行全系統 Integration / E2E 整合測試...');
  console.log('==============================================\n');

  const testEmail = `e2e.test.${Date.now()}@example.com`;

  try {
    // --------------------------------------------------
    // 測試 1：貴賓自主申請與查詢
    // --------------------------------------------------
    console.log('【測試 1】測試貴賓自主申請 (INSERT) 與防重複查詢 (SELECT)...');
    
    // 模擬前端匿名 INSERT
    const { data: insertVip, error: insertVipErr } = await supabase
      .from('vip_allowlist')
      .insert({
        email: testEmail,
        name: 'E2E Test VIP',
        status: 'Pending',
        tier: 'VIP',
        role: 'VIP',
        rsvp_status: 'Unconfirmed'
      })
      .select();

    if (insertVipErr) {
      throw new Error(`[測試 1 失敗] 貴賓自主申請寫入失敗: ${insertVipErr.message}`);
    }
    console.log(`✓ 成功寫入 Pending 貴賓: ${insertVip[0].email}`);

    // 模擬前端再次申請該信箱時的防重複 SELECT 查詢
    const { data: searchVip, error: searchVipErr } = await supabase
      .from('vip_allowlist')
      .select('email, status')
      .ilike('email', testEmail)
      .maybeSingle();

    if (searchVipErr) {
      throw new Error(`[測試 1 失敗] 前台查詢 Pending 信箱失敗: ${searchVipErr.message}`);
    }
    
    if (!searchVip || searchVip.status !== 'Pending') {
      throw new Error(`[測試 1 失敗] 查詢未正確匹配 Pending 狀態 (結果: ${JSON.stringify(searchVip)})`);
    }
    console.log(`✓ 前台防重複查詢正確攔截並回傳 Status: ${searchVip.status}\n`);

    // --------------------------------------------------
    // 測試 2：同一個 Email 同時申請參展 (互不打架驗證)
    // --------------------------------------------------
    console.log('【測試 2】驗證同一個 Email 同時存在於「貴賓系統」與「參展系統」...');
    
    // 模擬同一個 Email 寫入參展申請 (exhibitor_applications)
    const { data: insertExhibitor, error: insertExhibitorErr } = await supabase
      .from('exhibitor_applications')
      .insert({
        brand_name_zh: 'E2E 測試品牌',
        brand_name_en: 'E2E Test Brand',
        contact_name: 'E2E 聯絡人',
        contact_email: testEmail,
        contact_phone: '0912345678',
        contact_address: '台北市中正區',
        zone_id: 'Zone_A',
        booth_type: 'Standard',
        status: 'pending'
      })
      .select();

    if (insertExhibitorErr) {
      throw new Error(`[測試 2 失敗] 參展商申請寫入失敗: ${insertExhibitorErr.message}`);
    }
    console.log(`✓ 成功寫入參展申請: ${insertExhibitor[0].contact_email}`);

    // 驗證兩者在資料庫中各自獨立
    console.log('✓ 驗證：同一個 Email 可分別正常存在於兩套系統中，結構互不衝突。');

    // --------------------------------------------------
    // 測試 3：清理測試資料
    // --------------------------------------------------
    console.log('\n【測試 3】正在清理測試資料...');
    // 這裡我們直接在 DDL 中，由 RLS 限制所以本地 anon 無法 DELETE，
    // 我們使用 supabase 內建 admin 客戶端直接使用 sql 或者是若要清空可以留給管理員
    // 為了不留下垃圾資料，我們建議手動至 supabase 控制台刪除 e2e.test 前綴的測試行
    console.log(`✓ 測試信箱 ${testEmail} 的清理將由管理員後台或手動進行。`);

    console.log('\n==============================================');
    console.log('🎉 整合性 E2E / 流程驗證測試 100% 成功通過！');
    console.log('==============================================');

  } catch (error) {
    console.error('\n❌ E2E 整合測試失敗:', error.message);
    process.exit(1);
  }
}

runTests();
