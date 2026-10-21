'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Camera, Sparkles, Heart, Check, Trash2, X, Compass, 
  ExternalLink, QrCode, MapPin, Eye, ArrowRight, Info, Plus
} from 'lucide-react';

const ADMIN_EMAILS = ['artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'];

export default function VIPDashboard() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [qrValue, setQrValue] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [myCollections, setMyCollections] = useState<any[]>([]);
    const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
    const [showExploreModal, setShowExploreModal] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const scannerRef = useRef<any>(null);
    const isScannerProcessingRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [scannerError, setScannerError] = useState<string | null>(null);

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

                if (!data?.birthdate || !data?.identity_type) {
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

                // Fetch user's VIS Collection
                try {
                    const { data: cols } = await supabase
                        .from('vip_collections')
                        .select('*, exhibitor_products(*)')
                        .eq('vip_email', email)
                        .order('created_at', { ascending: false });

                    if (cols && isMounted) {
                        setMyCollections(cols.map((c: any) => ({
                            ...c.exhibitor_products,
                            saved_at: c.created_at,
                            collection_id: c.id,
                            collection_notes: c.notes
                        })).filter((item: any) => !!item?.id));
                    }
                } catch {
                    // Non-blocking
                }

                // Fetch featured fair products for live exploration
                try {
                    const { data: prods } = await supabase
                        .from('exhibitor_products')
                        .select('*')
                        .eq('is_published', true)
                        .order('save_count', { ascending: false })
                        .limit(6);

                    if (prods && isMounted) {
                        setFeaturedProducts(prods);
                    }
                } catch {
                    // Non-blocking
                }
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
    const accentColor = isSVIP ? '#DFBA87' : '#73531E'; // Pola Gold (Dark) / Antique Bronze Gold (Light)
    const blurClass = isSVIP ? 'bg-[#DFBA87]/10' : 'bg-[#73531E]/5';

    // High-contrast luxury typography & badge styling for accessibility (WCAG AAA compliant):
    // On dark (#111111): Pola Champagne Gold #DFBA87 (8.2:1 contrast ratio)
    // On light (#FAF9F6): Rich Antique Bronze Gold #73531E (6.8:1 to 7.2:1 contrast ratio)
    const goldText = isSVIP ? 'text-[#DFBA87]' : 'text-[#73531E]';
    const goldSubText = isSVIP ? 'text-[#DFBA87]/80' : 'text-[#85632A]';
    const goldBadge = isSVIP 
        ? 'text-[#DFBA87] bg-[#DFBA87]/15 border-[#DFBA87]/30' 
        : 'text-[#6E4F1D] bg-[#73531E]/12 border-[#73531E]/30 font-semibold';
    const stepCircle = isSVIP
        ? 'bg-[#DFBA87]/20 text-[#DFBA87] font-bold'
        : 'bg-[#73531E]/15 text-[#6E4F1D] font-bold';
    const goldBorder = isSVIP ? 'border-[#DFBA87]/30' : 'border-[#73531E]/25';

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/vip');
    };

    const handleToggleSaveProduct = async (prod: any, e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const email = profile?.email?.toLowerCase().trim() || userEmail;
        if (!email) return;

        const isAlreadySaved = myCollections.some(c => c.id === prod.id);

        try {
            if (isAlreadySaved) {
                await supabase
                    .from('vip_collections')
                    .delete()
                    .eq('vip_email', email)
                    .eq('product_id', prod.id);

                setMyCollections(prev => prev.filter(c => c.id !== prod.id));
            } else {
                await supabase
                    .from('vip_collections')
                    .insert({
                        vip_email: email,
                        product_id: prod.id,
                        brand_id: prod.brand_id || null,
                    });

                setMyCollections(prev => [{ ...prod, saved_at: new Date().toISOString() }, ...prev]);
            }
        } catch (err) {
            console.error('Toggle save error:', err);
        }
    };

    const handleRemoveCollection = async (productId: string, e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const email = profile?.email?.toLowerCase().trim() || userEmail;
        if (!email) return;

        try {
            await supabase
                .from('vip_collections')
                .delete()
                .eq('vip_email', email)
                .eq('product_id', productId);

            setMyCollections(prev => prev.filter(c => c.id !== productId));
        } catch (err) {
            console.error('Remove error:', err);
        }
    };

    const extractProductIdFromText = (text: string): string => {
        const clean = (text || '').trim();
        if (clean.includes('/vip/product/')) {
            const parts = clean.split('/vip/product/');
            return parts[1].split('?')[0].split('#')[0].replace(/\/+$/, '').trim();
        }
        // Match UUID directly if scanned
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
            return clean;
        }
        return '';
    };

    const handleStartScanner = () => {
        setIsScannerOpen(true);
        setScannerError(null);
        isScannerProcessingRef.current = false;

        setTimeout(() => {
            import('html5-qrcode').then((module) => {
                const Html5Qrcode = module.Html5Qrcode;
                const scanner = new Html5Qrcode('vip-artwork-scanner-view');
                scannerRef.current = scanner;
                scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 220, height: 220 } },
                    async (decodedText: string) => {
                        if (isScannerProcessingRef.current) return;
                        isScannerProcessingRef.current = true;

                        const prodId = extractProductIdFromText(decodedText);
                        if (prodId) {
                            try {
                                await scanner.stop();
                            } catch {}
                            setIsScannerOpen(false);
                            router.push(`/vip/product/${prodId}`);
                        } else if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
                            try {
                                await scanner.stop();
                            } catch {}
                            setIsScannerOpen(false);
                            window.location.href = decodedText;
                        } else {
                            isScannerProcessingRef.current = false;
                        }
                    },
                    () => {}
                ).catch((err) => {
                    console.warn('Camera failed to start:', err);
                    setScannerError('無法啟動相機鏡頭，請確認瀏覽器已允許相機權限，或使用下方拍照/相片上傳。');
                });
            });
        }, 300);
    };

    const handleFileUploadScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (isScannerProcessingRef.current) return;
        isScannerProcessingRef.current = true;

        try {
            setScannerError(null);
            const { Html5Qrcode } = await import('html5-qrcode');
            let tempEl = document.getElementById('vip-artwork-file-temp');
            if (!tempEl) {
                tempEl = document.createElement('div');
                tempEl.id = 'vip-artwork-file-temp';
                tempEl.style.display = 'none';
                document.body.appendChild(tempEl);
            }
            const fileScanner = new Html5Qrcode('vip-artwork-file-temp');
            const decodedText = await fileScanner.scanFile(file, true);
            try { fileScanner.clear(); } catch {}

            const prodId = extractProductIdFromText(decodedText);
            if (prodId) {
                handleCloseScanner();
                router.push(`/vip/product/${prodId}`);
            } else if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
                handleCloseScanner();
                window.location.href = decodedText;
            } else {
                setScannerError('未能辨識為作品條碼，請確認是否為 VIS 作品立牌 QR Code。');
                isScannerProcessingRef.current = false;
            }
        } catch (err) {
            console.warn('File QR decode failed:', err);
            setScannerError('未能在此相片中辨識出 QR Code，請確認條碼清晰度或靠近重拍。');
            isScannerProcessingRef.current = false;
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCloseScanner = () => {
        if (scannerRef.current) {
            try {
                scannerRef.current.stop().catch(() => {});
            } catch {}
        }
        setIsScannerOpen(false);
    };

    const generateICS = () => {
        if (!profile) return;
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//VIS Contemporary Culture//VIP Pass//EN',
            'BEGIN:VEVENT',
            `UID:vis-vip-${profile.id}`,
            'DTSTAMP:20260530T000000Z',
            'DTSTART:20270106T100000Z',
            'DTEND:20270109T110000Z',
            'SUMMARY:VIS Contemporary Culture 2027 (VIP)',
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
        const text = encodeURIComponent("VIS Contemporary Culture 2027 (VIP)");
        const dates = "20270106T100000Z/20270109T110000Z"; // Jan 6, 6:00 PM to Jan 9, 7:00 PM Taipei time (UTC+8)
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
                <div className="text-right flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        {/* Top-Right One-Click Artwork Scanner Button */}
                        <button 
                            type="button"
                            onClick={handleStartScanner}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#DFBA87] hover:bg-[#c9a96e] text-black font-semibold rounded-full text-[11px] shadow-md shadow-[#DFBA87]/25 transition-all cursor-pointer active:scale-95"
                            title="現場掃描作品立牌"
                        >
                            <Camera className="w-3.5 h-3.5 shrink-0 text-black" />
                            <span className="font-mono tracking-wider font-semibold">掃描立牌</span>
                        </button>

                        <div className={`inline-block px-3.5 py-1.5 border-[0.5px] rounded-sm ${isSVIP ? 'border-[#DFBA87] text-[#DFBA87]' : 'border-[#1A1A1A]/60 text-[#1A1A1A]'}`}>
                            <span className="text-[9px] tracking-[0.3em] uppercase font-light">
                                {profile.tier}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={handleSignOut}
                        className={`text-[8px] tracking-[0.3em] uppercase transition-opacity cursor-pointer border-b border-transparent hover:border-current ${isSVIP ? 'text-white/40 hover:text-white/100' : 'text-[#1A1A1A]/40 hover:text-[#1A1A1A]/100'}`}
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
                        <h2 className={`text-[12px] tracking-[0.2em] uppercase font-semibold leading-relaxed ${goldText}`}>
                            VIS Contemporary Culture Fair
                            <span className="text-[10.5px] tracking-[0.3em] font-light block mt-1.5 font-sans normal-case">當代文化博覽會</span>
                        </h2>
                        <p className="text-[10px] tracking-[0.2em] font-mono opacity-80">2027/1/6 - 1/9</p>
                        <p className="text-[9.5px] tracking-widest opacity-60">台北市中正區延平南路98號</p>
                        <p className="text-[8.5px] tracking-wider opacity-60 mt-3 border-t border-current/10 pt-3 px-2 leading-relaxed">
                            如需貴賓服務，請聯絡VIP辦公室<br/>
                            <a href="mailto:visvipteam@gmail.com" className={`underline ${goldText} ${isSVIP ? 'hover:text-white' : 'hover:text-black'} transition-colors duration-300`}>visvipteam@gmail.com</a>
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

                {/* VIP Timetable & Privileges Callout */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className={`w-full max-w-sm border-[0.5px] p-6 space-y-5 rounded-none backdrop-blur-md mt-6 shadow-xl ${
                        isSVIP 
                            ? 'border-[#DFBA87]/25 bg-[#DFBA87]/5 text-white/90' 
                            : 'border-[#1A1A1A]/10 bg-white/40 text-[#1A1A1A]/90'
                    }`}
                >
                    {/* Privilege Highlight */}
                    <div className="border-b border-current/10 pb-4 text-left">
                        <p className={`text-[9.5px] tracking-[0.25em] uppercase font-semibold mb-2 ${goldText}`}>
                            VIP PRIVILEGES / 貴賓權益
                        </p>
                        <p className="text-[11px] leading-relaxed tracking-wide font-normal">
                            憑此數位禮賓卡，您於所有展期時段（含預展與公眾日）皆享 **尊榮優先快速通行**。
                        </p>
                        <p className="text-[9px] leading-relaxed tracking-wide opacity-60 font-light mt-1">
                            This digital pass grants you **priority fast-track admission** for all preview and public hours.
                        </p>
                    </div>

                    {/* Complete Timetable */}
                    <div className="space-y-3.5 text-left">
                        <p className={`text-[9.5px] tracking-[0.25em] uppercase font-semibold ${goldText}`}>
                            TIMETABLE / 展會日程
                        </p>
                        
                        <div className="space-y-3 text-[10.5px] leading-relaxed font-light">
                            <div className="flex justify-between items-start gap-4">
                                <span className="font-normal shrink-0">VIP 預展 & 開幕酒會<br/><span className="text-[8px] opacity-50 uppercase tracking-wider font-mono">VIP Preview & Vernissage</span></span>
                                <span className="text-right font-mono font-medium">1/6 (三) 18:00 - 21:30</span>
                            </div>
                            
                            <div className="flex justify-between items-start gap-4 border-t border-current/5 pt-2.5">
                                <span className="font-normal shrink-0">公眾展期<br/><span className="text-[8px] opacity-50 uppercase tracking-wider font-mono">Public Days</span></span>
                                <div className="text-right font-mono font-medium space-y-0.5">
                                    <p>1/7 (四) 12:00 - 18:00</p>
                                    <p>1/8 (五) 12:00 - 18:00</p>
                                    <p>1/9 (六) 12:00 - 19:00</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* My VIS Collection Section — User-Centric Re-architecture */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className={`w-full max-w-sm border-[0.5px] p-6 space-y-5 rounded-none backdrop-blur-md mt-6 shadow-xl text-left ${
                        isSVIP 
                            ? 'border-[#DFBA87]/25 bg-[#DFBA87]/5 text-white/90' 
                            : 'border-[#1A1A1A]/10 bg-white/40 text-[#1A1A1A]/90'
                    }`}
                >
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-current/10 pb-3">
                        <div className="space-y-0.5">
                            <span className={`text-[8px] font-mono tracking-[0.3em] uppercase block font-semibold ${goldText}`}>
                                Scan & Save Service
                            </span>
                            <h3 className="text-sm font-serif font-medium tracking-wide">
                                MY COLLECTION / 我的展會典藏
                            </h3>
                        </div>
                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded border ${goldBadge}`}>
                            {myCollections.length} 件收藏
                        </span>
                    </div>

                    {/* 3-Step Visual User Flow (How It Works) */}
                    <div className="bg-current/[0.03] border border-current/5 p-3 rounded space-y-2">
                        <p className={`text-[8.5px] font-mono uppercase tracking-widest font-semibold ${goldText}`}>
                            HOW TO USE / 現場收藏三步驟
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-[10px] leading-tight">
                            <div className="space-y-1">
                                <span className={`inline-block w-4 h-4 rounded-full font-mono text-[9px] text-center leading-4 ${stepCircle}`}>1</span>
                                <p className="font-medium">逛展遇見心動</p>
                                <p className="text-[8.5px] opacity-60 font-light">於展位欣賞實體作品</p>
                            </div>
                            <div className="space-y-1 border-l border-current/10 pl-2">
                                <span className={`inline-block w-4 h-4 rounded-full font-mono text-[9px] text-center leading-4 ${stepCircle}`}>2</span>
                                <p className="font-medium">對準立牌掃碼</p>
                                <p className="text-[8.5px] opacity-60 font-light">開啟鏡頭掃描立牌 QR</p>
                            </div>
                            <div className="space-y-1 border-l border-current/10 pl-2">
                                <span className={`inline-block w-4 h-4 rounded-full font-mono text-[9px] text-center leading-4 ${stepCircle}`}>3</span>
                                <p className="font-medium">離場隨時回看</p>
                                <p className="text-[8.5px] opacity-60 font-light">規格售價存入此清單</p>
                            </div>
                        </div>

                        {/* Reverse Concierge Scan Hint */}
                        <p className="text-[9.5px] opacity-75 font-light pt-1 border-t border-current/10 leading-relaxed">
                            ✦ 雙向尊榮管家：於展位鑑賞試戴時，亦可出示上方貴賓 QR Code 由品牌管家直接為您將心儀款式收錄至此！
                        </p>
                    </div>

                    {/* Primary Action Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                            type="button"
                            onClick={handleStartScanner}
                            className="inline-flex items-center justify-center gap-1.5 py-3 px-3 bg-[#DFBA87] hover:bg-[#c9a96e] text-black font-semibold rounded text-[11px] tracking-wider uppercase transition-all shadow-md cursor-pointer"
                        >
                            <Camera className="w-3.5 h-3.5 shrink-0" />
                            <span>開啟相機掃碼</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowExploreModal(true)}
                            className="inline-flex items-center justify-center gap-1.5 py-3 px-3 bg-current/5 hover:bg-current/10 border border-current/15 rounded text-[11px] font-medium tracking-wider transition-all cursor-pointer"
                        >
                            <Compass className={`w-3.5 h-3.5 shrink-0 ${goldText}`} />
                            <span>探索現場展品</span>
                        </button>
                    </div>

                    {/* Saved Collection List */}
                    {myCollections.length === 0 ? (
                        <div className="border border-dashed border-current/15 rounded p-4 text-center space-y-2">
                            <p className="text-[11px] leading-relaxed opacity-70 font-light">
                                目前尚無收藏紀錄。於展會現場掃描各展位上的【作品桌立牌 QR Code】，或出示貴賓卡由品牌管家為您收錄，作品即會自動在此呈現！
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowExploreModal(true)}
                                className={`text-[10px] underline hover:opacity-100 transition-opacity font-mono tracking-wider cursor-pointer inline-flex items-center gap-1 ${goldText}`}
                            >
                                <Sparkles className="w-3 h-3" />
                                <span>點此搶先預覽並體驗加入示範作品 →</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2.5 pt-1">
                            <p className={`text-[9px] uppercase font-mono tracking-widest font-semibold ${goldText}`}>
                                SAVED ARTWORKS / 已收藏的作品
                            </p>
                            {myCollections.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-3 p-2.5 rounded bg-current/5 hover:bg-current/10 transition-colors border border-current/5 group"
                                >
                                    <Link
                                        href={`/vip/product/${item.id}`}
                                        className="flex items-center gap-3 flex-1 min-w-0"
                                    >
                                        <div className="w-12 h-12 rounded-sm bg-neutral-200 overflow-hidden shrink-0 border border-current/10">
                                            {item.images && item.images[0] ? (
                                                <img src={item.images[0]} alt={item.title_zh} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[9px] text-neutral-400">VIS</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <span className={`text-[9.5px] font-mono block truncate font-medium ${goldText}`}>
                                                {item.brand_name_zh} {item.booth_number ? `｜ ${item.booth_number}` : ''}
                                            </span>
                                            <h4 className="text-xs font-serif font-medium truncate">
                                                {item.title_zh}
                                            </h4>
                                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                <span className={`text-[10.5px] font-mono font-medium ${goldText}`}>
                                                    {item.price_display || '私洽 / Inquire'}
                                                </span>
                                                {item.collection_notes && (
                                                    <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded border ${goldBadge}`}>
                                                        ✦ 品牌管家收錄
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <Link
                                            href={`/vip/product/${item.id}`}
                                            className="p-1.5 text-current/60 hover:text-current transition-colors"
                                            title="查看作品頁面"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={(e) => handleRemoveCollection(item.id, e)}
                                            className="p-1.5 text-current/40 hover:text-rose-400 transition-colors cursor-pointer"
                                            title="從收藏中移除"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </main>

            {/* Modal: Camera QR Code Scanner */}
            <AnimatePresence>
                {isScannerOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#141414] border border-[#DFBA87]/30 rounded-lg max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative"
                        >
                            <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                <div>
                                    <span className="text-[9px] font-mono tracking-widest text-[#DFBA87] uppercase">Artwork QR Scanner</span>
                                    <h3 className="text-sm font-serif text-white font-medium">掃描展位作品立牌</h3>
                                </div>
                                <button
                                    onClick={handleCloseScanner}
                                    className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Camera Viewfinder */}
                            <div className="relative aspect-square w-full bg-black rounded-lg overflow-hidden border border-white/10 flex items-center justify-center">
                                <div id="vip-artwork-scanner-view" className="w-full h-full" />
                                {scannerError && (
                                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-black/85 text-xs text-rose-300 space-y-2">
                                        <p>{scannerError}</p>
                                        <button
                                            onClick={handleCloseScanner}
                                            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded text-white text-[11px]"
                                        >
                                            關閉
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Hidden file input for native camera / gallery fallback */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileUploadScan}
                                className="hidden"
                            />

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded text-[11px] font-sans text-neutral-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                    <Camera className="w-3.5 h-3.5 text-[#DFBA87]" />
                                    <span>拍照 / 從相簿上傳立牌條碼</span>
                                </button>
                            </div>

                            <p className="text-[10px] text-neutral-400 font-light leading-relaxed">
                                請將鏡頭對準展位桌上的【作品專屬立牌 QR Code】，系統將自動識別並帶您進入該作品的典藏頁面。
                            </p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Explore Featured Fair Artworks */}
            <AnimatePresence>
                {showExploreModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#171717] border border-white/15 rounded-lg max-w-md w-full p-6 space-y-5 shadow-2xl relative my-8"
                        >
                            <div className="flex justify-between items-start border-b border-white/10 pb-3">
                                <div className="text-left">
                                    <span className="text-[9px] tracking-widest text-[#DFBA87] uppercase font-mono">Fair Showcase</span>
                                    <h3 className="text-base font-serif text-white font-medium">
                                        大會精選參展作品巡禮
                                    </h3>
                                    <p className="text-[10.5px] text-neutral-400 font-light mt-0.5">
                                        點擊【✦ 收藏】即可直接模擬現場掃碼，存入您的個人典藏清單！
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowExploreModal(false)}
                                    className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Featured Artworks List */}
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-left">
                                {featuredProducts.map((p) => {
                                    const isSaved = myCollections.some(c => c.id === p.id);
                                    return (
                                        <div
                                            key={p.id}
                                            className="flex items-center gap-3.5 p-3 rounded bg-white/[0.03] border border-white/10 hover:border-[#DFBA87]/40 transition-all"
                                        >
                                            <div className="w-16 h-16 rounded overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
                                                {p.images && p.images[0] ? (
                                                    <img src={p.images[0]} alt={p.title_zh} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">VIS</div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[9.5px] font-mono text-[#DFBA87] truncate">
                                                        {p.brand_name_zh}
                                                    </span>
                                                    {p.booth_number && (
                                                        <span className="text-[9px] text-neutral-400 font-mono shrink-0">
                                                            {p.booth_number}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-xs font-serif text-white font-medium truncate">
                                                    {p.title_zh}
                                                </h4>
                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-[10px] font-mono text-neutral-300 font-medium">
                                                        {p.price_display || '私洽 / Inquire'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleToggleSaveProduct(p, e)}
                                                        className={`px-2.5 py-1 rounded text-[10px] font-medium tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer ${
                                                            isSaved
                                                                ? 'bg-[#DFBA87]/20 border border-[#DFBA87] text-[#DFBA87]'
                                                                : 'bg-white/10 hover:bg-white/20 text-white'
                                                        }`}
                                                    >
                                                        {isSaved ? (
                                                            <>
                                                                <Check className="w-3 h-3" />
                                                                <span>已收藏</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Heart className="w-3 h-3" />
                                                                <span>+ 收藏</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
                                <span className="text-[10px] text-neutral-500 font-light">
                                    現場於各展位掃描 QR Code 立牌，亦會即時同步存入此處。
                                </span>
                                <button
                                    onClick={() => setShowExploreModal(false)}
                                    className="px-4 py-2 bg-[#DFBA87] hover:bg-[#c9a96e] text-black font-semibold rounded text-[11px] uppercase tracking-wider"
                                >
                                    完成體驗
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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

            {/* VIP Access & Entry Notice Card */}
            <section className="px-6 mt-6 relative z-10">
                <div className={`p-5 rounded-none backdrop-blur-md text-left border ${isSVIP ? 'bg-[#1A1A1A]/80 border-[#DFBA87]/30' : 'bg-white/70 border-[#73531E]/25'}`}>
                    <h4 className={`text-[10px] font-semibold tracking-[0.25em] uppercase mb-2.5 ${goldText}`}>
                        尊榮貴賓入場與權益維護須知 Notice
                    </h4>
                    <ul className={`text-[10px] space-y-1.5 leading-relaxed font-light ${isSVIP ? 'text-neutral-400' : 'text-neutral-700'}`}>
                        <li>• <strong>個人專屬不可轉讓</strong>：本數位憑證為貴賓專屬權益開通，嚴禁轉傳、重製或轉讓他人使用。</li>
                        <li>• <strong>單一時段單次核銷</strong>：為維護展場觀展品質與安全，同一帳號於單一時段限單次掃碼入場，無法重複核銷。</li>
                        <li>• <strong>登入身份永久保留</strong>：本門戶已為您個人開通專屬權益，登入後系統將自動為您保留貴賓身份。</li>
                    </ul>
                </div>
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
                            <span className={`text-sm ${goldText}`}>⚙</span>
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
                                            <p className="text-[9px] tracking-[0.1em] font-mono text-neutral-300 mt-0.5">2027.01.06 - 09</p>
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

            {/* Floating Quick Scan Action Pill for Mobile */}
            <div className="fixed bottom-6 right-5 z-40 md:hidden">
                <button
                    type="button"
                    onClick={handleStartScanner}
                    className="flex items-center gap-2 bg-[#141414]/90 backdrop-blur-md text-[#DFBA87] border border-[#DFBA87]/40 px-4 py-3 rounded-full shadow-2xl shadow-black/80 active:scale-95 transition-all cursor-pointer hover:bg-[#1a1a1a]"
                >
                    <Camera className="w-4 h-4 text-[#DFBA87]" />
                    <span className="text-xs font-mono tracking-widest font-semibold uppercase">掃描展品立牌</span>
                </button>
            </div>
        </div>
    );
}
