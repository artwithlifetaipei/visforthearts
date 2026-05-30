import { Resend } from 'resend';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('請貼上您的 Resend API Key (以 re_ 開頭): ', async (apiKey) => {
    if (!apiKey.trim().startsWith('re_')) {
        console.error('❌ 格式錯誤！金鑰必須以 re_ 開頭。');
        rl.close();
        return;
    }

    console.log('\n正在初始化 Resend...');
    const resend = new Resend(apiKey.trim());

    console.log('正在嘗試發送測試信件至: amelie@theartpressasia.com...');
    try {
        const { data, error } = await resend.emails.send({
            from: 'VIS VIP TEAM <vip@visforthearts.com>',
            replyTo: 'visvipteam@gmail.com',
            to: 'amelie@theartpressasia.com',
            subject: 'Resend 整合測試信件',
            html: '<h1>這是一封測試信件</h1><p>如果您收到這封信，代表您的網域與 Resend API 已經完全成功開通！</p>'
        });

        if (error) {
            console.error('\n❌ Resend 伺服器回傳錯誤：');
            console.error(JSON.stringify(error, null, 2));
            
            if (error.name === 'validation_error' || error.message.includes('domain')) {
                console.log('\n💡 診斷建議：');
                console.log('這代表您的 Resend 帳號目前「尚未通過 visforthearts.com 的網域驗證」。');
                console.log('請至 Resend 後台 -> Domains 進行網域的 DNS 驗證，或是暫時使用 onboarding@resend.dev 作為寄件者。');
            }
        } else {
            console.log('\n✅ 成功！Resend 回傳資料：', data);
            console.log('信件已成功遞送，請檢查收件匣或垃圾信件夾！');
        }
    } catch (err) {
        console.error('\n❌ 連線或執行時發生例外錯誤：', err);
    }

    rl.close();
});
