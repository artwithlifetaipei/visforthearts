'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

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
            if (!isVip) {
                try {
                    const { data: allowed } = await supabase
                        .from('vip_allowlist')
                        .select('email')
                        .ilike('email', email)
                        .maybeSingle();
                    if (allowed) isVip = true;
                } catch (err) {
                    console.error('Error verifying VIP status in onboarding:', err);
                }
            }
            
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

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans overflow-x-hidden relative">
            <AnimatePresence mode="wait">
                {step === 1 ? (
                    <motion.div 
                        key="step1"
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.6 }}
                        className="w-full max-w-lg text-center"
                    >
                        <div className="mb-16 space-y-4">
                            <h2 className="text-[10px] tracking-[0.6em] text-neutral-400 uppercase">
                                Welcome to VIS
                            </h2>
                            <h1 className="text-xl md:text-2xl font-light tracking-widest leading-relaxed">
                                請寫下您的個人生日<br/>
                                <span className="text-sm text-neutral-500 italic mt-4 block">
                                    解鎖 VIS 獻給您的專屬貴賓通行證
                                </span>
                            </h1>
                        </div>

                        <form onSubmit={handleBirthdateSubmit} className="space-y-12">
                            <div className="relative border-b border-neutral-800 focus-within:border-white transition-colors duration-500 max-w-xs mx-auto">
                                <input
                                    type="date"
                                    required
                                    min="1920-01-01"
                                    max="2020-12-31"
                                    className="w-full py-4 bg-transparent outline-none text-xl tracking-[0.2em] text-center text-white font-light appearance-none"
                                    style={{ colorScheme: 'dark' }}
                                    value={birthdate}
                                    onChange={(e) => setBirthdate(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <motion.button
                                whileHover={{ scale: 0.98 }}
                                whileTap={{ scale: 0.95 }}
                                type="submit"
                                disabled={!birthdate}
                                className="px-16 py-4 border border-[#DFBA87] text-[#DFBA87] text-[10px] tracking-[0.5em] uppercase hover:bg-[#DFBA87] hover:text-black transition-all duration-700 disabled:opacity-30 cursor-pointer"
                            >
                                Next Step
                            </motion.button>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="step2"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ duration: 0.6 }}
                        className="w-full max-w-2xl text-center py-8"
                    >
                        <div className="mb-10 space-y-4">
                            <button 
                                onClick={() => setStep(1)}
                                className="text-[10px] tracking-[0.3em] text-neutral-500 hover:text-white transition-colors uppercase mb-2 block mx-auto cursor-pointer"
                            >
                                &larr; Back to Birthday
                            </button>
                            <h2 className="text-[10px] tracking-[0.6em] text-neutral-400 uppercase">
                                Personal Profile
                            </h2>
                            <h1 className="text-xl md:text-2xl font-light tracking-widest leading-relaxed">
                                請選擇您的身分別<br/>
                                <span className="text-sm text-neutral-500 italic mt-3 block">
                                    讓 VIS 提供更符合您喜好的專屬體驗與交流
                                </span>
                            </h1>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mb-10 text-left">
                            {IDENTITY_OPTIONS.map((option) => {
                                const isSelected = selectedIdentity === option;
                                return (
                                    <motion.div
                                        key={option}
                                        onClick={() => setSelectedIdentity(option)}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className={`p-4 border transition-all duration-300 cursor-pointer flex items-center justify-between rounded-none ${
                                            isSelected 
                                                ? 'border-[#DFBA87] bg-[#DFBA87]/10 text-[#DFBA87]' 
                                                : 'border-neutral-800 bg-neutral-950/40 text-neutral-300 hover:border-neutral-700 hover:text-white'
                                        }`}
                                    >
                                        <span className="text-xs tracking-wider font-light">{option}</span>
                                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                                            isSelected ? 'border-[#DFBA87]' : 'border-neutral-600'
                                        }`}>
                                            {isSelected && (
                                                <div className="w-1.5 h-1.5 bg-[#DFBA87] rounded-full" />
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {selectedIdentity === '其他' && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="max-w-xs mx-auto mb-10 relative border-b border-neutral-800 focus-within:border-[#DFBA87] transition-colors duration-500"
                            >
                                <input
                                    type="text"
                                    required
                                    placeholder="請輸入您的身分別"
                                    className="w-full py-3 bg-transparent outline-none text-sm tracking-widest text-center text-white font-light placeholder-neutral-600"
                                    value={otherIdentityText}
                                    onChange={(e) => setOtherIdentityText(e.target.value)}
                                    disabled={isLoading}
                                />
                            </motion.div>
                        )}

                        <motion.button
                            whileHover={{ scale: 0.98 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleOnboardingComplete}
                            disabled={isLoading || !selectedIdentity || (selectedIdentity === '其他' && !otherIdentityText.trim())}
                            className="px-16 py-4 border border-[#DFBA87] text-[#DFBA87] text-[10px] tracking-[0.5em] uppercase hover:bg-[#DFBA87] hover:text-black transition-all duration-700 disabled:opacity-30 cursor-pointer"
                        >
                            {isLoading ? 'Verifying...' : 'Unlock Portal'}
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="fixed inset-0 -z-10 opacity-20 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-[120px] animate-pulse"></div>
            </div>
        </div>
    );
}
