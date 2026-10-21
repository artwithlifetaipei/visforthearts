-- ============================================================
-- VIS 2027: Add Tier Column to exhibitor_vip_submissions
-- ============================================================
-- 允許參展商在後台直接勾選提報為 VIP（展期觀展貴賓）或 SVIP（開幕晚會貴賓）
-- 請在 Supabase Dashboard → SQL Editor 執行此腳本（一次性設定）
-- ============================================================

ALTER TABLE exhibitor_vip_submissions 
ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'VIP';

COMMENT ON COLUMN exhibitor_vip_submissions.tier IS 'VIP (公眾展期通行) 或 SVIP (開幕晚會榮譽席位)';
