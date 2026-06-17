import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createSupabaseServerClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Safe to ignore in route handlers
                    }
                },
            },
        }
    );
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, slotId } = body;

        if (!email || !slotId) {
            return NextResponse.json({ error: 'Missing email or slotId' }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();

        // Check if waitlist record already exists
        const { data: existing } = await supabase
            .from('ticket_waitlist')
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .eq('slot_id', slotId)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ success: true, message: 'Already registered on the waitlist for this slot.' });
        }

        const { error } = await supabase
            .from('ticket_waitlist')
            .insert({
                email: email.toLowerCase().trim(),
                slot_id: slotId
            });

        if (error) {
            console.error('Failed to register on waitlist:', error);
            return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Successfully joined waitlist.' });
    } catch (err: any) {
        console.error('Waitlist registration API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
