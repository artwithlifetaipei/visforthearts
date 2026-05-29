-- 1. 賦予 authenticated (已登入用戶) 對資料表的基本操作權限 (這步非常重要，否則連 RLS 都過不了)
GRANT ALL ON TABLE email_campaigns TO authenticated;
GRANT ALL ON TABLE email_logs TO authenticated;
GRANT ALL ON TABLE email_campaigns TO service_role;
GRANT ALL ON TABLE email_logs TO service_role;

-- 2. 刪除舊的權限鎖
DROP POLICY IF EXISTS "Admins can do everything on email_campaigns" ON email_campaigns;
DROP POLICY IF EXISTS "Admins can do everything on email_logs" ON email_logs;

-- 3. 開通兩個信箱的最高權限 (包含 SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can do everything on email_campaigns" 
ON email_campaigns FOR ALL 
USING (auth.email() IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'))
WITH CHECK (auth.email() IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'));

CREATE POLICY "Admins can do everything on email_logs" 
ON email_logs FOR ALL 
USING (auth.email() IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'))
WITH CHECK (auth.email() IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'));
