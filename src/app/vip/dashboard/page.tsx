'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

const ADMIN_EMAILS = ['artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'];

export default function VIPDashboard() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [qrValue, setQrValue] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [isWalletOpen, setIsWalletOpen] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let authTimeout: NodeJS.Timeout | null = null;

        const fetchProfile = async (user: any) => {
            if (!isMounted || !user) {
                if (!user) router.push('/vip');
                return;
            }
            const email = user.email?.toLowerCase().trim() || '';
            setUserEmail(email);

            // Verify VIP privilege
            let isVip = ADMIN_EMAILS.includes(email);
            if (!isVip) {
                try {
                    const { data: allowed } = await supabase
                        .from('vip_allowlist')
                        .select('email')
                        .ilike('email', email)
                        .maybeSingle();
                    if (allowed) isVip = true;
                } catch (err) {
                    console.error('Error verifying VIP status in dashboard:', err);
                }
            }

            if (!isVip) {
                router.push('/vip');
                return;
            }

            // Auto-heal password for scanner staff and admin/amelie account
            if (email === 'artwithlifetaipei@gmail.com' || email === 'amelie@theartpressasia.com') {
                supabase.auth.updateUser({ password: 'Kuo76443173' }).catch(() => {});
            }

            try {
                const { data } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                if (!isMounted) return;

                if (!data?.birthdate) {
                    router.push('/vip/onboarding');
                    return;
                }

                const { data: allowlistData } = await supabase
                    .from('vip_allowlist')
                    .select('tier')
                    .ilike('email', email)
                    .maybeSingle();

                if (!isMounted) return;

                setProfile({ ...data, tier: allowlistData?.tier || 'VIP' });
                setQrValue(`${data.id}:${Date.now()}`);
                setIsLoading(false);
            } catch (err) {
                console.error('Error loading dashboard profile:', err);
                router.push('/vip');
            }
        };

        // Handle ALL auth state changes — including INITIAL_SESSION (fired when already logged in)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;

            if (event === 'SIGNED_IN' && session?.user) {
                if (authTimeout) clearTimeout(authTimeout);
                await fetchProfile(session.user);
            } else if (event === 'SIGNED_OUT') {
                if (isMounted) router.push('/vip');
            }
        });

        // Instant session retrieval for client-side routing transitions
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!isMounted) return;
            if (session?.user) {
                if (authTimeout) clearTimeout(authTimeout);
                fetchProfile(session.user);
            } else {
                // Wait 3.5s for async auth state resolution before redirecting
                authTimeout = setTimeout(() => {
                    if (isMounted) router.push('/vip');
                }, 3500);
            }
        }).catch(() => {
            if (isMounted) router.push('/vip');
        });

        // Refresh QR code every 30 seconds
        const qrInterval = setInterval(() => {
            setQrValue(prev => {
                if (!prev) return prev;
                const userId = prev.split(':')[0];
                return `${userId}:${Date.now()}`;
            });
        }, 30000);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearInterval(qrInterval);
            if (authTimeout) clearTimeout(authTimeout);
        };
    }, [router]); // ← ONLY depend on router. Never re-run when profile changes.

    if (isLoading || !profile) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-4 h-4 border-t-2 border-[#DFBA87] rounded-full animate-spin"></div>
            </div>
        );
    }

    const isSVIP = profile.tier === 'SVIP';

    // Theme Variables based on SVIP/VIP
    const bgClass = isSVIP ? 'bg-[#111111] text-[#FAF9F6]' : 'bg-[#FAF9F6] text-[#1A1A1A]';
    const cardClass = isSVIP 
        ? 'bg-[#1A1A1A]/80 border-[#333333] shadow-black/50' 
        : 'bg-white/80 border-[#E5E5E5] shadow-black/5';
    const accentColor = '#DFBA87'; // Pola Gold
    const blurClass = isSVIP ? 'bg-[#DFBA87]/10' : 'bg-[#DFBA87]/5';

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/vip');
    };

    const generateICS = () => {
        if (!profile) return;
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//VIS FOR THE ARTS//VIP Pass//EN',
            'BEGIN:VEVENT',
            `UID:vis-vip-${profile.id}`,
            'DTSTAMP:20260530T000000Z',
            'DTSTART:20270107T030000Z',
            'DTEND:20270110T100000Z',
            'SUMMARY:VIS FOR THE ARTS 2027 藝術博覽會 (VIP)',
            'DESCRIPTION:您專屬的 VIS 貴賓尊榮通行證提醒。請於入場時出示您的數位禮賓卡通關。\\n\\n聯絡信箱：visvipteam@gmail.com',
            'LOCATION:台北市中正區延平南路98號',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'vis-vip-reminder.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const googleCalendarUrl = () => {
        const text = encodeURIComponent("VIS FOR THE ARTS 2027 藝術博覽會 (VIP)");
        const dates = "20270107T030000Z/20270110T100000Z"; // Jan 7, 11:00 AM to Jan 10, 6:00 PM Taipei time (UTC+8)
        const details = encodeURIComponent("您專屬的 VIS 貴賓尊榮通行證提醒。請於入場時出示您的數位禮賓卡通關。\n\n聯絡信箱：visvipteam@gmail.com");
        const location = encodeURIComponent("台北市中正區延平南路98號");
        return `https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&location=${location}&sf=true&output=xml`;
    };

    return (
        <div className={`min-h-screen transition-colors duration-1000 font-sans relative overflow-hidden pb-12 ${isSVIP ? 'text-[#FAF9F6]' : 'text-[#1A1A1A]'}`}>
            {/* Full-bleed architectural background */}
            <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
                <img
                    src="/vip_lobby_bg.jpg"
                    alt=""
                    className="w-full h-full object-cover object-center"
                    style={{ filter: isSVIP ? 'brightness(0.28) saturate(0.85)' : 'brightness(0.38) saturate(0.75)' }}
                />
                {/* Warm gradient overlay for readability */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: isSVIP
                            ? 'linear-gradient(180deg, rgba(10,8,6,0.65) 0%, rgba(12,10,8,0.45) 40%, rgba(10,8,6,0.75) 100%)'
                            : 'linear-gradient(180deg, rgba(245,242,235,0.82) 0%, rgba(240,235,225,0.6) 40%, rgba(245,242,235,0.88) 100%)'
                    }}
                />
                {/* Subtle gold vignette top */}
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(223,186,135,0.08) 0%, transparent 65%)' }} />
            </div>

            {/* Header */}
            <header className="px-6 py-10 flex justify-between items-start relative z-10">
                <div className="flex flex-col">
                    <span className={`text-[8px] tracking-[0.4em] uppercase mb-2 font-light ${isSVIP ? 'text-white/40' : 'text-[#1A1A1A]/50'}`}>
                        Digital Pass
                    </span>
                    <span className={`text-[14px] tracking-[0.2em] font-serif uppercase ${isSVIP ? 'text-white' : 'text-[#1A1A1A]'}`}>
                        {profile.first_name || profile.email.split('@')[0]}
                    </span>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                    <div className={`inline-block px-4 py-1.5 border-[0.5px] ${isSVIP ? 'border-[#DFBA87] text-[#DFBA87]' : 'border-[#1A1A1A]/60 text-[#1A1A1A]'}`}>
                        <span className="text-[9px] tracking-[0.4em] uppercase font-light">
                            {profile.tier}
                        </span>
                    </div>
                    <button 
                        onClick={handleSignOut}
                        className={`text-[8px] tracking-[0.3em] uppercase transition-opacity cursor-pointer border-b border-transparent hover:border-current mt-0.5 ${isSVIP ? 'text-white/40 hover:text-white/100' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/100'}`}
                    >
                        Sign Out / 登出
                    </button>
                </div>
            </header>

            {/* Main Pass Section */}
            <main className="px-6 pt-2 pb-12 flex flex-col items-center relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className={`relative w-full max-w-sm rounded-none overflow-hidden flex flex-col items-center justify-between shadow-2xl border-[0.5px] backdrop-blur-xl p-8 py-12 ${cardClass}`}
                    style={{ minHeight: '520px', boxShadow: isSVIP ? '0 25px 60px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(223,186,135,0.1)' : '0 25px 60px rgba(0,0,0,0.25)' }}
                >
                    {/* Corner Accents */}
                    <div className="absolute top-4 left-4 w-2 h-2 border-t-[0.5px] border-l-[0.5px] border-current opacity-30"></div>
                    <div className="absolute top-4 right-4 w-2 h-2 border-t-[0.5px] border-r-[0.5px] border-current opacity-30"></div>
                    <div className="absolute bottom-4 left-4 w-2 h-2 border-b-[0.5px] border-l-[0.5px] border-current opacity-30"></div>
                    <div className="absolute bottom-4 right-4 w-2 h-2 border-b-[0.5px] border-r-[0.5px] border-current opacity-30"></div>

                    {/* VIP Invitation / Event details */}
                    <div className="text-center mb-6 space-y-2.5 w-full">
                        <h2 className="text-[13px] tracking-[0.4em] uppercase font-semibold text-[#DFBA87]">VIS FOR THE ARTS</h2>
                        <p className="text-[10px] tracking-[0.2em] font-mono opacity-80">2027/1/7 - 1/10</p>
                        <p className="text-[9.5px] tracking-widest opacity-60">台北市中正區延平南路98號</p>
                        <p className="text-[8.5px] tracking-wider opacity-60 mt-3 border-t border-current/10 pt-3 px-2 leading-relaxed">
                            如需貴賓服務，請聯絡VIP辦公室<br/>
                            <a href="mailto:visvipteam@gmail.com" className="underline text-[#DFBA87] hover:text-white transition-colors duration-300">visvipteam@gmail.com</a>
                        </p>
                    </div>

                    {/* QR Code Container */}
                    <div className={`p-4 bg-white shadow-xl`}>
                        <QRCodeSVG 
                            value={qrValue} 
                            size={160}
                            level="H"
                            includeMargin={false}
                            fgColor="#1A1A1A"
                        />
                    </div>

                    <div className="mt-6 text-center space-y-2">
                        <p className={`text-[9px] tracking-[0.6em] uppercase font-light opacity-60`}>
                            Scan for Access
                        </p>
                        <p className={`text-[10px] tracking-[0.3em] font-mono opacity-30`}>
                            {new Date().toLocaleTimeString([], { hour12: false })}
                        </p>
                    </div>

                    {/* Apple Wallet Button - Minimalist */}
                    <button 
                        onClick={() => setIsWalletOpen(true)}
                        className="mt-6 flex items-center gap-2 group cursor-pointer"
                    >
                        <span className="w-6 h-[1px] bg-current opacity-30 group-hover:w-8 transition-all duration-300"></span>
                        <span className="text-[8px] tracking-[0.3em] uppercase opacity-50 group-hover:opacity-100 transition-opacity">
                            加入行事曆 Add to calendar
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
                    className="aspect-square p-6 flex flex-col justify-between text-left border-[0.5px] border-white/20 backdrop-blur-md relative overflow-hidden group shadow-xl cursor-pointer"
                >
                    <img 
                        src="/vip_lobby_bg.jpg"
                        className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-[1.2s] ease-out group-hover:scale-110"
                        alt="Taste Prediction BG"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/25 to-black/85 z-0"></div>

                    <span className="relative z-10 text-[8px] tracking-[0.4em] uppercase text-[#DFBA87] font-semibold">Curated</span>
                    <h3 className="relative z-10 text-xs font-serif tracking-[0.2em] leading-relaxed text-white">
                        品味預測<br/>迎賓禮
                    </h3>
                </motion.button>

                <motion.button 
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/vip/story')}
                    className="aspect-square p-6 flex flex-col justify-between text-left border-[0.5px] border-white/20 backdrop-blur-md relative overflow-hidden group shadow-xl cursor-pointer"
                >
                    <img 
                        src="https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop"
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
                        alt="Artist Resonance BG"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/25 to-black/85 z-0"></div>

                    <span className="relative z-10 text-[8px] tracking-[0.4em] uppercase text-[#DFBA87] font-semibold">Aesthetic</span>
                    <h3 className="relative z-10 text-xs font-serif tracking-[0.2em] leading-relaxed text-white">
                        你與哪位藝術家之間<br/>有所共感？
                    </h3>
                </motion.button>
            </section>

            {/* Admin-only CRM link — visible only to admin accounts */}
            {ADMIN_EMAILS.includes(profile.email ?? '') && (
                <div className="px-6 mt-6 relative z-10">
                    <motion.button
                        whileHover={{ scale: 0.99 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => router.push('/vip/admin')}
                        className={`w-full py-4 px-6 flex items-center justify-between border-[0.5px] backdrop-blur-md transition-all duration-500 group cursor-pointer ${
                            isSVIP
                                ? 'border-[#DFBA87]/30 hover:border-[#DFBA87]/70 bg-[#DFBA87]/5'
                                : 'border-[#1A1A1A]/20 hover:border-[#1A1A1A]/60 bg-white/30'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-[#DFBA87] text-sm">⚙</span>
                            <div className="text-left">
                                <p className={`text-[9px] tracking-[0.4em] uppercase font-medium ${isSVIP ? 'text-white/80' : 'text-[#1A1A1A]/80'}`}>
                                    CRM 後台管理
                                </p>
                                <p className={`text-[8px] tracking-wider mt-0.5 ${isSVIP ? 'text-white/40' : 'text-[#1A1A1A]/40'}`}>
                                    貴賓名單 / 行銷活動 / 入場掃描
                                </p>
                            </div>
                        </div>
                        <span className={`text-[10px] transition-transform duration-300 group-hover:translate-x-1 ${isSVIP ? 'text-white/40' : 'text-[#1A1A1A]/40'}`}>→</span>
                    </motion.button>
                </div>
            )}

            {/* Add to Wallet & Calendar Modal */}
            <AnimatePresence>
                {isWalletOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 30, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-[#121212] border border-[#222222] text-white w-full max-w-md p-8 relative flex flex-col items-center"
                        >
                            {/* Close button */}
                            <button 
                                onClick={() => setIsWalletOpen(false)}
                                className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors p-2 text-lg"
                            >
                                ✕
                            </button>

                            <h3 className="text-xs tracking-[0.4em] text-[#DFBA87] uppercase mb-8 font-medium">加入行事曆 Add to calendar</h3>

                            {/* Wallet Ticket Mockup */}
                            <div className="relative w-full max-w-[280px] bg-gradient-to-b from-[#1E1C18] to-[#0F0E0D] border-[0.5px] border-[#DFBA87]/30 p-6 flex flex-col items-center mb-8 shadow-2xl rounded-lg">
                                {/* Ticket Header */}
                                <div className="w-full flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                                    <img 
                                        src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
                                        alt="VIS Logo" 
                                        className="h-5 brightness-200 opacity-80"
                                    />
                                    <span className="text-[9px] tracking-[0.2em] font-mono text-[#DFBA87] border border-[#DFBA87]/40 px-2 py-0.5 uppercase">
                                        {profile.tier} PASS
                                    </span>
                                </div>

                                {/* Ticket Details */}
                                <div className="w-full space-y-3 mb-6">
                                    <div>
                                        <p className="text-[7px] tracking-[0.3em] uppercase text-neutral-500">MEMBER</p>
                                        <p className="text-[11px] tracking-[0.1em] font-medium font-serif mt-0.5 text-neutral-200">
                                            {profile.first_name || profile.email.split('@')[0]}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[7px] tracking-[0.3em] uppercase text-neutral-500">EVENT</p>
                                            <p className="text-[9px] tracking-[0.1em] text-neutral-300 mt-0.5">VIS Art Festival</p>
                                        </div>
                                        <div>
                                            <p className="text-[7px] tracking-[0.3em] uppercase text-neutral-500">DATE</p>
                                            <p className="text-[9px] tracking-[0.1em] font-mono text-neutral-300 mt-0.5">2027.01.07 - 10</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[7px] tracking-[0.3em] uppercase text-neutral-500">LOCATION</p>
                                        <p className="text-[9px] tracking-[0.1em] text-neutral-300 mt-0.5 leading-snug">台北市延平南路98號</p>
                                    </div>
                                </div>

                                {/* Dynamic QR Code */}
                                <div className="p-4 bg-white rounded-sm shadow-inner mb-4">
                                    <QRCodeSVG 
                                        value={qrValue} 
                                        size={120}
                                        level="M"
                                        fgColor="#1A1A1A"
                                    />
                                </div>
                                <span className="text-[8px] tracking-[0.4em] text-neutral-600 uppercase font-light">VIP Digital Key</span>
                            </div>



                            {/* Action Buttons */}
                            <div className="w-full space-y-4 px-4">
                                <span className="block text-[8px] tracking-[0.3em] text-center text-neutral-500 uppercase">💡 同步加入行事曆，提醒您重要展期：</span>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <a 
                                        href={googleCalendarUrl()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-3 bg-white/5 border border-white/10 hover:border-[#DFBA87] hover:text-[#DFBA87] text-center text-[9px] tracking-[0.2em] text-neutral-300 uppercase transition-all duration-300"
                                    >
                                        Google 日曆
                                    </a>
                                    <button 
                                        onClick={generateICS}
                                        className="py-3 bg-white/5 border border-white/10 hover:border-[#DFBA87] hover:text-[#DFBA87] text-center text-[9px] tracking-[0.2em] text-neutral-300 uppercase transition-all duration-300 cursor-pointer"
                                    >
                                        Apple / Outlook
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
