-- ==============================================================================
-- VIS 2027 Live Perspective Wall Database Migration (V1.0)
-- 臺北市中山堂 · VIS Contemporary Culture 2027
-- Execute this script in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Create perspective_campaigns table (年度文化命題活動表)
CREATE TABLE IF NOT EXISTS public.perspective_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,                       -- e.g. 'vis-2027'
    year INTEGER NOT NULL,                           -- e.g. 2027
    question_version TEXT NOT NULL,                  -- e.g. '2027-v1'
    question_en TEXT NOT NULL,                       -- 'WHAT DO YOU HOPE WILL STILL MATTER IN 100 YEARS?'
    question_zh TEXT NOT NULL,                       -- '一百年後，你希望什麼仍然重要？'
    identity_label TEXT NOT NULL,                    -- 'THE QUESTION OF THE YEAR 2027'
    submission_open_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submission_close_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 year'),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
    is_display_campaign BOOLEAN NOT NULL DEFAULT true,
    consent_version TEXT NOT NULL DEFAULT '2027-v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create perspective_submissions table (觀眾與各界回答提報表)
CREATE TABLE IF NOT EXISTS public.perspective_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.perspective_campaigns(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (source IN ('PUBLIC', 'EDITORIAL', 'INTERVIEW')),
    type TEXT NOT NULL DEFAULT 'visitor' CHECK (type IN ('visitor', 'vip', 'vis_people', 'artist', 'exhibitor')),
    original_name TEXT NOT NULL,                     -- 原始提交姓名/顯示名稱 (不可覆寫)
    display_name TEXT NOT NULL,                      -- 公開展示版本
    original_answer TEXT NOT NULL,                   -- 原始回答 (不可覆寫)
    display_answer TEXT,                             -- 經後台潤飾錯字標點之公開展示版本
    role_title TEXT,                                 -- 身份或頭銜 (如: '資深建築師', 'VIS People')
    language TEXT DEFAULT 'zh',                      -- 語言判斷 (zh, en, ja, mixed)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
    display_enabled BOOLEAN NOT NULL DEFAULT false,  -- 獨立播放開關 (Display On/Off)
    display_order INTEGER,                           -- 人工播放指定優先權
    featured BOOLEAN NOT NULL DEFAULT false,         -- 大會精選標記
    moderation_flags JSONB DEFAULT '[]'::jsonb,      -- 自動檢測標記 (PII, URL, Spam)
    rejection_reason TEXT,                           -- 內部審核婉拒原因
    consent_version TEXT NOT NULL DEFAULT '2027-v1', -- 授權文字版本
    consented_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- 同意時間
    withdrawn_at TIMESTAMPTZ,                        -- 撤回授權時間 (非空即排除)
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create perspective_display_settings table (LED 現場播放控制器參數)
CREATE TABLE IF NOT EXISTS public.perspective_display_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.perspective_campaigns(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'normal' CHECK (mode IN ('normal', 'latest', 'filtered', 'emergency')),
    filter_type TEXT,                                -- 若 mode = 'filtered'，過濾的 type
    duration_seconds INTEGER NOT NULL DEFAULT 8 CHECK (duration_seconds BETWEEN 5 AND 20),
    transition TEXT NOT NULL DEFAULT 'fade',
    emergency_message_en TEXT DEFAULT 'VIS 2027 — LIVE PERSPECTIVE WALL',
    emergency_message_zh TEXT DEFAULT 'VIS 2027 當代生活文化大展 · 現場觀點共創進行中',
    content_version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by TEXT
);

-- 4. Create perspective_audit_logs table (審核與系統操作稽核日誌)
CREATE TABLE IF NOT EXISTS public.perspective_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    before JSONB,
    after JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_perspectives_display_lookup 
ON public.perspective_submissions (campaign_id, status, display_enabled, withdrawn_at, display_order);

CREATE INDEX IF NOT EXISTS idx_perspectives_campaign_slug 
ON public.perspective_campaigns (slug);

-- 6. Permissions Grant to Standard Roles
GRANT ALL ON TABLE public.perspective_campaigns TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.perspective_submissions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.perspective_display_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.perspective_audit_logs TO anon, authenticated, service_role;

-- 7. Row Level Security (RLS)
ALTER TABLE public.perspective_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perspective_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perspective_display_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perspective_audit_logs ENABLE ROW LEVEL SECURITY;

-- Campaigns Policies
DROP POLICY IF EXISTS "Allow public read on active campaigns" ON public.perspective_campaigns;
CREATE POLICY "Allow public read on active campaigns" ON public.perspective_campaigns
    FOR SELECT USING (true);

-- Submissions Policies:
-- 1. Public can insert new submissions
DROP POLICY IF EXISTS "Allow public insert on perspective_submissions" ON public.perspective_submissions;
CREATE POLICY "Allow public insert on perspective_submissions" ON public.perspective_submissions
    FOR INSERT WITH CHECK (true);

-- 2. Public can read ONLY approved, display_enabled, non-withdrawn submissions
DROP POLICY IF EXISTS "Allow public select approved perspective_submissions" ON public.perspective_submissions;
CREATE POLICY "Allow public select approved perspective_submissions" ON public.perspective_submissions
    FOR SELECT USING (
        status = 'approved' AND display_enabled = true AND withdrawn_at IS NULL
    );

-- 3. Authenticated / Service role can perform all on submissions
DROP POLICY IF EXISTS "Allow all for authenticated on perspective_submissions" ON public.perspective_submissions;
CREATE POLICY "Allow all for authenticated on perspective_submissions" ON public.perspective_submissions
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Display Settings Policies
DROP POLICY IF EXISTS "Allow public select on display_settings" ON public.perspective_display_settings;
CREATE POLICY "Allow public select on display_settings" ON public.perspective_display_settings
    FOR SELECT USING (true);

-- 8. Seed Initial 2027 Campaign and Settings
INSERT INTO public.perspective_campaigns (
    id, slug, year, question_version, question_en, question_zh, identity_label, status, is_display_campaign
) VALUES (
    'e3c23114-61b9-4674-8898-0c367ad10827',
    'vis-2027',
    2027,
    '2027-v1',
    'WHAT DO YOU HOPE WILL STILL MATTER IN 100 YEARS?',
    '一百年後，你希望什麼仍然重要？',
    'THE QUESTION OF THE YEAR 2027',
    'active',
    true
) ON CONFLICT (slug) DO UPDATE SET 
    question_en = EXCLUDED.question_en,
    question_zh = EXCLUDED.question_zh,
    updated_at = now();

INSERT INTO public.perspective_display_settings (
    campaign_id, mode, duration_seconds, transition, content_version
) VALUES (
    'e3c23114-61b9-4674-8898-0c367ad10827',
    'normal',
    8,
    'fade',
    1
) ON CONFLICT DO NOTHING;

-- 9. Add Question Columns if missing
ALTER TABLE public.perspective_submissions ADD COLUMN IF NOT EXISTS question_id TEXT;
ALTER TABLE public.perspective_submissions ADD COLUMN IF NOT EXISTS question_prompt TEXT;

-- 10. Seed Curated Perspectives (3 Official Curated Perspectives)
INSERT INTO public.perspective_submissions (
    campaign_id, source, type, original_name, display_name, original_answer, display_answer, role_title, status, display_enabled, display_order, featured, question_id, question_prompt
) VALUES
(
    'e3c23114-61b9-4674-8898-0c367ad10827',
    'EDITORIAL',
    'vis_people',
    'Amelie KUO',
    'Amelie KUO',
    '希望台灣能讓更多人擁有理解美的能力，而不只是追求好看的結果。因為真正改變一個地方的，從來不只是創造美的人，還有懂得欣賞美的人。',
    '希望台灣能讓更多人擁有理解美的能力，而不只是追求好看的結果。因為真正改變一個地方的，從來不只是創造美的人，還有懂得欣賞美的人。',
    NULL,
    'approved',
    true,
    1,
    true,
    'q3',
    '如果希望台灣成為一個更有美感的地方，你最希望大家開始重視什麼？'
),
(
    'e3c23114-61b9-4674-8898-0c367ad10827',
    'EDITORIAL',
    'visitor',
    '匿名',
    '匿名',
    '真正的美感素養，不是知道什麼是美，而是能說出自己為什麼覺得美。',
    '真正的美感素養，不是知道什麼是美，而是能說出自己為什麼覺得美。',
    NULL,
    'approved',
    true,
    2,
    true,
    'q1',
    '你認為，一個真正懂得欣賞美的社會，應該具備什麼樣的特質？'
),
(
    'e3c23114-61b9-4674-8898-0c367ad10827',
    'EDITORIAL',
    'vis_people',
    'VIS 小隊',
    'VIS 小隊',
    '讓生活變得開心🤍🤍',
    '讓生活變得開心🤍🤍',
    NULL,
    'approved',
    true,
    3,
    true,
    'q2',
    '對你來說，美的事物，它的價值是什麼？一句話形容。'
)
ON CONFLICT DO NOTHING;
