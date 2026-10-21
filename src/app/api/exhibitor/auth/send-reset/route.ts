import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';

const ADMIN_EMAILS = [
  'artwithlifetaipei@gmail.com',
  'ameliecykuo@gmail.com',
  'amelie@theartpressasia.com',
  'visvipteam@gmail.com',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return NextResponse.json({ error: '請提供有效的電子信箱。' }, { status: 400 });
    }

    // 1. Verify eligibility in exhibitor_applications or admin list
    const { data: approvedApp } = await supabase
      .from('exhibitor_applications')
      .select('id, brand_name_zh, contact_name, contact_email, status')
      .eq('contact_email', normalizedEmail)
      .eq('status', 'approved')
      .maybeSingle();

    const { data: existingBrand } = await supabase
      .from('exhibitor_brands')
      .select('id, brand_name_zh, portal_email')
      .eq('portal_email', normalizedEmail)
      .maybeSingle();

    const isAdmin = ADMIN_EMAILS.includes(normalizedEmail);

    if (!approvedApp && !existingBrand && !isAdmin) {
      return NextResponse.json(
        { error: '查無此信箱的入選核准記錄。請確認此信箱是否為申請參展時填寫的「聯絡人電子信箱」；若有疑問請洽大會 LINE: vis_culture。' },
        { status: 403 }
      );
    }

    const brandName = approvedApp?.brand_name_zh || existingBrand?.brand_name_zh || (isAdmin ? '大會管理員' : '參展商');
    const contactName = approvedApp?.contact_name || brandName;

    // 2. Trigger Supabase resetPasswordForEmail
    const origin = req.nextUrl?.origin || 'https://www.visforthearts.com';
    const redirectUrl = `${origin}/exhibitor/reset-password`;

    let supabaseResetError: string | null = null;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl,
      });
      if (error) {
        supabaseResetError = error.message;
        console.warn('Supabase resetPasswordForEmail warning:', error);
      }
    } catch (sbErr: any) {
      supabaseResetError = sbErr.message || String(sbErr);
      console.warn('Supabase resetPasswordForEmail exception:', sbErr);
    }

    // 3. Send official notification via Nodemailer (Gmail) to ensure 100% inbox delivery
    let gmailSent = false;
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
          connectionTimeout: 10000,
          socketTimeout: 15000,
        });

        const resetPageUrl = `https://www.visforthearts.com/exhibitor/reset-password?email=${encodeURIComponent(normalizedEmail)}`;

        const html = `
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FAF9F6; color: #1A1A1A;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #8C7853; display: block; margin-bottom: 6px;">
                VIS Contemporary Culture 2027
              </span>
              <h1 style="font-size: 21px; font-weight: 300; letter-spacing: 0.08em; color: #1A1A1A; margin: 0;">
                參展商協作平台密碼重設與啟用指引
              </h1>
            </div>

            <div style="background-color: #FFFFFF; border: 1px solid rgba(201, 169, 110, 0.3); border-radius: 4px; padding: 30px 26px; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
              <p style="font-size: 14px; line-height: 1.8; color: #333333; margin-top: 0;">
                敬啟者 <strong>${contactName}</strong>（${brandName}）您好：
              </p>
              <p style="font-size: 14px; line-height: 1.8; color: #333333;">
                大會系統已為您的帳號（<strong style="color: #8C7853; font-family: monospace;">${normalizedEmail}</strong>）送出重設密碼驗證要求。
              </p>

              <div style="background: linear-gradient(135deg, rgba(201, 169, 110, 0.12) 0%, rgba(201, 169, 110, 0.04) 100%); border-left: 4px solid #C9A96E; padding: 16px 18px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                <div style="font-size: 13.5px; font-weight: 600; color: #1A1A1A; margin-bottom: 6px;">
                  ✦ 兩步驟完成密碼設定
                </div>
                <div style="font-size: 12.5px; color: #555555; line-height: 1.8;">
                  1. 請檢查您的信箱收件匣（及垃圾郵件匣），查收主旨包含 <strong>【Reset Password】</strong> 之官方安全驗證信。<br/>
                  2. 點擊信件中的「Reset Password」專屬安全連結，即可直接自訂新密碼（6 碼以上）並登入後台！
                </div>
              </div>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${resetPageUrl}" target="_blank" style="display: inline-block; background-color: #0D0D0D; color: #FFFFFF; text-decoration: none; padding: 13px 26px; font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 2px;">
                  前往參展商啟用與重設頁面
                </a>
              </div>

              <!-- LINE Support -->
              <div style="background-color: #FAF9F6; border: 1px solid #EAEAEA; border-left: 3px solid #06C755; border-radius: 4px; padding: 14px 16px; margin: 20px 0 0 0; font-size: 12.5px;">
                <div style="margin-bottom: 4px;">
                  <strong>官方 LINE 專人快速協助：</strong> 
                  <span style="font-family: monospace; font-size: 14px; font-weight: 700; color: #06C755;">vis_culture</span>
                </div>
                <div style="color: #666666; font-size: 12px; line-height: 1.6;">
                  若查收信件有任何問題，歡迎隨時添加官方 LINE，秘書處將指派專人即時為您處理。
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 24px; font-size: 10px; color: #999999; letter-spacing: 0.1em;">
              &copy; 2026 VIS Contemporary Culture. All rights reserved.
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: `"VIS Contemporary Culture" <${gmailUser}>`,
          to: normalizedEmail,
          subject: `【VIS 參展商協作平台】密碼重設與帳號啟用指引 — ${brandName}`,
          html,
        });

        gmailSent = true;
      }
    } catch (mailErr: any) {
      console.warn('Gmail notification failed:', mailErr);
    }

    return NextResponse.json({
      success: true,
      brandName,
      gmailSent,
      supabaseResetError,
      message: `重設密碼驗證信已發送至 ${normalizedEmail}，請至信箱查收！`,
    });
  } catch (err: any) {
    console.error('Send reset API error:', err);
    return NextResponse.json({ error: `伺服器異常: ${err.message || err}` }, { status: 500 });
  }
}
