import nodemailer from 'nodemailer';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('--- Gmail SMTP 測試工具 ---');

rl.question('請貼上您的 Google 應用程式密碼 (剛才那串 16 位字母，包含空格也沒關係): ', async (appPasswordInput) => {
    const appPassword = appPasswordInput.trim().replace(/\s+/g, '');
    const gmailUser = 'visvipteam@gmail.com';

    console.log(`\n正在初始化 Gmail SMTP (發信人: ${gmailUser})...`);
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: gmailUser,
            pass: appPassword
        }
    });

    console.log('正在嘗試發送測試信件至: amelie@theartpressasia.com...');
    
    try {
        await transporter.sendMail({
            from: `"VIS VIP TEAM" <${gmailUser}>`,
            to: 'amelie@theartpressasia.com',
            subject: 'Gmail SMTP 整合測試信件',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #FAF9F6; color: #1A1A1A;">
                    <h2 style="color: #8C7853; border-bottom: 1px solid #EAEAEA; padding-bottom: 10px;">GMAIL SMTP 連線成功！</h2>
                    <p>這是一封來自您的 <strong>visvipteam@gmail.com</strong> 的真實測試信件。</p>
                    <p>如果您在收件匣（或垃圾信匣）中看到這封信，代表我們所有的設定已經 100% 成功運作！</p>
                </div>
            `
        });

        console.log('\n✅ 成功！！！');
        console.log('Google 伺服器已成功接受這封信並發送！');
        console.log('請檢查 amelie@theartpressasia.com 的「收件匣」以及「垃圾郵件匣 (Spam)」。');

    } catch (error) {
        console.error('\n❌ 發送失敗！Google 伺服器回傳以下錯誤訊息：');
        console.error(error);
        
        console.log('\n💡 診斷說明：');
        if (error.code === 'EAUTH') {
            console.log('這代表「帳號或應用程式密碼錯誤」。請檢查：');
            console.log('1. 您的信箱是否確實是 visvipteam@gmail.com');
            console.log('2. 貼上的 16 位密碼是否有打錯字母');
        } else {
            console.log('這可能是連線或是 Google 帳戶安全防護阻擋了此發送。');
        }
    }

    rl.close();
});
