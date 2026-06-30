-- Add status column to vip_allowlist for self-registered pending verification
ALTER TABLE public.vip_allowlist ADD COLUMN IF NOT EXISTS status text DEFAULT 'Approved';

-- Update all existing records to Approved status
UPDATE public.vip_allowlist SET status = 'Approved' WHERE status IS NULL;

-- Enable public select policies to only view 'Approved' members for login validation
-- But allow inserts for any public member into pending self-registration
DROP POLICY IF EXISTS "Allow select for public on vip_allowlist" ON public.vip_allowlist;
CREATE POLICY "Allow select for public on vip_allowlist" ON public.vip_allowlist
    FOR SELECT USING (status = 'Approved');

DROP POLICY IF EXISTS "Allow insert for public self-registration on vip_allowlist" ON public.vip_allowlist;
CREATE POLICY "Allow insert for public self-registration on vip_allowlist" ON public.vip_allowlist
    FOR INSERT WITH CHECK (true);
