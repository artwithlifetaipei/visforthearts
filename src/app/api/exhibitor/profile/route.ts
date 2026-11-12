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

const PLACEHOLDER_PATTERNS = [
  '未填寫',
  '待補填',
  '事後補上',
  'LINE 聯繫',
  'LINE聯繫',
  '尚無',
  'Japanese Exhibitor Brand',
];

export function isPlaceholderOrEmpty(val: string | null | undefined, field?: string, brandNameZh?: string, brandNameEn?: string): boolean {
  const trimmed = (val || '').trim();
  if (!trimmed) return true;
  for (const pat of PLACEHOLDER_PATTERNS) {
    if (trimmed.includes(pat)) return true;
  }
  if (field === 'contact_name') {
    if (trimmed.endsWith('負責人')) return true;
    if (brandNameZh && trimmed === brandNameZh.trim()) return true;
    if (brandNameEn && trimmed.toLowerCase() === brandNameEn.trim().toLowerCase()) return true;
  }
  if (field === 'contact_phone' && trimmed.toLowerCase() === 'japan') {
    return true;
  }
  if (field === 'contact_address' && trimmed.toLowerCase() === 'japan') {
    return true;
  }
  return false;
}

/**
 * Truncate string to at most 245 Unicode code points so PostgreSQL
 * CHECK (char_length(concept_brief) <= 250) on exhibitor_applications NEVER fails.
 */
function toDbSafeConceptBrief(brief: string | null | undefined): string | null {
  if (brief === null || brief === undefined) return null;
  const trimmed = String(brief).trim();
  if (!trimmed) return null;
  const chars = Array.from(trimmed);
  if (chars.length <= 245) return trimmed;
  return chars.slice(0, 245).join('');
}

