import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

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

    // Use Authorization header, Service Role key, or default supabase client
    const authHeader = request.headers.get('authorization');
    const dbClient = authHeader
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: authHeader } }
        })
      : (process.env.SUPABASE_SERVICE_ROLE_KEY
          ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
          : supabase);

    // Insert application into DB
    const { data: insertedData, error: dbError } = await dbClient
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

    // 非同步發送通知郵件給管理員 (背景處理，絕不阻塞 API 響應)
    const sendAdminNotification = async () => {
      try {
        const adminEmailsStr = process.env.ADMIN_NOTIFICATION_EMAILS || 'artwithlifetaipei@gmail.com';
        const adminEmails = adminEmailsStr.split(',').map(e => e.trim()).filter(Boolean);
        if (adminEmails.length === 0) adminEmails.push('artwithlifetaipei@gmail.com');

        const subject = `【新參展申請通知】${brand_name_zh} / ${brand_name_en} 已送出參展申請`;
        const htmlContent = `
          <div style="max-width: 620px; margin: 0 auto; padding: 40px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF9F6; color: #1A1A1A;">
            <div style="text-align: center; margin-bottom: 28px;">
              <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" alt="VIS Logo" style="height: 42px; width: auto; max-width: 100%; object-fit: contain; margin-bottom: 10px;" />
              <p style="font-size: 10px; font-weight: 600; letter-spacing: 0.35em; color: #C9A96E; text-transform: uppercase; margin: 0;">
                Exhibitor Application Notification
              </p>
            </div>

            <div style="background-color: #FFFFFF; border: 1px solid rgba(201, 169, 110, 0.25); padding: 36px 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.03);">
              <h2 style="font-size: 17px; font-weight: 400; color: #0D0D0D; margin-top: 0; margin-bottom: 8px; text-align: center; letter-spacing: 0.05em;">
                收到新參展商申請單 Notification
              </h2>
              <p style="font-size: 13px; color: #555555; line-height: 1.8; margin-bottom: 28px; text-align: center;">
                大會系統已成功收到並儲存以下參展商的登記事項，請管理員儘速至大會後台審查資料與匯款憑證：
              </p>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
                <tr style="background-color: #FAF9F6;">
                  <td colspan="2" style="padding: 10px 14px; font-size: 11px; font-weight: 600; letter-spacing: 0.2em; color: #C9A96E; text-transform: uppercase; border-bottom: 1px solid rgba(201, 169, 110, 0.2);">
                    01. 品牌與公司登記 (Brand Profile)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; font-weight: 500; width: 32%; color: #8C7853;">中文品牌名稱</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A; font-weight: 600;">${brand_name_zh}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; font-weight: 500; color: #8C7853;">英文品牌名稱</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A;">${brand_name_en}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; font-weight: 500; color: #8C7853;">公司登記名稱</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A;">${company_name_zh || '無'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; font-weight: 500; color: #8C7853;">統一編號</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A; font-family: monospace;">${company_tax_id || '無'}</td>
                </tr>

                <tr style="background-color: #FAF9F6;">
                  <td colspan="2" style="padding: 10px 14px; font-size: 11px; font-weight: 600; letter-spacing: 0.2em; color: #C9A96E; text-transform: uppercase; border-bottom: 1px solid rgba(201, 169, 110, 0.2);">
                    02. 主要聯絡資訊 (Contact Information)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; font-weight: 500; color: #8C7853;">主要聯絡人</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A; font-weight: 600;">${contact_name}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; font-weight: 500; color: #8C7853;">電子信箱 Email</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A;"><a href="mailto:${contact_email}" style="color: #C9A96E; text-decoration: underline;">${contact_email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; font-weight: 500; color: #8C7853;">聯絡電話</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A;">${contact_phone}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; font-weight: 500; color: #8C7853;">通訊地址</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A;">${contact_address}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; font-weight: 500; color: #8C7853;">官方網站 / IG</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A; line-height: 1.6;">
                    ${website_url ? `官網: <a href="${website_url}" target="_blank" style="color: #C9A96E; text-decoration: underline;">${website_url}</a><br/>` : ''}
                    ${instagram_url ? `IG: <a href="${instagram_url}" target="_blank" style="color: #C9A96E; text-decoration: underline;">${instagram_url}</a>` : ''}
                    ${!website_url && !instagram_url ? '未提供' : ''}
                  </td>
                </tr>

                <tr style="background-color: #FAF9F6;">
                  <td colspan="2" style="padding: 10px 14px; font-size: 11px; font-weight: 600; letter-spacing: 0.2em; color: #C9A96E; text-transform: uppercase; border-bottom: 1px solid rgba(201, 169, 110, 0.2);">
                    03. 展位志願與展出概念 (Preferences & Concept)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; font-weight: 500; color: #8C7853;">展位類型首選</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A; font-weight: 600;">${booth_type}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; font-weight: 500; color: #8C7853;">展區志願順序</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; color: #1A1A1A; line-height: 1.7;">
                    1: ${zone_preference_1 || '無'}<br/>
                    2: ${zone_preference_2 || '無'}<br/>
                    3: ${zone_preference_3 || '無'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; font-weight: 500; color: #8C7853;">展出美學概要</td>
                  <td style="padding: 12px 14px; border-bottom: 1px solid #F0F0F0; color: #333333; line-height: 1.7; white-space: pre-wrap;">${concept_brief || '無'}</td>
                </tr>
              </table>

              <div style="background-color: #FAF9F6; border: 1px solid rgba(201, 169, 110, 0.25); padding: 24px; text-align: center; margin-top: 10px;">
                <p style="font-size: 11px; font-weight: 600; letter-spacing: 0.2em; color: #8C7853; text-transform: uppercase; margin-top: 0; margin-bottom: 12px;">
                  04. 保證金匯款憑證審查 (Payment Proof)
                </p>
                ${
                  deposit_proof_url 
                    ? `<a href="${deposit_proof_url}" target="_blank" style="background-color: #0D0D0D; color: #FFFFFF; text-decoration: none; padding: 12px 28px; font-size: 11px; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; display: inline-block; border-radius: 2px;">檢視憑證圖片 VIEW PROOF</a>`
                    : '<span style="font-size: 12px; color: #999;">參展商未上傳憑證圖片</span>'
                }
              </div>
            </div>

            <div style="text-align: center; margin-top: 32px; font-size: 10px; color: #999999; letter-spacing: 0.1em;">
              &copy; 2026 VIS Contemporary Culture. All rights reserved.<br/>
              <span style="font-size: 9px; opacity: 0.7; display: inline-block; margin-top: 4px;">此信件由 VIS 參展申請系統自動發送</span>
            </div>
          </div>
        `;

        const confirmSubject = `【VIS Contemporary Culture】參展意向申請收件確認 Proposal Received Notice`;
        const exhibitorConfirmHtml = `
          <div style="max-width: 620px; margin: 0 auto; padding: 40px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF9F6; color: #1A1A1A;">
            <div style="text-align: center; margin-bottom: 28px;">
              <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" alt="VIS Logo" style="height: 42px; width: auto; max-width: 100%; object-fit: contain; margin-bottom: 10px;" />
              <p style="font-size: 10px; font-weight: 600; letter-spacing: 0.35em; color: #C9A96E; text-transform: uppercase; margin: 0;">
                Exhibitor Proposal Confirmation
              </p>
            </div>

            <div style="background-color: #FFFFFF; border: 1px solid rgba(201, 169, 110, 0.25); padding: 36px 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.03);">
              <h2 style="font-size: 17px; font-weight: 400; color: #0D0D0D; margin-top: 0; margin-bottom: 6px; text-align: center; letter-spacing: 0.05em;">
                參展意向申請收件確認
              </h2>
              <p style="font-size: 10px; font-weight: 500; letter-spacing: 0.2em; color: #8C7853; text-transform: uppercase; text-align: center; margin-top: 0; margin-bottom: 24px;">
                Proposal Received Confirmation
              </p>

              <p style="font-size: 13px; color: #444444; line-height: 1.8; margin-bottom: 12px;">
                親愛的 <strong>${contact_name}</strong>（${brand_name_zh} / ${brand_name_en}），您好：
              </p>
              <p style="font-size: 13px; color: #444444; line-height: 1.8; margin-bottom: 16px; text-align: justify;">
                感謝您提交 VIS Contemporary Culture 2027 參展意向申請書。大會策展委員會已成功收到您的申請資料與保證金匯款憑證。
              </p>
              <p style="font-size: 12px; color: #666666; line-height: 1.7; margin-bottom: 28px; text-align: justify;">
                Thank you for submitting your exhibition proposal for VIS Contemporary Culture 2027. Our curatorial committee has successfully received your submission details and payment proof.
              </p>

              <div style="background-color: #FAF9F6; border: 1px solid rgba(201, 169, 110, 0.2); padding: 20px; margin-bottom: 28px;">
                <p style="font-size: 11px; font-weight: 600; letter-spacing: 0.2em; color: #C9A96E; text-transform: uppercase; margin-top: 0; margin-bottom: 12px;">
                  📌 重要日程 Timeline & Next Steps
                </p>
                <p style="font-size: 12px; color: #333333; line-height: 1.8; margin: 0 0 10px 0;">
                  • <strong>第一階段入選結果發布日期 Phase 1 Selection Date:</strong> 2026 年 10 月 20 日 前<br/>
                  • 審查結果將透過大會信箱 <a href="mailto:artwithlifetaipei@gmail.com" style="color: #C9A96E; text-decoration: underline;">artwithlifetaipei@gmail.com</a> 通知。若有任何問題，歡迎隨時透過此電郵聯繫大會展務團隊。
                </p>
                <p style="font-size: 11px; color: #666666; line-height: 1.7; margin: 0; border-top: 1px dashed rgba(201, 169, 110, 0.25); padding-top: 10px;">
                  • Selection results will be notified via our official email (<a href="mailto:artwithlifetaipei@gmail.com" style="color: #C9A96E; text-decoration: underline;">artwithlifetaipei@gmail.com</a>). Should you have any inquiries, please feel free to contact our team via this email address.
                </p>
              </div>

              <div style="text-align: center; border-top: 1px solid #F0F0F0; padding-top: 20px;">
                <p style="font-size: 11px; color: #888888; margin: 0;">
                  參展聯繫 Exhibitor Relations: <a href="mailto:artwithlifetaipei@gmail.com" style="color: #C9A96E; text-decoration: underline;">artwithlifetaipei@gmail.com</a>
                </p>
              </div>
            </div>

            <div style="text-align: center; margin-top: 32px; font-size: 10px; color: #999999; letter-spacing: 0.1em;">
              &copy; 2026 VIS Contemporary Culture. All rights reserved.
            </div>
          </div>
        `;

        // 1. Try Resend API if available
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'VIS System <onboarding@resend.dev>',
            to: adminEmails,
            subject,
            html: htmlContent,
          });
          if (contact_email) {
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'VIS System <onboarding@resend.dev>',
              to: [contact_email],
              subject: confirmSubject,
              html: exhibitorConfirmHtml,
            });
          }
          console.log(`Notification & Confirmation emails sent via Resend.`);
          return;
        }

        // 2. Try Gmail App Password if available
        const gmailUser = process.env.GMAIL_USER;
        const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
        if (gmailUser && gmailAppPassword) {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: gmailUser,
              pass: gmailAppPassword,
            },
          });

          await transporter.sendMail({
            from: `"VIS System Notification" <${gmailUser}>`,
            to: adminEmails.join(', '),
            subject,
            html: htmlContent,
          });

          if (contact_email) {
            await transporter.sendMail({
              from: `"VIS Contemporary Culture" <${gmailUser}>`,
              to: contact_email,
              subject: confirmSubject,
              html: exhibitorConfirmHtml,
            });
          }

          console.log(`Notification & Confirmation emails sent via Gmail.`);
          return;
        }

        // 3. Try custom SMTP if configured
        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT || '587';
        const smtpUser = process.env.SMTP_USER;
        const smtpPassword = process.env.SMTP_PASSWORD;
        if (smtpHost && smtpUser && smtpPassword) {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort, 10),
            secure: smtpPort === '465',
            auth: {
              user: smtpUser,
              pass: smtpPassword,
            },
          });

          await transporter.sendMail({
            from: `"VIS System Notification" <${smtpUser}>`,
            to: adminEmails.join(', '),
            subject,
            html: htmlContent,
          });
          console.log(`Notification email sent via SMTP to: ${adminEmails.join(', ')}`);
          return;
        }

        console.warn('No active email provider credentials (RESEND_API_KEY, GMAIL_USER/APP_PASSWORD, or SMTP_HOST) found in environment. Email dispatch skipped.');
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
