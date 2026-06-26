-- ====================================================================
-- 修復：Exhibitor 平台 RLS 政策大小寫敏感問題 (LOWER 修復)
-- 請在 Supabase Dashboard → SQL Editor 執行此腳本（一次性設定）
-- ====================================================================

-- ─── 1. 重建 exhibitor_applications 政策 ────────────────────────────
DROP POLICY IF EXISTS "user_select_own_application" ON exhibitor_applications;
CREATE POLICY "user_select_own_application"
  ON exhibitor_applications
  FOR SELECT
  TO authenticated
  USING (LOWER(contact_email) = LOWER(auth.jwt() ->> 'email'));


-- ─── 2. 重建 exhibitor_brands 政策 ──────────────────────────────────
DROP POLICY IF EXISTS "user_select_own_brand" ON exhibitor_brands;
CREATE POLICY "user_select_own_brand"
  ON exhibitor_brands
  FOR SELECT
  TO authenticated
  USING (LOWER(portal_email) = LOWER(auth.jwt() ->> 'email'));


-- ─── 3. 重建 exhibitor_vip_submissions 政策 ─────────────────────────
DROP POLICY IF EXISTS "user_insert_vip_submissions" ON exhibitor_vip_submissions;
CREATE POLICY "user_insert_vip_submissions"
  ON exhibitor_vip_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE LOWER(portal_email) = LOWER(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "user_select_vip_submissions" ON exhibitor_vip_submissions;
CREATE POLICY "user_select_vip_submissions"
  ON exhibitor_vip_submissions
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE LOWER(portal_email) = LOWER(auth.jwt() ->> 'email')
    )
  );


-- ─── 4. 重建 exhibitor_compliance 政策 ───────────────────────────────
DROP POLICY IF EXISTS "user_insert_compliance" ON exhibitor_compliance;
CREATE POLICY "user_insert_compliance"
  ON exhibitor_compliance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE LOWER(portal_email) = LOWER(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "user_select_compliance" ON exhibitor_compliance;
CREATE POLICY "user_select_compliance"
  ON exhibitor_compliance
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE LOWER(portal_email) = LOWER(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "user_update_compliance" ON exhibitor_compliance;
CREATE POLICY "user_update_compliance"
  ON exhibitor_compliance
  FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE LOWER(portal_email) = LOWER(auth.jwt() ->> 'email')
    )
  );


-- ─── 5. 重建 exhibitor_media_assets 政策 ─────────────────────────────
DROP POLICY IF EXISTS "user_insert_media" ON exhibitor_media_assets;
CREATE POLICY "user_insert_media"
  ON exhibitor_media_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE LOWER(portal_email) = LOWER(auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "user_select_media" ON exhibitor_media_assets;
CREATE POLICY "user_select_media"
  ON exhibitor_media_assets
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE LOWER(portal_email) = LOWER(auth.jwt() ->> 'email')
    )
  );
