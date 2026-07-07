import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';

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

    // 非同步發送通知郵件給管理員 (背景處理，避免阻塞 API 響應)
    const sendAdminNotification = async () => {
      try {
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT;
        const smtpUser = process.env.SMTP_USER;
        const smtpPassword = process.env.SMTP_PASSWORD;
        const adminEmailsStr = process.env.ADMIN_NOTIFICATION_EMAILS;

        // 如果沒有配置相關環境變數，則跳過發送
        if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword || !adminEmailsStr) {
          console.warn('SMTP or Admin notification variables are not fully configured. Skipping email notification.');
          return;
        }

        const adminEmails = adminEmailsStr.split(',').map(e => e.trim()).filter(Boolean);
        if (adminEmails.length === 0) return;

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort, 10),
          secure: smtpPort === '465', // true for 465, false for other ports (e.g. 587)
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        });

        const mailOptions = {
          from: `"VIS System Notification" <${smtpUser}>`,
          to: adminEmails.join(', '),
          subject: `【新參展申請通知】${brand_name_zh} / ${brand_name_en} 已送出參展申請`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e5e5; border-radius: 8px;">
              <h2 style="color: #C9A96E; border-bottom: 2px solid #C9A96E; padding-bottom: 10px; margin-top: 0;">收到新參展商申請單 Notification</h2>
              <p style="font-size: 14px; color: #666;">系統已成功儲存以下參展商的登記事項，請管理員儘速至大會後台審查匯款憑證與申請資料。</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; width: 35%; color: #333;">中文品牌名稱</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;">${brand_name_zh}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">英文品牌名稱</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;">${brand_name_en}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">公司登記名稱</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;">${company_name_zh || '無'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">統一編號</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;">${company_tax_id || '無'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">主要聯絡人</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;">${contact_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">電子信箱</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;"><a href="mailto:${contact_email}">${contact_email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">聯絡電話</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;">${contact_phone}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">通訊地址</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;">${contact_address}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">官方網站</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;">${website_url ? `<a href="${website_url}" target="_blank">${website_url}</a>` : '無'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">Instagram 連結</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;">${instagram_url ? `<a href="${instagram_url}" target="_blank">${instagram_url}</a>` : '無'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">展位類型</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;">${booth_type}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">展區首選</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;">
                    1: ${zone_preference_1 || '無'} / 2: ${zone_preference_2 || '無'} / 3: ${zone_preference_3 || '無'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">展出內容概要</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555; white-space: pre-wrap;">${concept_brief || '無'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; font-weight: bold; color: #333;">匯款憑證圖片</td>
                  <td style="padding: 10px; border-bottom: 1px solid #f0f0f0; color: #555;">
                    ${deposit_proof_url ? `<a href="${deposit_proof_url}" target="_blank" style="color: #C9A96E; font-weight: bold; text-decoration: underline;">點擊檢視憑證圖片</a>` : '未上傳憑證'}
                  </td>
                </tr>
              </table>
              
              <div style="margin-top: 30px; padding: 15px; background-color: #fafafb; border-radius: 6px; font-size: 12px; color: #888; text-align: center;">
                此信件由 VIS 參展申請系統自動寄發。請勿直接回信。
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Notification email successfully sent to admins.`);
      } catch (mailError) {
        console.error('Failed to send admin notification email:', mailError);
      }
    };

    // 背景背景執行發信，絕不阻塞前端響應
    sendAdminNotification();

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
