import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

const FALLBACK_ADMIN_BRAND_ID = '9fe39fc3-3317-4c37-90df-8c2435703d24';

async function getAdminClient() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
        return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    }

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await adminClient.auth.signInWithPassword({
        email: 'artwithlifetaipei@gmail.com',
        password: 'Kuo76443173',
    });
    return adminClient;
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

function generateCertificateNo(deliveryMethod?: string) {
    const prefix = deliveryMethod === 'hand_carry' ? 'VIS27-EXIT' : 'VIS27-ORD';
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timePart = Date.now().toString(36).slice(-3).toUpperCase();
    return `${prefix}-${timePart}${rand}`;
}

// Helper: Parse concierge_lead rows from exhibitor_media_assets
function parseAssetToLead(asset: any) {
    let parsed: any = {};
    try {
        parsed = typeof asset.file_url === 'string' ? JSON.parse(asset.file_url) : (asset.file_url || {});
    } catch {
        parsed = {};
    }
    return {
        id: asset.id,
        brand_id: parsed.brand_id || asset.brand_id,
        brand_name_zh: parsed.brand_name_zh || asset.exhibitor_brands?.brand_name_zh || '參展品牌',
        brand_name_en: parsed.brand_name_en || asset.exhibitor_brands?.brand_name_en || '',
        booth_number: parsed.booth_number || asset.exhibitor_brands?.booth_type || '',
        vip_user_id: parsed.vip_user_id || null,
        vip_email: (parsed.vip_email || '').toLowerCase().trim(),
        vip_name: parsed.vip_name || '',
        vip_phone: parsed.vip_phone || '',
        vip_tier: parsed.vip_tier || 'VIP',
        record_type: parsed.record_type || 'inquiry', // 'purchase' | 'inquiry'
        delivery_method: parsed.delivery_method || null, // 'hand_carry' | 'post_fair_delivery' | null
        amount_bracket: parsed.amount_bracket || null,
        custom_item_title: parsed.custom_item_title || '',
        certificate_no: parsed.certificate_no || null,
        intent_level: parsed.intent_level || (parsed.record_type === 'purchase' ? 'high' : 'high'),
        follow_up_actions: Array.isArray(parsed.follow_up_actions) ? parsed.follow_up_actions : [],
        interested_product_ids: Array.isArray(parsed.interested_product_ids) ? parsed.interested_product_ids : [],
        product_snapshots: Array.isArray(parsed.product_snapshots) ? parsed.product_snapshots : [],
        notes: parsed.notes || '',
        staff_email: parsed.staff_email || '',
        status: parsed.status || (parsed.record_type === 'purchase' ? 'closed' : 'new'),
        created_at: parsed.created_at || asset.created_at,
    };
}

