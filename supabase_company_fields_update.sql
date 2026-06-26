-- ─── 新增 exhibitor_applications 三個欄位 ───
-- 公司行號（中文）、公司統編、聯繫地址
ALTER TABLE exhibitor_applications ADD COLUMN IF NOT EXISTS company_name_zh TEXT;
ALTER TABLE exhibitor_applications ADD COLUMN IF NOT EXISTS company_tax_id TEXT;
ALTER TABLE exhibitor_applications ADD COLUMN IF NOT EXISTS contact_address TEXT;

COMMENT ON COLUMN exhibitor_applications.company_name_zh IS '公司行號（中文）';
COMMENT ON COLUMN exhibitor_applications.company_tax_id IS '公司統一編號（統編）';
COMMENT ON COLUMN exhibitor_applications.contact_address IS '聯繫地址';