async function resolveBrandAndApp(adminDb: any, brandId?: string | null, email?: string | null) {
  let brandRow: any = null;
  let appRow: any = null;

  if (brandId) {
    const { data: b } = await adminDb
      .from('exhibitor_brands')
      .select('*')
      .eq('id', brandId)
      .maybeSingle();
    brandRow = b;
  }

  if (!brandRow && email) {
    const cleanEmail = email.toLowerCase().trim();
    const { data: b } = await adminDb
      .from('exhibitor_brands')
      .select('*')
      .ilike('portal_email', cleanEmail)
      .limit(1)
      .maybeSingle();
    brandRow = b;
  }

  if (brandRow?.application_id) {
    const { data: a } = await adminDb
      .from('exhibitor_applications')
      .select('*')
      .eq('id', brandRow.application_id)
      .maybeSingle();
    appRow = a;
  }

  if (!appRow && brandId) {
    const { data: a } = await adminDb
      .from('exhibitor_applications')
      .select('*')
      .eq('id', brandId)
      .maybeSingle();
    appRow = a;
  }

  if (!appRow) {
    const lookupEmail = (email || brandRow?.portal_email || '').toLowerCase().trim();
    if (lookupEmail) {
      const { data: a } = await adminDb
        .from('exhibitor_applications')
        .select('*')
        .ilike('contact_email', lookupEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      appRow = a;
    }
  }

  if (!appRow && brandRow?.brand_name_zh) {
    const { data: a } = await adminDb
      .from('exhibitor_applications')
      .select('*')
      .eq('brand_name_zh', brandRow.brand_name_zh)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    appRow = a;
  }

  // If appRow exists without brandRow, check if another brandRow links to appRow.id or auto-create brandRow
  if (appRow && !brandRow) {
    const { data: existingByApp } = await adminDb
      .from('exhibitor_brands')
      .select('*')
      .eq('application_id', appRow.id)
      .limit(1)
      .maybeSingle();

    if (existingByApp) {
      brandRow = existingByApp;
    } else if (appRow.status === 'approved') {
      const targetPortalEmail = (email || appRow.contact_email || '').toLowerCase().trim();
      if (targetPortalEmail) {
        const { data: createdBrand } = await adminDb
          .from('exhibitor_brands')
          .insert({
            application_id: appRow.id,
            brand_name_zh: appRow.brand_name_zh,
            brand_name_en: appRow.brand_name_en || appRow.brand_name_zh,
            zone_id: appRow.zone_id || 'artsy',
            booth_type: appRow.booth_type || 'A01',
            is_micro_exposure: appRow.booth_type === 'T',
            portal_email: targetPortalEmail,
            custom_fee: appRow.custom_fee ?? null,
            discount_note: appRow.discount_note ?? null,
          })
          .select('*')
          .maybeSingle();
        if (createdBrand) {
          brandRow = createdBrand;
        }
      }
    }
  }

  return { brandRow, appRow };
}

async function getExtendedProfile(adminDb: any, brandId?: string | null): Promise<any | null> {
  if (!brandId) return null;
  try {
    const { data } = await adminDb
      .from('exhibitor_media_assets')
      .select('file_url')
      .eq('brand_id', brandId)
      .eq('file_type', 'brand_profile_ext')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.file_url) {
      return JSON.parse(data.file_url);
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

async function saveExtendedProfile(adminDb: any, brandId: string | null | undefined, extPayload: any) {
  if (!brandId) return;
  try {
    const content = JSON.stringify({
      ...extPayload,
      updated_at: new Date().toISOString(),
    });
    const { data: existing } = await adminDb
      .from('exhibitor_media_assets')
      .select('id')
      .eq('brand_id', brandId)
      .eq('file_type', 'brand_profile_ext')
      .order('created_at', { ascending: true });

    if (existing && existing.length > 0) {
      await adminDb
        .from('exhibitor_media_assets')
        .update({
          file_url: content,
          file_name: 'brand_profile_ext.json',
          created_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);

      if (existing.length > 1) {
        const extraIds = existing.slice(1).map((r: any) => r.id);
        await adminDb.from('exhibitor_media_assets').delete().in('id', extraIds);
      }
    } else {
      await adminDb.from('exhibitor_media_assets').insert({
        brand_id: brandId,
        file_type: 'brand_profile_ext',
        file_name: 'brand_profile_ext.json',
        file_url: content,
      });
    }
  } catch (err) {
    console.warn('Non-blocking warning saving brand_profile_ext:', err);
  }
}

function buildProfileResponse(brandRow: any, appRow: any, extProfile?: any | null) {
  const brand_name_zh = appRow?.brand_name_zh || brandRow?.brand_name_zh || '';
  const brand_name_en = appRow?.brand_name_en || brandRow?.brand_name_en || '';
  const company_name_zh = appRow?.company_name_zh || extProfile?.company_name_zh || '';
  const company_tax_id = appRow?.company_tax_id || extProfile?.company_tax_id || '';
  const contact_name = appRow?.contact_name || extProfile?.contact_name || '';
  const contact_email = appRow?.contact_email || brandRow?.portal_email || '';
  const contact_phone = appRow?.contact_phone || extProfile?.contact_phone || '';
  const contact_address = appRow?.contact_address || extProfile?.contact_address || '';
  const website_url = appRow?.website_url || extProfile?.website_url || '';
  const instagram_url = appRow?.instagram_url || extProfile?.instagram_url || '';

  // Prefer the untruncated concept_brief from extProfile if available
  const appBrief = appRow?.concept_brief || '';
  const extBrief = extProfile?.concept_brief || '';
  const concept_brief =
    extBrief && extBrief.length >= appBrief.length ? extBrief : appBrief;

  const missingFields: string[] = [];
  if (isPlaceholderOrEmpty(brand_name_zh, 'brand_name_zh') || brand_name_zh === '無') {
    missingFields.push('brand_name_zh');
  }
  if (isPlaceholderOrEmpty(brand_name_en, 'brand_name_en')) {
    missingFields.push('brand_name_en');
  }
  if (isPlaceholderOrEmpty(contact_name, 'contact_name', brand_name_zh, brand_name_en)) {
    missingFields.push('contact_name');
  }
  if (isPlaceholderOrEmpty(contact_phone, 'contact_phone')) {
    missingFields.push('contact_phone');
  }
  if (isPlaceholderOrEmpty(contact_address, 'contact_address')) {
    missingFields.push('contact_address');
  }
  if (isPlaceholderOrEmpty(concept_brief, 'concept_brief')) {
    missingFields.push('concept_brief');
  }

  return {
    profile: {
      application_id: appRow?.id || null,
      brand_id: brandRow?.id || appRow?.id || null,
      brand_name_zh,
      brand_name_en,
      company_name_zh,
      company_tax_id,
      contact_name,
      contact_email,
      contact_phone,
      contact_address,
      website_url,
      instagram_url,
      concept_brief,
    },
    missingFields,
    isDirectlyActivatedOrIncomplete: !appRow || missingFields.length > 0,
  };
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
    const { brandRow, appRow } = await resolveBrandAndApp(adminDb, brandId, email);

    if (!brandRow && !appRow) {
      return NextResponse.json({ error: '找不到參展品牌資料' }, { status: 404 });
    }

    const extProfile = await getExtendedProfile(adminDb, brandRow?.id);

    return NextResponse.json({
      success: true,
      ...buildProfileResponse(brandRow, appRow, extProfile),
    });
  } catch (err: any) {
    console.error('Error in GET /api/exhibitor/profile:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      brand_id,
      email,
      brand_name_zh,
      brand_name_en,
      company_name_zh,
      company_tax_id,
      contact_name,
      contact_email,
      contact_phone,
      contact_address,
      website_url,
      instagram_url,
      concept_brief,
    } = body;

    if (!brand_id && !email) {
      return NextResponse.json({ error: '缺少品牌識別資訊 (brand_id)' }, { status: 400 });
    }

    let adminDb = await getAdminClient();
    let { brandRow, appRow } = await resolveBrandAndApp(adminDb, brand_id, email);

    // Retry once with refreshed admin client if session expired
    if (!brandRow && !appRow) {
      cachedAdminClient = null;
      cachedAdminExpiresAt = 0;
      adminDb = await getAdminClient();
      const retry = await resolveBrandAndApp(adminDb, brand_id, email);
      brandRow = retry.brandRow;
      appRow = retry.appRow;
    }

    if (!brandRow && !appRow) {
      return NextResponse.json({ error: '找不到對應的參展品牌記錄，請重新登入後再試。' }, { status: 404 });
    }

    // Allow partial saves without blocking the exhibitor: fallback to existing values or safe placeholders for NOT NULL columns
    const cleanBrandZh = (brand_name_zh || '').trim() || appRow?.brand_name_zh || brandRow?.brand_name_zh || '參展品牌';
    const cleanBrandEn = (brand_name_en || '').trim() || appRow?.brand_name_en || brandRow?.brand_name_en || cleanBrandZh;
    const cleanCompanyZh = (company_name_zh || '').trim() || null;
    const cleanTaxId = (company_tax_id || '').trim() || null;
    const cleanContactName = (contact_name || '').trim() || appRow?.contact_name || '待補填';
    const cleanContactEmail = (contact_email || email || brandRow?.portal_email || appRow?.contact_email || '').toLowerCase().trim();
    const cleanPhone = (contact_phone || '').trim() || appRow?.contact_phone || '待補填';
    const cleanAddress = (contact_address || '').trim() || appRow?.contact_address || '待補填';
    const cleanWebsite = (website_url || '').trim();
    const cleanInstagram = (instagram_url || '').trim();
    const fullConceptBrief = (concept_brief || '').trim();

    // Truncate to <= 245 chars for exhibitor_applications.concept_brief so DB check constraint (<= 250) NEVER fails
    const dbSafeBrief = fullConceptBrief
      ? toDbSafeConceptBrief(fullConceptBrief)
      : toDbSafeConceptBrief(appRow?.concept_brief);

    let updatedAppRow = appRow;

    if (appRow?.id) {
      const { data: updated, error: updateErr } = await adminDb
        .from('exhibitor_applications')
        .update({
          brand_name_zh: cleanBrandZh,
          brand_name_en: cleanBrandEn,
          company_name_zh: cleanCompanyZh,
          company_tax_id: cleanTaxId,
          contact_name: cleanContactName,
          contact_email: cleanContactEmail,
          contact_phone: cleanPhone,
          contact_address: cleanAddress,
          website_url: cleanWebsite,
          instagram_url: cleanInstagram,
          concept_brief: dbSafeBrief,
        })
        .eq('id', appRow.id)
        .select('*')
        .maybeSingle();

      if (updateErr) {
        return NextResponse.json({ error: `更新申請表資料失敗: ${updateErr.message}` }, { status: 500 });
      }
      updatedAppRow = {
        ...(updated || appRow),
        brand_name_zh: cleanBrandZh,
        brand_name_en: cleanBrandEn,
        company_name_zh: cleanCompanyZh,
        company_tax_id: cleanTaxId,
        contact_name: cleanContactName,
        contact_email: cleanContactEmail,
        contact_phone: cleanPhone,
        contact_address: cleanAddress,
        website_url: cleanWebsite,
        instagram_url: cleanInstagram,
        concept_brief: fullConceptBrief || updated?.concept_brief || appRow?.concept_brief || '',
      };
    } else {
      // Brand was directly created in exhibitor_brands without an exhibitor_applications record
      const { data: inserted, error: insertErr } = await adminDb
        .from('exhibitor_applications')
        .insert({
          brand_name_zh: cleanBrandZh,
          brand_name_en: cleanBrandEn,
          company_name_zh: cleanCompanyZh,
          company_tax_id: cleanTaxId,
          contact_name: cleanContactName,
          contact_email: cleanContactEmail,
          contact_phone: cleanPhone,
          contact_address: cleanAddress,
          website_url: cleanWebsite,
          instagram_url: cleanInstagram,
          concept_brief: dbSafeBrief,
          zone_id: brandRow?.zone_id || 'artsy',
          booth_type: brandRow?.booth_type || 'A01',
          status: 'approved',
          deposit_paid: true,
          custom_fee: brandRow?.custom_fee ?? null,
          discount_note: brandRow?.discount_note ?? null,
        })
        .select('*')
        .maybeSingle();

      if (insertErr) {
        return NextResponse.json({ error: `建立申請表基本資料失敗: ${insertErr.message}` }, { status: 500 });
      }
      updatedAppRow = {
        ...(inserted || {}),
        concept_brief: fullConceptBrief || inserted?.concept_brief || '',
      };
    }

    // Also sync brand_name_zh, brand_name_en, and application_id onto exhibitor_brands
    let updatedBrandRow = brandRow;
    if (brandRow?.id) {
      const brandUpdatePayload: any = {
        brand_name_zh: cleanBrandZh,
        brand_name_en: cleanBrandEn,
      };
      if (!brandRow.application_id && updatedAppRow?.id) {
        brandUpdatePayload.application_id = updatedAppRow.id;
      }
      const { data: bUpdated } = await adminDb
        .from('exhibitor_brands')
        .update(brandUpdatePayload)
        .eq('id', brandRow.id)
        .select('*')
        .maybeSingle();
      if (bUpdated) {
        updatedBrandRow = bUpdated;
      }
    }

    // Save full untruncated profile data (including >250 char concept_brief) in exhibitor_media_assets
    const extPayload = {
      brand_name_zh: cleanBrandZh,
      brand_name_en: cleanBrandEn,
      company_name_zh: cleanCompanyZh,
      company_tax_id: cleanTaxId,
      contact_name: cleanContactName,
      contact_email: cleanContactEmail,
      contact_phone: cleanPhone,
      contact_address: cleanAddress,
      website_url: cleanWebsite,
      instagram_url: cleanInstagram,
      concept_brief: fullConceptBrief,
    };
    await saveExtendedProfile(adminDb, updatedBrandRow?.id || brandRow?.id, extPayload);

    return NextResponse.json({
      success: true,
      ...buildProfileResponse(updatedBrandRow, updatedAppRow, extPayload),
    });
  } catch (err: any) {
    console.error('Error in POST /api/exhibitor/profile:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
