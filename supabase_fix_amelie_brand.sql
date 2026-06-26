-- ================================================================
-- 修復：確保 amelie@theartpressasia.com 的 exhibitor_brands 記錄存在
-- 請在 Supabase Dashboard → SQL Editor 執行此腳本
-- ================================================================

-- Step 1: 查看是否已有對應的 exhibitor_brands 記錄
SELECT id, brand_name_zh, portal_email, created_at
FROM exhibitor_brands
WHERE portal_email = 'amelie@theartpressasia.com';

-- Step 2: 查看是否有對應的已核准 application
SELECT id, brand_name_zh, brand_name_en, zone_id, booth_type, status
FROM exhibitor_applications
WHERE contact_email = 'amelie@theartpressasia.com'
  AND status = 'approved';

-- Step 3: 若 Step 1 無結果，執行以下 INSERT 補建 brand 記錄
-- （先執行 Step 1 & 2 確認，再決定是否要執行 Step 3）
--
-- INSERT INTO exhibitor_brands (
--   application_id,
--   brand_name_zh,
--   brand_name_en,
--   zone_id,
--   booth_type,
--   is_micro_exposure,
--   portal_email
-- )
-- SELECT
--   id AS application_id,
--   brand_name_zh,
--   brand_name_en,
--   zone_id,
--   booth_type,
--   (booth_type = 'T') AS is_micro_exposure,
--   'amelie@theartpressasia.com' AS portal_email
-- FROM exhibitor_applications
-- WHERE contact_email = 'amelie@theartpressasia.com'
--   AND status = 'approved'
-- LIMIT 1
-- ON CONFLICT (portal_email) DO NOTHING;

-- Step 4: 若 Step 2 也無結果（沒有 approved application），
-- 直接建立一個測試用 brand 記錄：
--
-- INSERT INTO exhibitor_brands (
--   brand_name_zh,
--   brand_name_en,
--   zone_id,
--   booth_type,
--   is_micro_exposure,
--   portal_email
-- ) VALUES (
--   '測試品牌（Amelie）',
--   'VIS Test Brand (Amelie)',
--   'artsy',
--   'S01-S06',
--   false,
--   'amelie@theartpressasia.com'
-- )
-- ON CONFLICT (portal_email) DO NOTHING;
