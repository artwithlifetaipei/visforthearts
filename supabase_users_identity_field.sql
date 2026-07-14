-- SQL migration to add identity_type column to the users table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS identity_type TEXT;
