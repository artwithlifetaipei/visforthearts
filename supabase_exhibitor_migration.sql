-- ============================================================
-- VIS 2027 Exhibitor Platform – Supabase Migration
-- ============================================================
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================


-- ─── 1. exhibitor_applications ────────────────────────────
CREATE TABLE IF NOT EXISTS exhibitor_applications (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name_zh       TEXT NOT NULL,
  brand_name_en       TEXT NOT NULL,
  contact_name        TEXT NOT NULL,
  contact_email       TEXT NOT NULL,
  contact_phone       TEXT,
  website_url         TEXT,
  instagram_url       TEXT,
  -- zone_id: 'artsy' | 'premier' | 'atelier'
  zone_id             TEXT NOT NULL CHECK (zone_id IN ('artsy', 'premier', 'atelier')),
  -- booth_type: specific booth code, e.g. 'S01-S06', 'M9-M15', 'T', 'A-ENTRANCE'
  booth_type          TEXT NOT NULL,
  zone_preference_1   TEXT,
  zone_preference_2   TEXT,
  zone_preference_3   TEXT,
  -- concept_brief: max 250 characters
  concept_brief       TEXT CHECK (char_length(concept_brief) <= 250),
  deposit_paid        BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_proof_url   TEXT,
  -- status: pending | approved | rejected | incomplete
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'incomplete')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. exhibitor_brands ──────────────────────────────────
-- Created after approval; gives the brand access to the portal.
CREATE TABLE IF NOT EXISTS exhibitor_brands (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id      UUID REFERENCES exhibitor_applications(id) ON DELETE SET NULL,
  brand_name_zh       TEXT NOT NULL,
  brand_name_en       TEXT NOT NULL,
  zone_id             TEXT NOT NULL CHECK (zone_id IN ('artsy', 'premier', 'atelier')),
  booth_type          TEXT NOT NULL,
  -- T-zone brands cannot access Module C (VIP list) or Module D (media upload)
  is_micro_exposure   BOOLEAN NOT NULL DEFAULT FALSE,
  -- Email used for magic link / portal login
  portal_email        TEXT NOT NULL UNIQUE,
  magic_link_sent_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. exhibitor_vip_submissions ─────────────────────────
CREATE TABLE IF NOT EXISTS exhibitor_vip_submissions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id        UUID NOT NULL REFERENCES exhibitor_brands(id) ON DELETE CASCADE,
  brand_name_zh   TEXT NOT NULL,
  vip_email       TEXT NOT NULL,
  vip_surname     TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. exhibitor_compliance ──────────────────────────────
CREATE TABLE IF NOT EXISTS exhibitor_compliance (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id        UUID NOT NULL REFERENCES exhibitor_brands(id) ON DELETE CASCADE UNIQUE,
  rule_booth      BOOLEAN NOT NULL DEFAULT FALSE,   -- 展位規範
  rule_conduct    BOOLEAN NOT NULL DEFAULT FALSE,   -- 行為準則
  rule_liability  BOOLEAN NOT NULL DEFAULT FALSE,   -- 免責聲明
  rule_exit       BOOLEAN NOT NULL DEFAULT FALSE,   -- 撤展規範
  rule_ip         BOOLEAN NOT NULL DEFAULT FALSE,   -- 智慧財產權
  signed_at       TIMESTAMPTZ,
  signed_name     TEXT
);

-- ─── 5. exhibitor_media_assets ────────────────────────────
CREATE TABLE IF NOT EXISTS exhibitor_media_assets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id    UUID NOT NULL REFERENCES exhibitor_brands(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_type   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE exhibitor_applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibitor_brands          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibitor_vip_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibitor_compliance      ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibitor_media_assets    ENABLE ROW LEVEL SECURITY;


-- ─── exhibitor_applications ───────────────────────────────
-- Public: anyone can INSERT (submit an application)
CREATE POLICY "public_can_insert_application"
  ON exhibitor_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can SELECT their own application by email
CREATE POLICY "user_select_own_application"
  ON exhibitor_applications
  FOR SELECT
  TO authenticated
  USING (contact_email = auth.jwt() ->> 'email');

-- service_role has full access (admin operations)
CREATE POLICY "service_role_all_applications"
  ON exhibitor_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ─── exhibitor_brands ─────────────────────────────────────
-- Authenticated portal users can read their own brand record
CREATE POLICY "user_select_own_brand"
  ON exhibitor_brands
  FOR SELECT
  TO authenticated
  USING (portal_email = auth.jwt() ->> 'email');

-- service_role has full access
CREATE POLICY "service_role_all_brands"
  ON exhibitor_brands
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ─── exhibitor_vip_submissions ────────────────────────────
-- Authenticated users can INSERT vip submissions for their own brand
CREATE POLICY "user_insert_vip_submissions"
  ON exhibitor_vip_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE portal_email = auth.jwt() ->> 'email'
    )
  );

-- Authenticated users can SELECT their own vip submissions
CREATE POLICY "user_select_vip_submissions"
  ON exhibitor_vip_submissions
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE portal_email = auth.jwt() ->> 'email'
    )
  );

-- service_role has full access
CREATE POLICY "service_role_all_vip_submissions"
  ON exhibitor_vip_submissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ─── exhibitor_compliance ─────────────────────────────────
-- Authenticated users can INSERT compliance for their own brand
CREATE POLICY "user_insert_compliance"
  ON exhibitor_compliance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE portal_email = auth.jwt() ->> 'email'
    )
  );

-- Authenticated users can SELECT their own compliance record
CREATE POLICY "user_select_compliance"
  ON exhibitor_compliance
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE portal_email = auth.jwt() ->> 'email'
    )
  );

-- Authenticated users can UPDATE their own compliance record
CREATE POLICY "user_update_compliance"
  ON exhibitor_compliance
  FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE portal_email = auth.jwt() ->> 'email'
    )
  );

-- service_role has full access
CREATE POLICY "service_role_all_compliance"
  ON exhibitor_compliance
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ─── exhibitor_media_assets ───────────────────────────────
-- Authenticated users can INSERT media for their own brand
CREATE POLICY "user_insert_media"
  ON exhibitor_media_assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE portal_email = auth.jwt() ->> 'email'
    )
  );

-- Authenticated users can SELECT their own media assets
CREATE POLICY "user_select_media"
  ON exhibitor_media_assets
  FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM exhibitor_brands
      WHERE portal_email = auth.jwt() ->> 'email'
    )
  );

-- service_role has full access
CREATE POLICY "service_role_all_media"
  ON exhibitor_media_assets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- Storage Bucket
-- ============================================================
-- Create the 'exhibitor-deposits' storage bucket for deposit proof uploads.
-- Run this separately if not already created via Supabase Dashboard.
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('exhibitor-deposits', 'exhibitor-deposits', false)
-- ON CONFLICT DO NOTHING;
--
-- Allow public (anon) INSERT into the bucket (application submissions):
-- CREATE POLICY "anon_upload_deposit"
--   ON storage.objects FOR INSERT TO anon
--   WITH CHECK (bucket_id = 'exhibitor-deposits');

-- ─── 5. Grant permissions to standard Supabase roles ──────
GRANT ALL ON TABLE public.exhibitor_applications TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.exhibitor_brands TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.exhibitor_vip_submissions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.exhibitor_compliance TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.exhibitor_media_assets TO anon, authenticated, service_role;
