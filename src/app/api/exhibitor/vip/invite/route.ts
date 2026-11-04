import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';

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
        email: 'artwithlifetaipei@gmail.com',
        password: 'Kuo76443173'
    });
    if (!error) {
        cachedAdminClient = adminClient;
        cachedAdminExpiresAt = now + 30 * 60 * 1000;
    }
    return adminClient;
}

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
            tier = 'VIP',
            skip_email = false
        } = body;

        if (!vip_email || !vip_surname) {
            return NextResponse.json({ error: '貴賓姓氏與電子信箱為必填欄位' }, { status: 400 });
        }

        const normalizedEmail = vip_email.toLowerCase().trim();

        // Strict email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return NextResponse.json({ error: '電子信箱格式不正確，請輸入有效的 Email 地址（例如：name@example.com）' }, { status: 400 });
        }

        // Block event website domain or dummy test domains from triggering mail bouncebacks
        if (normalizedEmail.endsWith('@visforthearts.com') || normalizedEmail.endsWith('@example.com') || normalizedEmail.endsWith('@test.com')) {
            return NextResponse.json({ error: '此網域無法作為貴賓收件信箱，請提供貴賓個人的有效電子信箱（如 Gmail、公司郵箱等）' }, { status: 400 });
        }

        const cleanSurname = vip_surname.replace(/\s*\((S?VIP)\)/gi, '').replace(/\s*\[(S?VIP)\]/gi, '').trim();
        const selectedTier = tier === 'SVIP' ? 'SVIP' : 'VIP';
        const formattedSurname = selectedTier === 'SVIP' ? `${cleanSurname} (SVIP)` : cleanSurname;

        // Use cached admin client directly to bypass RLS policies reliably and eliminate extra auth round-trips
        const supabase = await getAdminClient();

        // 1. Save submission into exhibitor_vip_submissions
        // Note: 'tier' column does not exist in exhibitor_vip_submissions schema cache.
        // The tier is cleanly encoded in vip_surname as '(SVIP)', which is parsed everywhere.
        let submissionRecord: any = null;
        const insertPayload: any = {
            brand_id: brand_id || null,
            brand_name_zh: brand_name_zh || '參展品牌',
            vip_email: normalizedEmail,
            vip_surname: formattedSurname
        };

        let { data: subData, error: subErr } = await supabase
            .from('exhibitor_vip_submissions')
            .insert(insertPayload)
            .select()
            .maybeSingle();

        // If brand_id is an approved exhibitor_applications ID not yet provisioned in exhibitor_brands (FK 23503), auto-provision it
        if (subErr && subErr.code === '23503' && brand_id) {
            try {
                const { data: appRow } = await supabase
                    .from('exhibitor_applications')
                    .select('*')
                    .eq('id', brand_id)
                    .maybeSingle();
                if (appRow) {
                    await supabase.from('exhibitor_brands').upsert({
                        id: appRow.id,
                        application_id: appRow.id,
                        brand_name_zh: appRow.brand_name_zh || brand_name_zh || '參展品牌',
                        brand_name_en: appRow.brand_name_en || appRow.brand_name_zh || 'Brand',
                        zone_id: appRow.zone_id || 'lifestyle',
                        booth_type: appRow.booth_type || 'S',
                        is_micro_exposure: appRow.booth_type === 'T',
                        portal_email: (appRow.contact_email || '').toLowerCase().trim(),
                        custom_fee: appRow.custom_fee ?? null,
                        discount_note: appRow.discount_note ?? null
                    }, { onConflict: 'id' });

                    const retryFk = await supabase
                        .from('exhibitor_vip_submissions')
                        .insert(insertPayload)
                        .select()
                        .maybeSingle();
                    if (!retryFk.error) {
                        subData = retryFk.data;
                        subErr = null;
                    } else {
                        subErr = retryFk.error;
                    }
                }
            } catch (fkEx) {
                console.warn('Auto-provision brand on FK 23503 exception:', fkEx);
            }
        }

        // If insert failed due to expired cached session, refresh admin client once
        if (subErr && subErr.code !== '23505') {
            try {
                cachedAdminClient = null;
                cachedAdminExpiresAt = 0;
                const freshAdmin = await getAdminClient();
                const retryRes = await freshAdmin
                    .from('exhibitor_vip_submissions')
                    .insert(insertPayload)
                    .select()
                    .maybeSingle();
                
                if (!retryRes.error) {
                    subData = retryRes.data;
                    subErr = null;
                } else {
                    subErr = retryRes.error;
                }
            } catch (retryEx) {
                console.warn('Admin retry exception:', retryEx);
            }
        }

        if (subErr) {
            if (subErr.code === '23505') {
                return NextResponse.json({ error: '該電子信箱已在貴品牌的專屬邀請名單中' }, { status: 409 });
            }
            return NextResponse.json({ error: `名單登記失敗: ${subErr.message}` }, { status: 500 });
        }

        submissionRecord = subData ? { ...subData, tier: selectedTier } : null;

        // 2. Real-time auto-activation: Upsert into vip_allowlist so the guest can log in instantly
        try {
            const brandRefRole = brand_name_zh ? `推薦/代碼: ${brand_name_zh}` : 'VIP';
            await supabase
                .from('vip_allowlist')
                .upsert(
                    {
                        email: normalizedEmail,
                        name: `${cleanSurname} 氏`,
                        tier: selectedTier,
                        status: 'Approved',
                        role: brandRefRole,
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

        if (transporter && !skip_email) {
            const passUrl = `https://www.visforthearts.com/vip?email=${encodeURIComponent(normalizedEmail)}`;
            const isSvip = selectedTier === 'SVIP';
            const tierBadgeText = isSvip ? '✦ SVIP 尊榮預展暨開幕晚會專屬通行資格' : '✦ VIP 展期尊榮通行證';
            const subject = `【${brand_name_zh} 敬邀】您獲邀出席 VIS Contemporary Culture（${isSvip ? '專屬 SVIP 開幕晚會通行禮遇' : '專屬 VIP 展期尊榮通行證'}）`;

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
    .tier-card { background: #181818; border: 1px solid rgba(223, 186, 135, 0.35); padding: 22px; border-radius: 6px; text-align: center; margin: 26px 0; }
    .btn-container { text-align: center; margin: 35px 0 25px; }
    .btn { display: inline-block; background-color: #DFBA87; color: #000000 !important; font-weight: 700; font-size: 13px; letter-spacing: 0.15em; text-transform: uppercase; text-decoration: none; padding: 15px 36px; border-radius: 4px; box-shadow: 0 4px 20px rgba(223, 186, 135, 0.3); }
    .fair-info-card { background: rgba(223, 186, 135, 0.05); border: 1px solid rgba(223, 186, 135, 0.22); border-radius: 8px; padding: 22px 24px; margin: 28px 0; }
    .footer { padding: 25px 30px; font-size: 11px; color: #777777; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); background-color: #0E0E0E; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" alt="VIS" style="height: 36px; filter: invert(1) brightness(200); margin-bottom: 16px;">
      <div style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #DFBA87; font-family: monospace;">VIS Contemporary Culture</div>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #FFFFFF; font-weight: 600; margin-bottom: 20px;">
        親愛的 ${cleanSurname} 氏 貴賓您好：
      </p>
      
      <p>
        我們非常榮幸地通知您，參展品牌 <strong style="color: #DFBA87; font-size: 15px;">【${brand_name_zh}】</strong> 已特別為您專屬預留了 <strong>VIS Contemporary Culture</strong> 的尊榮貴賓入場資格。
      </p>

      <div class="tier-card">
        <div style="font-size: 15px; font-weight: bold; color: #DFBA87; letter-spacing: 0.1em; margin-bottom: 8px;">
          ${tierBadgeText}
        </div>
        <div style="font-size: 12px; color: #CCCCCC; line-height: 1.6;">
          ${isSvip 
            ? '包含 <strong>2027/1/6 (三) 尊榮預展暨開幕晚會專屬資格</strong>，以及展期全時段優先快速通行禮遇。' 
            : '享有 <strong>2027/1/7 (四) 至 1/9 (六) 公眾展期全時段免排隊優先快速通行</strong> 禮遇。'
          }
        </div>
      </div>

      <p style="font-size: 13px;">
        VIS Contemporary Culture 現場不另售一般票券，受邀貴賓憑專屬數位卡通行。請點擊下方按鈕，即可直接於手機上領取並查閱您的專屬數位貴賓憑證：
      </p>

      <div class="btn-container">
        <a href="${passUrl}" class="btn">立即領取我的數位貴賓卡 →</a>
      </div>

      <div class="fair-info-card">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #D1D1D1; line-height: 1.7;">
          <tr>
            <td style="width: 55px; vertical-align: top; color: #DFBA87; font-weight: 600; padding: 4px 0;">展期</td>
            <td style="vertical-align: top; color: #FFFFFF; padding: 4px 0;">
              <div style="font-weight: 600; font-size: 14px;">2027 年 1 月 6 日 (三) – 1 月 9 日 (六)</div>
              <div style="font-size: 11px; color: #DFBA87; margin-top: 2px;">✦ ${isSvip ? '尊榮預展暨開幕晚會（1/6）與展期專屬貴賓通行' : '本憑證預設為 1/7–1/9 展期專屬貴賓通行證'}</div>
            </td>
          </tr>
          <tr>
            <td style="width: 55px; vertical-align: top; color: #DFBA87; font-weight: 600; padding: 12px 0 4px;">地點</td>
            <td style="vertical-align: top; padding: 12px 0 4px;">
              <div style="color: #FFFFFF; font-weight: 600; font-size: 14px;">台北中山堂 光復廳</div>
              <div style="font-size: 11.5px; color: #888888; margin-top: 2px;">台北市中正區延平南路 98 號</div>
            </td>
          </tr>
        </table>
      </div>

      <p style="font-size: 12px; color: #999999; margin-top: 25px;">
        【${brand_name_zh}】與 VIS 大會全體團隊，衷心期待於展會現場親自接待您的蒞臨！
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0 0 6px 0;">VIS Contemporary Culture 貴賓禮賓處</p>
      <p style="margin: 0;">如需任何協助，歡迎隨時聯繫大會秘書處：<a href="mailto:visvipteam@gmail.com" style="color: #DFBA87; text-decoration: none;">visvipteam@gmail.com</a></p>
    </div>
  </div>
</body>
</html>
            `;

            try {
                await Promise.race([
                    transporter.sendMail({
                        from: `"VIS Contemporary Culture" <${gmailUser}>`,
                        to: normalizedEmail,
                        subject: subject,
                        html: htmlContent
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Email dispatch timeout')), 6000))
                ]);
                emailSent = true;
            } catch (mailErr: any) {
                console.warn('VIP email dispatch note:', mailErr?.message);
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

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const brandId = searchParams.get('brand_id');

        if (!brandId) {
            return NextResponse.json({ error: 'Missing brand_id' }, { status: 400 });
        }

        const adminDb = await getAdminClient();
        const { data: vips, error } = await adminDb
            .from('exhibitor_vip_submissions')
            .select('*')
            .eq('brand_id', brandId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error in GET VIPs:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            vips: vips || []
        });

    } catch (err: any) {
        console.error('Exception in GET /api/exhibitor/vip/invite:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        let id: string | null = null;
        let brandId: string | null = null;

        try {
            const body = await req.json();
            id = body.id;
            brandId = body.brand_id;
        } catch {
            const { searchParams } = new URL(req.url);
            id = searchParams.get('id');
            brandId = searchParams.get('brand_id');
        }

        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        const adminDb = await getAdminClient();

        const { data: row } = await adminDb
            .from('exhibitor_vip_submissions')
            .select('id, vip_email, brand_id')
            .eq('id', id)
            .maybeSingle();

        if (row) {
            let deleteQuery = adminDb
                .from('exhibitor_vip_submissions')
                .delete()
                .eq('id', id);

            if (brandId) {
                deleteQuery = deleteQuery.eq('brand_id', brandId);
            }

            const { error: delErr } = await deleteQuery;
            if (delErr) {
                return NextResponse.json({ error: delErr.message }, { status: 500 });
            }

            if (row.vip_email) {
                try {
                    await adminDb.from('vip_allowlist').delete().eq('email', row.vip_email);
                } catch {}
            }
        }

        return NextResponse.json({ success: true, id });

    } catch (err: any) {
        console.error('Exception in DELETE /api/exhibitor/vip/invite:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
