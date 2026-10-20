const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function runTest() {
  const gmailUser = process.env.GMAIL_USER || 'artwithlifetaipei@gmail.com';
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  console.log('=== [TEST] 核准入選自動化流程驗證 ===');
  console.log(`1. 寄件信箱發信服務 (SMTP): ${gmailUser}`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const testApp = {
    contact_name: '郭小姐 / 測試審核代表',
    brand_name_zh: 'Antigravity Studio',
    brand_name_en: 'Antigravity Studio',
    contact_email: 'artwithlifetaipei@gmail.com',
    zone_id: 'artsy',
    booth_type: 'A01',
    custom_fee: 35000,
    discount_note: '早鳥評審特別專案價 (9折優惠)',
  };

  const portalUrl = 'https://www.visforthearts.com/exhibitor/portal';
  const resetPasswordUrl = `https://www.visforthearts.com/exhibitor/reset-password?email=${encodeURIComponent(testApp.contact_email)}`;
  const feeValue = testApp.custom_fee;
  const noteValue = testApp.discount_note;

  const htmlContent = `
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
          敬啟者 <strong>${testApp.contact_name}</strong>（${testApp.brand_name_zh}）您好：
        </p>
        <p style="font-size: 14px; line-height: 1.8; color: #333333;">
          感謝貴品牌參與 2027 VIS 參展申請。大會策展委員會已完成審查評核與空間配置規劃，我們非常榮幸地正式通知您：貴品牌<strong>《${testApp.brand_name_zh}》</strong>已獲大會正式核准入選！
        </p>

        <!-- Approval Status Card -->
        <div style="background: linear-gradient(135deg, rgba(201, 169, 110, 0.12) 0%, rgba(201, 169, 110, 0.04) 100%); border-left: 4px solid #C9A96E; padding: 18px 20px; margin: 24px 0; border-radius: 0 4px 4px 0;">
          <span style="display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #2D6A4F; background: rgba(45, 106, 79, 0.12); padding: 3px 8px; border-radius: 2px; margin-bottom: 8px;">
            ✓ 官方正式核准錄取 APPROVED
          </span>
          <div style="font-size: 15px; font-weight: 600; color: #1A1A1A; margin-bottom: 4px;">
            核定展區：明日經典展區 Artsy
          </div>
          <div style="font-size: 13px; color: #666666;">
            核定規格：A01 (3m × 2m) ｜ 專案特惠展位費：NT$ ${feeValue.toLocaleString()}（${noteValue}） ｜ 履約保證金轉帳已核驗完成
          </div>
        </div>

        <!-- Portal Access -->
        <h3 style="font-size: 13px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #8C7853; border-bottom: 1px solid #EAEAEA; padding-bottom: 8px; margin-top: 28px;">
          參展商專屬協作平台啟用指南 (Brand Portal Access)
        </h3>
        <p style="font-size: 13px; color: #444444; line-height: 1.8; margin: 10px 0;">
          大會已為您開通專屬協作後台。請即刻登入以辦理後續參展手續（指定專屬 VIP 貴賓票受邀名單享全時段免排隊優先入場、簽署古蹟場地規範、上傳大會行銷視覺圖檔）。
        </p>
        <div style="background-color: #FAF9F6; border: 1px solid #EAEAEA; border-radius: 4px; padding: 16px; margin: 14px 0; font-size: 13px;">
          <div><strong>登入帳號 Login Email：</strong> <span style="color: #8C7853; font-family: monospace;">${testApp.contact_email}</span></div>
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

  console.log('2. 正在寄送測試核准通知信至:', testApp.contact_email);
  const info = await transporter.sendMail({
    from: `"2027 VIS Contemporary Culture 大會策展組" <${gmailUser}>`,
    to: testApp.contact_email,
    subject: `【2027 VIS Contemporary Culture】正式核准錄取通知 Official Admission Notice — ${testApp.brand_name_zh} (測試)`,
    html: htmlContent,
  });

  console.log('3. 測試信件發送結果:');
  console.log(`   - 狀態: 成功 SUCCESS`);
  console.log(`   - MessageId: ${info.messageId}`);
  console.log(`   - 回應: ${info.response}`);
}

runTest().catch(console.error);
