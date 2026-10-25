import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  }
  
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  await adminClient.auth.signInWithPassword({
    email: 'artwithlifetaipei@gmail.com',
    password: 'Kuo76443173',
  });
  return adminClient;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { brand_id, new_email, new_password } = body;

    if (!brand_id) {
      return NextResponse.json({ error: '缺少品牌編號 (brand_id is required)' }, { status: 400 });
    }

    if (!new_email || typeof new_email !== 'string') {
      return NextResponse.json({ error: '請輸入電子信箱地址' }, { status: 400 });
    }

    const formattedEmail = new_email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formattedEmail)) {
      return NextResponse.json({ error: '電子信箱格式不正確，請輸入有效的 Email 地址' }, { status: 400 });
    }

    const adminDb = await getAdminClient();

    // 1. Check if brand exists
    const { data: brand, error: brandFetchErr } = await adminDb
      .from('exhibitor_brands')
      .select('*')
      .eq('id', brand_id)
      .maybeSingle();

    if (brandFetchErr || !brand) {
      return NextResponse.json({ error: '查無此參展品牌資料' }, { status: 404 });
    }

    // 2. Check if new_email is already used by another brand
    const { data: existingBrand } = await adminDb
      .from('exhibitor_brands')
      .select('id, brand_name_zh')
      .eq('portal_email', formattedEmail)
      .neq('id', brand_id)
      .maybeSingle();

    if (existingBrand) {
      return NextResponse.json(
        { error: `此電子信箱已被其他參展品牌使用，請更換其他信箱。` },
        { status: 400 }
      );
    }

    // 3. Update exhibitor_brands.portal_email
    const { error: brandUpdateErr } = await adminDb
      .from('exhibitor_brands')
      .update({ portal_email: formattedEmail })
      .eq('id', brand_id);

    if (brandUpdateErr) {
      console.error('Update exhibitor_brands portal_email error:', brandUpdateErr);
      return NextResponse.json({ error: `更新品牌信箱失敗: ${brandUpdateErr.message}` }, { status: 500 });
    }

    // 4. Update exhibitor_applications.contact_email
    if (brand.application_id) {
      await adminDb
        .from('exhibitor_applications')
        .update({ contact_email: formattedEmail })
        .eq('id', brand.application_id);
    }

    // 5. Create or sync Supabase Auth user for the new email so they can log in
    const defaultPassword = (new_password && String(new_password).trim().length >= 6)
      ? String(new_password).trim()
      : 'KuoJewellery2027!';

    const publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
      await publicClient.auth.signUp({
        email: formattedEmail,
        password: defaultPassword,
      });
    } catch (authErr) {
      console.warn('Auth signup for new email note:', authErr);
    }

    return NextResponse.json({
      success: true,
      message: '電子信箱已成功綁定！',
      portal_email: formattedEmail,
      initial_password: defaultPassword,
    });
  } catch (err: any) {
    console.error('Exception in POST /api/exhibitor/update-email:', err);
    return NextResponse.json(
      { error: err.message || '伺服器處理異常，請稍後再試。' },
      { status: 500 }
    );
  }
}
