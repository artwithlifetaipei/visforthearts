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
        let isMounted = true;
        let authTimeout: NodeJS.Timeout | null = null;

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
                        .eq('email', email)
                        .maybeSingle();
                    if (allowed) isVip = true;
                } catch (err) {
                    console.error('Error verifying VIP status in onboarding:', err);
                }
            }
            
            if (!isVip) {
                await supabase.auth.signOut();
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
                    .select('birthdate')
                    .eq('id', user.id)
                    .maybeSingle();

                if (!isMounted) return;

                if (profile?.birthdate) {
                    router.push('/vip/dashboard');
                } else {
                    setUser(user);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Error fetching user profile in onboarding:', err);
                setUser(user);
                setIsLoading(false);
            }
        };

        // Primary mechanism: listen for ALL auth events including INITIAL_SESSION
        // (INITIAL_SESSION fires when already logged in; SIGNED_IN fires after magic link code exchange)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;
            
            const hasCode = typeof window !== 'undefined' && (
                new URLSearchParams(window.location.search).has('code') ||
                window.location.hash.includes('access_token') ||
                window.location.hash.includes('type=recovery') ||
                window.location.search.includes('type=magiclink')
            );

            if (event === 'SIGNED_IN' && session?.user) {
                if (authTimeout) clearTimeout(authTimeout);
                await handleUser(session.user);
            } else if (event === 'INITIAL_SESSION' && session?.user) {
                // If we are currently exchanging an OTP code/magiclink, DO NOT load the cached session user
                if (!hasCode) {
                    if (authTimeout) clearTimeout(authTimeout);
                    await handleUser(session.user);
                }
            } else if (event === 'SIGNED_OUT') {
                if (isMounted) router.push('/vip');
            }
        });

        // Secondary mechanism: manual session check + hasCode detection
        // Critical for magic link flow: ?code= in URL means code exchange is in progress
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!isMounted) return;

            if (session?.user) {
                // Already have a session — handleUser via onAuthStateChange INITIAL_SESSION
                // (which fires synchronously when subscribed). This is a no-op duplicate guard.
                return;
            }

            // No session yet — check if we're in the middle of a magic link code exchange
            const hasCode = typeof window !== 'undefined' && (
                new URLSearchParams(window.location.search).has('code') ||
                window.location.hash.includes('access_token') ||
                window.location.hash.includes('type=recovery') ||
                window.location.search.includes('type=magiclink')
            );

            if (!hasCode) {
                // No session AND no auth code → not authenticating → send to login
                router.push('/vip');
            } else {
                // Auth code present → SDK is exchanging it → wait up to 15s for SIGNED_IN
                authTimeout = setTimeout(async () => {
                    if (!isMounted) return;
                    const { data: { session: s2 } } = await supabase.auth.getSession();
                    if (!s2?.user) {
                        router.push('/vip');
                    }
                    // If session exists by now, SIGNED_IN already fired and handled it
                }, 15000);
            }
        };
        checkSession();

        return () => {
            isMounted = false;
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
