-- VIS VIP Blind Box Brands Table Migration
-- Run this script in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS vip_blind_box_brands (
    id text PRIMARY KEY,
    name text NOT NULL,
    desc_text text NOT NULL,
    image_url text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Grant privileges to Supabase default roles
GRANT ALL ON TABLE vip_blind_box_brands TO anon, authenticated, service_role;

-- Enable Row Level Security (RLS)
ALTER TABLE vip_blind_box_brands ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public read access (for VIP clients playing the game)
DROP POLICY IF EXISTS "Allow public read on blind box brands" ON vip_blind_box_brands;
CREATE POLICY "Allow public read on blind box brands" 
ON vip_blind_box_brands FOR SELECT 
TO public 
USING (true);

-- Policy 2: Allow admins full access (for admin dashboard configuration)
DROP POLICY IF EXISTS "Allow admins all on blind box brands" ON vip_blind_box_brands;
CREATE POLICY "Allow admins all on blind box brands" 
ON vip_blind_box_brands FOR ALL 
TO authenticated 
USING (auth.email() IN ('artwithlifetaipei@gmail.com'))
WITH CHECK (auth.email() IN ('artwithlifetaipei@gmail.com'));
