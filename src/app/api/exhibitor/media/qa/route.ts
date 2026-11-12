import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatFriendlyError } from '@/lib/friendlyError';

export const dynamic = 'force-dynamic';

let cachedAdminClient: any = null;
let cachedAdminExpiresAt = 0;

async function getAdminClient() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
        return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    }

    const now = Date.now();
    if (cachedAdminClient && cachedAdminExpiresAt > now) {
        return cachedAdminClient;
    }

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        }
    );

    const { error } = await adminClient.auth.signInWithPassword({
        email: 'artwithlifetaipei@gmail.com',
        password: 'Kuo76443173'
    });

    if (error) {
        console.error('getAdminClient auth error:', error);
        // Return without cache on failure
        return adminClient;
    }

    cachedAdminClient = adminClient;
    cachedAdminExpiresAt = now + 30 * 60 * 1000; // Cache 30 mins
    return adminClient;
}

async function resolveValidBrandId(adminDb: any, brandId?: string | null, email?: string | null): Promise<string | null> {
    if (brandId) {
        const { data: brand } = await adminDb
            .from('exhibitor_brands')
            .select('id')
            .eq('id', brandId)
            .maybeSingle();
        if (brand?.id) return brand.id;

        const { data: brandByApp } = await adminDb
            .from('exhibitor_brands')
            .select('id')
            .eq('application_id', brandId)
            .limit(1)
            .maybeSingle();
        if (brandByApp?.id) return brandByApp.id;

        const { data: app } = await adminDb
            .from('exhibitor_applications')
            .select('*')
            .eq('id', brandId)
            .maybeSingle();
        if (app) {
            const cleanEmail = (email || app.contact_email || '').toLowerCase().trim();
            if (cleanEmail) {
                const { data: existingByEmail } = await adminDb
                    .from('exhibitor_brands')
                    .select('id')
                    .ilike('portal_email', cleanEmail)
                    .limit(1)
                    .maybeSingle();
                if (existingByEmail?.id) return existingByEmail.id;

                const { data: created } = await adminDb
                    .from('exhibitor_brands')
                    .insert({
                        application_id: app.id,
                        brand_name_zh: app.brand_name_zh,
                        brand_name_en: app.brand_name_en || app.brand_name_zh,
                        zone_id: app.zone_id || 'artsy',
                        booth_type: app.booth_type || 'A01',
                        is_micro_exposure: app.booth_type === 'T',
                        portal_email: cleanEmail,
                        custom_fee: app.custom_fee ?? null,
                        discount_note: app.discount_note ?? null,
                    })
                    .select('id')
                    .maybeSingle();
                if (created?.id) return created.id;
            }
        }
    }

    if (email) {
        const cleanEmail = email.toLowerCase().trim();
        const { data: brand } = await adminDb
            .from('exhibitor_brands')
            .select('id')
            .ilike('portal_email', cleanEmail)
            .limit(1)
            .maybeSingle();
        if (brand?.id) return brand.id;
    }

    return brandId || null;
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const brandId = searchParams.get('brand_id');
        const email = searchParams.get('email');

        if (!brandId && !email) {
            return NextResponse.json({ error: '缺少品牌識別碼或信箱 (brand_id or email required)' }, { status: 400 });
        }

        const adminDb = await getAdminClient();
        const targetBrandId = await resolveValidBrandId(adminDb, brandId, email);

        if (!targetBrandId) {
            return NextResponse.json({ success: true, exists: false, data: null });
        }

        const { data: qaAsset, error } = await adminDb
            .from('exhibitor_media_assets')
            .select('*')
            .eq('brand_id', targetBrandId)
            .eq('file_type', 'pr_qa_submission')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching QA submission:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!qaAsset || !qaAsset.file_url) {
            return NextResponse.json({ success: true, exists: false, data: null });
        }

        let parsedData: any = null;
        try {
            parsedData = JSON.parse(qaAsset.file_url);
        } catch {
            parsedData = null;
        }

        return NextResponse.json({
            success: true,
            exists: !!parsedData,
            data: parsedData,
            savedAt: qaAsset.created_at,
        });

    } catch (err: any) {
        console.error('Exception in GET /api/exhibitor/media/qa:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
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

        const adminDb = await getAdminClient();
        const resolvedBrandId = (await resolveValidBrandId(adminDb, brand_id, body.email)) || brand_id;

        let filledCount = 0;
        ['q1', 'q2', 'q3', 'q4', 'q5'].forEach(k => {
            if ((answers?.[k] || '').trim().length > 0) filledCount += 1;
        });

        if (isSubmitted && filledCount === 0) {
            return NextResponse.json({ error: '請至少填寫一題題目後再點擊確認完成。' }, { status: 400 });
        }

        const nowIso = new Date().toISOString();
        const payload = {
            ...answers,
            filledCount,
            lastSavedAt: nowIso,
            isSubmitted: !!isSubmitted && filledCount > 0,
        };

        const fileContent = JSON.stringify(payload);

        // Check for existing PR Q&A submissions for this brand
        const { data: existingRows, error: queryErr } = await adminDb
            .from('exhibitor_media_assets')
            .select('id')
            .eq('brand_id', resolvedBrandId)
            .eq('file_type', 'pr_qa_submission')
            .order('created_at', { ascending: true });

        if (queryErr) {
            console.error('Error querying exhibitor_media_assets in QA POST:', queryErr);
            return NextResponse.json({ error: queryErr.message }, { status: 500 });
        }

        if (existingRows && existingRows.length > 0) {
            const primaryId = existingRows[0].id;
            const { error: updateErr } = await adminDb
                .from('exhibitor_media_assets')
                .update({
                    file_url: fileContent,
                    file_name: 'pr_editorial_answers.json',
                    created_at: nowIso,
                })
                .eq('id', primaryId);

            if (updateErr) {
                console.error('Update error in exhibitor_media_assets:', updateErr);
                return NextResponse.json({ error: formatFriendlyError(updateErr, '儲存公關專訪回稿') }, { status: 500 });
            }

            // Cleanup any duplicate rows if they exist
            if (existingRows.length > 1) {
                const redundantIds = existingRows.slice(1).map((r: any) => r.id);
                await adminDb
                    .from('exhibitor_media_assets')
                    .delete()
                    .in('id', redundantIds);
            }
        } else {
            const { error: insertErr } = await adminDb
                .from('exhibitor_media_assets')
                .insert({
                    brand_id: resolvedBrandId,
                    file_url: fileContent,
                    file_name: 'pr_editorial_answers.json',
                    file_type: 'pr_qa_submission',
                });

            if (insertErr) {
                console.error('Insert error in exhibitor_media_assets:', insertErr);
                return NextResponse.json({ error: formatFriendlyError(insertErr, '儲存公關專訪回稿') }, { status: 500 });
            }
        }

        return NextResponse.json({
            success: true,
            savedAt: nowIso,
            isSubmitted: !!isSubmitted,
            data: payload,
        });

    } catch (err: any) {
        console.error('Exception in POST /api/exhibitor/media/qa:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
