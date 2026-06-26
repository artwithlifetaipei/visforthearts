-- ─── 補建遺漏的已核准品牌資料 ───
-- 此 SQL 用於補建資料庫中已核准但漏建的品牌帳戶（例如 amelie@theartpressasia.com）

INSERT INTO exhibitor_brands (application_id, brand_name_zh, brand_name_en, zone_id, booth_type, is_micro_exposure, portal_email)
SELECT 
  id AS application_id, 
  brand_name_zh, 
  brand_name_en, 
  zone_id, 
  booth_type, 
  (booth_type = 'T') AS is_micro_exposure, 
  LOWER(TRIM(contact_email)) AS portal_email
FROM exhibitor_applications
WHERE status = 'approved'
ON CONFLICT (portal_email) DO NOTHING;

-- ─── 新增安全原則：允許登入的品牌自行補建品牌帳號 ───
-- 當已核准的展商登入時，若發現資料庫遺漏其品牌紀錄，允許其在登入後自行 INSERT 補建
DROP POLICY IF EXISTS "user_insert_own_brand" ON exhibitor_brands;
CREATE POLICY "user_insert_own_brand"
  ON exhibitor_brands
  FOR INSERT
  TO authenticated
  WITH CHECK (portal_email = auth.jwt() ->> 'email');
