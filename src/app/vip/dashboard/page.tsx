'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function VIPDashboard() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [qrValue, setQrValue] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/vip');
                return;
            }

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

    return (
        <div className={`min-h-screen ${isSVIP ? 'bg-zinc-950 text-white' : 'bg-white text-black'} transition-colors duration-1000 font-sans`}>
            {/* Header */}
            <header className="px-6 py-8 flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-[8px] tracking-[0.4em] uppercase opacity-50 mb-1">Pass Issued To</span>
                    <span className="text-[10px] tracking-widest font-medium uppercase">
                        {profile.first_name || profile.email.split('@')[0]}
                    </span>
                </div>
                <div className="text-right">
                    <span className={`text-[8px] tracking-[0.4em] uppercase px-3 py-1 border ${isSVIP ? 'border-zinc-800 bg-zinc-900' : 'border-neutral-100 bg-neutral-50'}`}>
                        {profile.vip_level}
                    </span>
                </div>
            </header>

            {/* Main Pass Section (60% height) */}
            <main className="px-6 pt-4 pb-12 flex flex-col items-center">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`relative w-full aspect-[3/4] max-w-sm rounded-3xl overflow-hidden flex flex-col items-center justify-center shadow-2xl ${isSVIP ? 'bg-gradient-to-br from-zinc-800 to-black' : 'bg-white border border-neutral-100'}`}
                >
                    {/* Animated Background Polish */}
                    <div className="absolute inset-0 pointer-events-none opacity-30">
                        <motion.div 
                            animate={{ 
                                x: [0, 100, 0],
                                y: [0, -50, 0],
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                            className={`absolute -top-20 -left-20 w-64 h-64 rounded-full blur-[80px] ${isSVIP ? 'bg-zinc-700' : 'bg-neutral-200'}`}
                        />
                    </div>

                    {/* QR Code Container */}
                    <div className={`p-6 rounded-2xl ${isSVIP ? 'bg-white' : 'bg-white'}`}>
                        <QRCodeSVG 
                            value={qrValue} 
                            size={180}
                            level="H"
                            includeMargin={false}
                        />
                    </div>

                    <div className="mt-8 text-center space-y-2">
                        <p className={`text-[10px] tracking-[0.5em] uppercase font-light ${isSVIP ? 'text-zinc-400' : 'text-neutral-400'}`}>
                            Scan for Access
                        </p>
                        <p className={`text-[8px] tracking-[0.2em] font-mono opacity-30`}>
                            {new Date().toLocaleTimeString([], { hour12: false })}
                        </p>
                    </div>

                    {/* Apple Wallet Button Mockup */}
                    <button className="absolute bottom-8 px-6 py-2 rounded-full bg-black text-white text-[9px] tracking-widest uppercase flex items-center gap-3 hover:scale-105 transition-transform">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91 1.13.05 2.14.46 2.87 1.14-.15.11-1.39.81-1.39 2.41 0 1.93 1.57 2.61 1.6 2.62-.01.03-.25.87-.84 1.73zM13 5c-.03-2.04 1.69-3.77 3.69-3.81.03 2.04-1.69 3.77-3.69 3.81z"/></svg>
                        Add to Wallet
                    </button>
                </motion.div>
            </main>

            {/* Aesthetic Entrances */}
            <section className="px-6 grid grid-cols-2 gap-4 pb-12">
                <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push('/vip/blind-box')}
                    className={`aspect-square rounded-2xl p-6 flex flex-col justify-between text-left ${isSVIP ? 'bg-zinc-900 border border-zinc-800' : 'bg-neutral-50 border border-neutral-100'}`}
                >
                    <span className="text-[8px] tracking-[0.3em] uppercase opacity-50 font-medium">禮遇</span>
                    <h3 className="text-sm font-light tracking-widest leading-relaxed">
                        品味預測<br/>迎賓禮
                    </h3>
                </motion.button>

                <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push('/vip/story')}
                    className={`aspect-square rounded-2xl p-6 flex flex-col justify-between text-left ${isSVIP ? 'bg-zinc-900 border border-zinc-800' : 'bg-neutral-50 border border-neutral-100'}`}
                >
                    <span className="text-[8px] tracking-[0.3em] uppercase opacity-50 font-medium">美學</span>
                    <h3 className="text-sm font-light tracking-widest leading-relaxed">
                        星座藝術<br/>生成器
                    </h3>
                </motion.button>
            </section>
        </div>
    );
}
