-- VIS VIP/SVIP V-Check System Database Migration Script
-- Please run this in your Supabase SQL Editor

-- 1. Create the check-in logs table to record every scanner entry
CREATE TABLE IF NOT EXISTS vip_checkin_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    email text NOT NULL,
    name text,
    tier text NOT NULL, -- 'VIP' or 'SVIP'
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    scanned_by_device text NOT NULL
);

-- 2. Enable Row Level Security (RLS) for the check-in logs
ALTER TABLE vip_checkin_logs ENABLE ROW LEVEL SECURITY;

-- 3. Grant table access permissions to authenticated and service roles
GRANT ALL ON TABLE vip_checkin_logs TO authenticated;
GRANT ALL ON TABLE vip_checkin_logs TO service_role;

-- 4. Create RLS Policies for admin email addresses
-- Allows designated admins complete access to view and add check-in records
DROP POLICY IF EXISTS "Admins can do everything on vip_checkin_logs" ON vip_checkin_logs;
CREATE POLICY "Admins can do everything on vip_checkin_logs" 
ON vip_checkin_logs FOR ALL 
USING (auth.email() IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'))
WITH CHECK (auth.email() IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'));
