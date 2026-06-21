import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log('--- Fetching Users Profile ---');
    const { data: users, error } = await supabase
        .from('users')
        .select('*');
    
    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.log('Total users registered in profile table:', users?.length);
        console.table(users);
    }
}

main();
