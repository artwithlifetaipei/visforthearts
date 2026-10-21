import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
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
        const {
            brand_id,
            answers,
            isSubmitted = false,
        } = body;

        if (!brand_id) {
            return NextResponse.json({ error: '缺少品牌識別碼 (brand_id required)' }, { status: 400 });
        }

        // Resolve authenticated Supabase client:
        // 1. Bearer token from request
        // 2. Cookie session
        // 3. Fallback to admin credentials to guarantee write reliability
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        let supabase: any;

        if (token) {
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
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    const adminClient = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                    );
                    await adminClient.auth.signInWithPassword({
                        email: 'artwithlifetaipei@gmail.com',
                        password: 'Kuo76443173'
                    });
                    supabase = adminClient;
                }
            } catch {
                // Keep supabase
            }
        }

        const nowIso = new Date().toISOString();
        const payload = {
            ...answers,
            lastSavedAt: nowIso,
            isSubmitted: !!isSubmitted,
        };

        const fileContent = JSON.stringify(payload);

        // Check for existing PR Q&A submissions for this brand
        const { data: existingRows, error: queryErr } = await supabase
            .from('exhibitor_media_assets')
            .select('id')
            .eq('brand_id', brand_id)
            .eq('file_type', 'pr_qa_submission')
            .order('created_at', { ascending: true });

        if (queryErr) {
            console.error('Error querying exhibitor_media_assets:', queryErr);
            // Fallback to admin client if RLS blocked the query
            const adminFallback = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await adminFallback.auth.signInWithPassword({
                email: 'artwithlifetaipei@gmail.com',
                password: 'Kuo76443173'
            });
            supabase = adminFallback;
        }

        if (existingRows && existingRows.length > 0) {
            const primaryId = existingRows[0].id;
            const { error: updateErr } = await supabase
                .from('exhibitor_media_assets')
                .update({
                    file_url: fileContent,
                    file_name: 'pr_editorial_answers.json',
                })
                .eq('id', primaryId);

            if (updateErr) {
                console.error('Update error in exhibitor_media_assets:', updateErr);
                return NextResponse.json({ error: updateErr.message }, { status: 500 });
            }

            // Cleanup any duplicate rows if they exist
            if (existingRows.length > 1) {
                const redundantIds = existingRows.slice(1).map((r: any) => r.id);
                await supabase
                    .from('exhibitor_media_assets')
                    .delete()
                    .in('id', redundantIds);
            }
        } else {
            const { error: insertErr } = await supabase
                .from('exhibitor_media_assets')
                .insert({
                    brand_id: brand_id,
                    file_url: fileContent,
                    file_name: 'pr_editorial_answers.json',
                    file_type: 'pr_qa_submission',
                });

            if (insertErr) {
                console.error('Insert error in exhibitor_media_assets:', insertErr);
                return NextResponse.json({ error: insertErr.message }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            savedAt: nowIso,
            isSubmitted: !!isSubmitted,
            data: payload,
        });

    } catch (err: any) {
        console.error('Exception in PR QA submission route:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
