import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
        console.error('getAdminClient auth error in assets route:', error);
        return adminClient;
    }

    cachedAdminClient = adminClient;
    cachedAdminExpiresAt = now + 30 * 60 * 1000;
    return adminClient;
}

const SYSTEM_FILE_TYPES = [
    'brand_logo_transparent',
    'pr_qa_submission',
    'booth_fee_proof',
    'compliance_contract',
    'perspective_store_master',
    'concierge_lead',
    'brand_profile_ext',
];

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
            return NextResponse.json({ error: 'Missing brand_id or email' }, { status: 400 });
        }

        const adminDb = await getAdminClient();
        const targetBrandId = await resolveValidBrandId(adminDb, brandId, email);

        if (!targetBrandId) {
            return NextResponse.json({ success: true, logo: null, assets: [] });
        }

        const { data: list, error } = await adminDb
            .from('exhibitor_media_assets')
            .select('*')
            .eq('brand_id', targetBrandId)
            .not('file_type', 'in', '("pr_qa_submission","booth_fee_proof","compliance_contract","perspective_store_master","concierge_lead","brand_profile_ext")')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching exhibitor_media_assets:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const rawList = list || [];
        const logo = rawList.find((a: any) => a.file_type === 'brand_logo_transparent') || null;
        const photos = rawList.filter((a: any) => !SYSTEM_FILE_TYPES.includes(a.file_type));

        return NextResponse.json({
            success: true,
            logo,
            assets: photos,
        });

    } catch (err: any) {
        console.error('Exception in GET /api/exhibitor/media/assets:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            brand_id,
            file_name,
            file_type,
            file_base64,
        } = body;

        if (!brand_id || !file_base64) {
            return NextResponse.json({ error: '缺少必填參數 (brand_id and file_base64 required)' }, { status: 400 });
        }

        // Basic sanity check on payload size (approx 15MB max)
        if (typeof file_base64 === 'string' && file_base64.length > 20 * 1024 * 1024) {
            return NextResponse.json({ error: '圖檔過大，請壓縮至 12MB 以內後再上傳。' }, { status: 400 });
        }

        const adminDb = await getAdminClient();
        const resolvedBrandId = (await resolveValidBrandId(adminDb, brand_id, body.email)) || brand_id;
        const nowIso = new Date().toISOString();

        if (file_type === 'brand_logo_transparent') {
            // Find existing logo asset
            const { data: existingLogo } = await adminDb
                .from('exhibitor_media_assets')
                .select('id')
                .eq('brand_id', resolvedBrandId)
                .eq('file_type', 'brand_logo_transparent')
                .maybeSingle();

            let savedLogo: any = null;
            if (existingLogo?.id) {
                const { data, error } = await adminDb
                    .from('exhibitor_media_assets')
                    .update({
                        file_url: file_base64,
                        file_name: file_name || 'brand_logo.png',
                        created_at: nowIso,
                    })
                    .eq('id', existingLogo.id)
                    .select()
                    .single();

                if (error) {
                    console.error('Error updating brand logo:', error);
                    return NextResponse.json({ error: `更新 Logo 失敗: ${error.message}` }, { status: 500 });
                }
                savedLogo = data;
            } else {
                const { data, error } = await adminDb
                    .from('exhibitor_media_assets')
                    .insert({
                        brand_id: resolvedBrandId,
                        file_url: file_base64,
                        file_name: file_name || 'brand_logo.png',
                        file_type: 'brand_logo_transparent',
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('Error inserting brand logo:', error);
                    return NextResponse.json({ error: `上傳 Logo 失敗: ${error.message}` }, { status: 500 });
                }
                savedLogo = data;
            }

            return NextResponse.json({
                success: true,
                asset: savedLogo,
            });

        } else {
            // General visual photo upload
            // Check existing photo assets count (max 5)
            const { data: existingPhotos, error: countErr } = await adminDb
                .from('exhibitor_media_assets')
                .select('id')
                .eq('brand_id', resolvedBrandId)
                .not('file_type', 'in', '("brand_logo_transparent","pr_qa_submission","booth_fee_proof","compliance_contract","perspective_store_master","concierge_lead","brand_profile_ext")');

            if (!countErr && existingPhotos && existingPhotos.length >= 5) {
                return NextResponse.json({ error: '最多僅能上傳 5 張媒體素材圖檔。' }, { status: 400 });
            }

            const { data, error: insErr } = await adminDb
                .from('exhibitor_media_assets')
                .insert({
                    brand_id: resolvedBrandId,
                    file_url: file_base64,
                    file_name: file_name || 'brand_visual.png',
                    file_type: file_type || 'image/png',
                })
                .select()
                .single();

            if (insErr) {
                console.error('Error inserting media visual asset:', insErr);
                return NextResponse.json({ error: `上傳圖檔失敗: ${insErr.message}` }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                asset: data,
            });
        }

    } catch (err: any) {
        console.error('Exception in POST /api/exhibitor/media/assets:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        let assetId: string | null = null;
        let brandId: string | null = null;

        // Try parsing JSON body first, or fallback to URL search params
        try {
            const body = await req.json();
            assetId = body.id || null;
            brandId = body.brand_id || null;
        } catch {
            const { searchParams } = new URL(req.url);
            assetId = searchParams.get('id');
            brandId = searchParams.get('brand_id');
        }

        if (!assetId) {
            return NextResponse.json({ error: '缺少圖檔識別碼 (id required)' }, { status: 400 });
        }

        const adminDb = await getAdminClient();

        let query = adminDb
            .from('exhibitor_media_assets')
            .delete()
            .eq('id', assetId);

        if (brandId) {
            query = query.eq('brand_id', brandId);
        }

        const { error } = await query;

        if (error) {
            console.error('Error deleting media asset:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: assetId });

    } catch (err: any) {
        console.error('Exception in DELETE /api/exhibitor/media/assets:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
