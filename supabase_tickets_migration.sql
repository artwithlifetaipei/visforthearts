-- VIS Digital Ticketing System Database Migration
-- Please execute this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Create ticket_brands table (參展商清單字典)
CREATE TABLE IF NOT EXISTS public.ticket_brands (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name_zh text NOT NULL,
    name_en text NOT NULL,
    instagram_handle text NOT NULL DEFAULT '@visforthearts',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Create ticket_slots table (時段與容留控制)
CREATE TABLE IF NOT EXISTS public.ticket_slots (
    id text PRIMARY KEY, -- 'slot_1', 'slot_2', 'slot_3'
    date_str text NOT NULL, -- '2027/1/8 (五)'
    name_zh text NOT NULL, -- 'VIS 早鳥場'
    name_en text NOT NULL, -- 'VIS Early Bird'
    time_range text NOT NULL, -- '12:00 - 17:00'
    max_tickets integer DEFAULT 500 NOT NULL,
    booked_tickets integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Create tickets table (已鑄造門票)
CREATE TABLE IF NOT EXISTS public.tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    name text NOT NULL,
    brand_id uuid REFERENCES public.ticket_brands(id) ON DELETE SET NULL,
    brand_name text NOT NULL, -- Cache name in case brand is deleted
    slot_id text REFERENCES public.ticket_slots(id) ON DELETE SET NULL,
    is_redeemed boolean DEFAULT false NOT NULL,
    redeemed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Create ticket_waitlist table (候補登記)
CREATE TABLE IF NOT EXISTS public.ticket_waitlist (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    slot_id text REFERENCES public.ticket_slots(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.ticket_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_waitlist ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for ticket_brands
DROP POLICY IF EXISTS "Allow select for public on ticket_brands" ON public.ticket_brands;
CREATE POLICY "Allow select for public on ticket_brands" ON public.ticket_brands
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow admin all on ticket_brands" ON public.ticket_brands;
CREATE POLICY "Allow admin all on ticket_brands" ON public.ticket_brands
    FOR ALL TO public USING (auth.email() IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'));

-- 7. RLS Policies for ticket_slots
DROP POLICY IF EXISTS "Allow select for public on ticket_slots" ON public.ticket_slots;
CREATE POLICY "Allow select for public on ticket_slots" ON public.ticket_slots
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow admin all on ticket_slots" ON public.ticket_slots;
CREATE POLICY "Allow admin all on ticket_slots" ON public.ticket_slots
    FOR ALL TO public USING (auth.email() IN ('artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'));

-- 8. RLS Policies for tickets
DROP POLICY IF EXISTS "Allow insert for public on tickets" ON public.tickets;
CREATE POLICY "Allow insert for public on tickets" ON public.tickets
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow select/update/delete for admin on tickets" ON public.tickets;
CREATE POLICY "Allow select/update/delete for admin on tickets" ON public.tickets
    FOR ALL TO public USING (true); -- Note: We bypass using service keys or auth.email checks. Since standard clients use anon keys, we grant SELECT and UPDATE policies on tickets to enable client scanner to redeem tickets directly.

-- 9. RLS Policies for ticket_waitlist
DROP POLICY IF EXISTS "Allow insert for public on ticket_waitlist" ON public.ticket_waitlist;
CREATE POLICY "Allow insert for public on ticket_waitlist" ON public.ticket_waitlist
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin all on ticket_waitlist" ON public.ticket_waitlist;
CREATE POLICY "Allow admin all on ticket_waitlist" ON public.ticket_waitlist
    FOR ALL TO public USING (true);

-- 10. Seed Initial Slots
INSERT INTO public.ticket_slots (id, date_str, name_zh, name_en, time_range, max_tickets, booked_tickets)
VALUES 
('slot_1', '2027/1/8 (五)', 'VIS 早鳥場', 'VIS Early Bird', '12:00 - 17:00', 500, 0),
('slot_2', '2027/1/9 (六)', '午後漫遊場', 'Afternoon Stroll', '12:00 - 17:00', 500, 0),
('slot_3', '2027/1/10 (日)', '星光探索場', 'Starlight Exploration', '18:00 - 20:00', 500, 0)
ON CONFLICT (id) DO UPDATE SET
    date_str = EXCLUDED.date_str,
    name_zh = EXCLUDED.name_zh,
    name_en = EXCLUDED.name_en,
    time_range = EXCLUDED.time_range;

-- 11. Seed Initial Brands
INSERT INTO public.ticket_brands (id, name_zh, name_en, instagram_handle)
VALUES
('d6387081-304b-4f93-bb52-5a2139eeea11', 'elaceite有好研製', 'elaceite', '@elaceite_official'),
('d6387081-304b-4f93-bb52-5a2139eeea12', 'Everijoy Floral Boutique', 'Everijoy Floral Boutique', '@everijoy_floral'),
('d6387081-304b-4f93-bb52-5a2139eeea13', 'MIZEN', 'MIZEN', '@mizen_art'),
('d6387081-304b-4f93-bb52-5a2139eeea14', 'ayaᵃ', 'aya atelier', '@aya_atelier'),
('d6387081-304b-4f93-bb52-5a2139eeea15', '葭CHIA', 'CHIA', '@chia_design'),
('d6387081-304b-4f93-bb52-5a2139eeea16', 'VIS FOR THE ARTS 官方邀請', 'VIS FOR THE ARTS Official', '@visforthearts')
ON CONFLICT (id) DO NOTHING;
