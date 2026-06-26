import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
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
      zone_id,
      booth_type,
      zone_preference_1,
      zone_preference_2,
      zone_preference_3,
      concept_brief,
      deposit_proof_base64,
      deposit_proof_filename,
    } = body;

    // Validate required fields
    if (!brand_name_zh || !brand_name_en || !contact_name || !contact_email || !zone_id || !booth_type || !contact_address) {
      return NextResponse.json({ success: false, error: '缺少必要欄位（含聯繫地址）' }, { status: 400 });
    }

    let deposit_proof_url = '';

    // Handle base64 image upload to Supabase Storage
    if (deposit_proof_base64 && deposit_proof_filename) {
      try {
        // Extract content type and base64 data
        const matches = deposit_proof_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Generate unique file path
          const fileExt = deposit_proof_filename.split('.').pop() || 'png';
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const filePath = `${fileName}`;

          // Upload to storage bucket
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('exhibitor-deposits')
            .upload(filePath, buffer, {
              contentType,
              upsert: true,
            });

          if (uploadError) {
            console.error('Supabase storage upload error:', uploadError);
            // Fallback: save placeholder or log
            deposit_proof_url = `/uploads/mock_deposit_${fileName}`;
          } else {
            // Get public URL
            const { data: publicUrlData } = supabase.storage
              .from('exhibitor-deposits')
              .getPublicUrl(filePath);
            
            deposit_proof_url = publicUrlData?.publicUrl || '';
          }
        }
      } catch (uploadException) {
        console.error('Exception during storage upload:', uploadException);
        deposit_proof_url = '/uploads/mock_deposit_error.png';
      }
    }

    // Insert application into DB
    const { data: insertedData, error: dbError } = await supabase
      .from('exhibitor_applications')
      .insert({
        brand_name_zh,
        brand_name_en,
        company_name_zh: company_name_zh || null,
        company_tax_id: company_tax_id || null,
        contact_name,
        contact_email,
        contact_phone,
        contact_address,
        website_url,
        instagram_url,
        zone_id,
        booth_type,
        zone_preference_1,
        zone_preference_2,
        zone_preference_3,
        concept_brief,
        deposit_proof_url,
        status: 'pending',
        deposit_paid: false, // will be approved by admin after verifying transfer proof
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      return NextResponse.json({ success: false, error: `資料庫儲存失敗: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      applicationId: insertedData.id,
      deposit_proof_url 
    });

  } catch (error: any) {
    console.error('API apply route exception:', error);
    return NextResponse.json({ success: false, error: '伺服器內部異常' }, { status: 500 });
  }
}
