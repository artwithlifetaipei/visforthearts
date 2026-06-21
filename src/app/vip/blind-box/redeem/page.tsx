'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

function RedeemContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const rewardId = searchParams.get('id');

    const [isLoading, setIsLoading] = useState(true);
    const [reward, setReward] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (!rewardId) {
            setErrorMsg('無效的優惠券代碼 (Missing Reward ID)');
            setIsLoading(false);
            return;
        }

        const fetchReward = async () => {
            try {
                const { data, error } = await supabase
                    .from('rewards')
                    .select('*')
                    .eq('id', rewardId)
                    .single();

                if (error || !data) {
                    console.error('Fetch reward error:', error);
                    setErrorMsg('找不到此優惠券，請確認條碼是否正確。');
                } else {
                    setReward(data);
                }
            } catch (err) {
                setErrorMsg('連線異常，請稍後再試。');
            } finally {
                setIsLoading(false);
            }
        };

        fetchReward();
    }, [rewardId]);

    const handleRedeem = async () => {
        if (!reward || isUpdating) return;
        setIsUpdating(true);

        const { data, error } = await supabase
            .from('rewards')
            .update({
                is_claimed: true,
                claimed_at: new Date().toISOString()
            })
            .eq('id', reward.id)
            .select()
            .single();

        setIsUpdating(false);
        if (error) {
            alert('確認使用優惠失敗：' + error.message);
        } else if (data) {
            setReward(data);
            alert('✓ 優惠核銷成功！已記錄此貴賓購買並使用該優惠。');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 font-sans">
                <div className="w-10 h-10 border-t-2 border-[#DFBA87] rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-6 flex flex-col font-sans relative overflow-hidden justify-center items-center">
            {/* Ambient glows */}
            <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-[#DFBA87]/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-neutral-900/40 rounded-full blur-[120px] pointer-events-none"></div>

            <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-md border border-[#DFBA87]/20 bg-[#14120E]/80 backdrop-blur-xl p-8 shadow-2xl relative text-center"
            >
                {/* Corner accents */}
                <div className="absolute top-4 left-4 w-2.5 h-2.5 border-t-[0.5px] border-l-[0.5px] border-[#DFBA87]/50"></div>
                <div className="absolute top-4 right-4 w-2.5 h-2.5 border-t-[0.5px] border-r-[0.5px] border-[#DFBA87]/50"></div>
                <div className="absolute bottom-4 left-4 w-2.5 h-2.5 border-b-[0.5px] border-l-[0.5px] border-[#DFBA87]/50"></div>
                <div className="absolute bottom-4 right-4 w-2.5 h-2.5 border-b-[0.5px] border-r-[0.5px] border-[#DFBA87]/50"></div>

                <div className="mb-8 space-y-2">
                    <span className="text-[9px] tracking-[0.5em] text-[#DFBA87] uppercase block font-semibold">VIS BRAND COUNTER</span>
                    <h2 className="text-sm tracking-widest text-neutral-400 font-mono">參展品牌核銷系統</h2>
                </div>

                {errorMsg ? (
                    <div className="space-y-6">
                        <div className="w-12 h-12 rounded-full border border-red-500/50 bg-red-950/20 text-red-500 flex items-center justify-center mx-auto text-xl">
                            ✕
                        </div>
                        <p className="text-sm text-neutral-300 leading-relaxed font-light">
                            {errorMsg}
                        </p>
                        <button 
                            onClick={() => router.push('/vip')}
                            className="px-10 py-3 border border-neutral-800 text-neutral-400 hover:text-white transition-colors text-[10px] tracking-widest uppercase font-semibold"
                        >
                            返回首頁
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8 text-left">
                        {/* Guest profile card */}
                        <div className="bg-white/5 border border-white/10 p-5 space-y-4">
                            <h3 className="text-xs uppercase tracking-wider text-[#DFBA87] font-semibold border-b border-white/5 pb-2">
                                貴賓與優惠資訊
                            </h3>
                            <div className="space-y-3 text-xs">
                                <div>
                                    <span className="text-neutral-500 block mb-1">貴賓姓名 Guest Name</span>
                                    <span className="text-white font-medium text-sm">
                                        {reward.user_name || '大會貴賓'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-neutral-500 block mb-1">電子信箱 Email</span>
                                    <span className="text-white font-mono">
                                        {reward.user_email || '尚未提供'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-neutral-500 block mb-1">優惠內容 Offer</span>
                                    <span className="text-[#DFBA87] font-medium text-sm">
                                        {reward.reward_type}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-neutral-500 block mb-1">優惠券代碼 ID</span>
                                    <span className="text-neutral-400 font-mono text-[10px]">
                                        {reward.id}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Status / Claim check */}
                        {reward.is_claimed ? (
                            <div className="bg-red-950/20 border border-red-500/20 p-4 text-center space-y-2">
                                <p className="text-red-400 text-xs font-semibold tracking-wider">
                                    ⚠️ 此優惠券已於現場使用
                                </p>
                                <p className="text-neutral-500 text-[10px] font-mono">
                                    核銷時間: {new Date(reward.claimed_at).toLocaleString()}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 text-center">
                                    <p className="text-emerald-400 text-xs font-semibold tracking-wider">
                                        ✓ 優惠券有效 (Valid)
                                    </p>
                                </div>
                                
                                <button
                                    onClick={handleRedeem}
                                    disabled={isUpdating}
                                    className="w-full py-4 bg-[#DFBA87] hover:bg-white text-black text-[10px] tracking-[0.4em] uppercase font-bold hover:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {isUpdating ? '核銷中...' : '確認客人結帳並使用優惠'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}

export default function RewardRedeemPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 font-sans">
                <div className="w-10 h-10 border-t-2 border-[#DFBA87] rounded-full animate-spin"></div>
            </div>
        }>
            <RedeemContent />
        </Suspense>
    );
}
