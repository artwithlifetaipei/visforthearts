'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Crown, Gem, ArrowLeft } from 'lucide-react';

const IDENTITY_OPTIONS = [
    '資深收藏家',
    '新興收藏家',
    '品牌創辦人',
    '企業主／企業高階決策者',
    '投資人／家族辦公室',
    '建築相關產業 / 室內／空間設計師',
    '媒體／編輯',
    '內容創作者／意見領袖',
    '藝術與設計愛好者',
    '創意工作者 / 策展人／藝術顧問',
    '通路經營者／買手',
    '其他'
];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Birthday, 2: Identity selection
    const [birthdate, setBirthdate] = useState('');
    const [selectedIdentity, setSelectedIdentity] = useState('');
    const [otherIdentityText, setOtherIdentityText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [guestTier, setGuestTier] = useState<'SVIP' | 'VIP'>('VIP');

    useEffect(() => {
        let isMounted = true;
        let authTimeout: NodeJS.Timeout | null = null;
        let checkInterval: NodeJS.Timeout | null = null;

        const handleUser = async (user: any) => {
            if (!isMounted || !user) return;

            const email = user.email?.toLowerCase().trim() || '';
            const ADMIN_EMAILS = ['artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'];
            
            // Verify VIP privilege
            let isVip = ADMIN_EMAILS.includes(email);
            let detectedTier: 'SVIP' | 'VIP' = isVip ? 'SVIP' : 'VIP';
            try {
                const { data: allowed } = await supabase
                    .from('vip_allowlist')
                    .select('email, tier')
                    .ilike('email', email)
                    .maybeSingle();
                if (allowed) {
                    isVip = true;
                    if (allowed.tier === 'SVIP') detectedTier = 'SVIP';
                }
            } catch (err) {
                console.error('Error verifying VIP status in onboarding:', err);
            }
            if (isMounted) setGuestTier(detectedTier);
            
            if (!isVip) {
                router.push('/vip');
                return;
            }

            // Auto-heal password for scanner staff and admin/amelie account
            if (email === 'artwithlifetaipei@gmail.com' || email === 'amelie@theartpressasia.com') {
                supabase.auth.updateUser({ password: 'Kuo76443173' }).catch(() => {});
            }

            try {
                const { data: profile } = await supabase
                    .from('users')
                    .select('birthdate, identity_type')
                    .eq('id', user.id)
                    .maybeSingle();

                if (!isMounted) return;

                if (profile?.birthdate && profile?.identity_type) {
                    router.push('/vip/dashboard');
                } else {
                    setUser(user);
                    if (profile?.birthdate) {
                        setBirthdate(profile.birthdate);
                        setStep(2); // If birthday exists, go straight to identity
                    }
                    if (profile?.identity_type) {
                        if (IDENTITY_OPTIONS.includes(profile.identity_type)) {
                            setSelectedIdentity(profile.identity_type);
                        } else {
                            setSelectedIdentity('其他');
                            setOtherIdentityText(profile.identity_type);
                        }
                    }
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Error fetching user profile in onboarding:', err);
                setUser(user);
                setIsLoading(false);
            }
        };

        // Primary mechanism: listen for ALL auth events including SIGNED_IN
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;
            
            if (event === 'SIGNED_IN' && session?.user) {
                if (authTimeout) clearTimeout(authTimeout);
                await handleUser(session.user);
            } else if (event === 'SIGNED_OUT') {
                if (isMounted) router.push('/vip');
            }
        });

        // Instant session retrieval for client-side routing and magic link code exchange transitions
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!isMounted) return;
            if (session?.user) {
                if (authTimeout) clearTimeout(authTimeout);
                handleUser(session.user);
            } else {
                const hasCode = typeof window !== 'undefined' && (
                    new URLSearchParams(window.location.search).has('code') ||
                    window.location.hash.includes('access_token') ||
                    window.location.hash.includes('type=recovery') ||
                    window.location.search.includes('type=magiclink')
                );
                
                if (!hasCode) {
                    router.push('/vip');
                } else {
                    let checkCount = 0;
                    checkInterval = setInterval(async () => {
                        if (!isMounted) {
                            if (checkInterval) clearInterval(checkInterval);
                            return;
                        }
                        checkCount++;
                        const { data: { session: s2 } } = await supabase.auth.getSession();
                        if (s2?.user) {
                            if (checkInterval) clearInterval(checkInterval);
                            if (authTimeout) clearTimeout(authTimeout);
                            handleUser(s2.user);
                        } else if (checkCount >= 15) {
                            if (checkInterval) clearInterval(checkInterval);
                            router.push('/vip');
                        }
                    }, 300);
                }
            }
        }).catch(() => {
            if (isMounted) router.push('/vip');
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            if (authTimeout) clearTimeout(authTimeout);
            if (checkInterval) clearInterval(checkInterval);
        };
    }, [router]);

    const handleBirthdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (birthdate) {
            setStep(2);
        }
    };

    const handleOnboardingComplete = async () => {
        if (!user || !birthdate || !selectedIdentity) return;
        
        const finalIdentity = selectedIdentity === '其他' 
            ? otherIdentityText.trim() 
            : selectedIdentity;

        if (selectedIdentity === '其他' && !finalIdentity) {
            alert('請輸入您的身分別');
            return;
        }

        setIsLoading(true);

        const { error } = await supabase
            .from('users')
            .upsert({ 
                id: user.id, 
                email: user.email,
                birthdate: birthdate,
                identity_type: finalIdentity
            }, { onConflict: 'id' });

        if (!error) {
            router.push('/vip/dashboard');
        } else {
            console.error(error);
            alert(`驗證失敗 (${error.message || error.code})。請嘗試重新登入。`);
        }
        setIsLoading(false);
    };

    if (!user) return null;

    const isSVIP = guestTier === 'SVIP';
    const TierIcon = isSVIP ? Crown : Gem;
    const tierAccent = isSVIP ? '#DFBA87' : '#DAD4CA';
    const tierGradient = isSVIP
        ? 'linear-gradient(135deg, #F7E7C8 0%, #DFBA87 35%, #A87F45 68%, #EBD2A6 100%)'
        : 'linear-gradient(135deg, #FFFFFF 0%, #DAD4CA 38%, #8F887D 70%, #EFEBE4 100%)';

    return (
        <div className="min-h-screen bg-[#0A0908] text-[#F3EFEA] flex flex-col justify-between p-5 sm:p-8 font-sans overflow-x-hidden relative selection:bg-[#DFBA87] selection:text-black">
            {/* Full-bleed architectural background matching 年度文化命題 */}
            <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
                <img src="/vip_lobby_bg.jpg" alt="" className="w-full h-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/60 to-black/92" />
                <div
                    className="absolute inset-0"
                    style={{ background: 'radial-gradient(circle at 50% 22%, rgba(223,186,135,0.16) 0%, transparent 70%)' }}
                />
            </div>

            <header className="relative z-10 max-w-2xl mx-auto w-full flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                    <img src="/vis_logo_white.png" alt="VIS Contemporary Culture" className="h-9 w-9 object-contain" />
                    <span className="text-xs font-mono tracking-[0.28em] uppercase text-white/60">VIP Onboarding</span>
                </div>
                <div
                    className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border backdrop-blur-md"
                    style={{ borderColor: isSVIP ? 'rgba(223,186,135,0.45)' : 'rgba(218,212,202,0.40)', background: isSVIP ? 'rgba(223,186,135,0.12)' : 'rgba(218,212,202,0.10)' }}
                >
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tracking-[0.15em] text-[#14120E]" style={{ background: tierGradient }}>
                        {guestTier}
                    </span>
                    <span className="text-xs font-medium tracking-wider" style={{ color: tierAccent }}>
                        {isSVIP ? '榮譽貴賓' : '展期貴賓'}
                    </span>
                </div>
            </header>

            <main className="relative z-10 flex-grow flex items-center justify-center py-10">
                <div className="w-full max-w-2xl">
                    {/* Top Identity Banner */}
                    <div className="text-center space-y-3 mb-8">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DFBA87]/15 border border-[#DFBA87]/40 text-[#DFBA87] text-[11px] font-mono tracking-widest uppercase font-semibold backdrop-blur-md">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>VIS Contemporary Culture 2027</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-serif text-white/90">
                            <TierIcon className="w-4 h-4" style={{ color: tierAccent }} />
                            <span>已驗證您的貴賓禮遇身份：</span>
                            <strong style={{ color: tierAccent }}>{isSVIP ? 'SVIP 榮譽貴賓（開幕晚會暨全展期通行）' : 'VIP 展期貴賓（公眾展期優先通行）'}</strong>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.45 }}
                                className="bg-black/60 backdrop-blur-2xl border border-white/15 rounded-3xl p-7 sm:p-10 shadow-2xl shadow-black/80 text-center space-y-8"
                            >
                                <div className="space-y-2.5">
                                    <span className="text-[11px] font-mono tracking-[0.3em] text-[#DFBA87] uppercase font-semibold">
                                        Step 01 / 02 · 貴賓資料認證
                                    </span>
                                    <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-wide">
                                        請填寫您的個人生日
                                    </h1>
                                    <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
                                        完成驗證後，系統將為您生成專屬的 {guestTier} 數位憑證與禮遇空間
                                    </p>
                                </div>

                                <form onSubmit={handleBirthdateSubmit} className="space-y-8 max-w-sm mx-auto">
                                    <div>
                                        <input
                                            type="date"
                                            required
                                            min="1920-01-01"
                                            max="2020-12-31"
                                            className="w-full py-4 px-5 bg-white/[0.06] hover:bg-white/[0.09] focus:bg-black/60 border border-white/20 focus:border-[#DFBA87] rounded-2xl outline-none text-lg sm:text-xl tracking-[0.15em] text-center text-white font-mono transition-all"
                                            style={{ colorScheme: 'dark' }}
                                            value={birthdate}
                                            onChange={(e) => setBirthdate(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 0.99 }}
                                        whileTap={{ scale: 0.97 }}
                                        type="submit"
                                        disabled={!birthdate}
                                        className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-[#DFBA87] to-[#C9A26A] hover:from-[#E5C799] hover:to-[#D4B07B] text-[#14120E] text-xs sm:text-sm font-bold tracking-[0.25em] uppercase transition-all shadow-xl shadow-[#DFBA87]/20 disabled:opacity-40 cursor-pointer"
                                    >
                                        下一步：選擇個人身分別 →
                                    </motion.button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.45 }}
                                className="bg-black/60 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-black/80 space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                        <span>返回上一步</span>
                                    </button>
                                    <span className="text-[11px] font-mono tracking-[0.25em] text-[#DFBA87] uppercase font-semibold">
                                        Step 02 / 02 · 身分別設定
                                    </span>
                                </div>

                                <div className="text-center space-y-2">
                                    <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-wide">
                                        請選擇您的個人身分別
                                    </h1>
                                    <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
                                        此身分別將顯示於您的貴賓專屬門戶，讓 VIS 提供更契合您喜好的策展體驗與交流
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                                    {IDENTITY_OPTIONS.map((option) => {
                                        const isSelected = selectedIdentity === option;
                                        return (
                                            <motion.div
                                                key={option}
                                                onClick={() => setSelectedIdentity(option)}
                                                whileHover={{ scale: 1.005 }}
                                                whileTap={{ scale: 0.99 }}
                                                className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-3 ${
                                                    isSelected
                                                        ? 'bg-gradient-to-r from-[#DFBA87]/20 via-[#DFBA87]/10 to-white/[0.04] border-2 border-[#DFBA87] text-white shadow-lg shadow-[#DFBA87]/15'
                                                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/15 hover:border-[#DFBA87]/40 text-neutral-200'
                                                }`}
                                            >
                                                <span className="text-sm font-medium leading-snug">{option}</span>
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                                    isSelected ? 'border-[#DFBA87] bg-[#DFBA87]' : 'border-white/30 bg-black/40'
                                                }`}>
                                                    {isSelected && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {selectedIdentity === '其他' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <input
                                            type="text"
                                            required
                                            placeholder="請輸入您的身分別（例：藝術評論家、獨立出版人）"
                                            className="w-full py-3.5 px-4 bg-white/[0.06] border border-white/20 focus:border-[#DFBA87] rounded-xl outline-none text-sm text-white placeholder-white/35 transition-all"
                                            value={otherIdentityText}
                                            onChange={(e) => setOtherIdentityText(e.target.value)}
                                            disabled={isLoading}
                                        />
                                    </motion.div>
                                )}

                                <motion.button
                                    whileHover={{ scale: 0.99 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleOnboardingComplete}
                                    disabled={isLoading || !selectedIdentity || (selectedIdentity === '其他' && !otherIdentityText.trim())}
                                    className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-[#DFBA87] to-[#C9A26A] hover:from-[#E5C799] hover:to-[#D4B07B] text-[#14120E] text-xs sm:text-sm font-bold tracking-[0.25em] uppercase transition-all shadow-xl shadow-[#DFBA87]/20 disabled:opacity-40 cursor-pointer"
                                >
                                    {isLoading ? '正在開通貴賓通行證...' : `確認並開啟 ${guestTier} 貴賓專屬門戶 →`}
                                </motion.button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <footer className="relative z-10 text-center text-[11px] font-mono text-white/40 pb-2">
                VIS Contemporary Culture · Taipei Zhongshan Hall 2027
            </footer>
        </div>
    );
}