// POST: Save purchase / concierge lead + Dual-sync to vip_collections + Send official certificate / concierge email
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            brand_id,
            brand_name_zh,
            brand_name_en,
            booth_number,
            vip_email,
            vip_name,
            vip_phone,
            vip_tier = 'VIP',
            vip_user_id,
            record_type = 'purchase', // 'purchase' | 'inquiry'
            delivery_method = 'hand_carry', // 'hand_carry' | 'post_fair_delivery'
            amount_bracket = '',
            custom_item_title = '',
            intent_level = 'high',
            follow_up_actions = [],
            interested_product_ids = [],
            notes = '',
            staff_email = ''
        } = body;

        if (!vip_email) {
            return NextResponse.json({ error: '貴賓電子信箱 (vip_email) 為必填欄位' }, { status: 400 });
        }

        const normalizedEmail = vip_email.toLowerCase().trim();
        const adminDb = await getAdminClient();

        // Resolve valid brand_id for exhibitor_media_assets FK
        let validBrandId = brand_id;
        if (!validBrandId || validBrandId === '00000000-0000-0000-0000-000000000000') {
            if (staff_email) {
                const { data: bData } = await adminDb
                    .from('exhibitor_brands')
                    .select('id')
                    .ilike('portal_email', staff_email.trim())
                    .maybeSingle();
                if (bData?.id) validBrandId = bData.id;
            }
        }
        if (!validBrandId || validBrandId === '00000000-0000-0000-0000-000000000000') {
            validBrandId = FALLBACK_ADMIN_BRAND_ID;
        }

        // Fetch product details for snapshot & email
        let productsData: any[] = [];
        if (Array.isArray(interested_product_ids) && interested_product_ids.length > 0) {
            try {
                const { data: prods } = await adminDb
                    .from('exhibitor_products')
                    .select('*')
                    .in('id', interested_product_ids);
                if (prods && prods.length > 0) {
                    productsData = prods;
                }
            } catch (err) {
                console.warn('Error fetching products for snapshot:', err);
            }
        }

        const isPurchase = record_type === 'purchase';
        const certNo = isPurchase ? generateCertificateNo(delivery_method) : null;
        const nowIso = new Date().toISOString();

        const productSnapshots = productsData.map(p => ({
            id: p.id,
            title_zh: p.title_zh,
            title_en: p.title_en || '',
            category: p.category || '精選展品',
            price_display: p.price_display || '私洽',
            image: p.images && p.images[0] ? p.images[0] : null,
            booth_number: p.booth_number || booth_number || '',
        }));

        const leadPayload = {
            brand_id: validBrandId,
            brand_name_zh: brand_name_zh || '參展品牌',
            brand_name_en: brand_name_en || '',
            booth_number: booth_number || '',
            vip_user_id: vip_user_id || null,
            vip_email: normalizedEmail,
            vip_name: vip_name || '',
            vip_phone: vip_phone || '',
            vip_tier: vip_tier || 'VIP',
            record_type: isPurchase ? 'purchase' : 'inquiry',
            delivery_method: isPurchase ? (delivery_method || 'hand_carry') : null,
            amount_bracket: isPurchase ? (amount_bracket || '未指定') : null,
            custom_item_title: (custom_item_title || '').trim(),
            certificate_no: certNo,
            intent_level: isPurchase ? 'high' : (intent_level || 'high'),
            follow_up_actions: follow_up_actions || [],
            interested_product_ids: interested_product_ids || [],
            product_snapshots: productSnapshots,
            notes: notes || '',
            staff_email: staff_email || '',
            status: isPurchase ? 'closed' : 'new',
            created_at: nowIso,
        };

        // 1. Save into exhibitor_media_assets (universal JSON store in live Supabase)
        let savedRecord: any = null;
        let saveErrorMsg: string | null = null;

        try {
            const { data: assetRow, error: assetErr } = await adminDb
                .from('exhibitor_media_assets')
                .insert({
                    brand_id: validBrandId,
                    file_type: 'concierge_lead',
                    file_name: `${isPurchase ? 'PURCHASE' : 'INQUIRY'}_${certNo || Date.now()}_${normalizedEmail}`,
                    file_url: JSON.stringify(leadPayload),
                })
                .select('*')
                .maybeSingle();

            if (assetErr) {
                console.warn('exhibitor_media_assets concierge_lead insert warning:', assetErr.message);
                saveErrorMsg = assetErr.message;
            } else if (assetRow) {
                savedRecord = parseAssetToLead(assetRow);
            }
        } catch (err: any) {
            console.warn('exhibitor_media_assets insert exception:', err);
            saveErrorMsg = err?.message || String(err);
        }

        // Also attempt insert into exhibitor_leads if table exists
        try {
            await adminDb
                .from('exhibitor_leads')
                .insert({
                    brand_id: validBrandId,
                    brand_name_zh: brand_name_zh || '參展品牌',
                    brand_name_en: brand_name_en || null,
                    booth_number: booth_number || null,
                    vip_user_id: vip_user_id || null,
                    vip_email: normalizedEmail,
                    vip_name: vip_name || null,
                    vip_phone: vip_phone || null,
                    vip_tier: vip_tier || 'VIP',
                    intent_level: isPurchase ? 'high' : (intent_level || 'high'),
                    follow_up_actions: follow_up_actions || [],
                    interested_product_ids: interested_product_ids || [],
                    notes: isPurchase
                        ? `[已成交｜${delivery_method === 'hand_carry' ? '現場提貨放行' : '展後交付/訂製'}｜${amount_bracket || ''}｜${certNo}] ${custom_item_title ? `品項: ${custom_item_title} ` : ''}${notes || ''}`
                        : (notes || null),
                    staff_email: staff_email || null,
                    status: isPurchase ? 'closed' : 'new'
                });
        } catch {
            // Optional table fallback
        }

        // 2. Dual-Sync: Save selected products into visitor's vip_collections
        let savedProductsCount = 0;
        if (Array.isArray(interested_product_ids) && interested_product_ids.length > 0) {
            for (const prodId of interested_product_ids) {
                try {
                    const noteTag = isPurchase
                        ? `✦ 已典藏成交 (${delivery_method === 'hand_carry' ? '現場提貨放行' : '展後交付/訂製'}｜憑證 ${certNo})`
                        : (notes ? `現場管家收錄: ${notes}` : '由品牌現場管家為您收錄 / Added by Brand Concierge');

                    const { error: colErr } = await adminDb
                        .from('vip_collections')
                        .upsert({
                            vip_email: normalizedEmail,
                            product_id: prodId,
                            brand_id: validBrandId,
                            notes: noteTag
                        }, { onConflict: 'vip_email,product_id' });

                    if (!colErr) {
                        savedProductsCount++;
                        try {
                            const matched = productsData.find(p => p.id === prodId);
                            const currentCount = matched?.save_count || 0;
                            await adminDb
                                .from('exhibitor_products')
                                .update({ save_count: currentCount + 1 })
                                .eq('id', prodId);
                        } catch {
                            // Non-critical
                        }
                    }
                } catch (e) {
                    console.warn('vip_collections sync item error:', e);
                }
            }
        }

        // 3. Dispatch Official Email to VIP / Visitor
        let emailSent = false;
        if (transporter && normalizedEmail) {
            try {
                const guestDisplay = vip_name ? `${vip_name} 貴賓` : '尊榮貴賓';
                const brandDisplay = brand_name_zh || 'VIS 參展品牌';
                const isHandCarry = delivery_method === 'hand_carry';

                const productsHtml = productsData.length > 0 ? productsData.map(p => `
                    <div style="display: flex; gap: 14px; margin-bottom: 12px; padding: 12px; background: #161616; border-radius: 6px; border: 1px solid #282828;">
                        ${p.images && p.images[0] ? `
                            <img src="${p.images[0]}" alt="${p.title_zh}" style="width: 68px; height: 68px; object-fit: cover; border-radius: 4px; border: 1px solid #333;" />
                        ` : ''}
                        <div style="flex: 1; text-align: left;">
                            <div style="font-size: 11px; color: #DFBA87; letter-spacing: 0.1em; font-family: monospace; text-transform: uppercase;">
                                ${p.category || '精選展品'} ${p.booth_number ? `｜ ${p.booth_number}` : ''}
                            </div>
                            <div style="font-size: 15px; font-weight: 600; color: #FAF9F6; margin: 3px 0;">
                                ${p.title_zh}
                            </div>
                            ${p.materials ? `<div style="font-size: 11px; color: #888; margin-top: 2px;">規格：${p.materials}</div>` : ''}
                        </div>
                    </div>
                `).join('') : '';

                const customItemHtml = custom_item_title ? `
                    <div style="padding: 12px 14px; margin-bottom: 12px; background: #161616; border-radius: 6px; border: 1px solid #2f2a22; color: #FAF9F6; font-size: 14px;">
                        <span style="color: #DFBA87; font-size: 11px; font-family: monospace; display: block; margin-bottom: 3px;">ACQUIRED ITEM / 典藏品項</span>
                        <strong>${custom_item_title}</strong>
                    </div>
                ` : '';

                if (isPurchase) {
                    const badgeTitle = isHandCarry
                        ? '🟢 現場提貨・離場放行憑證 (OFFICIAL EXIT PASS)'
                        : '📦 展後交付／專屬訂製・官方典藏預訂憑證 (ACQUISITION RECORD)';
                    const badgeSub = isHandCarry
                        ? '離場經過展場出口時，請向工作人員出示本憑證（或開啟您的 VIS 數位貴賓卡）即可直接放行。'
                        : '您的作品屬於展後寄送或專屬訂製項目，本憑證為 VIS 大會官方認證之典藏預訂紀錄，保障您的後續交付權益。';

                    const purchaseEmailHtml = `
                        <div style="background-color: #0d0d0d; color: #e5e5e5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; line-height: 1.6;">
                            <div style="max-width: 580px; margin: 0 auto; background-color: #111111; border: 1px solid #DFBA87; border-radius: 10px; overflow: hidden; box-shadow: 0 15px 40px rgba(0,0,0,0.7);">
                                
                                <!-- Top Gold Accent -->
                                <div style="height: 4px; background: linear-gradient(90deg, #DFBA87, #F7E7C8, #A87F45);"></div>

                                <!-- Header Banner -->
                                <div style="padding: 30px 24px; text-align: center; border-bottom: 1px solid #222222; background: linear-gradient(180deg, #1a1712 0%, #111111 100%);">
                                    <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.28em; color: #DFBA87; text-transform: uppercase; margin-bottom: 8px;">
                                        VIS CONTEMPORARY CULTURE 2027 · OFFICIAL CERTIFICATE
                                    </div>
                                    <h1 style="font-size: 22px; font-weight: 400; color: #ffffff; margin: 0; letter-spacing: 0.06em; font-family: Georgia, serif;">
                                        官方典藏登錄暨${isHandCarry ? '離場放行' : '展後交付'}憑證
                                    </h1>
                                    <div style="margin-top: 10px; font-family: monospace; font-size: 13px; color: #DFBA87; letter-spacing: 0.12em;">
                                        NO. ${certNo}
                                    </div>
                                </div>

                                <!-- Content -->
                                <div style="padding: 30px 26px;">
                                    <p style="font-size: 15px; color: #ffffff; margin-top: 0;">
                                        親愛的 ${guestDisplay} 您好：
                                    </p>
                                    <p style="font-size: 13.5px; color: #cccccc; line-height: 1.7;">
                                        誠摯感謝您於 <strong>VIS Contemporary Culture 2027</strong> 現場支持並典藏 <strong>【${brandDisplay}】</strong> 之作品。本函為大會系統自動核發之官方典藏登錄憑證：
                                    </p>

                                    <!-- Status Box -->
                                    <div style="margin: 22px 0; padding: 16px; border-radius: 8px; background: ${isHandCarry ? 'rgba(16, 185, 129, 0.1)' : 'rgba(223, 186, 135, 0.1)'}; border: 1px solid ${isHandCarry ? 'rgba(16, 185, 129, 0.4)' : 'rgba(223, 186, 135, 0.4)'};">
                                        <div style="font-size: 13px; font-weight: 700; color: ${isHandCarry ? '#34d399' : '#DFBA87'}; margin-bottom: 6px;">
                                            ${badgeTitle}
                                        </div>
                                        <div style="font-size: 12.5px; color: #d4d4d4; line-height: 1.6;">
                                            ${badgeSub}
                                        </div>
                                    </div>

                                    <!-- Certificate Metadata -->
                                    <div style="background: #161616; border: 1px solid #262626; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
                                        <div style="display: flex; justify-content: space-between; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid #222;">
                                            <span style="color: #888;">典藏品牌 Brand</span>
                                            <strong style="color: #fff;">${brandDisplay} ${booth_number ? `(${booth_number})` : ''}</strong>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid #222;">
                                            <span style="color: #888;">藏家身份 Collector</span>
                                            <strong style="color: #DFBA87;">${vip_name || normalizedEmail} (${vip_tier})</strong>
                                        </div>
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="color: #888;">登錄時間 Timestamp</span>
                                            <span style="color: #ccc; font-family: monospace;">${new Date(nowIso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</span>
                                        </div>
                                    </div>

                                    ${(productsHtml || customItemHtml) ? `
                                        <div style="margin: 20px 0;">
                                            <div style="font-size: 11px; letter-spacing: 0.15em; color: #888; text-transform: uppercase; margin-bottom: 8px; font-weight: 600;">
                                                ACQUIRED WORKS / 典藏作品紀錄
                                            </div>
                                            ${customItemHtml}
                                            ${productsHtml}
                                        </div>
                                    ` : ''}

                                    ${notes ? `
                                        <div style="margin-top: 14px; padding: 12px 14px; background: #1a1712; border-left: 3px solid #DFBA87; border-radius: 4px; font-size: 12.5px; color: #ccc;">
                                            <strong>品牌交付備註：</strong>${notes}
                                        </div>
                                    ` : ''}

                                    <!-- Next Year VIP Privilege Banner -->
                                    <div style="margin-top: 24px; padding: 16px; background: linear-gradient(135deg, #1c1813 0%, #12100e 100%); border: 1px solid rgba(223,186,135,0.35); border-radius: 8px; text-align: center;">
                                        <div style="font-size: 11px; font-family: monospace; letter-spacing: 0.2em; color: #DFBA87; text-transform: uppercase;">
                                            ✦ ACTIVE COLLECTOR PRIVILEGE UNLOCKED
                                        </div>
                                        <div style="font-size: 14px; color: #ffffff; font-weight: 600; margin-top: 4px;">
                                            已為您登錄下屆 VIS 貴賓卡優先續發資格
                                        </div>
                                        <div style="font-size: 12px; color: #a3a3a3; margin-top: 4px;">
                                            感謝您在展會現場對當代創作者的支持，您的活躍藏家紀錄已正式寫入大會 VIP 核心檔案。
                                        </div>
                                    </div>

                                    <!-- CTA Button -->
                                    <div style="text-align: center; margin: 30px 0 16px;">
                                        <a href="https://www.visforthearts.com/vip/dashboard" style="display: inline-block; background-color: #DFBA87; color: #000000; font-size: 13px; font-weight: 700; text-decoration: none; padding: 13px 32px; border-radius: 6px; letter-spacing: 0.1em; text-transform: uppercase;">
                                            開啟 VIS 數位貴賓卡查看放行／典藏憑證 →
                                        </a>
                                    </div>
                                </div>

                                <!-- Footer -->
                                <div style="padding: 20px 24px; text-align: center; border-top: 1px solid #1a1a1a; background-color: #0a0a0a; font-size: 11px; color: #555;">
                                    <p style="margin: 0 0 4px 0;">VIS Contemporary Culture 2027 籌備委員會</p>
                                    <p style="margin: 0;">VIS CONTEMPORARY CULTURE 2027 ORGANIZING COMMITTEE</p>
                                </div>
                            </div>
                        </div>
                    `;

                    await transporter.sendMail({
                        from: `"VIS 2027 官方典藏憑證中心 × ${brandDisplay}" <${gmailUser}>`,
                        to: normalizedEmail,
                        subject: `【VIS 2027 官方典藏暨${isHandCarry ? '離場放行' : '展後交付'}憑證】${brandDisplay}（編號 ${certNo}）`,
                        html: purchaseEmailHtml
                    });
                    emailSent = true;
                } else {
                    const followUpHtml = follow_up_actions.length > 0 ? `
                        <div style="margin-top: 18px; padding: 14px; background: #1a1712; border-left: 3px solid #DFBA87; border-radius: 4px;">
                            <div style="font-size: 11px; color: #DFBA87; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px;">
                                下次聯繫與服務事項 (Follow-up Details)
                            </div>
                            <ul style="margin: 0; padding-left: 18px; color: #ccc; font-size: 13px; line-height: 1.6;">
                                ${follow_up_actions.map((act: string) => `<li>${act}</li>`).join('')}
                            </ul>
                            ${notes ? `<div style="margin-top: 8px; font-size: 12px; color: #aaa; font-style: italic;">備註：${notes}</div>` : ''}
                        </div>
                    ` : '';

                    const inquiryEmailHtml = `
                        <div style="background-color: #0d0d0d; color: #e5e5e5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; line-height: 1.6;">
                            <div style="max-width: 580px; margin: 0 auto; background-color: #111111; border: 1px solid #262626; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                                <div style="padding: 30px 24px; text-align: center; border-bottom: 1px solid #222222; background: linear-gradient(180deg, #181818 0%, #111111 100%);">
                                    <div style="font-size: 10px; font-weight: 600; letter-spacing: 0.25em; color: #DFBA87; text-transform: uppercase; margin-bottom: 8px;">
                                        VIS 2027 VIP CONCIERGE SERVICE
                                    </div>
                                    <h1 style="font-size: 22px; font-weight: 300; color: #ffffff; margin: 0; letter-spacing: 0.05em; font-family: Georgia, serif;">
                                        ${brandDisplay} 貴賓專屬典藏收錄
                                    </h1>
                                </div>
                                <div style="padding: 32px 28px;">
                                    <p style="font-size: 15px; color: #ffffff; margin-top: 0;">
                                        親愛的 ${guestDisplay} 您好：
                                    </p>
                                    <p style="font-size: 13.5px; color: #b3b3b3; line-height: 1.7;">
                                        感謝您今日蒞臨 <strong>${brandDisplay}</strong> 展位鑑賞交流。現場品牌管家已為您將剛才討論的心儀款式直接收錄至您的 <strong>VIS 數位貴賓卡</strong> 中。
                                    </p>
                                    <div style="margin: 24px 0;">
                                        <div style="font-size: 11px; letter-spacing: 0.15em; color: #888; text-transform: uppercase; margin-bottom: 10px; font-weight: 600;">
                                            SAVED ARTWORKS / 現場收錄款式
                                        </div>
                                        ${customItemHtml}
                                        ${productsHtml || '<p style="color: #999; font-size: 13px;">（現場交流專屬款式已同步至您的貴賓卡典藏清單）</p>'}
                                    </div>
                                    ${followUpHtml}
                                    <div style="text-align: center; margin: 36px 0 24px;">
                                        <a href="https://www.visforthearts.com/vip/dashboard" style="display: inline-block; background-color: #DFBA87; color: #000000; font-size: 13px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 4px; letter-spacing: 0.1em; text-transform: uppercase;">
                                            開啟我的 VIS 數位貴賓卡回看典藏 →
                                        </a>
                                    </div>
                                </div>
                                <div style="padding: 20px 24px; text-align: center; border-top: 1px solid #1a1a1a; background-color: #0a0a0a; font-size: 11px; color: #555;">
                                    <p style="margin: 0 0 4px 0;">VIS Contemporary Culture 2027 籌備委員會</p>
                                    <p style="margin: 0;">VIS CONTEMPORARY CULTURE 2027 ORGANIZING COMMITTEE</p>
                                </div>
                            </div>
                        </div>
                    `;

                    await transporter.sendMail({
                        from: `"VIS 2027 大會專屬管家 × ${brandDisplay}" <${gmailUser}>`,
                        to: normalizedEmail,
                        subject: `【VIS 2027】${brandDisplay} 已為您收錄現場心儀作品清單`,
                        html: inquiryEmailHtml
                    });
                    emailSent = true;
                }
            } catch (mailErr) {
                console.error('Concierge email dispatch failed:', mailErr);
            }
        }

        return NextResponse.json({
            success: true,
            lead: savedRecord || { id: `local-${Date.now()}`, ...leadPayload },
            leadWarning: saveErrorMsg,
            collectionsSaved: savedProductsCount,
            emailSent
        });

    } catch (err: any) {
        console.error('API /exhibitor/concierge POST error:', err);
        return NextResponse.json({ error: err.message || '伺服器處理失敗' }, { status: 500 });
    }
}

