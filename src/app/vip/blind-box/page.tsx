'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

// Easily modifiable configuration array for the 5 brands.
// You can replace the Unsplash URLs with local image paths (e.g., '/fountain_logo.png' or '/brand1.png') later.
const BRAND_CARDS = [
    {
        id: 'brand-1',
        name: 'Fountain Tokyo',
        desc: '源自東京的奢華香氛與生活美學設計。',
        image: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?q=80&w=600&auto=format&fit=crop'
    },
    {
        id: 'brand-2',
        name: 'Looom Space',
        desc: '探索光影與永續材質交織的軟裝家居。',
        image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=600&auto=format&fit=crop'
    },
    {
        id: 'brand-3',
        name: 'Pola Art Gallery',
        desc: '匯聚東亞當代最受矚目的新銳藝術家作品。',
        image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=600&auto=format&fit=crop'
    },
    {
        id: 'brand-4',
        name: 'Aesthetic Design Lab',
        desc: '極簡主義極致工藝的現代家具設計品牌。',
        image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=600&auto=format&fit=crop'
    },
    {
        id: 'brand-5',
        name: 'Aura Scent Studio',
        desc: '調配專屬大自然與心靈共感的純淨沙龍香水。',
        image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=600&auto=format&fit=crop'
    }
];

export default function BlindBoxPage() {
    const router = useRouter();
    const [reward, setReward] = useState<any>(null);
    const [isOpening, setIsOpening] = useState(false);
    const [isClaimed, setIsClaimed] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    // Interactive Swiping Game States
    const [isGameStarted, setIsGameStarted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [likedBrands, setLikedBrands] = useState<any[]>([]);
    const [swipeOverlay, setSwipeOverlay] = useState<'like' | 'dislike' | null>(null);

    // Motion values for swipe drag gesture
    const dragX = useMotionValue(0);
    const rotate = useTransform(dragX, [-200, 200], [-30, 30]);
    const opacity = useTransform(dragX, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5]);

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

    // Handle Swiping Action (Like or Dislike)
    const handleSwipe = (action: 'like' | 'dislike') => {
        setSwipeOverlay(action);
        
        setTimeout(async () => {
            const currentBrand = BRAND_CARDS[currentIndex];
            let newLiked = [...likedBrands];
            
            if (action === 'like') {
                newLiked.push(currentBrand);
                setLikedBrands(newLiked);
            }

            setSwipeOverlay(null);
            
            // Advance to next card or trigger lottery
            if (currentIndex < BRAND_CARDS.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                // Game finished - pick random from liked, fallback to random of all
                setIsOpening(true);
                await new Promise(resolve => setTimeout(resolve, 1500)); // Suspense delay
                
                let chosenBrand = null;
                if (newLiked.length > 0) {
                    chosenBrand = newLiked[Math.floor(Math.random() * newLiked.length)];
                } else {
                    // Fallback to random of all 5 brands
                    chosenBrand = BRAND_CARDS[Math.floor(Math.random() * BRAND_CARDS.length)];
                }

                // Save to DB
                const rewardTypeStr = `${chosenBrand.name} 消費給予9折`;
                const { data: newReward, error } = await supabase
                    .from('rewards')
                    .insert({
                        user_id: profile.id,
                        reward_type: rewardTypeStr
                    })
                    .select()
                    .single();

                if (!error) {
                    setReward(newReward);
                } else {
                    console.error('Save reward failed:', error);
                    alert('領取禮遇失敗，請重試。');
                }
                setIsOpening(false);
            }
        }, 350);
    };

    // Drag-to-swipe handler
    const handleDragEnd = (event: any, info: any) => {
        const threshold = 100;
        if (info.offset.x > threshold) {
            handleSwipe('like');
        } else if (info.offset.x < -threshold) {
            handleSwipe('dislike');
        }
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
        <div className="min-h-screen bg-neutral-950 text-white p-6 flex flex-col font-sans relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-[#DFBA87]/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-neutral-900/40 rounded-full blur-[120px] pointer-events-none"></div>

            <header className="py-4 relative z-10 flex justify-between items-center">
                <button onClick={() => router.push('/vip/dashboard')} className="text-neutral-500 text-[10px] tracking-widest uppercase hover:text-white transition-colors">
                    ← Back
                </button>
                <div className="text-[10px] tracking-[0.4em] text-[#DFBA87] font-mono">
                    VIS VIP EXCLUSIVE
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center relative z-10">
                <AnimatePresence mode="wait">
                    {/* State 1: Unopened & Game Not Started */}
                    {!reward && !isGameStarted && (
                        <motion.div 
                            key="unstarted"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center max-w-sm flex flex-col items-center gap-8"
                        >
                            <div className="relative">
                                <motion.div 
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-44 h-44 bg-gradient-to-tr from-[#1A1A1B] to-[#2E2C28] rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.5)] mx-auto flex items-center justify-center border border-[#DFBA87]/20 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-[#DFBA87]/5 animate-pulse"></div>
                                    <span className="text-5xl text-[#DFBA87] font-light drop-shadow-[0_0_15px_rgba(212,175,87,0.3)]">✧</span>
                                </motion.div>
                            </div>
                            
                            <div className="space-y-3">
                                <h2 className="text-sm tracking-[0.4em] uppercase text-[#DFBA87] font-medium">品味預測迎賓禮</h2>
                                <p className="text-xs text-neutral-400 tracking-widest leading-relaxed max-w-[280px]">
                                    歡迎來到 VIS！<br/>
                                    請完成 5 款特選品牌的喜好配對，大會將為您預測並送出專屬的迎賓消費禮遇。
                                </p>
                            </div>

                            <button
                                onClick={() => setIsGameStarted(true)}
                                className="px-14 py-4 bg-[#DFBA87] hover:bg-white text-black text-[10px] tracking-[0.4em] uppercase font-bold transition-all duration-500 shadow-lg"
                            >
                                開始品味配對
                            </button>
                        </motion.div>
                    )}

                    {/* State 2: Tinder Swipe Game Active */}
                    {!reward && isGameStarted && !isOpening && (
                        <motion.div 
                            key="swiping"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full max-w-[320px] flex flex-col items-center gap-6"
                        >
                            {/* Card Count Indicator */}
                            <div className="text-[10px] tracking-[0.4em] text-neutral-500 uppercase font-mono">
                                BRAND STACK — <span className="text-white">{currentIndex + 1}</span> / {BRAND_CARDS.length}
                            </div>

                            {/* Cards Deck */}
                            <div className="relative w-full aspect-[3/4]">
                                <AnimatePresence mode="popLayout">
                                    {BRAND_CARDS.map((brand, idx) => {
                                        if (idx !== currentIndex) return null;
                                        return (
                                            <motion.div
                                                key={brand.id}
                                                style={{ x: dragX, rotate, opacity }}
                                                drag="x"
                                                dragConstraints={{ left: 0, right: 0 }}
                                                onDragEnd={handleDragEnd}
                                                initial={{ scale: 0.95, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ 
                                                    x: swipeOverlay === 'like' ? 200 : swipeOverlay === 'dislike' ? -200 : 0, 
                                                    opacity: 0,
                                                    transition: { duration: 0.3 }
                                                }}
                                                className="absolute inset-0 w-full h-full flex flex-col justify-between p-6 bg-gradient-to-b from-[#18181B] to-[#09090B] select-none cursor-grab active:cursor-grabbing rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                                            >
                                                {/* Brand image background */}
                                                <img 
                                                    src={brand.image} 
                                                    alt={brand.name} 
                                                    className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-85 brightness-[0.75]"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/45 to-black/95 z-0 pointer-events-none"></div>

                                                {/* Swipe indicator badge */}
                                                <AnimatePresence>
                                                    {swipeOverlay && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, scale: 0.5 }}
                                                            animate={{ opacity: 1, scale: 1.2 }}
                                                            className={`absolute top-10 right-10 px-4 py-1.5 border-2 rounded text-[14px] font-bold tracking-[0.2em] z-20 ${
                                                                swipeOverlay === 'like' ? 'border-emerald-500 text-emerald-500' : 'border-rose-500 text-rose-500'
                                                            }`}
                                                        >
                                                            {swipeOverlay === 'like' ? '◯ LIKE' : '✕ NO'}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {/* Card Header */}
                                                <div className="relative z-10 flex justify-between items-center">
                                                    <span className="text-[8px] tracking-[0.3em] uppercase text-white/50 font-mono">Taste Predict</span>
                                                    <span className="text-[12px] text-[#DFBA87]">✦</span>
                                                </div>

                                                {/* Card Info */}
                                                <div className="relative z-10 space-y-3">
                                                    <h3 className="text-xl font-serif tracking-widest text-white">{brand.name}</h3>
                                                    <p className="text-[11px] leading-relaxed text-neutral-300 font-light tracking-wider">
                                                        {brand.desc}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>

                            {/* Swipe Controller Buttons */}
                            <div className="flex justify-center items-center gap-8 mt-2">
                                {/* Dislike Button */}
                                <button
                                    onClick={() => handleSwipe('dislike')}
                                    className="w-14 h-14 rounded-full border border-rose-500/30 bg-rose-950/10 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center text-lg transition-all shadow-lg cursor-pointer"
                                >
                                    ✕
                                </button>
                                {/* Like Button */}
                                <button
                                    onClick={() => handleSwipe('like')}
                                    className="w-16 h-16 rounded-full border border-[#DFBA87]/50 bg-[#DFBA87]/10 hover:bg-[#DFBA87] text-[#DFBA87] hover:text-black flex items-center justify-center text-xl transition-all shadow-[0_0_20px_rgba(212,175,87,0.15)] cursor-pointer"
                                >
                                    ◯
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* State 3: Revealing Box Animation */}
                    {isOpening && (
                        <motion.div 
                            key="revealing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center"
                        >
                            <div className="w-12 h-12 border-t-2 border-[#DFBA87] rounded-full animate-spin mx-auto mb-6"></div>
                            <p className="text-[10px] tracking-[0.4em] uppercase text-[#DFBA87] font-mono animate-pulse">
                                分析品味偏好中...
                            </p>
                        </motion.div>
                    )}

                    {/* State 4: Reward Unlocked & Redeem Screen */}
                    {reward && !isOpening && (
                        <motion.div 
                            key="opened"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center w-full max-w-sm flex flex-col items-center"
                        >
                            <div className="mb-8 space-y-2">
                                <span className="text-[9px] tracking-[0.6em] text-[#DFBA87] uppercase block font-semibold">Tasting Reward Unlocked</span>
                                <h2 className="text-xs tracking-widest text-neutral-400 font-mono">您的專屬預測迎賓禮</h2>
                            </div>

                            {/* Gold styled ticket voucher */}
                            <div className={`w-full p-8 rounded-3xl border relative overflow-hidden backdrop-blur-xl ${
                                isClaimed 
                                    ? 'border-zinc-800 bg-zinc-900/30' 
                                    : 'border-[#DFBA87]/30 bg-[#14120E]/80 shadow-[0_15px_40px_rgba(212,175,87,0.05)]'
                            } mb-12`}>
                                {/* Ticket cutout circles for ticket feel */}
                                <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-neutral-950 border-r border-[#DFBA87]/20 -translate-y-1/2"></div>
                                <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-neutral-950 border-l border-[#DFBA87]/20 -translate-y-1/2"></div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <p className="text-[10px] tracking-[0.4em] text-[#DFBA87] uppercase font-mono">VIS ART FESTIVAL</p>
                                        <h3 className="text-2xl font-serif text-white tracking-widest px-4">{reward.reward_type}</h3>
                                    </div>

                                    {isClaimed ? (
                                        <div className="py-4 border-t border-zinc-800">
                                            <p className="text-green-500 text-[10px] tracking-[0.4em] uppercase mb-2">● 已於大會櫃檯核銷兌換</p>
                                            <p className="text-neutral-500 text-[8px] tracking-widest uppercase font-mono">
                                                {new Date(reward.claimed_at).toLocaleString()}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 pt-4 border-t border-white/5">
                                            <p className="text-[11px] text-neutral-400 leading-relaxed px-2 font-light">
                                                請於現場 Concierge 服務櫃檯將此畫面出示給 VIS 專員，由專員雙擊下方按鈕完成實體福利兌換。
                                            </p>
                                            
                                            <button
                                                onDoubleClick={handleClaim}
                                                className="w-full py-4 bg-[#DFBA87] hover:bg-white text-black text-[10px] tracking-[0.4em] uppercase font-bold hover:scale-[0.98] transition-all cursor-pointer"
                                            >
                                                專員點擊核銷 (Double Click)
                                            </button>
                                            <p className="text-[8px] text-zinc-500 tracking-widest">
                                                * 此操作由專員在您面前執行，請勿自行點擊
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
