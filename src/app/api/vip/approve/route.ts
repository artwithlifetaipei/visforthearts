import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const ADMIN_EMAILS = ['artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'];

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
        const { applicationEmail, action } = body; // action can be 'approve' or 'reject'

        if (!applicationEmail || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Authenticate that the actor is indeed an admin
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];
        
        let supabase;
        if (token) {
            // Build a client hardcoded with the Bearer token in global headers.
            // This guarantees the database sees the JWT and executes RLS policies correctly.
            supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    global: {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                }
            );
        } else {
            supabase = await createSupabaseServerClient();
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user || !ADMIN_EMAILS.includes(user.email?.toLowerCase().trim() ?? '')) {
            return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
        }

        const targetEmail = applicationEmail.toLowerCase().trim();

        if (action === 'approve') {
            // 2. Set status to Approved (and fetch returned data to confirm row change)
            const { data: updateData, error: updateError } = await supabase
                .from('vip_allowlist')
                .update({ status: 'Approved' })
                .ilike('email', targetEmail)
                .select();

            if (updateError || !updateData || updateData.length === 0) {
                console.error('Database update error:', updateError);
                return NextResponse.json({ 
                    error: `Update failed: ${updateError?.message || 'No rows updated. Make sure RLS policy allows this action.'}` 
                }, { status: 500 });
            }

            // 3. Dispatch the Magic Link (OTP) directly
            const { error: otpError } = await supabase.auth.signInWithOtp({
                email: targetEmail,
                options: {
                    emailRedirectTo: `${new URL(req.url).origin}/vip/onboarding`,
                    shouldCreateUser: true
                }
            });

            if (otpError) {
                console.warn('Magic link send warning (User status is Approved but email might have failed):', otpError);
                return NextResponse.json({ 
                    success: true, 
                    message: 'VIP status approved, but failed to auto-send magic link. User can now login manually.' 
                });
            }

            return NextResponse.json({ 
                success: true, 
                message: 'VIP status approved and magic link sent successfully.' 
            });

        } else if (action === 'reject') {
            // Set status to Rejected
            const { data: updateData, error: updateError } = await supabase
                .from('vip_allowlist')
                .update({ status: 'Rejected' })
                .ilike('email', targetEmail)
                .select();

            if (updateError || !updateData || updateData.length === 0) {
                console.error('Database update error during rejection:', updateError);
                return NextResponse.json({ 
                    error: `Rejection failed: ${updateError?.message || 'No rows updated. Make sure RLS policy allows this action.'}` 
                }, { status: 500 });
            }

            return NextResponse.json({ 
                success: true, 
                message: 'VIP status rejected successfully.' 
            });
        }

        return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });

    } catch (err: any) {
        console.error('VIP approval error:', err);
        return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
    }
}
