'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Crown, Gem, CheckCircle2, ArrowLeft, Mail } from 'lucide-react';

const formatVipError = (msg: string, lang: 'zh' | 'en'): string => {
  if (!msg) return '';
  if (msg.includes('Failed to fetch')) {
    return lang === 'zh'
      ? 'Failed to fetch (此錯誤通常是因為您的瀏覽器廣告封鎖外掛 [例如 Brave 阻擋、uBlock Origin]、防毒軟體、VPN 或公司網路防火牆阻擋了 Supabase 連線。請嘗試關閉阻擋程式、切換至一般網頁瀏覽、使用手機熱點網路，或使用無痕視窗重試。)'
      : 'Failed to fetch (This error is usually caused by browser extensions [e.g. Brave Shield, ad blockers], VPN, or firewalls blocking connection to Supabase database. Please try disabling them, using private browsing, switching networks, or retrying on a mobile hotspot.)';
  }
  return msg;
};

export default function VIPLoginPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [message, setMessage] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const router = useRouter();

    // Auto-redirect if already logged in or landing with hash
    useEffect(() => {
        setIsMounted(true);

        // Pre-fill email from URL parameter if available (e.g. from LINE or direct invitation link)
        if (typeof window !== 'undefined') {
            try {
                const params = new URLSearchParams(window.location.search);
                const queryEmail = params.get('email');
                if (queryEmail) {
                    setEmail(queryEmail.toLowerCase().trim());
                }
            } catch {
                // Ignore URL parsing errors
            }
        }
        const checkVipSession = async (currentSession: any) => {
            if (!currentSession?.user?.email) return;
            const email = currentSession.user.email.toLowerCase().trim();
            
            // Allow admin bypass
            const ADMIN_EMAILS = ['artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'];
            if (ADMIN_EMAILS.includes(email.toLowerCase().trim())) {
                router.push('/vip/onboarding');
                return;
            }
            
            try {
                // Check if email is in vip_allowlist
                const { data: allowed, error } = await supabase
                    .from('vip_allowlist')
                    .select('email')
                    .ilike('email', email)
                    .maybeSingle();
                
                if (allowed) {
                    router.push('/vip/onboarding');
                } else {
                    // Not in allowlist - ONLY show alert, NEVER sign out to avoid dropping active exhibitor sessions
                    setMessage('此信箱目前不在 VIS 貴賓名單中。如需申請，請聯繫主辦單位。');
                }
            } catch (err) {
                console.error('Error checking VIP session:', err);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                checkVipSession(session);
            }
        });

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                checkVipSession(session);
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        const formattedEmail = email.toLowerCase().trim();

        try {
            const ADMIN_EMAILS = ['artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'];
            const isAdminBypass = ADMIN_EMAILS.includes(formattedEmail);

            if (!isAdminBypass) {
                // Step 1: Check if email is on the VIP allowlist
                const { data: allowed, error: checkError } = await supabase
                    .from('vip_allowlist')
                    .select('email')
                    .ilike('email', formattedEmail)
                    .maybeSingle();

                if (checkError) {
                    console.error('VIP Allowlist check database error:', checkError);
                    setMessage(`資料庫驗證失敗，請稍後再試。Error: ${checkError.message}`);
                    setIsLoading(false);
                    return;
                }

                if (!allowed) {
                    // Not on the list — show an elegant, on-brand message
                    setMessage('此信箱尚未在 VIS 貴賓名單中。\n如您有任何疑問，歡迎與 visvipteam@gmail.com 聯繫。');
                    setIsLoading(false);
                    return;
                }
            }

            // Step 2: Email is approved — send the magic link (OTP)
            const { error } = await supabase.auth.signInWithOtp({
                email: formattedEmail,
                options: {
                    emailRedirectTo: `${window.location.origin}/vip/onboarding`,
                    shouldCreateUser: true, // This ensures new users are created AND sent the Magic Link template
                },
            });

            if (error) {
                console.error('OTP Send error:', error);
                if (error.status === 429 || error.message.includes('rate limit') || error.message.includes('once every 60 seconds')) {
                    setMessage('發送過於頻繁，請於 60 秒後再試。');
                } else {
                    setMessage(`發送失敗，請稍後再試。Error: ${formatVipError(error.message, 'zh')}`);
                }
            } else {
                setIsSent(true);
                setMessage('專屬邀請連結已發送至您的信箱，請查收。');
            }
        } catch (err: any) {
            console.error('Unexpected error during VIP login:', err);
            setMessage(`發生非預期錯誤：${formatVipError(err.message || String(err), 'zh')}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isMounted) {
        return (
            <div className="min-h-screen bg-[#0A0908] flex flex-col items-center justify-center gap-4 text-[#DFBA87]">
                <img src="/vis_logo_white.png" alt="VIS" className="h-12 w-12 object-contain opacity-80 animate-pulse" />
                <p className="text-[11px] font-mono tracking-[0.35em] uppercase text-[#DFBA87]/80">載入中 · Loading</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0908] text-[#F3EFEA] flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-[#DFBA87] selection:text-black">
            {/* Full-bleed architectural background matching 年度文化命題 */}
            <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
                <img src="/vip_lobby_bg.jpg" alt="" className="w-full h-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/82 via-black/55 to-black/92" />
                <div
                    className="absolute inset-0"
                    style={{ background: 'radial-gradient(circle at 50% 25%, rgba(223,186,135,0.15) 0%, transparent 72%)' }}
                />
            </div>

            {/* Top Navigation Bar */}
            <header className="relative z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl px-4 sm:px-8 py-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-xs text-neutral-300 hover:text-white font-medium transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <span>返回 VIS 官網首頁</span>
                    </Link>

                    <div className="flex items-center gap-2.5">
                        <img src="/vis_logo_white.png" alt="VIS Contemporary Culture" className="h-7 w-7 object-contain" />
                        <span className="text-xs font-mono tracking-[0.28em] uppercase text-[#DFBA87]">VIP Portal</span>
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center px-5 py-10 sm:py-16 relative z-10 max-w-2xl mx-auto w-full">
                {/* Identity Pillar Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center space-y-3.5 mb-8 sm:mb-10"
                >
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DFBA87]/15 border border-[#DFBA87]/40 text-[#DFBA87] text-[11px] sm:text-xs font-mono tracking-widest uppercase font-semibold backdrop-blur-md">
                        <Sparkles className="w-3.5 h-3.5 text-[#DFBA87]" />
                        <span>VIS Contemporary Culture 2027</span>
                    </div>

                    <div className="space-y-2 pt-1">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-serif text-[#DFBA87] font-medium tracking-[0.14em] sm:tracking-[0.2em] flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                            <span>VIP / SVIP Exclusive Portal</span>
                            <span className="hidden sm:inline text-[#DFBA87]/60">·</span>
                            <span className="text-white/90 font-normal tracking-[0.16em]">貴賓專屬禮遇門戶</span>
                        </h2>
                        <div className="w-10 h-[1px] bg-[#DFBA87] mx-auto mt-2.5 rounded-full opacity-60" />
                    </div>

                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-white leading-tight font-medium tracking-wide drop-shadow-md pt-1">
                        驗證貴賓身份・開啟專屬數位憑證
                    </h1>
                </motion.div>

                {/* Dual VIP Tier Identity Preview Cards */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6 text-left">
                    <div className="p-4 sm:p-5 rounded-2xl bg-black/50 backdrop-blur-xl border border-[#DFBA87]/40 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-[0.18em] text-[#14120E] bg-gradient-to-r from-[#F7E7C8] via-[#DFBA87] to-[#A87F45]">
                                <Crown className="w-3 h-3" />
                                <span>SVIP</span>
                            </span>
                            <span className="text-[11px] font-mono text-[#DFBA87]">2027.01.06 – 01.09</span>
                        </div>
                        <p className="text-sm font-serif text-white font-medium pt-1">SVIP 榮譽貴賓 · Honorary Guest</p>
                        <p className="text-xs text-neutral-300 font-light leading-relaxed">
                            享 1/6 尊榮預展暨開幕晚會專屬入場資格，以及全展期優先快速通行。
                        </p>
                    </div>

                    <div className="p-4 sm:p-5 rounded-2xl bg-black/50 backdrop-blur-xl border border-[#DAD4CA]/35 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-[0.18em] text-[#14120E] bg-gradient-to-r from-white via-[#DAD4CA] to-[#8F887D]">
                                <Gem className="w-3 h-3" />
                                <span>VIP</span>
                            </span>
                            <span className="text-[11px] font-mono text-[#DAD4CA]">2027.01.07 – 01.09</span>
                        </div>
                        <p className="text-sm font-serif text-white font-medium pt-1">VIP 展期貴賓 · Distinguished Guest</p>
                        <p className="text-xs text-neutral-300 font-light leading-relaxed">
                            享 1/7 至 1/9 公眾展期優先快速通行與現場作品典藏管家服務。
                        </p>
                    </div>
                </div>

                {/* Glassmorphic Authentication Box */}
                <div className="w-full bg-black/60 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-black/80">
                    <AnimatePresence mode="wait">
                        {!isSent ? (
                            <motion.form
                                key="login"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.5 }}
                                onSubmit={handleLogin}
                                className="space-y-6"
                            >
                                <div className="space-y-2 text-center">
                                    <p className="text-sm sm:text-base text-neutral-200 leading-relaxed font-light">
                                        請輸入您受邀登記之電子信箱，系統將自動辨識您的 <strong className="text-[#DFBA87] font-medium">SVIP / VIP</strong> 貴賓身份並寄發專屬登入連結。
                                    </p>
                                    <p className="text-xs text-neutral-400 font-serif italic">
                                        Enter your invited email address to verify your guest tier and unlock your digital pass.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="vip_email" className="text-xs text-white/80 font-medium flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-[#DFBA87]" />
                                        <span>受邀貴賓電子信箱 · Invited Email Address</span>
                                    </label>
                                    <input
                                        id="vip_email"
                                        type="email"
                                        placeholder="name@example.com"
                                        required
                                        className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-black/60 border border-white/20 focus:border-[#DFBA87] focus:ring-1 focus:ring-[#DFBA87]/40 rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/35 focus:outline-none transition-all font-sans"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 0.99 }}
                                    whileTap={{ scale: 0.97 }}
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#DFBA87] to-[#C9A26A] hover:from-[#E5C799] hover:to-[#D4B07B] text-[#14120E] text-xs sm:text-sm font-bold tracking-[0.25em] uppercase transition-all shadow-xl shadow-[#DFBA87]/20 disabled:opacity-50 cursor-pointer"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-3">
                                            <span className="w-3.5 h-3.5 border-r-transparent border-2 border-[#14120E] rounded-full animate-spin" />
                                            <span>正在驗證貴賓名單 · Authenticating...</span>
                                        </span>
                                    ) : (
                                        '驗證身份並取得專屬通行連結 · Authenticate'
                                    )}
                                </motion.button>
                            </motion.form>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                                className="text-center space-y-6 py-4"
                            >
                                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-7 h-7" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-serif text-white tracking-wide">專屬邀請連結已寄出 · Invitation Sent</h3>
                                    <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-md mx-auto font-light">
                                        {message}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsSent(false)}
                                    className="px-6 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] border border-white/20 text-xs text-neutral-200 hover:text-white tracking-wider transition-all cursor-pointer"
                                >
                                    返回重新輸入信箱 · Back to Login
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {message && !isSent && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 leading-relaxed text-center whitespace-pre-line"
                        >
                            {message}
                        </motion.div>
                    )}
                </div>
            </main>

            <footer className="relative z-10 border-t border-white/10 py-6 px-4 text-center text-xs text-neutral-400 bg-black/40 backdrop-blur-md space-y-1.5">
                <p>
                    若登入發生任何問題，歡迎來信至{' '}
                    <a href="mailto:visvipteam@gmail.com" className="text-[#DFBA87] underline underline-offset-4 hover:text-white transition-colors">
                        visvipteam@gmail.com
                    </a>
                    ，將有貴賓專人協助您。
                </p>
                <p className="text-[11px] font-mono tracking-[0.25em] text-neutral-500 uppercase">
                    &copy; 2027 VIS Contemporary Culture · VIP Portal
                </p>
            </footer>
        </div>
    );
}
