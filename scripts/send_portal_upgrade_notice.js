const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const gmailUser = process.env.GMAIL_USER || 'artwithlifetaipei@gmail.com';
const gmailPass = process.env.GMAIL_APP_PASSWORD;

if (!gmailUser || !gmailPass) {
  console.error('Missing GMAIL credentials');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPass,
  },
  connectionTimeout: 10000,
  socketTimeout: 15000,
});

function generateEmailHtml(applicant) {
  const email = applicant.contact_email.toLowerCase().trim();
  const resetUrl = `https://www.visforthearts.com/exhibitor/reset-password?email=${encodeURIComponent(email)}`;
  const portalUrl = 'https://www.visforthearts.com/exhibitor/portal';

  return `
    <div style="max-width: 620px; margin: 0 auto; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #FAF9F6; color: #1A1A1A;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #8C7853; display: block; margin-bottom: 6px;">
          VIS Contemporary Culture 2027
        </span>
        <h1 style="font-size: 22px; font-weight: 300; letter-spacing: 0.08em; color: #1A1A1A; margin: 0 0 4px 0;">
          參展商協作平台系統升級與首次登入指引
        </h1>
        <p style="font-size: 11px; color: #8C7853; letter-spacing: 0.15em; text-transform: uppercase; margin: 0;">
          Brand Portal System Upgrade & Access Notice
        </p>
      </div>

      <!-- Main Card -->
      <div style="background-color: #FFFFFF; border: 1px solid rgba(201, 169, 110, 0.3); border-radius: 4px; padding: 32px 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
        <p style="font-size: 14px; line-height: 1.8; color: #333333; margin-top: 0;">
          敬啟者 <strong>${applicant.contact_name}</strong>（${applicant.brand_name_zh}）您好：
        </p>

        <p style="font-size: 14px; line-height: 1.8; color: #333333;">
          大會技術團隊今早已全面優化升級參展商協作平台登入系統，提供更順暢穩定的啟用體驗。
        </p>

        <!-- Access Steps Card -->
        <div style="background: linear-gradient(135deg, rgba(201, 169, 110, 0.12) 0%, rgba(201, 169, 110, 0.04) 100%); border-left: 4px solid #C9A96E; padding: 18px 20px; margin: 24px 0; border-radius: 0 4px 4px 0;">
          <div style="font-size: 14px; font-weight: 600; color: #1A1A1A; margin-bottom: 8px;">
            ✦ 首次登入專屬啟用說明
          </div>
          <div style="font-size: 13px; color: #444444; line-height: 1.8;">
            若您是首次登入，請點擊下方專屬啟用連結：<br/>
            進入頁面後，系統已為您預填登記信箱（<strong style="color: #1A1A1A; font-family: monospace;">${email}</strong>），您只需<strong>直接設定您的專屬密碼（6 碼以上）</strong>，點擊【確認設定並進入平台】，即可立即登入後台！
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #8C7853; color: #FFFFFF; text-decoration: none; padding: 14px 28px; font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 2px; margin: 6px; box-shadow: 0 2px 10px rgba(140,120,83,0.25);">
            首次設定密碼並進入後台 SET PASSWORD
          </a>
          <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #0D0D0D; color: #FFFFFF; text-decoration: none; padding: 14px 28px; font-size: 11px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 2px; margin: 6px;">
            已有密碼直接登入 BRAND LOGIN
          </a>
        </div>

        <p style="font-size: 12.5px; color: #666666; line-height: 1.8; margin-top: 10px;">
          * 若日後已設定過密碼，亦可隨時由此處直接憑帳號密碼登入：<br/>
          <a href="${portalUrl}" style="color: #8C7853; text-decoration: underline; word-break: break-all;">${portalUrl}</a>
        </p>

        <!-- LINE Fast Support Card -->
        <div style="background-color: #FAF9F6; border: 1px solid #EAEAEA; border-left: 3px solid #06C755; border-radius: 4px; padding: 16px; margin: 24px 0 10px 0; font-size: 13px;">
          <div style="margin-bottom: 8px;">
            <strong style="color: #1A1A1A;">官方 LINE 即時諮詢與群組協助：</strong> 
            <span style="font-family: monospace; font-size: 15px; font-weight: 700; color: #06C755; background: rgba(6,199,85,0.08); padding: 3px 10px; border-radius: 4px; border: 1px solid rgba(6,199,85,0.2);">vis_culture</span>
          </div>
          <div style="color: #555555; line-height: 1.7; font-size: 12px;">
            有任何登入或參展相關疑問，歡迎隨時添加大會官方 LINE 告知您的品牌名稱，秘書處專員將即刻為您協助並邀請加入【參展專屬工作溝通群組】。
          </div>
        </div>

        <div style="margin-top: 26px; padding-top: 18px; border-top: 1px solid #EEEEEE; font-size: 11.5px; color: #777777; line-height: 1.8;">
          若有任何其他需求，亦歡迎隨時回覆本信件或來信至 <a href="mailto:artwithlifetaipei@gmail.com" style="color: #8C7853; text-decoration: underline;">artwithlifetaipei@gmail.com</a>。<br/>
          VIS Contemporary Culture 策展秘書處 敬上
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 28px; font-size: 10px; color: #999999; letter-spacing: 0.1em;">
        &copy; 2026/2027 VIS Contemporary Culture. All rights reserved.<br/>
        台北市中正區光復里延平南路 98 號 台北中山堂光復廳
      </div>
    </div>
  `;
}

