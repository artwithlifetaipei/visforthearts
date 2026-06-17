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

// Premium HTML wrapper for the digital entry ticket
function getTicketEmailHtml(name: string, ticketId: string, slotNameZh: string, slotNameEn: string, dateStr: string, timeRange: string, brandName: string): string {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${ticketId}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Your VIS Digital Entry Pass</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;600&display=swap');
            body {
                margin: 0;
                padding: 0;
                background-color: #FAF9F6;
                color: #1A1A1A;
                font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                -webkit-font-smoothing: antialiased;
            }
            .wrapper {
                width: 100%;
                background-color: #FAF9F6;
                padding: 40px 20px;
            }
            .container {
                max-width: 550px;
                margin: 0 auto;
                background-color: #FFFFFF;
                border: 0.5px solid #E5E5E5;
                padding: 50px 40px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
                text-align: center;
            }
            .logo {
                height: 35px;
                opacity: 0.9;
                margin-bottom: 25px;
            }
            .divider {
                width: 40px;
                height: 0.5px;
                background-color: #C9A96E;
                margin: 20px auto;
            }
            .greeting {
                font-size: 16px;
                font-weight: 300;
                letter-spacing: 0.05em;
                margin-bottom: 30px;
                line-height: 1.8;
            }
            .ticket-card {
                background: #FAF9F6;
                border: 0.5px dashed #C9A96E;
                padding: 30px;
                margin: 30px 0;
                text-align: left;
            }
            .ticket-field {
                margin-bottom: 15px;
            }
            .field-label {
                font-size: 9px;
                text-transform: uppercase;
                letter-spacing: 0.15em;
                color: #888888;
                margin-bottom: 3px;
            }
            .field-value {
                font-size: 14px;
                font-weight: 400;
                letter-spacing: 0.05em;
                color: #1A1A1A;
            }
            .qr-container {
                margin: 40px auto 20px auto;
                width: 200px;
                height: 200px;
                background: #FFFFFF;
                border: 1px solid #E5E5E5;
                padding: 10px;
                display: block;
            }
            .qr-image {
                width: 100%;
                height: 100%;
                display: block;
            }
            .ticket-footer-msg {
                font-size: 10px;
                letter-spacing: 0.08em;
                color: #666666;
                line-height: 1.8;
                margin-top: 30px;
                text-align: left;
            }
            .footer {
                margin-top: 40px;
                border-top: 0.5px solid #F0F0F0;
                padding-top: 30px;
            }
            .footer-text {
                font-size: 8px;
                letter-spacing: 0.3em;
                color: #999999;
                text-transform: uppercase;
            }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" alt="VIS Logo" class="logo" />
                <div class="divider"></div>
                
                <div class="greeting">
                    親愛的 <strong>${name}</strong>，您好：<br/>
                    感謝您索取 VIS for the Arts 數位觀展憑證。您的電子入場門票已成功鑄造，詳細資訊如下。
                </div>
                
                <div class="ticket-card">
                    <div class="ticket-field">
                        <div class="field-label">Guest 貴賓姓名</div>
                        <div class="field-value">${name}</div>
                    </div>
                    <div class="ticket-field">
                        <div class="field-label">Invited By 邀請品牌</div>
                        <div class="field-value">${brandName}</div>
                    </div>
                    <div class="ticket-field">
                        <div class="field-label">Time Slot 預約時段</div>
                        <div class="field-value">${dateStr} ${slotNameZh} (${timeRange})</div>
                    </div>
                    <div class="ticket-field" style="margin-bottom: 0;">
                        <div class="field-label">Ticket ID 憑證編號</div>
                        <div class="field-value" style="font-size: 11px; font-family: monospace; color: #555;">${ticketId}</div>
                    </div>
                </div>
                
                <div style="font-size: 12px; letter-spacing: 0.05em; color: #1A1A1A; font-weight: 600; margin-top: 30px;">
                    現場核銷專用 QR CODE
                </div>
                
                <div class="qr-container">
                    <img src="${qrUrl}" alt="QR Code" class="qr-image" />
                </div>
                
                <div class="ticket-footer-msg">
                    * 請於入場時出示本信件之 QR Code 與已追蹤 @visforthearts 及邀請品牌之 Instagram 畫面供工作人員核銷。<br/>
                    * 本時段門票採總量管制。若遇現場人潮達場館上限，將啟動『一進一出』之動線管制，敬請持本憑證依序排隊等候進場。
                </div>
                
                <div class="footer">
                    <p class="footer-text">VIS FOR THE ARTS</p>
                    <p class="footer-text" style="color: #CCCCCC; font-size: 7px; margin-top: 5px;">&copy; 2027 VIS FOR THE ARTS. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, brandId, slotId } = body;

        if (!name || !email || !brandId || !slotId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = await createSupabaseServerClient();

        // 1. Fetch Brand Details
        const { data: brand, error: brandErr } = await supabase
            .from('ticket_brands')
            .select('*')
            .eq('id', brandId)
            .single();

        if (brandErr || !brand) {
            return NextResponse.json({ error: 'Invalid invitation brand selected' }, { status: 400 });
        }

        // 2. Fetch and Validate Slot Capacity (atomic lock check)
        const { data: slot, error: slotErr } = await supabase
            .from('ticket_slots')
            .select('*')
            .eq('id', slotId)
            .single();

        if (slotErr || !slot) {
            return NextResponse.json({ error: 'Invalid slot selected' }, { status: 400 });
        }

        if (slot.booked_tickets >= slot.max_tickets) {
            return NextResponse.json({ error: 'SLOT_FULL', message: '該預約時段名額已滿，請加入候補。' }, { status: 422 });
        }

        // 3. Create Ticket Record
        const { data: ticket, error: ticketErr } = await supabase
            .from('tickets')
            .insert({
                name: name.trim(),
                email: email.toLowerCase().trim(),
                brand_id: brandId,
                brand_name: brand.name_zh,
                slot_id: slotId,
                is_redeemed: false
            })
            .select('*')
            .single();

        if (ticketErr || !ticket) {
            console.error('Failed to create ticket:', ticketErr);
            return NextResponse.json({ error: 'Failed to generate ticket' }, { status: 500 });
        }

        // 4. Update Slot Booked Count
        const { error: updateErr } = await supabase
            .from('ticket_slots')
            .update({
                booked_tickets: slot.booked_tickets + 1
            })
            .eq('id', slotId);

        if (updateErr) {
            console.error('Failed to update slot count:', updateErr);
            // We don't roll back strictly unless needed, but database constraint is enough.
        }

        // 5. Send Ticket Email
        let emailSent = false;
        if (transporter) {
            try {
                const htmlContent = getTicketEmailHtml(
                    ticket.name,
                    ticket.id,
                    slot.name_zh,
                    slot.name_en,
                    slot.date_str,
                    slot.time_range,
                    brand.name_zh
                );

                await transporter.sendMail({
                    from: `"VIS VIP TEAM" <${gmailUser}>`,
                    to: ticket.email,
                    subject: `【VIS for the Arts】您的專屬數位觀展憑證已解鎖`,
                    html: htmlContent
                });
                emailSent = true;
            } catch (err) {
                console.error('Failed to dispatch nodemailer ticket email:', err);
            }
        } else {
            console.warn('GMAIL Transporter is not configured. Ticket is minted but email was not sent.');
        }

        return NextResponse.json({
            success: true,
            ticketId: ticket.id,
            emailSent
        });

    } catch (err: any) {
        console.error('Ticket registration error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
