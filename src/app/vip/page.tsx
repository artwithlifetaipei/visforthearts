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

        // Step 1: Check if email is on the VIP allowlist
        const { data: allowed, error: checkError } = await supabase
            .from('vip_allowlist')
            .select('email')
            .eq('email', email.toLowerCase().trim())
            .single();

        if (checkError || !allowed) {
            // Not on the list — show an elegant, on-brand message
            setMessage('此信箱尚未在 VIS 貴賓名單中。\n如您有任何疑問，歡迎與 visvipteam@gmail.com 聯繫。');
            setIsLoading(false);
            return;
        }

        // Step 2: Email is approved — send the magic link (OTP)
        const { error } = await supabase.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: `${window.location.origin}/vip/onboarding`,
                shouldCreateUser: true, // This ensures new users are created AND sent the Magic Link template
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
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
            {/* Atmospheric Background Blurs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[#D4AF37]/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-black/5 rounded-full blur-[120px]"></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-md text-center relative z-10"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
                >
                    <img 
                        src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
                        alt="VIS" 
                        className="h-16 mx-auto mb-12 opacity-90"
                    />
                </motion.div>

                <h1 className="text-3xl font-serif text-[#1A1A1A] mb-2 tracking-tight">
                    Digital Portal
                </h1>
                <AnimatePresence mode="wait">
                    {!isSent ? (
                        <motion.form 
                            key="login"
                            initial={{ opacity: 0, filter: "blur(10px)" }}
                            animate={{ opacity: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, filter: "blur(10px)", y: -20 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            onSubmit={handleLogin} 
                            className="space-y-12"
                        >
                            <div className="mb-10 mt-2">
                                <h1 className="text-[15px] font-serif tracking-[0.1em] text-[#D4AF37] uppercase">
                                    VIP / SVIP Exclusive Access
                                </h1>
                            </div>
                            
                            <p className="text-[#666666] text-[15px] leading-[2.2] tracking-widest mb-12 font-light">
                                請輸入您的電子信箱以驗證貴賓身份。<br/>
                                系統將為您開啟專屬的貴賓門卡與禮遇空間。<br/>
                                <span className="opacity-60 text-[13.5px] mt-4 block italic font-serif">
                                    Enter your email to verify your VIP status and unlock your<br/>
                                    exclusive digital key and premium benefits.
                                </span>
                            </p>
                            
                            <div className="relative border-b border-[#E5E5E5] focus-within:border-[#1A1A1A] transition-colors duration-500 group">
                                <input
                                    type="email"
                                    placeholder="EMAIL ADDRESS"
                                    required
                                    className="w-full py-4 bg-transparent outline-none text-xs tracking-widest uppercase placeholder:text-[#CCCCCC] text-center text-[#1A1A1A]"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                                <div className="absolute bottom-[-1px] left-1/2 w-0 h-[1px] bg-[#1A1A1A] transition-all duration-500 group-focus-within:w-full group-focus-within:left-0"></div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 0.98 }}
                                whileTap={{ scale: 0.95 }}
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-5 bg-[#1A1A1A] text-white text-[10px] tracking-[0.4em] uppercase transition-all duration-500 disabled:opacity-50 shadow-2xl shadow-black/10 hover:shadow-black/20"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <div className="w-3 h-3 border-r-transparent border-[1.5px] border-white rounded-full animate-spin"></div>
                                        Authenticating
                                    </span>
                                ) : 'Authenticate'}
                            </motion.button>
                        </motion.form>
                    ) : (
                        <motion.div 
                            key="success"
                            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="space-y-10"
                        >
                            <div className="py-10 flex justify-center">
                                <motion.div 
                                    initial={{ scale: 0, rotate: -90 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", damping: 15, stiffness: 100, delay: 0.2 }}
                                    className="w-16 h-16 rounded-full border-[0.5px] border-[#D4AF37] flex items-center justify-center bg-white shadow-xl shadow-[#D4AF37]/10"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 6L9 17L4 12" />
                                    </svg>
                                </motion.div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-sm font-serif text-[#1A1A1A] tracking-wider">Invitation Sent</h3>
                                <p className="text-[#666666] text-xs leading-[2] tracking-wider max-w-[280px] mx-auto font-light">
                                    {message}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsSent(false)}
                                className="text-[9px] tracking-[0.3em] uppercase text-[#999999] hover:text-[#1A1A1A] transition-colors duration-300 border-b border-transparent hover:border-[#1A1A1A] pb-1"
                            >
                                Back to login
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {message && !isSent && (
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 text-[10px] text-red-500/80 tracking-widest font-light"
                    >
                        {message}
                    </motion.p>
                )}

                <footer className="absolute bottom-8 left-0 w-full text-center">
                    <div className="w-6 h-[1px] bg-[#E5E5E5] mx-auto mb-6 transition-all duration-700 hover:w-12"></div>
                    <p className="text-[9px] tracking-[0.4em] text-[#999999] uppercase font-light">
                        &copy; 2026 VIS FOR THE ARTS <span className="mx-2 opacity-30">|</span> PORTAL
                    </p>
                </footer>
            </motion.div>
        </div>
    );
}
