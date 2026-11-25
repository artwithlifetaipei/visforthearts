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
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error } = await adminClient.auth.signInWithPassword({
    email: process.env.ADMIN_TEST_EMAIL || 'artwithlifetaipei@gmail.com',
    password: process.env.ADMIN_TEST_PASSWORD || 'Kuo76443173',
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const adminDb = await getAdminClient();
    const { data: asset, error } = await adminDb
      .from('exhibitor_media_assets')
      .select('id, file_url, file_name, file_type')
      .eq('id', id)
      .maybeSingle();

    if (error || !asset || !asset.file_url) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    let rawUrl: string = asset.file_url;

    // If booth_fee_proof JSON, extract receipt_url
    if (asset.file_type === 'booth_fee_proof' && rawUrl.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(rawUrl);
        if (parsed?.receipt_url) {
          rawUrl = parsed.receipt_url;
        }
      } catch {}
    }

    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return NextResponse.redirect(rawUrl);
    }

    const matches = rawUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported asset format' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in GET /api/exhibitor/media/file:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
