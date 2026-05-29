-- VIS CRM Database Migration Script
-- Please run this in the Supabase SQL Editor

-- 1. Add CRM fields to the existing vip_allowlist table
ALTER TABLE vip_allowlist 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'VIP', -- Can be 'VIP', 'SVIP', 'Professional Buyer', 'Press', etc.
ADD COLUMN IF NOT EXISTS rsvp_status text DEFAULT 'Pending', -- Can be 'Pending', 'Confirmed', 'Declined'
ADD COLUMN IF NOT EXISTS last_engaged_at timestamp with time zone;

-- 2. Create the email_campaigns table to store scheduled/sent emails
CREATE TABLE IF NOT EXISTS email_campaigns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subject text NOT NULL,
    content text NOT NULL,
    target_role text DEFAULT 'All', -- 'All', 'Professional Buyer', 'VIP', etc.
    status text DEFAULT 'Draft', -- 'Draft', 'Scheduled', 'Sent'
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by text -- Email of the admin who created it
);

-- 3. Create an email_logs table to track who received what (Optional but good for CRM)
CREATE TABLE IF NOT EXISTS email_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id uuid REFERENCES email_campaigns(id) ON DELETE CASCADE,
    recipient_email text NOT NULL,
    sent_at timestamp with time zone DEFAULT now(),
    opened_at timestamp with time zone
);

-- 4. Enable Row Level Security (RLS) for the new tables
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create basic policies for admins (assuming only authenticated admins can access)
-- Note: Replace with your actual admin email or role logic if different
CREATE POLICY "Admins can do everything on email_campaigns" 
ON email_campaigns FOR ALL 
USING (auth.email() IN ('artwithlifetaipei@gmail.com'));

CREATE POLICY "Admins can do everything on email_logs" 
ON email_logs FOR ALL 
USING (auth.email() IN ('artwithlifetaipei@gmail.com'));
