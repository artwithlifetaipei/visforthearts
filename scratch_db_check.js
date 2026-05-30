import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log('--- DB Diagnostic ---');
    console.log('Supabase URL:', supabaseUrl);
    
    // 1. Fetch Allowlist
    const { data: allowlist, error: err1 } = await supabase
        .from('vip_allowlist')
        .select('*');
    
    if (err1) {
        console.error('Error fetching vip_allowlist:', err1);
    } else {
        console.log('VIP Allowlist count:', allowlist?.length);
        console.log('VIP Allowlist items:');
        console.table(allowlist);
    }

    // 2. Fetch Campaigns
    const { data: campaigns, error: err2 } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (err2) {
        console.error('Error fetching email_campaigns:', err2);
    } else {
        console.log('\nEmail Campaigns:');
        console.table(campaigns?.map(c => ({
            id: c.id,
            subject: c.subject,
            status: c.status,
            target_role: c.target_role,
            sent_at: c.sent_at
        })));
    }

    // 3. Fetch Email Logs
    const { data: logs, error: err3 } = await supabase
        .from('email_logs')
        .select('*');
    
    if (err3) {
        console.error('Error fetching email_logs:', err3);
    } else {
        console.log('\nEmail Logs:');
        console.table(logs);
    }
}

main();
