-- ============================================================
-- VIS 2027 Exhibitor Admin Row Level Security (RLS) Fix
-- ============================================================
-- 執行目的：允許主辦單位管理員信箱（artwithlifetaipei@gmail.com 與 ameliecykuo@gmail.com）
-- 在管理後台能順利讀取並管理所有廠商提交的 VIP 名單、合約守則簽署狀態與媒體公關素材。
-- 請在 Supabase Dashboard -> SQL Editor 中貼上並執行此段 SQL 腳本。
-- ============================================================

-- 1. 清理可能重複的舊 Policy（以防萬一）
DROP POLICY IF EXISTS "Admins can do everything on exhibitor_applications" ON exhibitor_applications;
DROP POLICY IF EXISTS "Admins can do everything on exhibitor_brands" ON exhibitor_brands;
DROP POLICY IF EXISTS "Admins can do everything on exhibitor_vip_submissions" ON exhibitor_vip_submissions;
DROP POLICY IF EXISTS "Admins can do everything on exhibitor_compliance" ON exhibitor_compliance;
DROP POLICY IF EXISTS "Admins can do everything on exhibitor_media_assets" ON exhibitor_media_assets;

-- 2. 建立新 Policy 授權給主辦單位管理員信箱

-- ── 申請表 exhibitor_applications ──
CREATE POLICY "Admins can do everything on exhibitor_applications"
ON exhibitor_applications FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'))
WITH CHECK (auth.jwt() ->> 'email' IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'));

-- ── 品牌表 exhibitor_brands ──
CREATE POLICY "Admins can do everything on exhibitor_brands"
ON exhibitor_brands FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'))
WITH CHECK (auth.jwt() ->> 'email' IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'));

-- ── VIP 提報名單 exhibitor_vip_submissions ──
CREATE POLICY "Admins can do everything on exhibitor_vip_submissions"
ON exhibitor_vip_submissions FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'))
WITH CHECK (auth.jwt() ->> 'email' IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'));

-- ── 規範簽署書 exhibitor_compliance ──
CREATE POLICY "Admins can do everything on exhibitor_compliance"
ON exhibitor_compliance FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'))
WITH CHECK (auth.jwt() ->> 'email' IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'));

-- ── 媒體素材 exhibitor_media_assets ──
CREATE POLICY "Admins can do everything on exhibitor_media_assets"
ON exhibitor_media_assets FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'))
WITH CHECK (auth.jwt() ->> 'email' IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'));
