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
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/vip');
                return;
            }
            
            // Check if birthdate already exists
            const { data: profile } = await supabase
                .from('users')
                .select('birthdate')
                .eq('id', user.id)
                .single();

            if (profile?.birthdate) {
                router.push('/vip/dashboard');
            } else {
                setUser(user);
            }
        };
        checkUser();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsLoading(true);

        const { error } = await supabase
            .from('users')
            .update({ birthdate })
            .eq('id', user.id);

        if (!error) {
            router.push('/vip/dashboard');
        } else {
            console.error(error);
            alert('發生錯誤，請稍後再試。');
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
                        Welcome to VIS Universe
                    </motion.h2>
                    <motion.h1 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8, duration: 1 }}
                        className="text-xl md:text-2xl font-light tracking-widest leading-relaxed"
                    >
                        請留下您的誕生印記<br/>
                        <span className="text-sm text-neutral-500 italic mt-4 block">
                            解鎖 VIS 專屬星象美學與迎賓禮遇
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
                            className="w-full py-4 bg-transparent outline-none text-sm tracking-[0.2em] uppercase text-center appearance-none"
                            value={birthdate}
                            onChange={(e) => setBirthdate(e.target.value)}
                            disabled={isLoading}
                            style={{ colorScheme: 'dark' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !birthdate}
                        className="px-12 py-4 border border-white text-[10px] tracking-[0.5em] uppercase hover:bg-white hover:text-black transition-all duration-700 disabled:opacity-20"
                    >
                        {isLoading ? 'Decrypting Stars...' : 'Unlock Portal'}
                    </button>
                </motion.form>

                <div className="fixed inset-0 -z-10 opacity-20 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-[120px] animate-pulse"></div>
                </div>
            </motion.div>
        </div>
    );
}
