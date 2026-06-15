import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log('--- Rewards Table Diagnostic ---');
    
    // 1. Fetch rewards
    const { data: rewards, error: err1 } = await supabase
        .from('rewards')
        .select('*')
        .limit(5);
    
    if (err1) {
        console.error('Error fetching rewards:', err1);
    } else {
        console.log('Rewards fetched successfully:', rewards);
    }

    // 2. Test inserting a reward for one of the valid user IDs in allowlist
    // Valid ID from diagnostic: '67ab7f8a-f781-4b0d-a0c6-8fe965d63638'
    const testUserId = '67ab7f8a-f781-4b0d-a0c6-8fe965d63638';
    const rewardTypeStr = 'Test Reward Insert';
    
    console.log(`\nAttempting to insert test reward for user: ${testUserId}...`);
    const { data: newReward, error: err2 } = await supabase
        .from('rewards')
        .insert({
            user_id: testUserId,
            reward_type: rewardTypeStr
        })
        .select()
        .single();

    if (err2) {
        console.error('Error inserting reward:', err2);
    } else {
        console.log('Reward inserted successfully:', newReward);
        
        // Clean up
        const { error: err3 } = await supabase
            .from('rewards')
            .delete()
            .eq('id', newReward.id);
        if (err3) {
            console.error('Error cleaning up test reward:', err3);
        } else {
            console.log('Cleaned up test reward.');
        }
    }
}

main();
