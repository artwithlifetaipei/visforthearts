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

const KNOWN_BRAND_IGS: Record<string, string> = {
    'looom': '@looomasia',
    'looom-club': '@looomasia',
    'looomasia': '@looomasia',
    'looom club邀請': '@looomasia',
    'pumpkin-vintage-watches': '@nangua.vintage.watches',
    'nangua': '@nangua.vintage.watches',
    '南瓜鐘錶': '@nangua.vintage.watches',
    'reborn-antique': '@reborn_antique_store',
    'reborn antique 古董雜貨鋪': '@reborn_antique_store',
    'dan-retro-furniture': '@dan_decoantique_',
    'dan retro & furniture': '@dan_decoantique_',
    'j-l-jewelry': '@jl_jewelry2020',
    '詠聆珠寶': '@jl_jewelry2020',
    'aaa': '@theartpressasia',
};

function extractIgHandle(urlOrHandle: string | null | undefined, fallbackKey?: string): string {
    if (fallbackKey) {
        const normKey = fallbackKey.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '');
        if (KNOWN_BRAND_IGS[normKey]) return KNOWN_BRAND_IGS[normKey];
        if (KNOWN_BRAND_IGS[fallbackKey.toLowerCase().trim()]) return KNOWN_BRAND_IGS[fallbackKey.toLowerCase().trim()];
    }

    if (!urlOrHandle) return '@visforthearts';
    let clean = urlOrHandle.trim();
    if (!clean) return '@visforthearts';

    const lower = clean.toLowerCase();
    for (const [key, ig] of Object.entries(KNOWN_BRAND_IGS)) {
        if (lower.includes(key)) return ig;
    }

    if (clean.includes('instagram.com/')) {
        const after = clean.split('instagram.com/')[1];
        if (after) {
            const handle = after.split('/')[0].split('?')[0].split('&')[0].replace(/^@/, '').trim();
            if (handle) return `@${handle}`;
        }
    }

    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.includes('.com') || clean.includes('.net') || clean.includes('.org') || clean.includes('/')) {
        return '@visforthearts';
    }

    clean = clean.replace(/^@+/, '').split('?')[0].split('/')[0].trim();
    return clean ? `@${clean}` : '@visforthearts';
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

        // 2. Fetch approved exhibitor applications (column is instagram_url)
        const { data: approvedApps, error: appsErr } = await supabase
            .from('exhibitor_applications')
            .select('id, brand_name_zh, brand_name_en, instagram_url')
            .eq('status', 'approved');

        if (appsErr) {
            console.error('Error fetching approved exhibitor_applications:', appsErr);
        }

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
                const ig = extractIgHandle(app.instagram_url, en || zh || app.id);
                const primarySlug = slugify(en || zh || app.id);

                brandMap.set(app.id, {
                    id: app.id,
                    name_zh: zh || en,
                    name_en: en,
                    instagram_handle: ig,
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
                const ig = extractIgHandle(tb.instagram_handle, en || zh || tb.id);
                const primarySlug = slugify(en || zh || tb.id);

                brandMap.set(tb.id, {
                    id: tb.id,
                    name_zh: zh,
                    name_en: en,
                    instagram_handle: ig,
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
