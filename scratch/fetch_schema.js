import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function main() {
    const url = `${supabaseUrl}/rest/v1/`;
    try {
        const res = await fetch(url, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`
            }
        });
        const schema = await res.json();
        console.log('Response:', schema);
    } catch (e) {
        console.error('Error:', e);
    }
}

main();
