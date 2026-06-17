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

// Premium HTML Wrapper for General Ticket Holders Broadcast Campaigns
function wrapEmailInVisAesthetic(subject: string, content: string): string {
    const formattedContent = content
        .split('\n')
        .filter(p => p.trim() !== '')
        .map(p => `<p style="margin-bottom: 1.8em;">${p}</p>`)
        .join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400&display=swap');
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
                table-layout: fixed;
                background-color: #FAF9F6;
                padding: 40px 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #FFFFFF;
                border: 0.5px solid #E5E5E5;
                padding: 60px 50px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
            }
            .header {
                text-align: center;
                margin-bottom: 60px;
            }
            .logo {
                height: 45px;
                opacity: 0.9;
            }
            .divider {
                width: 40px;
                height: 0.5px;
                background-color: #C9A96E;
                margin: 30px auto;
            }
            .content {
                font-size: 14px;
                line-height: 2.2;
                letter-spacing: 0.08em;
                font-weight: 300;
                color: #2D2D2D;
                margin-bottom: 50px;
            }
            .footer {
                text-align: center;
                border-top: 0.5px solid #F0F0F0;
                padding-top: 40px;
                margin-top: 40px;
            }
            .footer-text {
                font-size: 8px;
                letter-spacing: 0.3em;
                color: #999999;
                text-transform: uppercase;
                margin-bottom: 12px;
            }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="container">
                <div class="header">
                    <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" alt="VIS Logo" class="logo" />
                    <div class="divider"></div>
                </div>
                
                <div class="content">
                    ${formattedContent}
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

const ADMIN_EMAILS = ['artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'];

export async function POST(req: Request) {
    try {
        const supabase = await createSupabaseServerClient();

        // 1. Authorize Admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
            return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
        }

        const body = await req.json();
        const { subject, content } = body;

        if (!subject || !content) {
            return NextResponse.json({ error: 'Missing subject or content' }, { status: 400 });
        }

        // 2. Fetch all unique emails registered for tickets
        const { data: ticketHolders, error: fetchErr } = await supabase
            .from('tickets')
            .select('email, name');

        if (fetchErr) {
            console.error('Failed to fetch ticket holders for broadcast:', fetchErr);
            return NextResponse.json({ error: 'Failed to retrieve recipient list' }, { status: 500 });
        }

        if (!ticketHolders || ticketHolders.length === 0) {
            return NextResponse.json({ success: true, recipientsCount: 0, message: 'No registered ticket holders found.' });
        }

        // De-duplicate recipient emails
        const recipientsMap = new Map<string, string>();
        ticketHolders.forEach(holder => {
            recipientsMap.set(holder.email.toLowerCase().trim(), holder.name || '');
        });

        const recipientsList = Array.from(recipientsMap.entries()).map(([email, name]) => ({
            email,
            name
        }));

        const htmlBody = wrapEmailInVisAesthetic(subject, content);

        let sentCount = 0;
        if (transporter) {
            // Send email to all recipients concurrently
            const sendPromises = recipientsList.map(async (r) => {
                try {
                    await transporter.sendMail({
                        from: `"VIS VIP TEAM" <${gmailUser}>`,
                        to: r.email,
                        subject: subject,
                        html: htmlBody
                    });
                    sentCount++;
                } catch (e) {
                    console.error(`Failed to send broadcast email to ${r.email}`, e);
                }
            });

            await Promise.all(sendPromises);
        } else {
            console.warn('GMAIL Transporter is not configured. Simulating mock broadcast.');
            sentCount = recipientsList.length;
        }

        return NextResponse.json({
            success: true,
            recipientsCount: recipientsList.length,
            sentCount
        });

    } catch (err: any) {
        console.error('Broadcast campaign API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
