import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Query a single record to trigger database connection & activity
        const { data, error } = await supabase
            .from('vip_allowlist')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Keep-alive database query error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Database connection active.',
            timestamp: new Date().toISOString() 
        });
    } catch (err: any) {
        console.error('Keep-alive unexpected error:', err);
        return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
    }
}
