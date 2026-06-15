-- Fix RLS Policy for rewards table to allow users to insert their won rewards
-- Run this script in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Allow authenticated users to insert their own rewards
DROP POLICY IF EXISTS "Users can insert their own rewards" ON public.rewards;
CREATE POLICY "Users can insert their own rewards" 
ON public.rewards FOR INSERT 
WITH CHECK (auth.uid() = user_id);
