-- 1. Grant table privileges to standard Supabase roles
GRANT ALL ON TABLE public.ticket_brands TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ticket_slots TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tickets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ticket_waitlist TO anon, authenticated, service_role;

-- 2. Update RLS policies for ticket_brands to use lower(auth.jwt() ->> 'email')
DROP POLICY IF EXISTS "Allow admin all on ticket_brands" ON public.ticket_brands;
CREATE POLICY "Allow admin all on ticket_brands" ON public.ticket_brands
    FOR ALL TO public USING (lower(auth.jwt() ->> 'email') IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'));

-- 3. Update RLS policies for ticket_slots to use lower(auth.jwt() ->> 'email')
DROP POLICY IF EXISTS "Allow admin all on ticket_slots" ON public.ticket_slots;
CREATE POLICY "Allow admin all on ticket_slots" ON public.ticket_slots
    FOR ALL TO public USING (lower(auth.jwt() ->> 'email') IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'));
