-- ================================================================
-- 永久修復：Auto-create exhibitor_brands when application is approved
-- 請在 Supabase Dashboard → SQL Editor 執行此腳本（一次性設定）
-- ================================================================

-- ─── 1. 建立觸發器函式 ───────────────────────────────────────────
-- 每當 exhibitor_applications 的 status 被更新為 'approved'，
-- 自動在 exhibitor_brands 建立對應記錄（若已存在則略過）
CREATE OR REPLACE FUNCTION auto_create_exhibitor_brand()
RETURNS TRIGGER AS $$
BEGIN
  -- 僅在狀態從非 approved 變為 approved 時觸發
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO exhibitor_brands (
      application_id,
      brand_name_zh,
      brand_name_en,
      zone_id,
      booth_type,
      is_micro_exposure,
      portal_email
    )
    VALUES (
      NEW.id,
      NEW.brand_name_zh,
      NEW.brand_name_en,
      NEW.zone_id,
      NEW.booth_type,
      (NEW.booth_type = 'T'),
      LOWER(TRIM(NEW.contact_email))
    )
    ON CONFLICT (portal_email) DO NOTHING;  -- 若已有記錄則略過，不報錯
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2. 綁定觸發器到 exhibitor_applications 資料表 ──────────────
DROP TRIGGER IF EXISTS trg_auto_create_brand ON exhibitor_applications;

CREATE TRIGGER trg_auto_create_brand
  AFTER UPDATE OF status ON exhibitor_applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_exhibitor_brand();

-- ─── 3. 補建所有已 approved 但尚無 brand 記錄的 application ──────
-- 執行一次性修補，確保歷史資料也補齊
INSERT INTO exhibitor_brands (
  application_id,
  brand_name_zh,
  brand_name_en,
  zone_id,
  booth_type,
  is_micro_exposure,
  portal_email
)
SELECT
  a.id,
  a.brand_name_zh,
  a.brand_name_en,
  a.zone_id,
  a.booth_type,
  (a.booth_type = 'T') AS is_micro_exposure,
  LOWER(TRIM(a.contact_email)) AS portal_email
FROM exhibitor_applications a
WHERE a.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM exhibitor_brands b
    WHERE b.portal_email = LOWER(TRIM(a.contact_email))
  )
ON CONFLICT (portal_email) DO NOTHING;

-- ─── 4. 驗證：查看補建結果 ──────────────────────────────────────
SELECT 
  b.portal_email,
  b.brand_name_zh,
  b.zone_id,
  b.created_at
FROM exhibitor_brands b
ORDER BY b.created_at DESC
LIMIT 20;