// Skip emails already sent in previous run
const ALREADY_SENT = new Set(['lovely870620@gmail.com', 'pipi727813@gmail.com']);

async function run() {
  console.log('Fetching approved applications from Supabase...');
  const { data: apps, error } = await sb
    .from('exhibitor_applications')
    .select('id, brand_name_zh, brand_name_en, contact_name, contact_email, status')
    .eq('status', 'approved');

  if (error || !apps) {
    console.error('Error fetching applications:', error);
    process.exit(1);
  }

  // Deduplicate by normalized contact_email
  const uniqueAppsMap = new Map();
  for (const app of apps) {
    const email = app.contact_email.toLowerCase().trim();
    if (!uniqueAppsMap.has(email)) {
      uniqueAppsMap.set(email, app);
    }
  }

  const targets = Array.from(uniqueAppsMap.values());
  console.log(`Found ${targets.length} unique approved brands in total.`);

  let successCount = ALREADY_SENT.size;
  let failCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const app = targets[i];
    let recipientEmail = app.contact_email.toLowerCase().trim();

    if (recipientEmail === 'pw.chen1025@gmai.com') {
      recipientEmail = 'pw.chen1025@gmail.com';
    }

    if (ALREADY_SENT.has(recipientEmail)) {
      console.log(`[${i + 1}/${targets.length}] ${app.brand_name_zh} <${recipientEmail}>: already sent, skipping.`);
      continue;
    }

    const subject = `【VIS 2027 重要通知】參展商協作平台系統升級與首次登入指引 — ${app.brand_name_zh}`;
    const html = generateEmailHtml({ ...app, contact_email: recipientEmail });

    try {
      console.log(`[${i + 1}/${targets.length}] Sending to ${app.brand_name_zh} <${recipientEmail}>...`);
      await transporter.sendMail({
        from: `"VIS Contemporary Culture" <${gmailUser}>`,
        to: recipientEmail,
        subject,
        html,
      });
      console.log(` -> SUCCESS`);
      successCount++;
    } catch (err) {
      console.error(` -> FAILED:`, err.message);
      failCount++;
    }

    await new Promise((r) => setTimeout(r, 800));
  }

  // Send summary to admin
  try {
    const adminSummarySubject = `[系統備份] 已完成發送參展商協作平台升級指引信 (${successCount} 家品牌)`;
    const adminCopyHtml = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h3>大會審查備份：已成功發送 ${successCount} 封參展商升級指引信</h3>
        <p>發送清單如下：</p>
        <ul>
          ${targets.map(t => `<li><strong>${t.brand_name_zh}</strong> (${t.contact_name}) - ${t.contact_email === 'pw.chen1025@gmai.com' ? 'pw.chen1025@gmail.com (已校正)' : t.contact_email}</li>`).join('')}
        </ul>
      </div>
    `;
    await transporter.sendMail({
      from: `"VIS System Notification" <${gmailUser}>`,
      to: 'artwithlifetaipei@gmail.com',
      cc: 'amelie@theartpressasia.com',
      subject: adminSummarySubject,
      html: adminCopyHtml,
    });
    console.log('Admin summary email dispatched successfully.');
  } catch (adminErr) {
    console.error('Failed to send admin summary copy:', adminErr.message);
  }

  console.log(`\n========================================`);
  console.log(`Done! Success: ${successCount}, Failed: ${failCount}`);
  console.log(`========================================`);
}

run();
