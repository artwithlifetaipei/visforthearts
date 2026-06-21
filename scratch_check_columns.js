import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    const { data, error } = await supabase
        .from('rewards')
        .select('id, user_email, user_name')
        .limit(1);
    
    if (error) {
        console.error('Error fetching columns:', error);
    } else {
        console.log('Columns user_email and user_name exist! Query result:', data);
    }
}

main();
