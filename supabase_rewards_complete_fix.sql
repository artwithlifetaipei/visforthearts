-- Complete Supabase Rewards Table Fix Script
-- Run this script in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Grant all necessary table privileges to anonymous, authenticated, and service roles
GRANT ALL ON TABLE public.rewards TO anon, authenticated, service_role;

-- 2. Make sure RLS is enabled
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Users can view own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Users can update own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.rewards;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.rewards;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.rewards;

-- 4. Create SELECT Policy: Allow users to view their own rewards
CREATE POLICY "Users can view own rewards" 
ON public.rewards FOR SELECT 
TO public
USING (auth.uid() = user_id);

-- 5. Create INSERT Policy: Allow users to insert their own rewards
CREATE POLICY "Users can insert own rewards" 
ON public.rewards FOR INSERT 
TO public
WITH CHECK (auth.uid() = user_id);

-- 6. Create UPDATE Policy: Allow users to update/claim their own rewards
CREATE POLICY "Users can update own rewards" 
ON public.rewards FOR UPDATE 
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
