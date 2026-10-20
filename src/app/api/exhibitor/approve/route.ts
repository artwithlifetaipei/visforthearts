import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { formatBoothDisplay, normalizeBoothCode } from '@/lib/exhibitorConstants';

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
    const { applicationId, zoneId, boothType, customFee, discountNote } = body;

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
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const clientKey = serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const clientOptions: any = {};
    if (!serviceKey && token) {
      clientOptions.global = { headers: { Authorization: `Bearer ${token}` } };
    }
    const adminDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, clientKey, clientOptions);

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
    const rawBoothType = boothType || app.booth_type || 'A01';
    const finalBoothType = isMakingProject ? 'MAKING-PROJECT' : normalizeBoothCode(rawBoothType, finalZoneId);

    const feeValue = (customFee === null || customFee === '' || customFee === undefined)
      ? null
      : Number(customFee);
    const noteValue = discountNote ? String(discountNote).trim() : null;

    // 4. Update status in exhibitor_applications
    const appUpdateData: any = {
      status: 'approved',
      deposit_paid: true,
      zone_id: finalZoneId,
      booth_type: finalBoothType,
    };
    if (feeValue !== null) appUpdateData.custom_fee = feeValue;
    if (noteValue !== null) appUpdateData.discount_note = noteValue;

    let { error: appUpdateErr } = await adminDb
      .from('exhibitor_applications')
      .update(appUpdateData)
      .eq('id', applicationId);

    if (appUpdateErr && appUpdateErr.code === '42703') {
      console.warn('custom_fee or discount_note column missing on exhibitor_applications, falling back to base fields');
      const fallback = await adminDb
        .from('exhibitor_applications')
        .update({
          status: 'approved',
          deposit_paid: true,
          zone_id: finalZoneId,
          booth_type: finalBoothType,
        })
        .eq('id', applicationId);
      appUpdateErr = fallback.error;
    }

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
    const brandPayload: any = {
      application_id: applicationId,
      brand_name_zh: app.brand_name_zh,
      brand_name_en: app.brand_name_en,
      zone_id: finalZoneId,
      booth_type: finalBoothType,
      is_micro_exposure: isMicro,
      portal_email: app.contact_email.toLowerCase().trim(),
    };
    if (feeValue !== null) brandPayload.custom_fee = feeValue;
    if (noteValue !== null) brandPayload.discount_note = noteValue;

    if (!existingBrand) {
      let { error: brandInsertErr } = await adminDb
        .from('exhibitor_brands')
        .insert(brandPayload);
      if (brandInsertErr && brandInsertErr.code === '42703') {
        delete brandPayload.custom_fee;
        delete brandPayload.discount_note;
        const fallback = await adminDb.from('exhibitor_brands').insert(brandPayload);
        brandInsertErr = fallback.error;
      }
      if (brandInsertErr) {
        console.error('Insert exhibitor_brands error:', brandInsertErr);
      }
    } else {
      let { error: brandUpdateErr } = await adminDb
        .from('exhibitor_brands')
        .update(brandPayload)
        .eq('application_id', applicationId);
      if (brandUpdateErr && brandUpdateErr.code === '42703') {
        delete brandPayload.custom_fee;
        delete brandPayload.discount_note;
        const fallback = await adminDb.from('exhibitor_brands').update(brandPayload).eq('application_id', applicationId);
        brandUpdateErr = fallback.error;
      }
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
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });

        const portalUrl = 'https://www.visforthearts.com/exhibitor/portal';
        const resetPasswordUrl = `https://www.visforthearts.com/exhibitor/reset-password?email=${encodeURIComponent(app.contact_email)}`;

        let subject = '';
        let htmlContent = '';

        if (isMakingProject) {
          // --- MAKING PROJECT ADMISSION EMAIL ---
          subject = `【2027 VIS Contemporary Culture】「造物計畫」正式核准錄取通知 Official Admission Notice — ${app.brand_name_zh}`;
          
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
                    媒材分類：${materialCategory} ｜ 專案參展費用：NT$ ${feeValue !== null ? `${feeValue.toLocaleString()}${noteValue ? `（${noteValue}）` : ''}` : '12,000'}（費用憑證已核驗確認）
                  </div>
                </div>

                <!-- Portal Access -->
                <h3 style="font-size: 13px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #8C7853; border-bottom: 1px solid #EAEAEA; padding-bottom: 8px; margin-top: 28px;">
                  01. 參展商專屬協作平台啟用指南 (Brand Portal Access)
                </h3>
                <p style="font-size: 13px; color: #444444; line-height: 1.8; margin: 10px 0;">
                  大會已自動為您開通專屬協作後台。您可於後台<strong>簽署古蹟參展守則、指定 10 位貴賓並發送 VIP 貴賓票（全時段免排隊優先入場）、以及上傳品牌媒體宣傳素材</strong>。
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

                <!-- Line Support -->
                <h3 style="font-size: 13px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #8C7853; border-bottom: 1px solid #EAEAEA; padding-bottom: 8px; margin-top: 28px;">
                  02. 官方 LINE 即時諮詢與群組協助 (LINE Fast Support)
                </h3>
                <p style="font-size: 13px; color: #444444; line-height: 1.8; margin: 10px 0;">
                  為提供入選創作者與品牌更即時、順暢的溝通與策展籌辦支援，大會特別成立【參展專屬工作溝通群組】。若您需要透過 LINE 進行快速諮詢或對接進度，請加入大會官方 LINE：
                </p>
                <div style="background-color: #FAF9F6; border: 1px solid #EAEAEA; border-left: 3px solid #06C755; border-radius: 4px; padding: 16px; margin: 14px 0; font-size: 13px;">
                  <div style="margin-bottom: 8px;">
                    <strong style="color: #1A1A1A;">官方 LINE ID：</strong> 
                    <span style="font-family: monospace; font-size: 15px; font-weight: 700; color: #06C755; background: rgba(6,199,85,0.08); padding: 3px 10px; border-radius: 4px; border: 1px solid rgba(6,199,85,0.2);">vis_culture</span>
                  </div>
                  <div style="color: #555555; line-height: 1.7; font-size: 12.5px;">
                    ✦ <strong>加入說明：</strong> 添加好友後，<strong>請主動傳送訊息告知您的「品牌名稱（或創作者姓名）」與「負責人姓名」</strong>，大會秘書處專員將即刻為您確認並邀請加入【參展專屬工作溝通群組】。
                  </div>
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
          subject = `【2027 VIS Contemporary Culture】正式核准錄取通知 Official Admission Notice — ${app.brand_name_zh}`;

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
                    核定展區：${finalZoneId === 'premier' ? '文化實體展區 Premier' : finalZoneId === 'atelier' ? '匠心藝藏展區 Atelier' : '明日經典展區 Artsy'}
                  </div>
                  <div style="font-size: 13px; color: #666666;">
                    核定規格：${formatBoothDisplay(finalBoothType, finalZoneId)} ｜ ${feeValue !== null ? `專案特惠展位費：NT$ ${feeValue.toLocaleString()}${noteValue ? `（${noteValue}）` : ''} ｜ ` : ''}履約保證金轉帳已核驗完成
                  </div>
                </div>

                <!-- Portal Access -->
                <h3 style="font-size: 13px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #8C7853; border-bottom: 1px solid #EAEAEA; padding-bottom: 8px; margin-top: 28px;">
                  01. 參展商專屬協作平台啟用指南 (Brand Portal Access)
                </h3>
                <p style="font-size: 13px; color: #444444; line-height: 1.8; margin: 10px 0;">
                  大會已為您開通專屬協作後台。請即刻登入以辦理後續參展手續（指定專屬 VIP 貴賓票受邀名單享全時段免排隊優先入場、簽署古蹟場地規範、上傳大會行銷視覺圖檔）。
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

                <!-- Line Support -->
                <h3 style="font-size: 13px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #8C7853; border-bottom: 1px solid #EAEAEA; padding-bottom: 8px; margin-top: 28px;">
                  02. 官方 LINE 即時諮詢與群組協助 (LINE Fast Support)
                </h3>
                <p style="font-size: 13px; color: #444444; line-height: 1.8; margin: 10px 0;">
                  為提供入選品牌更即時、順暢的溝通與策展籌辦支援，大會特別成立【參展專屬工作溝通群組】。若您需要透過 LINE 進行快速諮詢或對接進度，請加入大會官方 LINE：
                </p>
                <div style="background-color: #FAF9F6; border: 1px solid #EAEAEA; border-left: 3px solid #06C755; border-radius: 4px; padding: 16px; margin: 14px 0; font-size: 13px;">
                  <div style="margin-bottom: 8px;">
                    <strong style="color: #1A1A1A;">官方 LINE ID：</strong> 
                    <span style="font-family: monospace; font-size: 15px; font-weight: 700; color: #06C755; background: rgba(6,199,85,0.08); padding: 3px 10px; border-radius: 4px; border: 1px solid rgba(6,199,85,0.2);">vis_culture</span>
                  </div>
                  <div style="color: #555555; line-height: 1.7; font-size: 12.5px;">
                    ✦ <strong>加入說明：</strong> 添加好友後，<strong>請主動傳送訊息告知您的「品牌名稱」與「負責人姓名」</strong>，大會秘書處專員將即刻為您確認並邀請加入【參展專屬工作溝通群組】。
                  </div>
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
