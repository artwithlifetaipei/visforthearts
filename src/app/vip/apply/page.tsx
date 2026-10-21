'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export const dynamic = 'force-dynamic';

const formatVipError = (msg: string, lang: 'zh' | 'en'): string => {
  if (!msg) return '';
  if (msg.includes('Failed to fetch')) {
    return lang === 'zh'
      ? 'Failed to fetch (此錯誤通常是因為您的瀏覽器廣告封鎖外掛 [例如 Brave 阻擋、uBlock Origin]、防毒軟體、VPN 或公司網路防火牆阻擋了 Supabase 連線。請嘗試關閉阻擋程式、切換至一般網頁瀏覽、使用手機熱點網路，或使用無痕視窗重試。)'
      : 'Failed to fetch (This error is usually caused by browser extensions [e.g. Brave Shield, ad blockers], VPN, or firewalls blocking connection to Supabase database. Please try disabling them, using private browsing, switching networks, or retrying on a mobile hotspot.)';
  }
  return msg;
};

function VIPApplyForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialCode = searchParams.get('code') || searchParams.get('ref') || '';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [inviteCode, setInviteCode] = useState(initialCode);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
    const [lang, setLang] = useState<'zh' | 'en'>('zh');

    // Bilingual Dictionary
    const dict = {
        zh: {
            title: "貴賓席位申請登記",
            dateLabel: "展期",
            dateValue: "2027 年 1 月 6 日（三）– 1 月 9 日（六）",
            vipPreviewNote: "✦ 本登記預設為 1/7–1/9 展期專屬貴賓通行證",
            galaDisclaimer: "💡 本申請表為【VIS 2027 展期貴賓通行證】專屬登記。1/6 (三) 尊榮預展暨開幕晚會（18:00–21:30）因席位有限，採大會專屬特邀或經大會審核通過之 SVIP 資格出席。",
            venueLabel: "地點",
            venueValue: "台北中山堂 光復廳",
            addressValue: "台北市中正區延平南路 98 號",
            nameLabel: "您的完整姓名 (Full Name)",
            namePlaceholder: "請輸入中文或英文姓名",
            emailLabel: "電子信箱 (Email Address)",
            emailPlaceholder: "attendant@example.com",
            codeLabel: "受邀代碼 / 推薦參展品牌或單位（選填）",
            codePlaceholder: "例如：受邀代碼、參展藝廊名稱或推薦人",
            submitBtn: "提交貴賓席申請",
            submittingBtn: "提交中...",
            backBtn: "← 返回貴賓登入",
            nameRequired: "請輸入您的完整姓名。",
            emailRequired: "請輸入正確的電子信箱。",
            timeoutErr: "伺服器回應逾時，請檢查網路連線或稍後再試。",
            queryFailed: "查詢失敗: ",
            existingApproved: "此信箱已是 VIS 貴賓，點選下方返回登入即可進入。",
            existingPending: "此信箱已在申請審核中，大會核准後將會發送通知信，請耐心等候。",
            existingRejected: "此信箱已被審核退回，如有疑問請洽 visvipteam@gmail.com。",
            insertFailed: "提交登記失敗: ",
            submitSuccess: "申請提交成功！\n\n您的申請已送出並進入大會審核程序。大會審核完成後，將依資格核發【SVIP 尊榮預展晚會卡】或【VIP 展期貴賓卡】，專屬通行邀請信將自動寄送至您的信箱。"
        },
        en: {
            title: "VIP Seat Request",
            dateLabel: "DATES",
            dateValue: "Jan 6 (Wed) – Jan 9 (Sat), 2027",
            vipPreviewNote: "✦ Registration for Fair VIP Pass (Jan 7 - 9)",
            galaDisclaimer: "💡 This form registers for Fair VIP Pass (Jan 7-9). Due to capacity limits, the Jan 6 Vernissage & Opening Gala is by special invitation or approved SVIP honorees.",
            venueLabel: "VENUE",
            venueValue: "Guangfu Hall, Taipei Zhongshan Hall",
            addressValue: "No. 98, Yanping S. Rd., Zhongzheng Dist., Taipei",
            nameLabel: "Your Full Name",
            namePlaceholder: "Enter your first and last name",
            emailLabel: "Email Address",
            emailPlaceholder: "attendant@example.com",
            codeLabel: "Invite Code / Referral Gallery or Org (Optional)",
            codePlaceholder: "e.g., Invitation code, participating gallery or referral",
            submitBtn: "Submit VIP Request",
            submittingBtn: "Submitting...",
            backBtn: "← Back to VIP Login",
            nameRequired: "Please enter your full name.",
            emailRequired: "Please enter a valid email address.",
            timeoutErr: "Server timeout. Please check your connection or try again later.",
            queryFailed: "Query failed: ",
            existingApproved: "This email is already an approved VIP. Click back to login to enter.",
            existingPending: "This email is already pending review. An invite will be sent once approved.",
            existingRejected: "This request has been declined. Please contact visvipteam@gmail.com.",
            insertFailed: "Submission failed: ",
            submitSuccess: "✓ Request submitted successfully! Your application is under review. Upon approval, your SVIP (Opening Gala) or VIP (Fair Access) digital pass invite will be emailed to you."
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setStatusType('');

        const formattedEmail = email.toLowerCase().trim();
        const formattedName = name.trim();
        const formattedCode = inviteCode.trim();

        if (!formattedName) {
            setMessage(dict[lang].nameRequired);
            setStatusType('error');
            setIsLoading(false);
            return;
        }

        if (!formattedEmail || !formattedEmail.includes('@')) {
            setMessage(dict[lang].emailRequired);
            setStatusType('error');
            setIsLoading(false);
            return;
        }

        // Setup a 8-second safety timeout guard to prevent infinite loading screens on network dropouts
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(dict[lang].timeoutErr)), 8000)
        );

        try {
            // 1. Check if email already exists in vip_allowlist (both approved or pending)
            const checkPromise = supabase
                .from('vip_allowlist')
                .select('email, status')
                .ilike('email', formattedEmail)
                .maybeSingle();

            // Race query against safety timeout
            const { data: existing, error: checkError } = await Promise.race([checkPromise, timeoutPromise]) as any;

            if (checkError) {
                throw new Error(`${dict[lang].queryFailed}${checkError.message}`);
            }

            if (existing) {
                if (existing.status === 'Approved') {
                    setMessage(dict[lang].existingApproved);
                    setStatusType('success');
                } else if (existing.status === 'Pending') {
                    setMessage(dict[lang].existingPending);
                    setStatusType('success');
                } else {
                    setMessage(dict[lang].existingRejected);
                    setStatusType('error');
                }
                setIsLoading(false);
                return;
            }

            // 2. Insert as pending self-registration with referral/invite code recorded in role
            const roleValue = formattedCode ? `推薦/代碼: ${formattedCode}` : '自主登記貴賓';

            const insertPromise = supabase
                .from('vip_allowlist')
                .insert({
                    email: formattedEmail,
                    name: formattedName,
                    status: 'Pending',
                    tier: 'VIP',
                    role: roleValue,
                    rsvp_status: 'Unconfirmed'
                });

            // Race insert against safety timeout
            const { error: insertError } = await Promise.race([insertPromise, timeoutPromise]) as any;

            if (insertError) {
                throw new Error(`${dict[lang].insertFailed}${insertError.message}`);
            }

            setMessage(dict[lang].submitSuccess);
            setStatusType('success');
            setName('');
            setEmail('');
            setInviteCode('');
        } catch (err: any) {
            console.error('VIP Application failed:', err);
            const errMsg = err.message || String(err);
            setMessage(`${lang === 'zh' ? '提交失敗 (詳細錯誤): ' : 'Submission failed: '}${formatVipError(errMsg, lang)}`);
            setStatusType('error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden select-none">
            {/* Ambient subtle glowing mesh background */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent"></div>

            <motion.div 
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-sm sm:max-w-md border border-neutral-200/60 bg-white/90 p-6 sm:p-8 py-8 sm:py-9 relative backdrop-blur-xl shadow-2xl flex flex-col gap-5"
            >
                {/* Language Switch Button */}
                <div className="absolute top-4 right-10 flex gap-1 z-20">
                    <button 
                        type="button"
                        onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                        className="text-[9px] tracking-widest font-light border border-[#C9A96E]/30 px-2 py-0.5 text-[#C9A96E] hover:bg-[#C9A96E]/10 transition-colors uppercase cursor-pointer"
                    >
                        {lang === 'zh' ? 'EN' : '繁中'}
                    </button>
                </div>

                {/* Corner accents */}
                <div className="absolute top-4 left-4 w-2.5 h-2.5 border-t-[0.5px] border-l-[0.5px] border-[#DFBA87]"></div>
                <div className="absolute top-4 right-4 w-2.5 h-2.5 border-t-[0.5px] border-r-[0.5px] border-[#DFBA87]"></div>
                <div className="absolute bottom-4 left-4 w-2.5 h-2.5 border-b-[0.5px] border-l-[0.5px] border-[#DFBA87]"></div>
                <div className="absolute bottom-4 right-4 w-2.5 h-2.5 border-b-[0.5px] border-r-[0.5px] border-[#DFBA87]"></div>

                <div className="text-center space-y-2">
                    <img 
                        src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
                        alt="VIS Logo" 
                        className="h-9 mx-auto brightness-95 opacity-90"
                    />
                    <p className="text-[7.5px] tracking-[0.5em] text-[#DFBA87] uppercase font-mono mt-3 font-medium">VIP Request Portal</p>
                    <h2 className="text-sm tracking-[0.25em] font-serif uppercase font-light text-neutral-800">{dict[lang].title}</h2>
                </div>

                {/* Exhibition Date & Venue Section — Luxury Editorial Layout */}
                <div className="border-t border-neutral-200/70 border-b border-dashed border-neutral-200/90 py-4 my-0.5 text-left space-y-3.5 select-none">
                    {/* Date */}
                    <div className="grid grid-cols-[46px_1fr] gap-2.5 items-baseline">
                        <span className="text-[9.5px] font-mono tracking-widest text-neutral-400 uppercase select-none">
                            {dict[lang].dateLabel}
                        </span>
                        <div className="space-y-1">
                            <div className="text-[12px] font-medium text-neutral-800 tracking-wide font-sans">
                                {dict[lang].dateValue}
                            </div>
                            <div className="text-[10.5px] text-[#A68042] font-normal tracking-wide">
                                {dict[lang].vipPreviewNote}
                            </div>
                        </div>
                    </div>

                    {/* Venue */}
                    <div className="grid grid-cols-[46px_1fr] gap-2.5 items-baseline">
                        <span className="text-[9.5px] font-mono tracking-widest text-neutral-400 uppercase select-none">
                            {dict[lang].venueLabel}
                        </span>
                        <div className="space-y-0.5">
                            <div className="text-[12px] font-medium text-neutral-800 tracking-wide font-sans">
                                {dict[lang].venueValue}
                            </div>
                            <div className="text-[10.5px] text-neutral-400 font-light tracking-wide">
                                {dict[lang].addressValue}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gala / Preview Clarification Note */}
                <div className="p-3 bg-amber-500/8 border border-amber-500/25 text-left rounded-sm">
                    <p className="text-[10px] text-[#73531E] font-normal leading-relaxed">
                        {dict[lang].galaDisclaimer}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-4">
                        <div className="border-b border-neutral-200 focus-within:border-[#DFBA87] transition-all py-1">
                            <label className="block text-[7px] tracking-widest text-neutral-500 uppercase mb-1">{dict[lang].nameLabel}</label>
                            <input 
                                type="text"
                                placeholder={dict[lang].namePlaceholder}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={isLoading}
                                className="w-full bg-transparent border-none outline-none text-xs text-neutral-800 tracking-widest py-1"
                            />
                        </div>
                        <div className="border-b border-neutral-200 focus-within:border-[#DFBA87] transition-all py-1">
                            <label className="block text-[7px] tracking-widest text-neutral-500 uppercase mb-1">{dict[lang].emailLabel}</label>
                            <input 
                                type="email"
                                placeholder={dict[lang].emailPlaceholder}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className="w-full bg-transparent border-none outline-none text-xs text-neutral-800 tracking-widest font-mono py-1"
                            />
                        </div>
                        <div className="border-b border-neutral-200 focus-within:border-[#DFBA87] transition-all py-1">
                            <label className="block text-[7px] tracking-widest text-neutral-500 uppercase mb-1">{dict[lang].codeLabel}</label>
                            <input 
                                type="text"
                                placeholder={dict[lang].codePlaceholder}
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                                disabled={isLoading}
                                className="w-full bg-transparent border-none outline-none text-xs text-neutral-800 tracking-widest py-1"
                            />
                        </div>
                    </div>

                    {message && (
                        <p className={`text-[10px] tracking-widest leading-relaxed font-light p-3 border whitespace-pre-line ${
                            statusType === 'success' 
                                ? 'text-emerald-600 bg-emerald-50/50 border-emerald-200' 
                                : 'text-rose-500 bg-rose-50/50 border-rose-200'
                        }`}>
                            {message}
                        </p>
                    )}

                    <div className="space-y-4">
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-[#DFBA87] hover:bg-neutral-800 hover:text-white text-black font-semibold text-[10px] tracking-[0.4em] uppercase disabled:opacity-50 transition-all duration-300 cursor-pointer font-sans"
                        >
                            {isLoading ? dict[lang].submittingBtn : dict[lang].submitBtn}
                        </button>
                        
                        <button 
                            type="button"
                            onClick={() => router.push('/vip')}
                            className="w-full py-3 text-neutral-500 hover:text-black text-[9px] tracking-[0.3em] uppercase transition-colors cursor-pointer"
                        >
                            {dict[lang].backBtn}
                        </button>
                    </div>

                    <p className="text-[10px] text-neutral-500 font-light tracking-wider text-center leading-relaxed">
                        若註冊/登入發生任何問題，請來信至{' '}
                        <a href="mailto:artwithlifetaipei@gmail.com" className="text-[#C9A96E] underline hover:text-[#B39359] transition-colors">
                            artwithlifetaipei@gmail.com
                        </a>
                        ，將有專人協助您。
                    </p>
                </form>
            </motion.div>
        </div>
    );
}

export default function VIPApplyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
                <div className="w-5 h-5 border-t-2 border-[#DFBA87] rounded-full animate-spin"></div>
            </div>
        }>
            <VIPApplyForm />
        </Suspense>
    );
}

