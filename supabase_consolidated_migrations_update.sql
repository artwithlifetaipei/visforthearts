-- ============================================================
-- 2027 VIS Exhibitor Platform – Consolidated Database Migration Updates
-- ============================================================
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- to add all recently introduced columns for company profiles,
-- compliance agreements, and return & damage policies.
-- ============================================================

-- 1. Add company profile columns to exhibitor_applications
ALTER TABLE exhibitor_applications ADD COLUMN IF NOT EXISTS company_name_zh TEXT;
ALTER TABLE exhibitor_applications ADD COLUMN IF NOT EXISTS company_tax_id TEXT;
ALTER TABLE exhibitor_applications ADD COLUMN IF NOT EXISTS contact_address TEXT;

COMMENT ON COLUMN exhibitor_applications.company_name_zh IS '公司行號（中文）';
COMMENT ON COLUMN exhibitor_applications.company_tax_id IS '公司統一編號（統編）';
COMMENT ON COLUMN exhibitor_applications.contact_address IS '聯繫地址';

-- 2. Add compliance policy columns to exhibitor_compliance
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS rule_deposit_forfeiture BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS rule_damage_compensation BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS signer_id_number TEXT;
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS is_legal_representative BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS physical_contract_url TEXT;
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS rule_refund_policy BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS rule_return_inspection BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN exhibitor_compliance.rule_deposit_forfeiture IS '特別條款：保證金沒收機制同意狀態';
COMMENT ON COLUMN exhibitor_compliance.rule_damage_compensation IS '特別條款：古蹟場地毀損賠償同意狀態';
COMMENT ON COLUMN exhibitor_compliance.signer_id_number IS '授權簽署人身分證字號';
COMMENT ON COLUMN exhibitor_compliance.is_legal_representative IS '確認為法定代理人或已取得法定代理人充分授權';
COMMENT ON COLUMN exhibitor_compliance.physical_contract_url IS '實體合約用印掃描檔下載/上傳 URL';
COMMENT ON COLUMN exhibitor_compliance.privacy_consent IS '隱私權政策與個資蒐集聲明同意狀態';
COMMENT ON COLUMN exhibitor_compliance.rule_refund_policy IS '特別條款：參展費退費與展位取消規範同意狀態';
COMMENT ON COLUMN exhibitor_compliance.rule_return_inspection IS '特別條款：展位點交與損害賠償規範（第六項）同意狀態';
