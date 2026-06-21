import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    const { data, error } = await supabase
        .from('vip_allowlist')
        .select('tier')
        .limit(100);
    
    if (error) {
        console.error('Error fetching tiers:', error);
    } else {
        const tiers = new Set(data.map(d => d.tier));
        console.log('Unique tiers in vip_allowlist:', Array.from(tiers));
        console.log('Tiers list:', data.slice(0, 10));
    }
}

main();
