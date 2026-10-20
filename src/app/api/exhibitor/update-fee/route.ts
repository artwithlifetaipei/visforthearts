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
    const { applicationId, brandId, customFee, discountNote, zoneId, boothType } = body;

    if (!applicationId && !brandId) {
      return NextResponse.json(
        { error: '缺少識別代碼 (applicationId or brandId is required)' },
        { status: 400 }
      );
    }

    // 1. Authenticate that the actor is an admin
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    let userEmail: string | undefined;

    if (token) {
      const sbAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user } } = await sbAuth.auth.getUser();
      userEmail = user?.email;
    } else {
      const sbServer = await createSupabaseServerClient();
      const { data: { user } } = await sbServer.auth.getUser();
      userEmail = user?.email;
    }

    const normalizedEmail = (userEmail || '').toLowerCase().trim();
    if (!normalizedEmail || !ADMIN_EMAILS.includes(normalizedEmail)) {
      return NextResponse.json(
        { error: '權限不足，需要大會管理員權限 (Admin access required)' },
        { status: 403 }
      );
    }

    // 2. Initialize privileged client
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const clientKey = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const clientOptions: any = {};
    if (!serviceKey && token) {
      clientOptions.global = { headers: { Authorization: `Bearer ${token}` } };
    }
    const adminDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, clientKey, clientOptions);

    const feeValue = (customFee === null || customFee === '' || customFee === undefined)
      ? null
      : Number(customFee);
    const noteValue = discountNote ? String(discountNote).trim() : null;

    // 3. Update exhibitor_applications
    let appUpdated = false;
    if (applicationId) {
      const appUpdateData: any = {
        custom_fee: feeValue,
        discount_note: noteValue,
      };
      if (zoneId) appUpdateData.zone_id = zoneId;
      if (boothType) appUpdateData.booth_type = boothType;

      const { data: updatedApps, error: appErr } = await adminDb
        .from('exhibitor_applications')
        .update(appUpdateData)
        .eq('id', applicationId)
        .select();

      if (appErr) {
        if (appErr.code === '42703') {
          return NextResponse.json(
            {
              error: '資料庫尚未新增 custom_fee 欄位，請先至 Supabase SQL Editor 執行 supabase_custom_fee_update.sql 腳本',
              needsMigration: true,
            },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { error: `更新申請資料失敗: ${appErr.message}` },
          { status: 500 }
        );
      }
      appUpdated = true;
    }

    // 4. Update exhibitor_brands
    const brandUpdateData: any = {
      custom_fee: feeValue,
      discount_note: noteValue,
    };
    if (zoneId) brandUpdateData.zone_id = zoneId;
    if (boothType) {
      brandUpdateData.booth_type = boothType;
      brandUpdateData.is_micro_exposure = boothType === 'T';
    }

    let brandQuery = adminDb.from('exhibitor_brands').update(brandUpdateData);

    if (brandId) {
      brandQuery = brandQuery.eq('id', brandId);
    } else if (applicationId) {
      brandQuery = brandQuery.eq('application_id', applicationId);
    }

    const { error: brandErr } = await brandQuery;
    if (brandErr) {
      if (brandErr.code === '42703') {
        return NextResponse.json(
          {
            error: '資料庫尚未新增 custom_fee 欄位，請先至 Supabase SQL Editor 執行 supabase_custom_fee_update.sql 腳本',
            needsMigration: true,
          },
          { status: 500 }
        );
      }
      // Non-fatal if no brand record exists yet (e.g. still in review)
      console.warn('Brand fee update warning:', brandErr.message);
    }

    return NextResponse.json({
      success: true,
      customFee: feeValue,
      discountNote: noteValue,
      message: feeValue !== null 
        ? `成功設定參展費為 NT$ ${feeValue.toLocaleString()}${noteValue ? ` (${noteValue})` : ''}`
        : '已恢復為展位標準公定牌價',
    });

  } catch (err: any) {
    console.error('Update fee API error:', err);
    return NextResponse.json(
      { error: `伺服器異常: ${err.message || err}` },
      { status: 500 }
    );
  }
}