// GET: Lookup guest identity OR Query leads/purchases for brand / VIP / admin
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const lookupTerm = url.searchParams.get('lookup');
        const brandId = url.searchParams.get('brand_id');
        const staffEmail = url.searchParams.get('staff_email');
        const vipEmail = url.searchParams.get('vip_email');
        const allFlag = url.searchParams.get('all') === 'true';

        const adminDb = await getAdminClient();

        // --- MODE A: Guest Identity Lookup (from QR Scan, Member Code VIS-XXXXXX, Email, or Name) ---
        if (lookupTerm) {
            const rawTerm = lookupTerm.trim();
            const term = rawTerm.toLowerCase();
            const strippedHex = term.replace(/^vis-/, '').replace(/-/g, '').trim();
            let resolved: any = null;

            // 1. Exact UUID (36 chars)
            if (term.length === 36 && term.includes('-')) {
                // Check users first
                const { data: uData } = await adminDb.from('users').select('*').eq('id', term).maybeSingle();
                if (uData) {
                    const { data: alData } = await adminDb.from('vip_allowlist').select('*').ilike('email', uData.email).maybeSingle();
                    resolved = {
                        id: uData.id,
                        email: uData.email,
                        name: uData.first_name || alData?.name || null,
                        phone: uData.phone || null,
                        tier: (alData?.tier as 'VIP' | 'SVIP') || 'VIP',
                        role: uData.identity_type || alData?.role || 'VIP 貴賓',
                        company: alData?.company || null,
                        isVerified: true
                    };
                }

                // Check vip_allowlist by ID
                if (!resolved) {
                    const { data: alById } = await adminDb.from('vip_allowlist').select('*').eq('id', term).maybeSingle();
                    if (alById) {
                        resolved = {
                            id: alById.id,
                            email: alById.email,
                            name: alById.name || null,
                            phone: null,
                            tier: (alById.tier as 'VIP' | 'SVIP') || 'VIP',
                            role: alById.role || 'VIP 貴賓',
                            company: alById.company || null,
                            isVerified: true
                        };
                    }
                }

                // Check tickets by ID
                if (!resolved) {
                    const { data: ticket } = await adminDb.from('tickets').select('*').eq('id', term).maybeSingle();
                    if (ticket) {
                        resolved = {
                            id: ticket.id,
                            email: ticket.email,
                            name: ticket.name || null,
                            phone: null,
                            tier: 'VIP',
                            role: ticket.brand_name ? `特邀貴賓 (${ticket.brand_name})` : 'VIS 展期電子票貴賓',
                            company: ticket.brand_name || null,
                            isVerified: true
                        };
                    }
                }
            }

            // 2. 6-character Member Code (e.g. VIS-8F3A2B or 8F3A2B)
            if (!resolved && strippedHex.length >= 6 && /^[0-9a-f]+$/i.test(strippedHex)) {
                const prefix6 = strippedHex.slice(0, 6).toLowerCase();
                const { data: allUsers } = await adminDb.from('users').select('id, email, first_name, phone, identity_type').limit(1000);
                const matchedUser = (allUsers || []).find((u: any) => String(u.id || '').replace(/-/g, '').toLowerCase().startsWith(prefix6));
                if (matchedUser) {
                    const { data: alData } = await adminDb.from('vip_allowlist').select('*').ilike('email', matchedUser.email).maybeSingle();
                    resolved = {
                        id: matchedUser.id,
                        email: matchedUser.email,
                        name: matchedUser.first_name || alData?.name || null,
                        phone: matchedUser.phone || null,
                        tier: (alData?.tier as 'VIP' | 'SVIP') || 'VIP',
                        role: matchedUser.identity_type || alData?.role || 'VIP 貴賓',
                        company: null,
                        isVerified: true
                    };
                }
            }

            // 3. Email lookup
            if (!resolved && term.includes('@')) {
                const { data: alData } = await adminDb.from('vip_allowlist').select('*').ilike('email', term).maybeSingle();
                const { data: uData } = await adminDb.from('users').select('*').ilike('email', term).maybeSingle();
                if (alData || uData) {
                    resolved = {
                        id: uData?.id || alData?.id,
                        email: (uData?.email || alData?.email || term).toLowerCase(),
                        name: uData?.first_name || alData?.name || null,
                        phone: uData?.phone || null,
                        tier: (alData?.tier as 'VIP' | 'SVIP') || 'VIP',
                        role: uData?.identity_type || alData?.role || 'VIP 貴賓',
                        company: null,
                        isVerified: true
                    };
                } else {
                    const { data: tData } = await adminDb.from('tickets').select('*').ilike('email', term).maybeSingle();
                    if (tData) {
                        resolved = {
                            id: tData.id,
                            email: tData.email,
                            name: tData.name || null,
                            phone: null,
                            tier: 'VIP',
                            role: tData.brand_name ? `特邀貴賓 (${tData.brand_name})` : 'VIS 展期電子票貴賓',
                            company: tData.brand_name || null,
                            isVerified: true
                        };
                    }
                }
            }

            // 4. Name or partial string search
            if (!resolved && term.length >= 2) {
                const { data: alList } = await adminDb
                    .from('vip_allowlist')
                    .select('*')
                    .or(`name.ilike.%${term}%,email.ilike.%${term}%`)
                    .limit(1);
                if (alList && alList.length > 0) {
                    const al = alList[0];
                    resolved = {
                        id: al.id,
                        email: al.email,
                        name: al.name || null,
                        phone: null,
                        tier: (al.tier as 'VIP' | 'SVIP') || 'VIP',
                        role: al.role || 'VIP 貴賓',
                        company: null,
                        isVerified: true
                    };
                }
                if (!resolved) {
                    const { data: uList } = await adminDb
                        .from('users')
                        .select('*')
                        .or(`first_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
                        .limit(1);
                    if (uList && uList.length > 0) {
                        const u = uList[0];
                        const { data: alData } = await adminDb.from('vip_allowlist').select('*').ilike('email', u.email).maybeSingle();
                        resolved = {
                            id: u.id,
                            email: u.email,
                            name: u.first_name || alData?.name || null,
                            phone: u.phone || null,
                            tier: (alData?.tier as 'VIP' | 'SVIP') || 'VIP',
                            role: u.identity_type || alData?.role || 'VIP 貴賓',
                            company: null,
                            isVerified: true
                        };
                    }
                }
                if (!resolved) {
                    const { data: tList } = await adminDb
                        .from('tickets')
                        .select('*')
                        .or(`name.ilike.%${term}%,email.ilike.%${term}%`)
                        .limit(1);
                    if (tList && tList.length > 0) {
                        const t = tList[0];
                        resolved = {
                            id: t.id,
                            email: t.email,
                            name: t.name || null,
                            phone: null,
                            tier: 'VIP',
                            role: t.brand_name ? `特邀貴賓 (${t.brand_name})` : 'VIS 展期電子票貴賓',
                            company: t.brand_name || null,
                            isVerified: true
                        };
                    }
                }
            }

            return NextResponse.json({ guest: resolved });
        }

        // --- MODE B: Query Concierge Leads & Purchases ---
        let assetQuery = adminDb
            .from('exhibitor_media_assets')
            .select('*, exhibitor_brands(id, brand_name_zh, brand_name_en, booth_type, zone_id)')
            .eq('file_type', 'concierge_lead')
            .order('created_at', { ascending: false })
            .limit(500);

        if (brandId && brandId !== '00000000-0000-0000-0000-000000000000' && !allFlag) {
            assetQuery = assetQuery.eq('brand_id', brandId);
        }

        const { data: assetRows, error: assetErr } = await assetQuery;
        if (assetErr) {
            return NextResponse.json({ leads: [], error: assetErr.message });
        }

        let leads = (assetRows || []).map(parseAssetToLead);

        if (vipEmail) {
            const targetEmail = vipEmail.toLowerCase().trim();
            leads = leads.filter(l => l.vip_email === targetEmail);
        } else if (staffEmail && !brandId && !allFlag) {
            const targetStaff = staffEmail.toLowerCase().trim();
            leads = leads.filter(l => (l.staff_email || '').toLowerCase().trim() === targetStaff);
        }

        return NextResponse.json({ leads });
    } catch (err: any) {
        return NextResponse.json({ leads: [], error: err.message }, { status: 500 });
    }
}

// PATCH: Update lead / purchase status
export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, status, notes, delivery_method, amount_bracket } = body;
        if (!id) {
            return NextResponse.json({ error: 'Missing lead id' }, { status: 400 });
        }

        const adminDb = await getAdminClient();
        const { data: existing } = await adminDb
            .from('exhibitor_media_assets')
            .select('*')
            .eq('id', id)
            .eq('file_type', 'concierge_lead')
            .maybeSingle();

        if (!existing) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        let parsed: any = {};
        try {
            parsed = JSON.parse(existing.file_url);
        } catch {}

        if (status !== undefined) parsed.status = status;
        if (notes !== undefined) parsed.notes = notes;
        if (delivery_method !== undefined) parsed.delivery_method = delivery_method;
        if (amount_bracket !== undefined) parsed.amount_bracket = amount_bracket;

        const { data: updated, error } = await adminDb
            .from('exhibitor_media_assets')
            .update({ file_url: JSON.stringify(parsed) })
            .eq('id', id)
            .select('*')
            .maybeSingle();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, lead: parseAssetToLead(updated) });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
