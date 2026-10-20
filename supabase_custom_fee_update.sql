-- ============================================================
-- 2027 VIS Contemporary Culture – Custom Booth Fee & Discount Migration
-- ============================================================
-- 執行說明：請至 Supabase Dashboard → SQL Editor 貼上並執行此腳本即可啟用
-- ============================================================

-- 1. exhibitor_applications: 新增自訂參展費與折扣備註欄位
ALTER TABLE exhibitor_applications ADD COLUMN IF NOT EXISTS custom_fee NUMERIC;
ALTER TABLE exhibitor_applications ADD COLUMN IF NOT EXISTS discount_note TEXT;

COMMENT ON COLUMN exhibitor_applications.custom_fee IS '大會審定/專案特惠參展費用 (NT$)，若為 NULL 則自動依展位規格標準定價';
COMMENT ON COLUMN exhibitor_applications.discount_note IS '參展費優惠/專案折扣備註說明（例如：策略夥伴優惠、早鳥特惠等）';

-- 2. exhibitor_brands: 新增自訂參展費與折扣備註欄位
ALTER TABLE exhibitor_brands ADD COLUMN IF NOT EXISTS custom_fee NUMERIC;
ALTER TABLE exhibitor_brands ADD COLUMN IF NOT EXISTS discount_note TEXT;

COMMENT ON COLUMN exhibitor_brands.custom_fee IS '大會審定/專案特惠參展費用 (NT$)，若為 NULL 則自動依展位規格標準定價';
COMMENT ON COLUMN exhibitor_brands.discount_note IS '參展費優惠/專案折扣備註說明（例如：策略夥伴優惠、早鳥特惠等）';
