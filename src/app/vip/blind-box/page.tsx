'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function BlindBoxPage() {
    const router = useRouter();
    const [reward, setReward] = useState<any>(null);
    const [isOpening, setIsOpening] = useState(false);
    const [isClaimed, setIsClaimed] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/vip'); return; }
            
            const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
            setProfile(data);

            // Check if already has a reward
            const { data: rewardData } = await supabase
                .from('rewards')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (rewardData) {
                setReward(rewardData);
                setIsClaimed(rewardData.is_claimed);
            }
        };
        checkAuth();
    }, [router]);

    const handleOpenBox = async () => {
        setIsOpening(true);
        // Simulate dramatic delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        const rewardTypes = ['限量藝術圖錄', '大師專屬導覽', '展會限定香氛', 'VIP 休息區餐飲兌換'];
        const selectedType = rewardTypes[Math.floor(Math.random() * rewardTypes.length)];

        const { data, error } = await supabase
            .from('rewards')
            .insert({
                user_id: profile.id,
                reward_type: selectedType
            })
            .select()
            .single();

        if (!error) {
            setReward(data);
        }
        setIsOpening(false);
    };

    const handleClaim = async () => {
        if (!reward || isClaimed) return;
        
        const { error } = await supabase
            .from('rewards')
            .update({ 
                is_claimed: true,
                claimed_at: new Date().toISOString()
            })
            .eq('id', reward.id);

        if (!error) {
            setIsClaimed(true);
        }
    };

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-6 flex flex-col font-sans">
            <header className="py-4">
                <button onClick={() => router.push('/vip/dashboard')} className="text-neutral-500 text-[10px] tracking-widest uppercase">
                    ← Back
                </button>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center">
                <AnimatePresence mode="wait">
                    {!reward ? (
                        <motion.div 
                            key="unopened"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="text-center"
                        >
                            <div className="mb-12 relative">
                                <motion.div 
                                    animate={isOpening ? { 
                                        rotate: [0, -5, 5, -5, 5, 0],
                                        scale: [1, 1.05, 1],
                                    } : { y: [0, -10, 0] }}
                                    transition={isOpening ? { duration: 0.2, repeat: Infinity } : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-48 h-48 bg-gradient-to-tr from-zinc-800 to-zinc-600 rounded-2xl shadow-2xl mx-auto flex items-center justify-center border border-white/10"
                                >
                                    <span className="text-4xl">✧</span>
                                </motion.div>
                            </div>
                            
                            <h2 className="text-sm tracking-[0.4em] uppercase mb-4">品味預測迎賓禮</h2>
                            <p className="text-xs text-neutral-500 tracking-wider leading-relaxed mb-12">
                                點擊解鎖您的專屬藝術禮遇
                            </p>

                            <button
                                onClick={handleOpenBox}
                                disabled={isOpening}
                                className="px-12 py-4 border border-white text-[10px] tracking-[0.5em] uppercase hover:bg-white hover:text-black transition-all duration-500"
                            >
                                {isOpening ? 'Revealing...' : 'Open Box'}
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="opened"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center w-full max-w-sm"
                        >
                            <div className="mb-8">
                                <span className="text-[10px] tracking-[0.6em] text-neutral-500 uppercase block mb-4">You have received</span>
                                <h2 className="text-2xl font-light tracking-[0.2em]">{reward.reward_type}</h2>
                            </div>

                            <div className={`p-8 rounded-3xl border ${isClaimed ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-700 bg-zinc-800/30'} mb-12`}>
                                {isClaimed ? (
                                    <div className="py-4">
                                        <p className="text-green-500 text-[10px] tracking-[0.4em] uppercase mb-2">● 已於現場核銷</p>
                                        <p className="text-neutral-500 text-[8px] tracking-widest uppercase">
                                            {new Date(reward.claimed_at).toLocaleString()}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <p className="text-xs text-neutral-400 leading-relaxed px-4">
                                            請於現場 Concierge 櫃檯將手機出示給 VIS 專員，由專員點擊下方按鈕完成核銷。
                                        </p>
                                        
                                        {/* Swipe-to-Claim UI Logic (Simplified for now) */}
                                        <button
                                            onDoubleClick={handleClaim}
                                            className="w-full py-5 bg-white text-black text-[10px] tracking-[0.4em] uppercase font-bold hover:scale-[0.98] transition-transform"
                                        >
                                            專員點擊核銷 (Double Click)
                                        </button>
                                        <p className="text-[8px] text-zinc-600 tracking-widest">
                                            * 此操作不可逆，請確保在專員面前操作
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
