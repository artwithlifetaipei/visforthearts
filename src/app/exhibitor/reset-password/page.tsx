'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // Supabase recovery flow automatically logs the user in and puts access_token in the hash
        // Check if we have an active session (recovery session)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setMessage('連結已過期或無效，請重新於參展商登入頁面點擊「忘記密碼」發送重設信。');
                setStatusType('error');
            }
        };
        checkSession();
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setStatusType('');

        if (password !== confirmPassword) {
            setMessage('兩次輸入的密碼不相符，請重新確認。');
            setStatusType('error');
            setIsLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                setMessage(`密碼更新失敗: ${error.message}`);
                setStatusType('error');
            } else {
                setMessage('密碼更新成功！即將為您導向參展商登入頁面...');
                setStatusType('success');
                setTimeout(() => {
                    router.push('/exhibitor');
                }, 2500);
            }
        } catch (err: any) {
            setMessage(`發生非預期錯誤: ${err.message || String(err)}`);
            setStatusType('error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isMounted) {
        return (
            <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-[#C9A96E]">
                <div className="text-center font-sans">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p className="text-xs font-light tracking-[0.2em] uppercase text-[#1A1A1A]">載入中 Loading...</p>
                </div>
            </div>
        );
    }

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
                <div className="text-center">
                    <h2 className="text-[17px] font-light tracking-[0.3em] uppercase text-[#1a1a1a] mb-2">
                        重設參展商密碼
                    </h2>
                    <p className="text-[10px] tracking-[0.25em] text-[#C9A96E] uppercase font-mono">
                        Reset password
                    </p>
                </div>

                <form onSubmit={handleReset} className="flex flex-col gap-6">
                    <div className="flex flex-col border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                        <label className="text-[8px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">
                            新密碼 New Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="請輸入新密碼 (至少 6 碼)"
                            minLength={6}
                            disabled={isLoading}
                            className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                        />
                    </div>

                    <div className="flex flex-col border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                        <label className="text-[8px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">
                            確認新密碼 Confirm Password
                        </label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="請再次輸入新密碼"
                            minLength={6}
                            disabled={isLoading}
                            className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-[#0D0D0D] hover:bg-[#C9A96E] text-white py-3.5 rounded-none text-xs font-semibold tracking-[0.25em] uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer active:scale-[0.99] shadow-md border-0"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                處理中 Processing...
                            </span>
                        ) : (
                            '確認重設密碼'
                        )}
                    </button>
                </form>

                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`text-[11px] font-light leading-relaxed p-4 border text-center ${
                                statusType === 'error'
                                    ? 'text-rose-600 bg-rose-50 border-rose-100'
                                    : 'text-[#8C7853] bg-[#C9A96E]/5 border-[#C9A96E]/15'
                            }`}
                        >
                            {message}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
