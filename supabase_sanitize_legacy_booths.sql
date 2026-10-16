-- ================================================================
-- 2027 VIS Contemporary Culture - 展位編號現代化資料庫更新腳本
-- 請在 Supabase Dashboard → SQL Editor 執行此腳本
-- ================================================================

-- 1. 更新 exhibitor_applications 表中過往的舊版展位代碼 (S01-03,S06-08, S01-S06, M9-M15, S-2x2)
UPDATE public.exhibitor_applications
SET booth_type = 'A01'
WHERE booth_type LIKE '%S01%' 
   OR booth_type LIKE '%S06%' 
   OR booth_type = 'S-2x2';

UPDATE public.exhibitor_applications
SET booth_type = 'A04'
WHERE booth_type LIKE '%M9%' 
   OR booth_type LIKE '%M15%';

UPDATE public.exhibitor_applications
SET booth_type = 'S-02'
WHERE booth_type LIKE '%ENTRANCE%';

-- 2. 更新 exhibitor_brands 表中舊版展位代碼
UPDATE public.exhibitor_brands
SET booth_type = 'A01'
WHERE booth_type LIKE '%S01%' 
   OR booth_type LIKE '%S06%' 
   OR booth_type = 'S-2x2';

UPDATE public.exhibitor_brands
SET booth_type = 'A04'
WHERE booth_type LIKE '%M9%' 
   OR booth_type LIKE '%M15%';

UPDATE public.exhibitor_brands
SET booth_type = 'S-02'
WHERE booth_type LIKE '%ENTRANCE%';

-- 3. 查詢確認更新後結果
SELECT id, brand_name_zh, brand_name_en, contact_email, zone_id, booth_type, status
FROM public.exhibitor_applications
ORDER BY created_at DESC;

SELECT id, brand_name_zh, brand_name_en, portal_email, zone_id, booth_type
FROM public.exhibitor_brands;
