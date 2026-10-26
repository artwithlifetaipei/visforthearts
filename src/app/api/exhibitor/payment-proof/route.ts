import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brand_id');
    const email = searchParams.get('email');

    if (!brandId && !email) {
      return NextResponse.json({ error: 'Missing brand_id or email' }, { status: 400 });
    }

    const adminDb = await getAdminClient();
    let resolvedBrandId = brandId;

    if (!resolvedBrandId && email) {
      const { data: brand } = await adminDb
        .from('exhibitor_brands')
        .select('id')
        .eq('portal_email', email.toLowerCase().trim())
        .maybeSingle();

      if (brand) {
        resolvedBrandId = brand.id;
      } else {
        const { data: app } = await adminDb
          .from('exhibitor_applications')
          .select('id')
          .eq('contact_email', email.toLowerCase().trim())
          .eq('status', 'approved')
          .maybeSingle();
        if (app) resolvedBrandId = app.id;
      }
    }

    if (!resolvedBrandId) {
      return NextResponse.json({ proof: null });
    }

    // Fetch latest booth_fee_proof asset for this brand
    const { data: proofAsset, error } = await adminDb
      .from('exhibitor_media_assets')
      .select('*')
      .eq('brand_id', resolvedBrandId)
      .eq('file_type', 'booth_fee_proof')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !proofAsset) {
      return NextResponse.json({ proof: null });
    }

    let parsedPayload: any = {};
    try {
      parsedPayload = JSON.parse(proofAsset.file_url);
    } catch {
      parsedPayload = { receipt_url: proofAsset.file_url };
    }

    return NextResponse.json({
      proof: {
        id: proofAsset.id,
        brand_id: proofAsset.brand_id,
        file_name: proofAsset.file_name,
        created_at: proofAsset.created_at,
        ...parsedPayload,
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/exhibitor/payment-proof:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      brand_id,
      email,
      receipt_base64,
      receipt_filename = 'remittance_slip.png',
      last_five_digits = '',
      payment_date = new Date().toISOString().split('T')[0],
      amount = null,
      note = '',
      action = 'submit', // 'submit' | 'verify' | 'reject'
    } = body;

    if (!brand_id && !email) {
      return NextResponse.json({ error: 'Missing brand_id or email' }, { status: 400 });
    }

    const adminDb = await getAdminClient();
    let resolvedBrandId = brand_id;

    // Resolve brand ID
    if (!resolvedBrandId && email) {
      const { data: brand } = await adminDb
        .from('exhibitor_brands')
        .select('id')
        .eq('portal_email', email.toLowerCase().trim())
        .maybeSingle();
      if (brand) resolvedBrandId = brand.id;
    }

    // Ensure resolvedBrandId exists in exhibitor_brands (foreign key constraint)
    let brandRow = null;
    if (resolvedBrandId) {
      const { data } = await adminDb
        .from('exhibitor_brands')
        .select('*')
        .eq('id', resolvedBrandId)
        .maybeSingle();
      brandRow = data;
    }

    // If brand not yet in exhibitor_brands, look up exhibitor_applications and auto-insert into exhibitor_brands
    if (!brandRow) {
      const { data: app } = await adminDb
        .from('exhibitor_applications')
        .select('*')
        .or(`id.eq.${resolvedBrandId},contact_email.eq.${email?.toLowerCase().trim()}`)
        .eq('status', 'approved')
        .maybeSingle();

      if (app) {
        const { data: newBrand, error: bErr } = await adminDb
          .from('exhibitor_brands')
          .insert({
            id: app.id,
            application_id: app.id,
            brand_name_zh: app.brand_name_zh,
            brand_name_en: app.brand_name_en || app.brand_name_zh,
            zone_id: app.zone_id || 'artsy',
            booth_type: app.booth_type || 'A01',
            portal_email: (app.contact_email || email || '').toLowerCase().trim(),
            custom_fee: app.custom_fee ?? null,
            discount_note: app.discount_note ?? null,
          })
          .select()
          .maybeSingle();

        if (newBrand) {
          resolvedBrandId = newBrand.id;
          brandRow = newBrand;
        }
      }
    }

    if (!resolvedBrandId) {
      return NextResponse.json({ error: '無法識別參展品牌身份，請確認已登入專屬帳號。' }, { status: 404 });
    }

    // Handle Admin Verification Action
    if (action === 'verify' || action === 'reject') {
      const { data: existingProof } = await adminDb
        .from('exhibitor_media_assets')
        .select('*')
        .eq('brand_id', resolvedBrandId)
        .eq('file_type', 'booth_fee_proof')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!existingProof) {
        return NextResponse.json({ error: '查無此品牌提交之匯款水單紀錄' }, { status: 404 });
      }

      let parsed: any = {};
      try { parsed = JSON.parse(existingProof.file_url); } catch {}
      parsed.status = action === 'verify' ? 'verified' : 'rejected';
      parsed.verified_at = new Date().toISOString();
      if (note) parsed.admin_note = note;

      const { data: updated, error: updErr } = await adminDb
        .from('exhibitor_media_assets')
        .update({ file_url: JSON.stringify(parsed) })
        .eq('id', existingProof.id)
        .select()
        .single();

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: action === 'verify' ? '已成功確認核帳！' : '已標記為待補件／拒絕。',
        proof: { id: updated.id, ...parsed },
      });
    }

    // Normal Submission
    if (!receipt_base64 && !last_five_digits) {
      return NextResponse.json({ error: '請至少上傳匯款單截圖或填寫帳號末五碼' }, { status: 400 });
    }

    const proofData = {
      receipt_url: receipt_base64 || '',
      last_five_digits: String(last_five_digits).trim(),
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      amount: amount ? Number(amount) : null,
      note: String(note).trim(),
      status: 'verifying', // 'verifying' | 'verified' | 'rejected'
      submitted_at: new Date().toISOString(),
    };

    // Check if there is an existing proof for this brand, update or insert
    const { data: existingAsset } = await adminDb
      .from('exhibitor_media_assets')
      .select('id, file_url')
      .eq('brand_id', resolvedBrandId)
      .eq('file_type', 'booth_fee_proof')
      .maybeSingle();

    let savedAsset: any;
    if (existingAsset?.id) {
      const { data, error: updErr } = await adminDb
        .from('exhibitor_media_assets')
        .update({
          file_name: receipt_filename,
          file_url: JSON.stringify(proofData),
        })
        .eq('id', existingAsset.id)
        .select()
        .single();

      if (updErr) {
        console.error('Error updating payment proof:', updErr);
        return NextResponse.json({ error: `更新憑證失敗: ${updErr.message}` }, { status: 500 });
      }
      savedAsset = data;
    } else {
      const { data, error: insErr } = await adminDb
        .from('exhibitor_media_assets')
        .insert({
          brand_id: resolvedBrandId,
          file_type: 'booth_fee_proof',
          file_name: receipt_filename,
          file_url: JSON.stringify(proofData),
        })
        .select()
        .single();

      if (insErr) {
        console.error('Error inserting payment proof:', insErr);
        return NextResponse.json({ error: `提交憑證失敗: ${insErr.message}` }, { status: 500 });
      }
      savedAsset = data;
    }

    return NextResponse.json({
      success: true,
      message: '匯款水單憑證已成功提交！大會財務組將進行核帳查對。',
      proof: {
        id: savedAsset.id,
        brand_id: savedAsset.brand_id,
        file_name: savedAsset.file_name,
        created_at: savedAsset.created_at,
        ...proofData,
      },
    });
  } catch (err: any) {
    console.error('Exception in POST /api/exhibitor/payment-proof:', err);
    return NextResponse.json({ error: err.message || '伺服器異常' }, { status: 500 });
  }
}
