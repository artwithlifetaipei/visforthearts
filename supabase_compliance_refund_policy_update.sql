-- ─── 擴充 exhibitor_compliance 欄位：新增參展費退費與展位取消規範 ───
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS rule_refund_policy BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN exhibitor_compliance.rule_refund_policy IS '特別條款：參展費退費與展位取消規範同意狀態';
