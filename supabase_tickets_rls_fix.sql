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

-- 4. Clean up any existing duplicate test tickets and add a unique constraint on email
DELETE FROM public.tickets a USING public.tickets b
WHERE a.id > b.id AND a.email = b.email;

ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_email_key;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_email_key UNIQUE (email);

-- 5. Seed / Update the new 5 Time Slots schedule
INSERT INTO public.ticket_slots (id, date_str, name_zh, name_en, time_range, max_tickets, booked_tickets)
VALUES 
('slot_1', '2027/1/9 (六)', '午後漫遊場(I)', 'Afternoon Stroll (I)', '12:00 - 14:30', 500, 0),
('slot_2', '2027/1/9 (六)', '午後漫遊場(II)', 'Afternoon Stroll (II)', '14:30 - 17:00', 500, 0),
('slot_3', '2027/1/10 (日)', '午後漫遊場(I)', 'Afternoon Stroll (I)', '12:00 - 14:30', 500, 0),
('slot_4', '2027/1/10 (日)', '午後漫遊場(II)', 'Afternoon Stroll (II)', '14:30 - 17:00', 500, 0),
('slot_5', '2027/1/10 (日)', '星光探索場(I)', 'Starlight Exploration (I)', '18:00 - 20:00', 500, 0)
ON CONFLICT (id) DO UPDATE SET
    date_str = EXCLUDED.date_str,
    name_zh = EXCLUDED.name_zh,
    name_en = EXCLUDED.name_en,
    time_range = EXCLUDED.time_range;
