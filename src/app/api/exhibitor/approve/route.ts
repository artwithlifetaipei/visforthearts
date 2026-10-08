import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';

const ADMIN_EMAILS = ['artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'];

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
    const { applicationId, zoneId, boothType } = body;

    if (!applicationId) {
      return NextResponse.json({ error: '缺少申請案號 (applicationId is required)' }, { status: 400 });
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
      return NextResponse.json({ error: '權限不足，需要大會管理員權限 (Admin access required)' }, { status: 403 });
    }

    // 2. Initialize privileged Supabase client for reliable updates
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const adminDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    // 3. Fetch application
    const { data: app, error: appFetchErr } = await adminDb
      .from('exhibitor_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appFetchErr || !app) {
      return NextResponse.json({ error: `查無此申請案: ${appFetchErr?.message || 'Not found'}` }, { status: 404 });
    }

    // Detect if this is Making Project
    const boothTypeUpper = String(app.booth_type || '').toUpperCase();
    const zoneIdLower = String(app.zone_id || '').toLowerCase();
    const pref1 = String(app.zone_preference_1 || '');
    const isMakingProject = 
      zoneIdLower === 'making-project' ||
      boothTypeUpper === 'MAKING-PROJECT' ||
      boothTypeUpper.includes('MAKING') ||
      boothTypeUpper.includes('造物') ||
      pref1.includes('造物');

    const finalZoneId = isMakingProject ? 'artsy' : (zoneId || app.zone_id || 'artsy');
    const finalBoothType = isMakingProject ? 'MAKING-PROJECT' : (boothType || app.booth_type || 'S-2x2');

    // 4. Update status in exhibitor_applications
    const { error: appUpdateErr } = await adminDb
      .from('exhibitor_applications')
      .update({
        status: 'approved',
        deposit_paid: true,
        zone_id: finalZoneId,
        booth_type: finalBoothType,
      })
      .eq('id', applicationId);

    if (appUpdateErr) {
      console.error('Update exhibitor_applications error:', appUpdateErr);
      return NextResponse.json({ error: `更新申請狀態失敗: ${appUpdateErr.message}` }, { status: 500 });
    }

    // 5. Update or insert exhibitor_brands (Brand Portal Access)
    const { data: existingBrand } = await adminDb
      .from('exhibitor_brands')
      .select('id')
      .eq('application_id', applicationId)
      .maybeSingle();

    const isMicro = finalBoothType === 'T';
    const brandPayload = {
      application_id: applicationId,
      brand_name_zh: app.brand_name_zh,
      brand_name_en: app.brand_name_en,
      zone_id: finalZoneId,
      booth_type: finalBoothType,
      is_micro_exposure: isMicro,
      portal_email: app.contact_email.toLowerCase().trim(),
    };

    if (!existingBrand) {
      const { error: brandInsertErr } = await adminDb
        .from('exhibitor_brands')
        .insert(brandPayload);
      if (brandInsertErr) {
        console.error('Insert exhibitor_brands error:', brandInsertErr);
      }
    } else {
      const { error: brandUpdateErr } = await adminDb
        .from('exhibitor_brands')
        .update(brandPayload)
        .eq('application_id', applicationId);
      if (brandUpdateErr) {
        console.error('Update exhibitor_brands error:', brandUpdateErr);
      }
    }

    // 6. Send official Admission Notification Email
    let emailSent = false;
    let emailError: string | null = null;

    try {
      const gmailUser = process.env.GMAIL_USER || 'artwithlifetaipei@gmail.com';
      const gmailPass = process.env.GMAIL_APP_PASSWORD;

      if (gmailUser && gmailPass) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });

        const portalUrl = 'https://www.visforthearts.com/exhibitor/portal';
        const resetPasswordUrl = 'https://www.visforthearts.com/exhibitor/reset-password';

        let subject = '';
        let htmlContent = '';

        if (isMakingProject) {
          // --- MAKING PROJECT ADMISSION EMAIL ---
          subject = `【VIS 2027 造物計畫】正式核准錄取通知 Official Admission Notice — ${app.brand_name_zh}`;
          
          const materialCategory = app.zone_preference_1?.match(/\((.*?)\)/)?.[1] || '原創造物類別';

          htmlContent = `
            <div style="max-width: 620px; margin: 0 auto; padding: 40px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF9F6; color: #1A1A1A;">
              <div style="text-align: center; margin-bottom: 28px;">
                <span style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #8C7853; display: block; margin-bottom: 6px;">
                  VIS Contemporary Culture 2027
                </span>
                <h1 style="font-size: 23px; font-weight: 300; letter-spacing: 0.08em; color: #1A1A1A; margin: 0 0 4px 0;">
                  「造物計畫」正式核准錄取通知
                </h1>
                <p style="font-size: 12px; color: #8C7853; letter-spacing: 0.15em; text-transform: uppercase; margin: 0;">
                  Official Admission & Curation Notice
                </p>
              </div>

              <div style="background-color: #FFFFFF; border: 1px solid rgba(201, 169, 110, 0.3); border-radius: 4px; padding: 32px 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
                <p style="font-size: 14px; line-height: 1.8; color: #333333; margin-top: 0;">
                  親愛的創作者 / 品牌代表 <strong>${app.contact_name}</strong>（${app.brand_name_zh}）您好：
                </p>
                <p style="font-size: 14px; line-height: 1.8; color: #333333;">
                  誠摯恭喜您！大會策展委員會已完成「VIS 2027 造物計畫」之提案審查與作品評核。我們非常榮幸地正式通知您：您的創作提案<strong>《${app.brand_name_zh}》</strong>已正式通過策展評核，獲得 2027 VIS 台北中山堂光復廳之參展資格！
                </p>

                <!-- Approval Status Card -->
                <div style="background: linear-gradient(135deg, rgba(201, 169, 110, 0.12) 0%, rgba(201, 169, 110, 0.04) 100%); border-left: 4px solid #C9A96E; padding: 18px 20px; margin: 24px 0; border-radius: 0 4px 4px 0;">
                  <span style="display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #2D6A4F; background: rgba(45, 106, 79, 0.12); padding: 3px 8px; border-radius: 2px; margin-bottom: 8px;">
                    ✓ 官方正式核准錄取 APPROVED
                  </span>
                  <div style="font-size: 15px; font-weight: 600; color: #1A1A1A; margin-bottom: 4px;">
                    入選專案：VIS 2027「造物計畫特展席位」
                  </div>
                  <div style="font-size: 13px; color: #666666;">
                    媒材分類：${materialCategory} ｜ 專案參展費用：NT$ 12,000（費用憑證已核驗確認）
                  </div>
                </div>

                <!-- Entitlements -->
                <h3 style="font-size: 13px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #8C7853; border-bottom: 1px solid #EAEAEA; padding-bottom: 8px; margin-top: 28px;">
                  01. 特展席位專屬權益 (Exhibition Entitlements)
                </h3>
                <ul style="font-size: 13px; color: #444444; line-height: 1.9; padding-left: 20px; margin: 12px 0;">
                  <li><strong>大平面展示檯面席位</strong>：由 VIS 策展團隊統一規劃高品質展示空間與照明氛圍。</li>
                  <li><strong>現場銷售 0% 抽成</strong>：四天展期內現場交易款項 100% 歸創作者所有。</li>
                  <li><strong>參展者證 1 張</strong>：展期四天自由進出展場與工作通道。</li>
                  <li><strong>工作室貴賓名額 5 名</strong>：可於參展商後台提報 5 位親友或藏家貴賓專屬免票觀展名額。</li>
                </ul>

                <!-- Schedule -->
                <h3 style="font-size: 13px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #8C7853; border-bottom: 1px solid #EAEAEA; padding-bottom: 8px; margin-top: 28px;">
                  02. 重要展期時程 (Key Exhibition Schedule)
                </h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #444444; margin: 12px 0;">
                  <tr style="border-bottom: 1px solid #F0F0F0;">
                    <td style="padding: 8px 0; font-weight: 600; width: 35%; color: #1A1A1A;">2027.01.06 (三)</td>
                    <td style="padding: 8px 0;">10:00–17:00 佈展報到 ｜ 18:30–21:30 VIP預展暨開幕酒會</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #F0F0F0;">
                    <td style="padding: 8px 0; font-weight: 600; color: #1A1A1A;">2027.01.07 (四)</td>
                    <td style="padding: 8px 0;">11:00–19:00 公眾展期首日</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #F0F0F0;">
                    <td style="padding: 8px 0; font-weight: 600; color: #1A1A1A;">2027.01.08 (五)</td>
                    <td style="padding: 8px 0;">11:00–19:00 公眾展期次日</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #1A1A1A;">2027.01.09 (六)</td>
                    <td style="padding: 8px 0;">13:00–19:00 公眾展期最終日 ｜ 19:00–21:30 撤場離場</td>
                  </tr>
                </table>

                <!-- Portal Access -->
                <h3 style="font-size: 13px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #8C7853; border-bottom: 1px solid #EAEAEA; padding-bottom: 8px; margin-top: 28px;">
                  03. 參展商專屬協作平台 (Brand Portal Access)
                </h3>
                <p style="font-size: 13px; color: #444444; line-height: 1.8; margin: 10px 0;">
                  大會已自動為您開通專屬協作後台。您可於後台<strong>簽署古蹟參展守則、提報 5 名貴賓觀展名單、以及上傳品牌媒體宣傳素材</strong>。
                </p>
                <div style="background-color: #FAF9F6; border: 1px solid #EAEAEA; border-radius: 4px; padding: 16px; margin: 14px 0; font-size: 13px;">
                  <div><strong>登入帳號 Login Email：</strong> <span style="color: #8C7853; font-family: monospace;">${app.contact_email}</span></div>
                  <div style="margin-top: 6px;"><strong>首次登入說明：</strong> 若您尚未設定過登入密碼，請點擊下方「設定密碼」按鈕接收一次性安全驗證連結完成密碼設定，日後即可憑帳號密碼登入。</div>
                </div>

                <div style="text-align: center; margin-top: 24px; margin-bottom: 10px;">
                  <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #0D0D0D; color: #FFFFFF; text-decoration: none; padding: 14px 28px; font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 2px; margin: 4px;">
                    登入參展商協作平台 BRAND LOGIN
                  </a>
                  <a href="${resetPasswordUrl}" target="_blank" style="display: inline-block; background-color: #8C7853; color: #FFFFFF; text-decoration: none; padding: 14px 28px; font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 2px; margin: 4px;">
                    設定/重設密碼 SET PASSWORD
                  </a>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #EEEEEE; font-size: 12px; color: #777777; line-height: 1.8;">
                  大會策展秘書處將於近日指派專人與您對接後續進場佈展細節。<br/>
                  若有任何疑問，歡迎隨時回覆本信件或來信至 <a href="mailto:artwithlifetaipei@gmail.com" style="color: #8C7853; text-decoration: underline;">artwithlifetaipei@gmail.com</a> 與我們聯繫。
                </div>
              </div>

              <div style="text-align: center; margin-top: 28px; font-size: 10px; color: #999999; letter-spacing: 0.1em;">
                &copy; 2026 VIS Contemporary Culture. All rights reserved.<br/>
                台北市中正區光復里延平南路 98 號 台北中山堂光復廳
              </div>
            </div>
          `;
        } else {
          // --- REGULAR EXHIBITOR ADMISSION EMAIL ---
          subject = `【VIS 2027 國際當代藝術與生活美學展】正式核准錄取通知 Official Admission Notice — ${app.brand_name_zh}`;

          htmlContent = `
            <div style="max-width: 620px; margin: 0 auto; padding: 40px 20px; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FAF9F6; color: #1A1A1A;">
              <div style="text-align: center; margin-bottom: 28px;">
                <span style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #8C7853; display: block; margin-bottom: 6px;">
                  VIS Contemporary Culture 2027
                </span>
                <h1 style="font-size: 23px; font-weight: 300; letter-spacing: 0.08em; color: #1A1A1A; margin: 0 0 4px 0;">
                  參展申請正式核准錄取通知
                </h1>
                <p style="font-size: 12px; color: #8C7853; letter-spacing: 0.15em; text-transform: uppercase; margin: 0;">
                  Official Exhibitor Admission Notice
                </p>
              </div>

              <div style="background-color: #FFFFFF; border: 1px solid rgba(201, 169, 110, 0.3); border-radius: 4px; padding: 32px 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
                <p style="font-size: 14px; line-height: 1.8; color: #333333; margin-top: 0;">
                  敬啟者 <strong>${app.contact_name}</strong>（${app.brand_name_zh}）您好：
                </p>
                <p style="font-size: 14px; line-height: 1.8; color: #333333;">
                  感謝貴品牌參與 2027 VIS 參展申請。大會策展委員會已完成審查評核與空間配置規劃，我們非常榮幸地正式通知您：貴品牌<strong>《${app.brand_name_zh}》</strong>已獲大會正式核准入選！
                </p>

                <!-- Approval Status Card -->
                <div style="background: linear-gradient(135deg, rgba(201, 169, 110, 0.12) 0%, rgba(201, 169, 110, 0.04) 100%); border-left: 4px solid #C9A96E; padding: 18px 20px; margin: 24px 0; border-radius: 0 4px 4px 0;">
                  <span style="display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #2D6A4F; background: rgba(45, 106, 79, 0.12); padding: 3px 8px; border-radius: 2px; margin-bottom: 8px;">
                    ✓ 官方正式核准錄取 APPROVED
                  </span>
                  <div style="font-size: 15px; font-weight: 600; color: #1A1A1A; margin-bottom: 4px;">
                    核定展區：${finalZoneId === 'premier' ? '精鑑展區 Premier' : finalZoneId === 'atelier' ? '藝藏展區 Atelier' : '獨立展位 Artsy'}
                  </div>
                  <div style="font-size: 13px; color: #666666;">
                    核定規格：${finalBoothType} ｜ 履約保證金轉帳已核驗完成
                  </div>
                </div>

                <!-- Portal Access -->
                <h3 style="font-size: 13px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #8C7853; border-bottom: 1px solid #EAEAEA; padding-bottom: 8px; margin-top: 28px;">
                  參展商協作平台啟用指南 (Brand Portal Access)
                </h3>
                <p style="font-size: 13px; color: #444444; line-height: 1.8; margin: 10px 0;">
                  大會已為您開通專屬協作後台。請即刻登入以辦理後續參展手續（提報 VIP 貴賓名單、簽署古蹟場地規範、上傳大會行銷視覺圖檔）。
                </p>
                <div style="background-color: #FAF9F6; border: 1px solid #EAEAEA; border-radius: 4px; padding: 16px; margin: 14px 0; font-size: 13px;">
                  <div><strong>登入帳號 Login Email：</strong> <span style="color: #8C7853; font-family: monospace;">${app.contact_email}</span></div>
                  <div style="margin-top: 6px;"><strong>首次登入說明：</strong> 若您尚未設定過登入密碼，請點擊下方「設定密碼」按鈕接收一次性安全驗證連結完成密碼設定，日後即可憑帳號密碼登入。</div>
                </div>

                <div style="text-align: center; margin-top: 24px; margin-bottom: 10px;">
                  <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #0D0D0D; color: #FFFFFF; text-decoration: none; padding: 14px 28px; font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 2px; margin: 4px;">
                    登入參展商協作平台 BRAND LOGIN
                  </a>
                  <a href="${resetPasswordUrl}" target="_blank" style="display: inline-block; background-color: #8C7853; color: #FFFFFF; text-decoration: none; padding: 14px 28px; font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 2px; margin: 4px;">
                    設定/重設密碼 SET PASSWORD
                  </a>
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #EEEEEE; font-size: 12px; color: #777777; line-height: 1.8;">
                  大會秘書處將指派專人與您聯繫對接合約與進場手續。<br/>
                  若有任何疑問，歡迎隨時來信至 <a href="mailto:artwithlifetaipei@gmail.com" style="color: #8C7853; text-decoration: underline;">artwithlifetaipei@gmail.com</a> 與我們聯繫。
                </div>
              </div>

              <div style="text-align: center; margin-top: 28px; font-size: 10px; color: #999999; letter-spacing: 0.1em;">
                &copy; 2026 VIS Contemporary Culture. All rights reserved.<br/>
                台北市中正區光復里延平南路 98 號 台北中山堂光復廳
              </div>
            </div>
          `;
        }

        // Send to applicant
        await transporter.sendMail({
          from: `"VIS Contemporary Culture" <${gmailUser}>`,
          to: app.contact_email,
          subject,
          html: htmlContent,
        });

        // Also send copy to admin for record keeping
        for (const admin of ADMIN_EMAILS) {
          await transporter.sendMail({
            from: `"VIS System Notification" <${gmailUser}>`,
            to: admin,
            subject: `[大會審核通知備份] 已核准發送：${subject}`,
            html: htmlContent,
          });
        }

        emailSent = true;
        console.log(`[Approval Email] Sent successfully to ${app.contact_email} and admins.`);
      } else {
        emailError = 'Gmail credentials not configured';
      }
    } catch (sendErr: any) {
      console.error('[Approval Email Error]:', sendErr);
      emailError = sendErr.message;
    }

    return NextResponse.json({
      success: true,
      message: `申請案已成功核准！${emailSent ? '正式入選通知信已寄出。' : `(信件寄送異常: ${emailError})`}`,
      emailSent,
      emailError,
    });

  } catch (err: any) {
    console.error('Approval API error:', err);
    return NextResponse.json({ error: `伺服器處理異常: ${err.message}` }, { status: 500 });
  }
}
