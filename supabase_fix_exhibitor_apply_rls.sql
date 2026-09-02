-- ====================================================================
-- VIS 2027 – 修復 參展申請 (exhibitor_applications) RLS 權限問題
-- 請在 Supabase Dashboard ➔ SQL Editor 執行此腳本
-- ====================================================================

-- 1. 啟用 public/anon 與 authenticated 角色的寫入 (INSERT) 權限
DROP POLICY IF EXISTS "public_can_insert_application" ON exhibitor_applications;

CREATE POLICY "public_can_insert_application"
  ON exhibitor_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. 確保權限完全賦予 (GRANT)
GRANT ALL ON TABLE public.exhibitor_applications TO anon, authenticated, service_role;
