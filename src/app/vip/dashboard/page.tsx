'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

const ADMIN_EMAILS = ['artwithlifetaipei@gmail.com'];

export default function VIPDashboard() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [qrValue, setQrValue] = useState('');
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/vip');
                return;
            }
            setUserEmail(user.email ?? '');

            const { data } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (!data?.birthdate) {
                router.push('/vip/onboarding');
                return;
            }

            setProfile(data);
            // Dynamic QR: user_id + timestamp
            setQrValue(`${data.id}:${Date.now()}`);
        };

        fetchProfile();

        // Refresh QR every 30 seconds for security
        const interval = setInterval(() => {
            if (profile) {
                setQrValue(`${profile.id}:${Date.now()}`);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [router, profile?.id]);

    if (!profile) return null;

    const isSVIP = profile.vip_level === 'SVIP';

    // Theme Variables based on SVIP/VIP
    const bgClass = isSVIP ? 'bg-[#111111] text-[#FAF9F6]' : 'bg-[#FAF9F6] text-[#1A1A1A]';
    const cardClass = isSVIP 
        ? 'bg-[#1A1A1A]/80 border-[#333333] shadow-black/50' 
        : 'bg-white/80 border-[#E5E5E5] shadow-black/5';
    const accentColor = '#D4AF37'; // Pola Gold
    const blurClass = isSVIP ? 'bg-[#D4AF37]/10' : 'bg-[#D4AF37]/5';

    return (
        <div className={`min-h-screen ${bgClass} transition-colors duration-1000 font-sans relative overflow-hidden pb-12`}>
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className={`absolute top-[-5%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[100px] ${blurClass}`}></div>
            </div>

            {/* Header */}
            <header className="px-6 py-10 flex justify-between items-start relative z-10">
                <div className="flex flex-col">
                    <span className="text-[8px] tracking-[0.4em] uppercase opacity-40 mb-2 font-light">
                        Digital Pass
                    </span>
                    <span className="text-[14px] tracking-[0.2em] font-serif uppercase">
                        {profile.first_name || profile.email.split('@')[0]}
                    </span>
                </div>
                <div className="text-right">
                    <div className={`inline-block px-4 py-1.5 border-[0.5px] ${isSVIP ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-[#1A1A1A] text-[#1A1A1A]'}`}>
                        <span className="text-[9px] tracking-[0.4em] uppercase font-light">
                            {profile.vip_level}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Pass Section */}
            <main className="px-6 pt-2 pb-12 flex flex-col items-center relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className={`relative w-full aspect-[3/4] max-w-sm rounded-none overflow-hidden flex flex-col items-center justify-center shadow-2xl border-[0.5px] backdrop-blur-xl ${cardClass}`}
                >
                    {/* Corner Accents */}
                    <div className="absolute top-4 left-4 w-2 h-2 border-t-[0.5px] border-l-[0.5px] border-current opacity-30"></div>
                    <div className="absolute top-4 right-4 w-2 h-2 border-t-[0.5px] border-r-[0.5px] border-current opacity-30"></div>
                    <div className="absolute bottom-4 left-4 w-2 h-2 border-b-[0.5px] border-l-[0.5px] border-current opacity-30"></div>
                    <div className="absolute bottom-4 right-4 w-2 h-2 border-b-[0.5px] border-r-[0.5px] border-current opacity-30"></div>

                    {/* QR Code Container */}
                    <div className={`p-5 bg-white`}>
                        <QRCodeSVG 
                            value={qrValue} 
                            size={180}
                            level="H"
                            includeMargin={false}
                            fgColor="#1A1A1A"
                        />
                    </div>

                    <div className="mt-10 text-center space-y-3">
                        <p className={`text-[9px] tracking-[0.6em] uppercase font-light opacity-60`}>
                            Scan for Access
                        </p>
                        <p className={`text-[10px] tracking-[0.3em] font-mono opacity-30`}>
                            {new Date().toLocaleTimeString([], { hour12: false })}
                        </p>
                    </div>

                    {/* Apple Wallet Button - Minimalist */}
                    <button className="absolute bottom-10 flex items-center gap-2 group">
                        <span className="w-6 h-[1px] bg-current opacity-30 group-hover:w-8 transition-all duration-300"></span>
                        <span className="text-[8px] tracking-[0.3em] uppercase opacity-50 group-hover:opacity-100 transition-opacity">
                            Add to Wallet
                        </span>
                        <span className="w-6 h-[1px] bg-current opacity-30 group-hover:w-8 transition-all duration-300"></span>
                    </button>
                </motion.div>
            </main>

            {/* Aesthetic Entrances */}
            <section className="px-6 grid grid-cols-2 gap-4 relative z-10">
                <motion.button 
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/vip/blind-box')}
                    className={`aspect-square p-6 flex flex-col justify-between text-left border-[0.5px] backdrop-blur-md transition-colors duration-500 hover:border-[#D4AF37] ${cardClass}`}
                >
                    <span className="text-[8px] tracking-[0.4em] uppercase opacity-40 font-light">Curated</span>
                    <h3 className="text-sm font-serif tracking-[0.2em] leading-relaxed">
                        品味預測<br/>迎賓禮
                    </h3>
                </motion.button>

                <motion.button 
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/vip/story')}
                    className={`aspect-square p-6 flex flex-col justify-between text-left border-[0.5px] backdrop-blur-md transition-colors duration-500 hover:border-[#D4AF37] ${cardClass}`}
                >
                    <span className="text-[8px] tracking-[0.4em] uppercase opacity-40 font-light">Aesthetic</span>
                    <h3 className="text-sm font-serif tracking-[0.2em] leading-relaxed">
                        你與哪位藝術家之間<br/>有所共感？
                    </h3>
                </motion.button>
            </section>

            {/* Admin-only link — invisible to regular VIPs */}
            {ADMIN_EMAILS.includes(userEmail) && (
                <div className="text-center mt-8">
                    <button
                        onClick={() => router.push('/vip/admin')}
                        className="text-[9px] tracking-[0.4em] uppercase text-neutral-600 hover:text-[#D4AF37] transition-colors duration-500"
                    >
                        ⚙ 貴賓名單管理
                    </button>
                </div>
            )}
        </div>
    );
}
