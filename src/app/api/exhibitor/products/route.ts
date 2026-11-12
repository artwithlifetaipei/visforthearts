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
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error } = await adminClient.auth.signInWithPassword({
    email: 'artwithlifetaipei@gmail.com',
    password: 'Kuo76443173',
  });
  if (!error) {
    cachedAdminClient = adminClient;
    cachedAdminExpiresAt = now + 30 * 60 * 1000;
  }
  return adminClient;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brand_id');
    const brandNameZh = searchParams.get('brand_name_zh');

    if (!brandId && !brandNameZh) {
      return NextResponse.json({ error: 'Missing brand_id or brand_name_zh' }, { status: 400 });
    }

    const adminDb = await getAdminClient();
    const orFilters: string[] = [];
    if (brandId) orFilters.push(`brand_id.eq.${brandId}`);
    if (brandNameZh) orFilters.push(`brand_name_zh.eq.${brandNameZh}`);

    const { data, error } = await adminDb
      .from('exhibitor_products')
      .select('*')
      .or(orFilters.join(','))
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, products: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, payload } = body;

    if (!payload || !payload.title_zh) {
      return NextResponse.json({ error: '請填寫作品／商品中文名稱' }, { status: 400 });
    }

    const adminDb = await getAdminClient();

    if (id) {
      const { data, error } = await adminDb
        .from('exhibitor_products')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: formatFriendlyError(error, '更新作品／商品資料') }, { status: 500 });
      }
      return NextResponse.json({ success: true, product: data });
    } else {
      const { data, error } = await adminDb
        .from('exhibitor_products')
        .insert(payload)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: formatFriendlyError(error, '新增作品／商品資料') }, { status: 500 });
      }
      return NextResponse.json({ success: true, product: data });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    let id: string | null = null;
    try {
      const body = await req.json();
      id = body.id;
    } catch {
      const { searchParams } = new URL(req.url);
      id = searchParams.get('id');
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const adminDb = await getAdminClient();
    const { error } = await adminDb
      .from('exhibitor_products')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
