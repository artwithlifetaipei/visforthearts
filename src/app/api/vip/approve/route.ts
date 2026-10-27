import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const ADMIN_EMAILS = [
    'artwithlifetaipei@gmail.com',
    'ameliecykuo@gmail.com',
    'amelie@theartpressasia.com',
    'visvipteam@gmail.com',
];

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
        const { applicationEmail, action, tier } = body; // action can be 'approve' or 'reject', tier can be 'VIP' or 'SVIP'

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
            // 2. Set status to Approved (and optionally set tier)
            const updateFields: any = { status: 'Approved' };
            if (tier === 'VIP' || tier === 'SVIP') {
                updateFields.tier = tier;
            }

            const { data: updateData, error: updateError } = await supabase
                .from('vip_allowlist')
                .update(updateFields)
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

        } else if (action === 'update_tier') {
            if (tier !== 'VIP' && tier !== 'SVIP') {
                return NextResponse.json({ error: 'Invalid tier specified. Must be VIP or SVIP.' }, { status: 400 });
            }

            const { data: existingRows, error: checkErr } = await supabase
                .from('vip_allowlist')
                .select('id, email')
                .ilike('email', targetEmail);

            if (checkErr) {
                return NextResponse.json({ error: `Query failed: ${checkErr.message}` }, { status: 500 });
            }

            if (existingRows && existingRows.length > 0) {
                const { data: updateData, error: updateError } = await supabase
                    .from('vip_allowlist')
                    .update({ tier })
                    .ilike('email', targetEmail)
                    .select();

                if (updateError || !updateData || updateData.length === 0) {
                    console.error('Database update error during tier change:', updateError);
                    return NextResponse.json({
                        error: `Tier update failed: ${updateError?.message || 'No rows updated.'}`
                    }, { status: 500 });
                }
            } else {
                const { error: insertError } = await supabase
                    .from('vip_allowlist')
                    .insert({
                        email: targetEmail,
                        tier,
                        status: 'Approved',
                        role: 'VIP',
                        rsvp_status: 'Confirmed'
                    });

                if (insertError) {
                    return NextResponse.json({
                        error: `Tier insert failed: ${insertError.message}`
                    }, { status: 500 });
                }
            }

            // Optional sync with exhibitor_vip_submissions if this email was invited by a brand
            try {
                const { data: subRows } = await supabase
                    .from('exhibitor_vip_submissions')
                    .select('id, vip_surname')
                    .ilike('vip_email', targetEmail);

                if (subRows && subRows.length > 0) {
                    for (const sub of subRows) {
                        const cleanSurname = (sub.vip_surname || '')
                            .replace(/\s*\((S?VIP)\)/gi, '')
                            .replace(/\s*\[(S?VIP)\]/gi, '')
                            .trim();
                        const newSurname = tier === 'SVIP' ? `${cleanSurname} (SVIP)` : cleanSurname;
                        await supabase
                            .from('exhibitor_vip_submissions')
                            .update({ vip_surname: newSurname })
                            .eq('id', sub.id);
                    }
                }
            } catch (syncErr) {
                console.warn('Optional exhibitor_vip_submissions sync warning:', syncErr);
            }

            return NextResponse.json({
                success: true,
                tier,
                message: `Guest tier updated to ${tier} successfully.`
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
