-- Supabase RLS Fix for public.users Table
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Ensure RLS is enabled on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Grant table permissions to standard Supabase roles
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;

-- 3. Policy: Allow users to view their own profile details
DROP POLICY IF EXISTS "Allow users to view own profile" ON public.users;
CREATE POLICY "Allow users to view own profile" ON public.users
    FOR SELECT TO authenticated USING (auth.uid() = id);

-- 4. Policy: Allow users to insert/upsert their own profile details
DROP POLICY IF EXISTS "Allow users to insert own profile" ON public.users;
CREATE POLICY "Allow users to insert own profile" ON public.users
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 5. Policy: Allow users to update their own profile details
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.users;
CREATE POLICY "Allow users to update own profile" ON public.users
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
