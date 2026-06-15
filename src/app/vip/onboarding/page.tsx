'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnboardingPage() {
    const router = useRouter();
    const [birthdate, setBirthdate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        setIsLoading(true);
        // Listen for auth state changes — especially crucial for catching Magic Link sessions
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const user = session.user;
                
                // Auto-heal / configure password 'Kuo76443173' for artwithlifetaipei@gmail.com
                if (user.email?.toLowerCase().trim() === 'artwithlifetaipei@gmail.com') {
                    supabase.auth.updateUser({ password: 'Kuo76443173' })
                        .then(() => console.log('Scanner staff password synchronized in onboarding.'))
                        .catch((err) => console.log('Omitted auto password update in onboarding:', err));
                }
                
                // Check if profile exists in users table
                const { data: profile } = await supabase
                    .from('users')
                    .select('birthdate')
                    .eq('id', user.id)
                    .single();

                if (profile?.birthdate) {
                    router.push('/vip/dashboard');
                } else {
                    setUser(user);
                    setIsLoading(false);
                }
            } else if (event === 'SIGNED_OUT') {
                router.push('/vip');
            }
        });

        // Initial check in case they are already logged in
        let authTimeout: NodeJS.Timeout | null = null;
        const checkCurrentSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const user = session.user;
                
                // Auto-heal / configure password 'Kuo76443173' for artwithlifetaipei@gmail.com
                if (user.email?.toLowerCase().trim() === 'artwithlifetaipei@gmail.com') {
                    supabase.auth.updateUser({ password: 'Kuo76443173' })
                        .then(() => console.log('Scanner staff password synchronized in onboarding session check.'))
                        .catch((err) => console.log('Omitted auto password update in onboarding session check:', err));
                }
                
                const { data: profile } = await supabase
                    .from('users')
                    .select('birthdate')
                    .eq('id', user.id)
                    .single();

                if (profile?.birthdate) {
                    router.push('/vip/dashboard');
                } else {
                    setUser(user);
                    setIsLoading(false);
                }
            } else {
                // If there is no session, check if we have OAuth/OTP code or token in URL.
                // Next.js might still be hydrating, so check query params and hash.
                const hasCode = typeof window !== 'undefined' && (
                    new URLSearchParams(window.location.search).has('code') ||
                    window.location.hash.includes('access_token') ||
                    window.location.hash.includes('type=recovery') ||
                    window.location.search.includes('type=magiclink')
                );

                if (!hasCode) {
                    // Not authenticating and no session -> redirect to login immediately
                    router.push('/vip');
                } else {
                    // Authenticating -> Wait longer (up to 12s) to allow Supabase SDK to complete exchange
                    authTimeout = setTimeout(async () => {
                        const { data: { session: s2 } } = await supabase.auth.getSession();
                        if (!s2?.user) {
                            router.push('/vip');
                        }
                    }, 12000);
                }
            }
        };
        checkCurrentSession();

        return () => {
            subscription.unsubscribe();
            if (authTimeout) clearTimeout(authTimeout);
        };
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsLoading(true);

        const { error } = await supabase
            .from('users')
            .upsert({ 
                id: user.id, 
                email: user.email,
                birthdate: birthdate 
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
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
                className="w-full max-w-lg text-center"
            >
                <div className="mb-24 space-y-4">
                    <motion.h2 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="text-[10px] tracking-[0.6em] text-neutral-400 uppercase"
                    >
                        Welcome to VIS
                    </motion.h2>
                    <motion.h1 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8, duration: 1 }}
                        className="text-xl md:text-2xl font-light tracking-widest leading-relaxed"
                    >
                        請寫下您的個人生日<br/>
                        <span className="text-sm text-neutral-500 italic mt-4 block">
                            解鎖 VIS 獻給您的專屬貴賓通行證
                        </span>
                    </motion.h1>
                </div>

                <motion.form 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 1.2 }}
                    onSubmit={handleSubmit}
                    className="space-y-12"
                >
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
                        disabled={isLoading || !birthdate}
                        className="px-16 py-4 border border-[#DFBA87] text-[#DFBA87] text-[10px] tracking-[0.5em] uppercase hover:bg-[#DFBA87] hover:text-black transition-all duration-700 disabled:opacity-30"
                    >
                        {isLoading ? 'Verifying...' : 'Unlock Portal'}
                    </motion.button>
                </motion.form>

                <div className="fixed inset-0 -z-10 opacity-20 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-[120px] animate-pulse"></div>
                </div>
            </motion.div>
        </div>
    );
}
