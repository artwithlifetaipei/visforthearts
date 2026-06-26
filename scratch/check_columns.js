import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log('--- Checking exhibitor_applications ---');
    const { data: apps, error: err1 } = await supabase
        .from('exhibitor_applications')
        .select('*')
        .limit(1);
    if (err1) console.error('Error:', err1);
    else console.log('Columns:', Object.keys(apps[0] || {}));

    console.log('\n--- Checking exhibitor_compliance ---');
    const { data: comp, error: err2 } = await supabase
        .from('exhibitor_compliance')
        .select('*')
        .limit(1);
    if (err2) console.error('Error:', err2);
    else console.log('Columns:', Object.keys(comp[0] || {}));

    console.log('\n--- Checking exhibitor_brands ---');
    const { data: brands, error: err3 } = await supabase
        .from('exhibitor_brands')
        .select('*')
        .limit(1);
    if (err3) console.error('Error:', err3);
    else console.log('Columns:', Object.keys(brands[0] || {}));
}

main();
