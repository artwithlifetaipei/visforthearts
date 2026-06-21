-- 1. Add crm columns to rewards table if not present
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS user_email text;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS user_name text;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Users can insert own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Users can update own rewards" ON public.rewards;
DROP POLICY IF EXISTS "Allow select for public on rewards" ON public.rewards;
DROP POLICY IF EXISTS "Allow insert for public on rewards" ON public.rewards;
DROP POLICY IF EXISTS "Allow update for public on rewards" ON public.rewards;

-- 3. Create SELECT Policy: Allow everyone to select (to let brand staff scan & resolve guest info)
CREATE POLICY "Allow select for public on rewards" 
ON public.rewards FOR SELECT 
TO public
USING (true);

-- 4. Create INSERT Policy: Allow users to insert their own rewards
CREATE POLICY "Allow insert for public on rewards" 
ON public.rewards FOR INSERT 
TO public
WITH CHECK (auth.uid() = user_id);

-- 5. Create UPDATE Policy: Allow everyone to update (to let brand staff redeem)
CREATE POLICY "Allow update for public on rewards" 
ON public.rewards FOR UPDATE 
TO public
USING (true);
