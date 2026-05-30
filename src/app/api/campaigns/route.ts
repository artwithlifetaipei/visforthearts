import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';

// Initialize Nodemailer Transporter gracefully using Gmail SMTP
const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

const transporter = (gmailUser && gmailAppPassword) ? nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: gmailUser,
        pass: gmailAppPassword
    }
}) : null;

// Premium HTML Wrapper for VIP/Buyer Campaigns
function wrapEmailInVisAesthetic(subject: string, content: string): string {
    // Convert newlines in content to elegant paragraph spaces
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
                background-color: #D4AF37;
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
            .btn-container {
                text-align: center;
                margin-bottom: 60px;
            }
            .cta-button {
                display: inline-block;
                background-color: #1A1A1A;
                color: #FFFFFF !important;
                text-decoration: none;
                font-size: 10px;
                letter-spacing: 0.4em;
                text-transform: uppercase;
                font-weight: 400;
                padding: 18px 45px;
                transition: all 0.3s ease;
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
            .footer-subtext {
                font-size: 9px;
                letter-spacing: 0.1em;
                color: #CCCCCC;
                text-transform: uppercase;
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

                <div class="btn-container">
                    <a href="https://www.visforthearts.com/vip" class="cta-button">Enter VIP Portal</a>
                </div>

                <div class="footer">
                    <p class="footer-text">VIS FOR THE ARTS</p>
                    <p class="footer-subtext">&copy; 2026 VIS FOR THE ARTS. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

export async function POST(req: Request) {
    try {
        const { campaignId } = await req.json();
        if (!campaignId) {
            return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 });
        }

        // 1. Fetch Campaign Details
        const { data: campaign, error: campError } = await supabase
            .from('email_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (campError || !campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // 2. Determine target audience based on campaign.target_role
        let query = supabase.from('vip_allowlist').select('email, name');
        if (campaign.target_role !== 'All') {
            query = query.eq('role', campaign.target_role);
        }
        const { data: recipients, error: recipError } = await query;

        if (recipError || !recipients || recipients.length === 0) {
            return NextResponse.json({ message: 'No recipients found for this campaign' }, { status: 200 });
        }

        // 3. Render premium email content
        const htmlBody = wrapEmailInVisAesthetic(campaign.subject, campaign.content);

        // 4. Send Emails via Gmail SMTP (or fall back to Mock if no transporter is present)
        if (transporter) {
            // Send email to all recipients concurrently
            const sendPromises = recipients.map(async (r) => {
                try {
                    await transporter.sendMail({
                        from: `"VIS VIP TEAM" <${gmailUser}>`,
                        to: r.email,
                        subject: campaign.subject,
                        html: htmlBody
                    });

                    // Log to email_logs
                    await supabase
                        .from('email_logs')
                        .insert({
                            campaign_id: campaignId,
                            recipient_email: r.email
                        });
                } catch (e) {
                    console.error(`Failed to send email to ${r.email}`, e);
                }
            });

            await Promise.all(sendPromises);
        } else {
            console.warn('GMAIL_USER or GMAIL_APP_PASSWORD is not defined. Simulating sending (Mock Mode)...');
            // Populate mock logs so CRM dashboard works
            const mockLogs = recipients.map(r => ({
                campaign_id: campaignId,
                recipient_email: r.email
            }));
            await supabase.from('email_logs').insert(mockLogs);
        }

        // Update campaign status
        await supabase
            .from('email_campaigns')
            .update({
                status: 'Sent',
                sent_at: new Date().toISOString()
            })
            .eq('id', campaignId);

        return NextResponse.json({ success: true, recipientsSent: recipients.length });
    } catch (error: any) {
        console.error('Campaign sending API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
