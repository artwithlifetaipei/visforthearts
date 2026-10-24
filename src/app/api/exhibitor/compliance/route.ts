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
            // Ignore in route handlers
          }
        },
      },
    }
  );
}

async function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  }
  
  // Use privileged system session for reliable database operations
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brand_id');
    const email = searchParams.get('email');

    if (!brandId && !email) {
      return NextResponse.json({ error: 'Missing brand_id or email parameter' }, { status: 400 });
    }

    const adminDb = await getAdminClient();
    let targetBrandId = brandId;

    if (!targetBrandId && email) {
      const formattedEmail = email.toLowerCase().trim();
      const { data: brand } = await adminDb
        .from('exhibitor_brands')
        .select('id')
        .eq('portal_email', formattedEmail)
        .maybeSingle();

      if (brand) {
        targetBrandId = brand.id;
      }
    }

    if (!targetBrandId) {
      return NextResponse.json({ compliance: null });
    }

    const { data: compliance, error } = await adminDb
      .from('exhibitor_compliance')
      .select('*')
      .eq('brand_id', targetBrandId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ compliance });
  } catch (err: any) {
    console.error('Error in GET /api/exhibitor/compliance:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      brand_id,
      portal_email,
      rule_booth,
      rule_conduct,
      rule_liability,
      rule_exit,
      rule_ip,
      rule_return_inspection,
      specialDeposit,
      specialDamage,
      specialRefund,
      signedName,
      signerIdNumber,
      isLegalRepresentative,
      privacyConsent,
      physicalContractUrl,
    } = body;

    // Basic legal validations
    if (physicalContractUrl) {
      if (!privacyConsent) {
        return NextResponse.json(
          { error: '請勾選並同意《隱私權政策與個資蒐集聲明》。' },
          { status: 400 }
        );
      }
    } else {
      if (!rule_booth || !rule_conduct || !rule_liability || !rule_exit || !rule_ip || !rule_return_inspection) {
        return NextResponse.json(
          { error: '請勾選並同意所有 6 項參展規範條款。' },
          { status: 400 }
        );
      }

      if (!specialDeposit || !specialDamage || !specialRefund) {
        return NextResponse.json(
          { error: '請詳閱並勾選同意「場地設施維護與保證金規範」、「古蹟場地毀損賠償」與「參展費退費與展位取消規範」三項法律重大特別條款。' },
          { status: 400 }
        );
      }

      if (!signedName || typeof signedName !== 'string' || signedName.trim() === '') {
        return NextResponse.json(
          { error: '請填寫授權簽署人法定姓名。' },
          { status: 400 }
        );
      }

      if (!signerIdNumber || typeof signerIdNumber !== 'string' || signerIdNumber.trim() === '') {
        return NextResponse.json(
          { error: '請填寫授權簽署人身分證字號。' },
          { status: 400 }
        );
      }

      if (!isLegalRepresentative) {
        return NextResponse.json(
          { error: '請確認並勾選「本人確認為參展品牌之法定代理人，或已取得充分授權」核取方塊。' },
          { status: 400 }
        );
      }

      if (!privacyConsent) {
        return NextResponse.json(
          { error: '請勾選並同意《隱私權政策與個資蒐集聲明》。' },
          { status: 400 }
        );
      }
    }

    const adminDb = await getAdminClient();
    let resolvedBrandId = brand_id;
    const formattedEmail = (portal_email || '').toLowerCase().trim();

    // 1. Resolve & verify brand in exhibitor_brands
    if (resolvedBrandId) {
      const { data: brandRow } = await adminDb
        .from('exhibitor_brands')
        .select('id, portal_email')
        .eq('id', resolvedBrandId)
        .maybeSingle();

      if (!brandRow) {
        // resolvedBrandId might be an application_id
        const { data: appRow } = await adminDb
          .from('exhibitor_applications')
          .select('*')
          .eq('id', resolvedBrandId)
          .maybeSingle();

        if (appRow) {
          // Check if an exhibitor_brands row already exists for this application or email
          const { data: existingBrand } = await adminDb
            .from('exhibitor_brands')
            .select('id')
            .or(`application_id.eq.${appRow.id},portal_email.eq.${appRow.contact_email.toLowerCase().trim()}`)
            .maybeSingle();

          if (existingBrand) {
            resolvedBrandId = existingBrand.id;
          } else {
            // Auto-heal: create the exhibitor_brands row
            const isMicro = appRow.booth_type === 'T';
            const { data: createdBrand, error: createErr } = await adminDb
              .from('exhibitor_brands')
              .insert({
                application_id: appRow.id,
                brand_name_zh: appRow.brand_name_zh,
                brand_name_en: appRow.brand_name_en || appRow.brand_name_zh,
                zone_id: appRow.zone_id || 'artsy',
                booth_type: appRow.booth_type || 'A01',
                is_micro_exposure: isMicro,
                portal_email: appRow.contact_email.toLowerCase().trim(),
                custom_fee: appRow.custom_fee ?? null,
                discount_note: appRow.discount_note ?? null,
              })
              .select('id')
              .single();

            if (!createErr && createdBrand) {
              resolvedBrandId = createdBrand.id;
            }
          }
        }
      }
    }

    // 2. Fallback to portal_email if resolvedBrandId is still invalid
    if (!resolvedBrandId && formattedEmail) {
      const { data: brandByEmail } = await adminDb
        .from('exhibitor_brands')
        .select('id')
        .eq('portal_email', formattedEmail)
        .maybeSingle();

      if (brandByEmail) {
        resolvedBrandId = brandByEmail.id;
      } else {
        const { data: appByEmail } = await adminDb
          .from('exhibitor_applications')
          .select('*')
          .eq('contact_email', formattedEmail)
          .eq('status', 'approved')
          .maybeSingle();

        if (appByEmail) {
          const isMicro = appByEmail.booth_type === 'T';
          const { data: createdBrand } = await adminDb
            .from('exhibitor_brands')
            .insert({
              application_id: appByEmail.id,
              brand_name_zh: appByEmail.brand_name_zh,
              brand_name_en: appByEmail.brand_name_en || appByEmail.brand_name_zh,
              zone_id: appByEmail.zone_id || 'artsy',
              booth_type: appByEmail.booth_type || 'A01',
              is_micro_exposure: isMicro,
              portal_email: formattedEmail,
              custom_fee: appByEmail.custom_fee ?? null,
              discount_note: appByEmail.discount_note ?? null,
            })
            .select('id')
            .single();

          if (createdBrand) {
            resolvedBrandId = createdBrand.id;
          }
        }
      }
    }

    if (!resolvedBrandId) {
      return NextResponse.json(
        { error: '系統無法辨識參展品牌資料，請重新登入後台後再試。' },
        { status: 400 }
      );
    }

    // 3. Assemble UPSERT payload
    const payload = {
      brand_id: resolvedBrandId,
      rule_booth: Boolean(rule_booth),
      rule_conduct: Boolean(rule_conduct),
      rule_liability: Boolean(rule_liability),
      rule_exit: Boolean(rule_exit),
      rule_ip: Boolean(rule_ip),
      rule_return_inspection: Boolean(rule_return_inspection),
      rule_deposit_forfeiture: Boolean(specialDeposit),
      rule_damage_compensation: Boolean(specialDamage),
      rule_refund_policy: Boolean(specialRefund),
      signed_name: signedName ? String(signedName).trim() : null,
      signer_id_number: signerIdNumber ? String(signerIdNumber).trim().toUpperCase() : null,
      is_legal_representative: Boolean(isLegalRepresentative),
      privacy_consent: Boolean(privacyConsent),
      physical_contract_url: physicalContractUrl || null,
      signed_at: new Date().toISOString(),
    };

    const { data: compliance, error: upsertErr } = await adminDb
      .from('exhibitor_compliance')
      .upsert(payload, { onConflict: 'brand_id' })
      .select()
      .single();

    if (upsertErr) {
      console.error('Compliance upsert error:', upsertErr);
      return NextResponse.json(
        { error: `合約簽署儲存失敗: ${upsertErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '備忘錄簽署成功！',
      compliance,
      brand_id: resolvedBrandId,
    });
  } catch (err: any) {
    console.error('Exception in POST /api/exhibitor/compliance:', err);
    return NextResponse.json(
      { error: err.message || '伺服器處理異常，請稍後再試。' },
      { status: 500 }
    );
  }
}
