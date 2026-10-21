-- ============================================================
-- VIS 2027 數位貴賓卡 Phase 2: 現場貴賓接待與商機名單 (Concierge Leads)
-- ============================================================
-- 請於 Supabase Dashboard -> SQL Editor 中貼上並執行此段 SQL 腳本。
-- ============================================================

-- 1. 展商現場貴賓接待商機表 (exhibitor_leads)
CREATE TABLE IF NOT EXISTS exhibitor_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id UUID REFERENCES exhibitor_brands(id) ON DELETE CASCADE,
    brand_name_zh TEXT NOT NULL,
    brand_name_en TEXT,
    booth_number TEXT,
    vip_user_id UUID,                                -- VIP 帳號 UUID (若有)
    vip_email TEXT NOT NULL,                         -- 貴賓登入/登記信箱
    vip_name TEXT,                                  -- 貴賓姓名
    vip_phone TEXT,                                 -- 貴賓聯絡電話
    vip_tier TEXT DEFAULT 'VIP',                    -- 'VIP' 或 'SVIP'
    intent_level TEXT DEFAULT 'high' CHECK (intent_level IN ('high', 'medium', 'discovery')),
    -- 'high' (🔥 高度購買意向), 'medium' (✨ 中度鑑賞興趣), 'discovery' (🌿 初步認識交流)
    follow_up_actions TEXT[] DEFAULT '{}',          -- 標籤陣列 e.g. ['戒圍／尺寸確認', '寄送作品型錄與報價單', '預約工作室鑑賞']
    interested_product_ids UUID[] DEFAULT '{}',     -- 勾選之感興趣展品 ID 陣列
    notes TEXT,                                     -- 現場接待筆記 / 尺寸記錄 / 溝通要點
    staff_email TEXT,                               -- 記錄接待的工作人員信箱
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引以加速報表與查詢
CREATE INDEX IF NOT EXISTS idx_exhibitor_leads_brand ON exhibitor_leads(brand_id);
CREATE INDEX IF NOT EXISTS idx_exhibitor_leads_email ON exhibitor_leads(vip_email);
CREATE INDEX IF NOT EXISTS idx_exhibitor_leads_intent ON exhibitor_leads(intent_level);
CREATE INDEX IF NOT EXISTS idx_exhibitor_leads_created ON exhibitor_leads(created_at DESC);

-- 啟用 Row Level Security (RLS)
ALTER TABLE exhibitor_leads ENABLE ROW LEVEL SECURITY;

-- 2. RLS 權限策略 (開放展商與平台正常操作增刪改查)
DROP POLICY IF EXISTS "Exhibitors and Admins can manage leads" ON exhibitor_leads;
CREATE POLICY "Exhibitors and Admins can manage leads"
ON exhibitor_leads FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 3. 授予資料表權限 (Grant permissions to anon, authenticated, service_role)
GRANT ALL ON TABLE exhibitor_leads TO anon, authenticated, service_role;

-- 4. 確保 vip_collections 表支援雙向同步更新
ALTER TABLE IF EXISTS vip_collections ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS vip_collections ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES exhibitor_brands(id) ON DELETE CASCADE;
GRANT ALL ON TABLE vip_collections TO anon, authenticated, service_role;
