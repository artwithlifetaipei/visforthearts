'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function VIPLoginPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [message, setMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: `${window.location.origin}/vip/onboarding`,
            },
        });

        if (error) {
            setMessage(`Error: ${error.message}`);
        } else {
            setIsSent(true);
            setMessage('專屬邀請連結已發送至您的信箱，請查收。');
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-md text-center"
            >
                <img 
                    src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
                    alt="VIS" 
                    className="h-8 mx-auto mb-16 opacity-80"
                />

                <h1 className="text-sm tracking-[0.3em] font-medium text-black uppercase mb-8">
                    Digital VIP Access
                </h1>

                <AnimatePresence mode="wait">
                    {!isSent ? (
                        <motion.form 
                            key="login"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onSubmit={handleLogin} 
                            className="space-y-8"
                        >
                            <p className="text-neutral-500 text-xs leading-relaxed tracking-wider mb-8">
                                請輸入您的電子信箱以驗證貴賓身份。<br/>
                                系統將為您開啟專屬的數位門卡與禮遇空間。
                            </p>
                            
                            <div className="relative border-b border-neutral-200 focus-within:border-black transition-colors duration-300">
                                <input
                                    type="email"
                                    placeholder="EMAIL ADDRESS"
                                    required
                                    className="w-full py-4 bg-transparent outline-none text-xs tracking-widest uppercase placeholder:text-neutral-300"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 border border-black text-[10px] tracking-[0.4em] uppercase hover:bg-black hover:text-white transition-all duration-500 disabled:opacity-50"
                            >
                                {isLoading ? 'Verifying...' : 'Authenticate'}
                            </button>
                        </motion.form>
                    ) : (
                        <motion.div 
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-8"
                        >
                            <div className="py-12 flex justify-center">
                                <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                    className="w-12 h-12 rounded-full border border-neutral-100 flex items-center justify-center"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </motion.div>
                            </div>
                            <p className="text-neutral-500 text-xs leading-relaxed tracking-wider">
                                {message}
                            </p>
                            <button
                                onClick={() => setIsSent(false)}
                                className="text-[10px] tracking-[0.2em] uppercase text-neutral-400 hover:text-black transition-colors"
                            >
                                Back to login
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {message && !isSent && (
                    <p className="mt-8 text-[10px] text-red-400 tracking-widest">{message}</p>
                )}

                <footer className="mt-32">
                    <p className="text-[8px] tracking-[0.5em] text-neutral-300 uppercase">
                        &copy; 2026 VIS FOR THE ARTS
                    </p>
                </footer>
            </motion.div>
        </div>
    );
}
