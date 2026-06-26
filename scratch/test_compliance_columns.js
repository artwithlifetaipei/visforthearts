import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log('Testing mock insert into exhibitor_compliance to verify columns...');
    const payload = {
        brand_id: '00000000-0000-0000-0000-000000000000',
        rule_booth: true,
        rule_conduct: true,
        rule_liability: true,
        rule_exit: true,
        rule_ip: true,
        rule_deposit_forfeiture: true,
        rule_damage_compensation: true,
        rule_refund_policy: true,
        rule_return_inspection: true
    };

    const { error } = await supabase
        .from('exhibitor_compliance')
        .insert(payload);

    if (error) {
        console.log('Insert response message:', error.message);
        console.log('Insert response details:', error.details);
    } else {
        console.log('Insert succeeded (unexpected since brand_id does not exist).');
    }
}

main();
