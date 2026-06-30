'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export const dynamic = 'force-dynamic';

export default function VIPApplyPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setStatusType('');

        const formattedEmail = email.toLowerCase().trim();
        const formattedName = name.trim();

        if (!formattedName) {
            setMessage('請輸入您的完整姓名。');
            setStatusType('error');
            setIsLoading(false);
            return;
        }

        if (!formattedEmail || !formattedEmail.includes('@')) {
            setMessage('請輸入正確的電子信箱。');
            setStatusType('error');
            setIsLoading(false);
            return;
        }

        try {
            // 1. Check if email already exists in vip_allowlist (both approved or pending)
            const { data: existing, error: checkError } = await supabase
                .from('vip_allowlist')
                .select('email, status')
                .ilike('email', formattedEmail)
                .maybeSingle();

            if (existing) {
                if (existing.status === 'Approved') {
                    setMessage('此信箱已是 VIS 貴賓，點選下方返回登入即可進入。');
                    setStatusType('success');
                } else if (existing.status === 'Pending') {
                    setMessage('此信箱已在申請審核中，大會核准後將會發送通知信，請耐心等候。');
                    setStatusType('success');
                } else {
                    setMessage('此信箱已被審核退回，如有疑問請洽 visvipteam@gmail.com。');
                    setStatusType('error');
                }
                setIsLoading(false);
                return;
            }

            // 2. Insert as pending self-registration
            const { error: insertError } = await supabase
                .from('vip_allowlist')
                .insert({
                    email: formattedEmail,
                    name: formattedName,
                    status: 'Pending',
                    tier: 'VIP',
                    role: 'VIP',
                    rsvp_status: 'Unconfirmed'
                });

            if (insertError) {
                throw insertError;
            }

            setMessage('✓ 申請提交成功！大會審核通過後，專屬邀請連結將會自動發送至您的信箱。');
            setStatusType('success');
            setName('');
            setEmail('');
        } catch (err: any) {
            console.error('VIP Application failed:', err);
            setMessage(`申請提交失敗，請稍後再試。Error: ${err.message || err}`);
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
                className="w-full max-w-sm border border-neutral-200/60 bg-white/80 p-8 py-10 relative backdrop-blur-xl shadow-2xl flex flex-col gap-8"
            >
                {/* Corner accents */}
                <div className="absolute top-4 left-4 w-2.5 h-2.5 border-t-[0.5px] border-l-[0.5px] border-[#DFBA87]"></div>
                <div className="absolute top-4 right-4 w-2.5 h-2.5 border-t-[0.5px] border-r-[0.5px] border-[#DFBA87]"></div>
                <div className="absolute bottom-4 left-4 w-2.5 h-2.5 border-b-[0.5px] border-l-[0.5px] border-[#DFBA87]"></div>
                <div className="absolute bottom-4 right-4 w-2.5 h-2.5 border-b-[0.5px] border-r-[0.5px] border-[#DFBA87]"></div>

                <div className="text-center space-y-3">
                    <img 
                        src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
                        alt="VIS Logo" 
                        className="h-10 mx-auto brightness-95 opacity-90"
                    />
                    <p className="text-[7.5px] tracking-[0.5em] text-[#DFBA87] uppercase font-mono mt-4 font-medium">VIP Request Portal</p>
                    <h2 className="text-sm tracking-[0.25em] font-serif uppercase font-light text-neutral-800">貴賓席位申請登記</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="border-b border-neutral-200 focus-within:border-[#DFBA87] transition-all py-1">
                            <label className="block text-[7px] tracking-widest text-neutral-500 uppercase mb-1">您的完整姓名 (Full Name)</label>
                            <input 
                                type="text"
                                placeholder="請輸入中文或英文姓名"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                disabled={isLoading}
                                className="w-full bg-transparent border-none outline-none text-xs text-neutral-800 tracking-widest py-1"
                            />
                        </div>
                        <div className="border-b border-neutral-200 focus-within:border-[#DFBA87] transition-all py-1">
                            <label className="block text-[7px] tracking-widest text-neutral-500 uppercase mb-1">電子信箱 (Email Address)</label>
                            <input 
                                type="email"
                                placeholder="attendant@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className="w-full bg-transparent border-none outline-none text-xs text-neutral-800 tracking-widest font-mono py-1"
                            />
                        </div>
                    </div>

                    {message && (
                        <p className={`text-[10px] tracking-widest leading-relaxed font-light p-3 border ${
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
                            {isLoading ? '提交中...' : '提交貴賓席申請'}
                        </button>
                        
                        <button 
                            type="button"
                            onClick={() => router.push('/vip')}
                            className="w-full py-3 text-neutral-500 hover:text-black text-[9px] tracking-[0.3em] uppercase transition-colors cursor-pointer"
                        >
                            ← 返回貴賓登入
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
