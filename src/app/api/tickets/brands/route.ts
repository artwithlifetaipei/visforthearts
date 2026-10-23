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

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export type PublicBrandItem = {
    id: string;
    name_zh: string;
    name_en: string;
    instagram_handle: string;
    slug: string;
    is_ticket_brand: boolean;
};

export async function GET() {
    try {
        const supabase = await createSupabaseServerClient();

        // 1. Fetch ticket_brands (legacy & official)
        const { data: ticketBrands } = await supabase
            .from('ticket_brands')
            .select('*')
            .order('name_zh', { ascending: true });

        // 2. Fetch approved exhibitor applications
        const { data: approvedApps } = await supabase
            .from('exhibitor_applications')
            .select('id, brand_name_zh, brand_name_en, instagram_handle')
            .eq('status', 'approved');

        const brandMap = new Map<string, PublicBrandItem>();

        // Always include Official VIS Invitation Channel first
        brandMap.set('vis-official', {
            id: 'vis-official',
            name_zh: 'VIS Contemporary Culture 大會官方',
            name_en: 'VIS Contemporary Culture',
            instagram_handle: '@visforthearts',
            slug: 'vis',
            is_ticket_brand: false,
        });

        // Add approved applications
        if (approvedApps) {
            for (const app of approvedApps) {
                const zh = (app.brand_name_zh || '').trim();
                const en = (app.brand_name_en || '').trim();
                const ig = (app.instagram_handle || '').trim();
                const primarySlug = slugify(en || zh || app.id);

                brandMap.set(app.id, {
                    id: app.id,
                    name_zh: zh || en,
                    name_en: en,
                    instagram_handle: ig ? (ig.startsWith('@') ? ig : `@${ig}`) : '@visforthearts',
                    slug: primarySlug,
                    is_ticket_brand: false,
                });
            }
        }

        // Add ticket_brands
        if (ticketBrands) {
            for (const tb of ticketBrands) {
                const zh = (tb.name_zh || '').trim();
                const en = (tb.name_en || '').trim();
                const ig = (tb.instagram_handle || '').trim();
                const primarySlug = slugify(en || zh || tb.id);

                // If brand already exists with similar name, mark as ticket_brand = true
                brandMap.set(tb.id, {
                    id: tb.id,
                    name_zh: zh,
                    name_en: en,
                    instagram_handle: ig ? (ig.startsWith('@') ? ig : `@${ig}`) : '@visforthearts',
                    slug: primarySlug,
                    is_ticket_brand: true,
                });
            }
        }

        const brands = Array.from(brandMap.values());

        return NextResponse.json({
            success: true,
            brands,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            }
        });
    } catch (err: any) {
        console.error('Failed to get ticket brands:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
