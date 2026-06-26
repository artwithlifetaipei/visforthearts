-- ─── 擴充 exhibitor_compliance 欄位：新增第六項展位點交與損害賠償規範 ───
ALTER TABLE exhibitor_compliance ADD COLUMN IF NOT EXISTS rule_return_inspection BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN exhibitor_compliance.rule_return_inspection IS '特別條款：展位點交與損害賠償規範（第六項）同意狀態';
