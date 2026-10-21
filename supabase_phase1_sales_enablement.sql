-- ============================================================
-- VIS 2027 數位貴賓卡 Phase 1: 展品掃碼收藏 (Scan & Save) 資料庫綱要
-- ============================================================
-- 請於 Supabase Dashboard -> SQL Editor 中貼上並執行此段 SQL 腳本。
-- ============================================================

-- 1. 展商展品庫 (exhibitor_products)
CREATE TABLE IF NOT EXISTS exhibitor_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id UUID REFERENCES exhibitor_brands(id) ON DELETE CASCADE,
    brand_name_zh TEXT NOT NULL,
    brand_name_en TEXT,
    booth_number TEXT,
    title_zh TEXT NOT NULL,
    title_en TEXT,
    category TEXT DEFAULT '當代文化選品',
    price_type TEXT DEFAULT 'inquire' CHECK (price_type IN ('fixed', 'range', 'inquire')),
    price_display TEXT,                        -- e.g. "NT$ 38,000" 或 "洽詢專員 / 私洽"
    materials TEXT,                            -- 材質規格 (e.g. "陶瓷、白金釉")
    dimensions TEXT,                           -- 尺寸規格 (e.g. "25 x 18 x 12 cm")
    images TEXT[] NOT NULL DEFAULT '{}',       -- 作品圖片 URLs 陣列
    description TEXT,                          -- 創作理念 / 作品特色介紹
    buy_url TEXT,                              -- 外部下單/官方商城連結
    is_published BOOLEAN DEFAULT TRUE,
    view_count INT DEFAULT 0,
    save_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 貴賓個人收藏庫 (vip_collections - Scan & Save)
CREATE TABLE IF NOT EXISTS vip_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vip_email TEXT NOT NULL,
    product_id UUID NOT NULL REFERENCES exhibitor_products(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES exhibitor_brands(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vip_email, product_id)
);

-- 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_exhibitor_products_brand ON exhibitor_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_exhibitor_products_published ON exhibitor_products(is_published);
CREATE INDEX IF NOT EXISTS idx_vip_collections_email ON vip_collections(vip_email);
CREATE INDEX IF NOT EXISTS idx_vip_collections_product ON vip_collections(product_id);

-- 啟用 Row Level Security (RLS)
ALTER TABLE exhibitor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_collections ENABLE ROW LEVEL SECURITY;

-- 3. RLS 權限策略
-- (1) 展品公開可讀（供觀眾現場掃描立牌 QR Code 瀏覽）
DROP POLICY IF EXISTS "Public can view published products" ON exhibitor_products;
CREATE POLICY "Public can view published products"
ON exhibitor_products FOR SELECT
TO anon, authenticated
USING (is_published = true);

-- (2) 展商與管理員可管理所有展品 (增刪改查)
DROP POLICY IF EXISTS "Exhibitors and Admins can manage products" ON exhibitor_products;
CREATE POLICY "Exhibitors and Admins can manage products"
ON exhibitor_products FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- (3) 貴賓收藏表可公開新增與依信箱讀取
DROP POLICY IF EXISTS "Anyone can insert vip_collections" ON vip_collections;
CREATE POLICY "Anyone can insert vip_collections"
ON vip_collections FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view own vip_collections" ON vip_collections;
CREATE POLICY "Anyone can view own vip_collections"
ON vip_collections FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can delete own vip_collections" ON vip_collections;
CREATE POLICY "Anyone can delete own vip_collections"
ON vip_collections FOR DELETE
TO anon, authenticated
USING (true);

-- 4. 授予資料表權限 (Grant table permissions to anon & authenticated)
GRANT ALL ON TABLE exhibitor_products TO anon, authenticated, service_role;
GRANT ALL ON TABLE vip_collections TO anon, authenticated, service_role;

