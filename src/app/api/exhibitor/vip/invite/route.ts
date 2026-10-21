import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';

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

const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

const transporter = (gmailUser && gmailAppPassword) ? nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailUser,
        pass: gmailAppPassword
    }
}) : null;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            brand_id,
            brand_name_zh,
            vip_email,
            vip_surname,
            tier = 'VIP'
        } = body;

        if (!vip_email || !vip_surname) {
            return NextResponse.json({ error: '貴賓姓氏與電子信箱為必填欄位' }, { status: 400 });
        }

        const normalizedEmail = vip_email.toLowerCase().trim();
        const cleanSurname = vip_surname.replace(/\s*\((S?VIP)\)/gi, '').replace(/\s*\[(S?VIP)\]/gi, '').trim();
        const selectedTier = tier === 'SVIP' ? 'SVIP' : 'VIP';
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        let supabase;
        if (token) {
            supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    global: {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                }
            );
        } else {
            supabase = await createSupabaseServerClient();
        }

        // 1. Save submission into exhibitor_vip_submissions
        let submissionRecord: any = null;
        let insertPayload: any = {
            brand_id: brand_id || null,
            brand_name_zh: brand_name_zh || '參展品牌',
            vip_email: normalizedEmail,
            vip_surname: cleanSurname,
            tier: selectedTier
        };

        const { data: subData, error: subErr } = await supabase
            .from('exhibitor_vip_submissions')
            .insert(insertPayload)
            .select()
            .maybeSingle();

        if (subErr) {
            // Fallback if column 'tier' does not exist yet in database table (PostgREST PGRST204 or PostgreSQL error)
            const isMissingTier = 
                subErr.code === 'PGRST204' || 
                (subErr.message && (subErr.message.includes('tier') || subErr.message.includes('column')));

            if (isMissingTier) {
                const fallbackSurname = selectedTier === 'SVIP' ? `${cleanSurname} (SVIP)` : cleanSurname;
                const { data: retryData, error: retryErr } = await supabase
                    .from('exhibitor_vip_submissions')
                    .insert({
                        brand_id: brand_id || null,
                        brand_name_zh: brand_name_zh || '參展品牌',
                        vip_email: normalizedEmail,
                        vip_surname: fallbackSurname
                    })
                    .select()
                    .maybeSingle();

                if (retryErr) {
                    if (retryErr.code === '23505') {
                        return NextResponse.json({ error: '該電子信箱已在貴品牌的專屬邀請名單中' }, { status: 409 });
                    }
                    return NextResponse.json({ error: `名單登記失敗: ${retryErr.message}` }, { status: 500 });
                }
                submissionRecord = retryData ? { ...retryData, tier: selectedTier } : null;
            } else if (subErr.code === '23505') {
                return NextResponse.json({ error: '該電子信箱已在貴品牌的專屬邀請名單中' }, { status: 409 });
            } else {
                return NextResponse.json({ error: `名單登記失敗: ${subErr.message}` }, { status: 500 });
            }
        } else {
            submissionRecord = subData ? { ...subData, tier: selectedTier } : null;
        }

        // 2. Real-time auto-activation: Upsert into vip_allowlist so the guest can log in instantly
        try {
            await supabase
                .from('vip_allowlist')
                .upsert(
                    {
                        email: normalizedEmail,
                        name: `${cleanSurname} 氏`,
                        tier: selectedTier,
                        status: 'Approved',
                        role: 'VIP',
                        rsvp_status: 'Pending',
                    },
                    { onConflict: 'email' }
                );
        } catch (allowlistErr) {
            console.warn('Auto-allowlist sync non-blocking warning:', allowlistErr);
        }

        // 3. Dispatch Branded Invitation Email via Nodemailer
        let emailSent = false;
        let emailErrorMsg: string | null = null;

        if (transporter) {
            const passUrl = `https://www.visforthearts.com/vip?email=${encodeURIComponent(normalizedEmail)}`;
            const isSvip = selectedTier === 'SVIP';
            const tierBadgeText = isSvip ? '✦ SVIP 尊榮預展暨開幕晚會專屬席位' : '✦ VIP 展期尊榮通行證';
            const subject = `【${brand_name_zh} 敬邀】您獲邀出席 2027 VIS 當代文化博覽會（${isSvip ? '專屬 SVIP 開幕晚會席位' : '專屬 VIP 展期通行證'}）`;

            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0A0A0A; color: #FFFFFF; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #121212; border: 1px solid rgba(223, 186, 135, 0.25); border-radius: 8px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    .header { padding: 40px 30px 25px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); background: radial-gradient(circle at center top, rgba(223, 186, 135, 0.08) 0%, transparent 70%); }
    .content { padding: 35px 35px; line-height: 1.8; color: #D1D1D1; font-size: 14px; }
    .brand-callout { background: rgba(223, 186, 135, 0.08); border-left: 3px solid #DFBA87; padding: 16px 20px; border-radius: 4px; margin: 24px 0; }
    .tier-card { background: #181818; border: 1px solid rgba(223, 186, 135, 0.35); padding: 22px; border-radius: 6px; text-align: center; margin: 26px 0; }
    .btn-container { text-align: center; margin: 35px 0 20px; }
    .btn { display: inline-block; background-color: #DFBA87; color: #000000 !important; font-weight: 700; font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 15px 36px; border-radius: 4px; box-shadow: 0 4px 20px rgba(223, 186, 135, 0.3); }
    .footer { padding: 25px 30px; font-size: 11px; color: #777777; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); background-color: #0E0E0E; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" alt="VIS" style="height: 36px; filter: invert(1) brightness(200); margin-bottom: 16px;">
      <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #DFBA87; font-family: monospace;">Contemporary Culture Fair 2027</div>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #FFFFFF; font-weight: 600; margin-bottom: 20px;">
        親愛的 ${cleanSurname} 氏 貴賓您好：
      </p>
      
      <p>
        我們非常榮幸地通知您，參展品牌 <strong style="color: #DFBA87; font-size: 15px;">【${brand_name_zh}】</strong> 已特別為您專屬預留了 <strong>2027 VIS 台北當代文化博覽會</strong> 的尊榮貴賓席位。
      </p>

      <div class="tier-card">
        <div style="font-size: 15px; font-weight: bold; color: #DFBA87; letter-spacing: 0.1em; margin-bottom: 8px;">
          ${tierBadgeText}
        </div>
        <div style="font-size: 12px; color: #CCCCCC; line-height: 1.6;">
          ${isSvip 
            ? '包含 <strong>2027/1/6 (三) 18:00 - 21:30 尊榮預展暨開幕晚會專屬席位</strong>，以及展期全時段優先快速通行禮遇。' 
            : '享有 <strong>2027/1/7 (四) 至 1/9 (六) 公眾展期全時段免排隊優先快速通行</strong> 禮遇。'
          }
        </div>
      </div>

      <p style="font-size: 13px;">
        本屆博覽會現場不另售一般票券，受邀貴賓憑專屬數位卡通行。請點擊下方按鈕，即可直接於手機上領取並查閱您的專屬數位貴賓憑證：
      </p>

      <div class="btn-container">
        <a href="${passUrl}" class="btn">立即領取我的數位貴賓卡 →</a>
      </div>

      <div class="brand-callout">
        <p style="margin: 0; font-size: 12px; color: #E5E5E5;">
          <strong>【展會資訊】</strong><br>
          • 展會地點：台北市中正區延平南路98號（台北市中山堂，捷運西門站 5 號出口步行 1 分鐘）<br>
          • 開幕晚會：2027/1/6 (三) 18:00 - 21:30<br>
          • 公眾展期：2027/1/7 (四) - 1/9 (六)<br>
          • 接待方式：現場設有貴賓專屬接待櫃檯，出示手機數位卡即可核銷快速入場。
        </p>
      </div>

      <p style="font-size: 12px; color: #999999; margin-top: 25px;">
        【${brand_name_zh}】與 VIS 大會全體團隊，衷心期待於展會現場親自接待您的蒞臨！
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">VIS 当代文化博覽會 貴賓禮賓辦公室</p>
      <p style="margin: 0;">如需任何協助，歡迎隨時聯繫大會秘書處：<a href="mailto:visvipteam@gmail.com" style="color: #DFBA87; text-decoration: none;">visvipteam@gmail.com</a></p>
    </div>
  </div>
</body>
</html>
            `;

            try {
                await transporter.sendMail({
                    from: `"VIS 當代文化博覽會" <${gmailUser}>`,
                    to: normalizedEmail,
                    subject: subject,
                    html: htmlContent
                });
                emailSent = true;
            } catch (mailErr: any) {
                console.error('Failed to send branded VIP invite email:', mailErr);
                emailErrorMsg = mailErr?.message || 'Mail transport error';
            }
        }

        return NextResponse.json({
            success: true,
            submission: submissionRecord,
            emailSent,
            emailError: emailErrorMsg
        });

    } catch (err: any) {
        console.error('Error in exhibitor VIP invite route:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
