-- ─── 擴充 exhibitor_compliance 欄位 ───
-- 此 SQL 用於支援更嚴格的線上簽署法律效力與實體用印合約替代方案

ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS rule_deposit_forfeiture BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS rule_damage_compensation BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS signer_id_number TEXT;
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS is_legal_representative BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS physical_contract_url TEXT;
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS privacy_consent BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN exhibitor_compliance.rule_deposit_forfeiture IS '特別條款：保證金沒收機制同意狀態';
COMMENT ON COLUMN exhibitor_compliance.rule_damage_compensation IS '特別條款：古蹟場地毀損賠償同意狀態';
COMMENT ON COLUMN exhibitor_compliance.signer_id_number IS '授權簽署人身分證字號';
COMMENT ON COLUMN exhibitor_compliance.is_legal_representative IS '確認為法定代理人或已取得法定代理人充分授權';
COMMENT ON COLUMN exhibitor_compliance.physical_contract_url IS '實體合約用印掃描檔下載/上傳 URL';
COMMENT ON COLUMN exhibitor_compliance.privacy_consent IS '隱私權政策與個資蒐集聲明同意狀態';
