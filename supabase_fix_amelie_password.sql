-- ============================================================
-- 修復計畫：直接重設 amelie@theartpressasia.com 的帳號密碼
-- 執行目的：因為該信箱之前是用 Magic Link 登入，Auth 系統中沒有設定密碼。
-- 請在 Supabase Dashboard -> SQL Editor 中貼上並執行以下 SQL 語句，即可直接將其密碼設為：Kuo76443173
-- ============================================================

UPDATE auth.users
SET encrypted_password = crypt('Kuo76443173', gen_salt('bf'))
WHERE email = 'amelie@theartpressasia.com';

-- 驗證更新是否成功（執行後若回傳 1 row 即代表成功）
SELECT id, email, encrypted_password FROM auth.users WHERE email = 'amelie@theartpressasia.com';
