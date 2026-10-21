import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
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

// POST: Save lead + Dual-sync to vip_collections + Send warm concierge confirmation
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
        const supabase = await createSupabaseServerClient();

        // 1. Save Lead into exhibitor_leads
        let leadRecord: any = null;
        let leadErrorMsg: string | null = null;

        try {
            const { data: leadData, error: leadError } = await supabase
                .from('exhibitor_leads')
                .insert({
                    brand_id: brand_id || null,
                    brand_name_zh: brand_name_zh || '參展品牌',
                    brand_name_en: brand_name_en || null,
                    booth_number: booth_number || null,
                    vip_user_id: vip_user_id || null,
                    vip_email: normalizedEmail,
                    vip_name: vip_name || null,
                    vip_phone: vip_phone || null,
                    vip_tier: vip_tier || 'VIP',
                    intent_level: intent_level || 'high',
                    follow_up_actions: follow_up_actions || [],
                    interested_product_ids: interested_product_ids || [],
                    notes: notes || null,
                    staff_email: staff_email || null,
                    status: 'new'
                })
                .select()
                .maybeSingle();

            if (leadError) {
                console.warn('exhibitor_leads table insert warning:', leadError.message);
                leadErrorMsg = leadError.message;
            } else {
                leadRecord = leadData;
            }
        } catch (err: any) {
            console.warn('exhibitor_leads insert exception:', err);
            leadErrorMsg = err?.message || String(err);
        }

        // 2. Dual-Sync: Save selected products into visitor's vip_collections
        let savedProductsCount = 0;
        let productsData: any[] = [];

        if (Array.isArray(interested_product_ids) && interested_product_ids.length > 0) {
            try {
                // Fetch product details for email & validation
                const { data: prods } = await supabase
                    .from('exhibitor_products')
                    .select('*')
                    .in('id', interested_product_ids);

                if (prods && prods.length > 0) {
                    productsData = prods;
                }

                // Batch upsert/insert into vip_collections
                for (const prodId of interested_product_ids) {
                    try {
                        const { error: colErr } = await supabase
                            .from('vip_collections')
                            .upsert({
                                vip_email: normalizedEmail,
                                product_id: prodId,
                                brand_id: brand_id || null,
                                notes: notes ? `現場管家收錄: ${notes}` : '由品牌現場管家為您收錄 / Added by Brand Concierge'
                            }, { onConflict: 'vip_email,product_id' });

                        if (!colErr) {
                            savedProductsCount++;
                            // Increment product save_count
                            try {
                                const matched = productsData.find(p => p.id === prodId);
                                const currentCount = matched?.save_count || 0;
                                await supabase
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
            } catch (err) {
                console.warn('vip_collections bulk sync error:', err);
            }
        }

        // 3. Dispatch Warm Concierge Email to VIP Guest
        let emailSent = false;
        if (transporter && normalizedEmail) {
            try {
                const guestDisplay = vip_name ? `${vip_name} 貴賓` : '尊榮貴賓';
                const brandDisplay = brand_name_zh || 'VIS 參展品牌';

                const productsHtml = productsData.length > 0 ? productsData.map(p => `
                    <div style="display: flex; gap: 14px; margin-bottom: 16px; padding: 12px; background: #161616; border-radius: 6px; border: 1px solid #282828;">
                        ${p.images && p.images[0] ? `
                            <img src="${p.images[0]}" alt="${p.title_zh}" style="width: 72px; height: 72px; object-fit: cover; border-radius: 4px; border: 1px solid #333;" />
                        ` : ''}
                        <div style="flex: 1; text-align: left;">
                            <div style="font-size: 11px; color: #DFBA87; letter-spacing: 0.1em; font-family: monospace; text-transform: uppercase;">
                                ${p.category || '精選展品'} ${p.booth_number ? `｜ ${p.booth_number}` : ''}
                            </div>
                            <div style="font-size: 15px; font-weight: 600; color: #FAF9F6; margin: 3px 0;">
                                ${p.title_zh}
                            </div>
                            <div style="font-size: 12px; color: #DFBA87; font-family: monospace;">
                                ${p.price_display || '私洽專員 / Inquire'}
                            </div>
                            ${p.materials ? `<div style="font-size: 11px; color: #888; margin-top: 2px;">規格：${p.materials}</div>` : ''}
                        </div>
                    </div>
                `).join('') : '<p style="color: #999; font-size: 13px;">（現場交流專屬款式已同步至您的貴賓卡典藏清單）</p>';

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

                const emailHtml = `
                    <div style="background-color: #0d0d0d; color: #e5e5e5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; line-height: 1.6;">
                        <div style="max-width: 580px; margin: 0 auto; background-color: #111111; border: 1px solid #262626; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                            
                            <!-- Header Banner -->
                            <div style="padding: 30px 24px; text-align: center; border-bottom: 1px solid #222222; background: linear-gradient(180deg, #181818 0%, #111111 100%);">
                                <div style="font-size: 10px; font-weight: 600; letter-spacing: 0.25em; color: #DFBA87; text-transform: uppercase; margin-bottom: 8px;">
                                    VIS 2027 VIP CONCIERGE SERVICE
                                </div>
                                <h1 style="font-size: 22px; font-weight: 300; color: #ffffff; margin: 0; letter-spacing: 0.05em; font-family: Georgia, serif;">
                                    ${brandDisplay} 貴賓專屬典藏收錄
                                </h1>
                            </div>

                            <!-- Content -->
                            <div style="padding: 32px 28px;">
                                <p style="font-size: 15px; color: #ffffff; margin-top: 0;">
                                    親愛的 ${guestDisplay} 您好：
                                </p>
                                <p style="font-size: 13.5px; color: #b3b3b3; line-height: 1.7;">
                                    感謝您今日蒞臨 <strong>${brandDisplay}</strong> 展位鑑賞交流。為了讓您能隨時回顧喜愛的作品與細節，現場品牌管家已為您將剛才討論的心儀款式直接收錄至您的 <strong>VIS 數位貴賓卡</strong> 中。
                                </p>

                                <!-- Product Cards -->
                                <div style="margin: 24px 0;">
                                    <div style="font-size: 11px; letter-spacing: 0.15em; color: #888; text-transform: uppercase; margin-bottom: 10px; font-weight: 600;">
                                        SAVED ARTWORKS / 現場收錄款式
                                    </div>
                                    ${productsHtml}
                                </div>

                                ${followUpHtml}

                                <!-- CTA Button -->
                                <div style="text-align: center; margin: 36px 0 24px;">
                                    <a href="https://www.visforthearts.com/vip/dashboard" style="display: inline-block; background-color: #DFBA87; color: #000000; font-size: 13px; font-weight: 600; text-decoration: none; padding: 13px 32px; border-radius: 4px; letter-spacing: 0.1em; text-transform: uppercase;">
                                        開啟我的 VIS 數位貴賓卡回看典藏 →
                                    </a>
                                </div>

                                <p style="font-size: 12px; color: #777; text-align: center; margin-bottom: 0;">
                                    展期結束後，您亦可隨時登入貴賓卡查看作品詳情、規格與品牌專屬購買通道。
                                </p>
                            </div>

                            <!-- Footer -->
                            <div style="padding: 20px 24px; text-align: center; border-top: 1px solid #1a1a1a; background-color: #0a0a0a; font-size: 11px; color: #555;">
                                <p style="margin: 0 0 4px 0;">VIS 2027 台北國際當代生活藝術博覽會 籌備委員會</p>
                                <p style="margin: 0;">TAIPEI INTERNATIONAL CONTEMPORARY LIVING ART FAIR</p>
                            </div>

                        </div>
                    </div>
                `;

                await transporter.sendMail({
                    from: `"VIS 2027 大會專屬管家 × ${brandDisplay}" <${gmailUser}>`,
                    to: normalizedEmail,
                    subject: `【VIS 2027】${brandDisplay} 已為您收錄現場心儀作品清單`,
                    html: emailHtml
                });
                emailSent = true;
            } catch (mailErr) {
                console.error('Concierge email dispatch failed:', mailErr);
            }
        }

        return NextResponse.json({
            success: true,
            lead: leadRecord,
            leadWarning: leadErrorMsg,
            collectionsSaved: savedProductsCount,
            emailSent
        });

    } catch (err: any) {
        console.error('API /exhibitor/concierge error:', err);
        return NextResponse.json({ error: err.message || '伺服器處理失敗' }, { status: 500 });
    }
}

// GET: Query leads for brand
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const brandId = url.searchParams.get('brand_id');
        const staffEmail = url.searchParams.get('staff_email');

        const supabase = await createSupabaseServerClient();
        let query = supabase
            .from('exhibitor_leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (brandId) {
            query = query.eq('brand_id', brandId);
        } else if (staffEmail) {
            query = query.eq('staff_email', staffEmail.toLowerCase().trim());
        }

        const { data, error } = await query.limit(100);

        if (error) {
            return NextResponse.json({ leads: [], error: error.message });
        }

        return NextResponse.json({ leads: data || [] });
    } catch (err: any) {
        return NextResponse.json({ leads: [], error: err.message }, { status: 500 });
    }
}
