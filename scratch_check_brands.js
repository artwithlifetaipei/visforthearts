import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
    console.log('Testing query on vip_blind_box_brands...');
    try {
        const { data, error } = await supabase
            .from('vip_blind_box_brands')
            .select('*');
        
        if (error) {
            console.error('Query failed with error:', error);
        } else {
            console.log('Query succeeded!');
            console.log('Data:', data);
        }
    } catch (err) {
        console.error('Exception caught:', err);
    }
}

testQuery();
