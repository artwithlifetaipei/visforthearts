'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Camera, Sparkles, Heart, Check, Trash2, X, Compass, Eye, MapPin,
  Lock, LogOut, CalendarPlus, Crown, Gem, Mail, ShieldCheck, Settings
} from 'lucide-react';

const ADMIN_EMAILS = ['artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'];

const IDENTITY_OPTIONS = [
    '資深收藏家',
    '新興收藏家',
    '品牌創辦人',
    '企業主／企業高階決策者',
    '投資人／家族辦公室',
    '建築相關產業 / 室內／空間設計師',
    '媒體／編輯',
    '內容創作者／意見領袖',
    '藝術與設計愛好者',
    '創意工作者 / 策展人／藝術顧問',
    '通路經營者／買手',
    '其他'
];

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
    const [showIdentityModal, setShowIdentityModal] = useState(false);
    const [selectedIdentity, setSelectedIdentity] = useState('');
    const [otherIdentityText, setOtherIdentityText] = useState('');
    const [savingIdentity, setSavingIdentity] = useState(false);
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
            <div className="min-h-screen bg-[#0A0908] flex flex-col items-center justify-center gap-5">
                <img src="/vis_logo_white.png" alt="VIS" className="h-12 w-12 object-contain opacity-80 animate-pulse" />
                <p className="text-[11px] font-mono tracking-[0.35em] uppercase text-[#DFBA87]/80">正在驗證貴賓身份 · Verifying</p>
            </div>
        );
    }

    const isSVIP = profile.tier === 'SVIP';
    const displayName = profile.first_name || profile.email.split('@')[0];
    const memberNo = `VIS-${String(profile.id || '').replace(/-/g, '').slice(0, 6).toUpperCase()}`;

    // ─── Tier Identity System ───────────────────────────────────────────────
    // SVIP → Champagne Gold (Opening Night honoree)
    // VIP  → Pearl Platinum (Fair-days priority guest)
    // Both sit on the same dark architectural canvas as「年度文化命題」.
    const tier = isSVIP
        ? {
            code: 'SVIP',
            zh: '榮譽貴賓',
            en: 'Honorary Guest',
            passZh: '開幕晚會暨全展期通行證',
            passEn: 'Opening Night & All-Access Pass',
            validity: '2027.01.06 — 01.09',
            accent: '#DFBA87',
            accentSoft: 'rgba(223,186,135,0.12)',
            accentLine: 'rgba(223,186,135,0.45)',
            glow: 'rgba(223,186,135,0.20)',
            gradient: 'linear-gradient(135deg, #F7E7C8 0%, #DFBA87 35%, #A87F45 68%, #EBD2A6 100%)',
        }
        : {
            code: 'VIP',
            zh: '展期貴賓',
            en: 'Distinguished Guest',
            passZh: '展期優先通行證',
            passEn: 'Fair Days Priority Pass',
            validity: '2027.01.07 — 01.09',
            accent: '#DAD4CA',
            accentSoft: 'rgba(218,212,202,0.10)',
            accentLine: 'rgba(218,212,202,0.40)',
            glow: 'rgba(218,212,202,0.14)',
            gradient: 'linear-gradient(135deg, #FFFFFF 0%, #DAD4CA 38%, #8F887D 70%, #EFEBE4 100%)',
        };
    const TierIcon = isSVIP ? Crown : Gem;

    const privileges = [
        { zh: '1/6 尊榮預展暨開幕晚會', en: 'Vernissage & Opening Night', granted: isSVIP },
        { zh: '1/7 – 1/9 展期優先快速通行', en: 'Priority Fast-Track Entry', granted: true },
        { zh: '中山堂貴賓專屬櫃檯核驗', en: 'Dedicated VIP Reception', granted: true },
        { zh: '現場作品典藏・品牌管家服務', en: 'Scan & Save Concierge', granted: true },
    ];

    const sessions = [
        { date: '1/6', week: '三', time: '18:00 – 21:00', zh: 'VIP 預展暨開幕晚會', en: 'Vernissage & Opening Night', granted: isSVIP },
        { date: '1/7', week: '四', time: '12:00 – 18:00', zh: '公眾展期', en: 'Fair Day', granted: true },
        { date: '1/8', week: '五', time: '12:00 – 18:00', zh: '公眾展期', en: 'Fair Day', granted: true },
        { date: '1/9', week: '六', time: '12:00 – 19:00', zh: '公眾展期・閉幕日', en: 'Closing Day', granted: true },
    ];

    const glassCard = 'bg-black/55 backdrop-blur-2xl border border-white/12 rounded-3xl shadow-2xl shadow-black/70';
    const eyebrow = 'text-[11px] font-mono tracking-[0.28em] uppercase font-semibold';

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/vip');
    };

    const handleOpenIdentityModal = () => {
        const current = profile?.identity_type || '';
        if (IDENTITY_OPTIONS.includes(current)) {
            setSelectedIdentity(current);
            setOtherIdentityText('');
        } else if (current) {
            setSelectedIdentity('其他');
            setOtherIdentityText(current);
        } else {
            setSelectedIdentity(IDENTITY_OPTIONS[0]);
            setOtherIdentityText('');
        }
        setShowIdentityModal(true);
    };

    const handleSaveIdentity = async () => {
        if (!profile || !selectedIdentity) return;
        const finalIdentity = selectedIdentity === '其他' ? otherIdentityText.trim() : selectedIdentity;
        if (selectedIdentity === '其他' && !finalIdentity) return;

        setSavingIdentity(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ identity_type: finalIdentity })
                .eq('id', profile.id);

            if (!error) {
                setProfile((prev: any) => ({ ...prev, identity_type: finalIdentity }));
                setShowIdentityModal(false);
            }
        } catch (err) {
            console.error('Error updating identity:', err);
        } finally {
            setSavingIdentity(false);
        }
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
        <div className="min-h-screen bg-[#0A0908] text-[#F3EFEA] font-sans relative overflow-x-hidden pb-28 md:pb-16 selection:bg-[#DFBA87] selection:text-black">
            {/* Full-bleed architectural background — same canvas as 年度文化命題 */}
            <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
                <img src="/vip_lobby_bg.jpg" alt="" className="w-full h-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/60 to-black/92" />
                <div
                    className="absolute inset-0"
                    style={{ background: `radial-gradient(circle at 50% 18%, ${tier.glow} 0%, transparent 62%)` }}
                />
            </div>

            {/* Sticky Glass Navigation */}
            <header className="sticky top-0 z-30 border-b border-white/10 bg-black/45 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <img src="/vis_logo_white.png" alt="VIS Contemporary Culture" className="h-9 w-9 object-contain shrink-0" />
                        <div className="hidden sm:block leading-tight">
                            <p className="text-[11px] font-mono tracking-[0.3em] uppercase text-white/50">VIP Portal</p>
                            <p className="text-sm font-serif text-white/90 tracking-wide">貴賓專屬門戶</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Persistent tier chip — always visible identity */}
                        <div
                            className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border backdrop-blur-md"
                            style={{ borderColor: tier.accentLine, background: tier.accentSoft }}
                        >
                            <span
                                className="px-2 py-0.5 rounded-full text-[11px] font-bold tracking-[0.15em] text-[#14120E]"
                                style={{ background: tier.gradient }}
                            >
                                {tier.code}
                            </span>
                            <span className="text-xs font-medium tracking-wider" style={{ color: tier.accent }}>
                                {tier.zh}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleStartScanner}
                            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#DFBA87] hover:bg-[#cf9e5e] text-[#14120E] text-xs font-bold tracking-wider shadow-lg shadow-[#DFBA87]/20 transition-all duration-300 active:scale-95 cursor-pointer"
                        >
                            <Camera className="w-3.5 h-3.5" />
                            <span>掃描作品立牌</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSignOut}
                            title="登出 Sign Out"
                            className="p-2 rounded-full border border-white/15 bg-white/[0.05] hover:bg-white/[0.12] text-neutral-300 hover:text-white transition-all duration-300 cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="relative z-10 max-w-6xl mx-auto w-full px-5 sm:px-8 pt-10 sm:pt-16">

                {/* ── 01. Identity Hero ───────────────────────────────────── */}
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-12 sm:mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DFBA87]/12 border border-[#DFBA87]/35 text-[#DFBA87] text-[11px] sm:text-xs font-mono tracking-widest uppercase font-semibold backdrop-blur-md">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>VIS Contemporary Culture 2027</span>
                    </div>

                    <p className="mt-7 text-base sm:text-lg font-serif text-white/75 tracking-wide">
                        歡迎蒞臨，<span className="text-white font-medium">{displayName}</span>
                    </p>
                    <p className="mt-1 text-[11px] font-mono tracking-[0.35em] uppercase text-white/45">
                        Your Guest Status · 您的貴賓身份
                    </p>

                    <div className="mt-5 flex items-center justify-center gap-4 sm:gap-6">
                        <span className="hidden sm:block h-px w-16 md:w-24" style={{ background: `linear-gradient(90deg, transparent, ${tier.accentLine})` }} />
                        <h1
                            className="font-serif font-medium leading-none tracking-[0.14em] text-7xl sm:text-8xl md:text-[8.5rem] bg-clip-text text-transparent drop-shadow-[0_8px_30px_rgba(0,0,0,0.6)] pl-[0.14em]"
                            style={{ backgroundImage: tier.gradient }}
                        >
                            {tier.code}
                        </h1>
                        <span className="hidden sm:block h-px w-16 md:w-24" style={{ background: `linear-gradient(270deg, transparent, ${tier.accentLine})` }} />
                    </div>

                    {/* Dual Identity Pill Bar: Tier Pass + Personal Collector/Professional Identity */}
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                        <div
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-md text-xs"
                            style={{ borderColor: tier.accentLine, background: tier.accentSoft }}
                        >
                            <span className="font-mono uppercase tracking-wider text-white/60">通行禮遇</span>
                            <span className="w-1 h-1 rounded-full" style={{ background: tier.accent }} />
                            <span className="font-medium text-white">{tier.passZh}</span>
                        </div>

                        {profile.identity_type && (
                            <button
                                type="button"
                                onClick={handleOpenIdentityModal}
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] hover:border-[#DFBA87]/50 backdrop-blur-md text-xs transition-all duration-300 cursor-pointer group"
                                title="點擊檢視或變更您的個人身分別"
                            >
                                <span className="font-mono uppercase tracking-wider text-white/55">個人身分別</span>
                                <span className="w-1 h-1 rounded-full bg-[#DFBA87]" />
                                <span className="font-medium text-[#DFBA87]">{profile.identity_type}</span>
                                <span className="text-[11px] text-white/40 group-hover:text-white/80 underline underline-offset-2 ml-0.5 transition-colors">
                                    變更
                                </span>
                            </button>
                        )}
                    </div>

                    <div className="w-10 h-px mx-auto mt-5 opacity-70" style={{ background: tier.accent }} />
                    <p className="mt-4 text-sm sm:text-base text-neutral-300 font-light leading-relaxed max-w-xl mx-auto">
                        {isSVIP
                            ? '您已獲邀出席 1/6 尊榮預展暨開幕晚會，並享有全展期優先快速通行。'
                            : '您享有 1/7 – 1/9 公眾展期之優先快速通行與貴賓專屬服務。'}
                    </p>

                    {/* Privilege matrix — what this identity unlocks */}
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mx-auto text-left">
                        {privileges.map((p, i) => (
                            <motion.div
                                key={p.zh}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.25 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                                className={`flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md transition-colors duration-300 ${
                                    p.granted ? 'bg-white/[0.05] hover:bg-white/[0.08]' : 'bg-black/30 border-white/8'
                                }`}
                                style={p.granted ? { borderColor: tier.accentLine } : undefined}
                            >
                                <span
                                    className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${p.granted ? '' : 'bg-white/5 border border-white/15'}`}
                                    style={p.granted ? { background: tier.gradient } : undefined}
                                >
                                    {p.granted
                                        ? <Check className="w-3.5 h-3.5 text-[#14120E] stroke-[3]" />
                                        : <Lock className="w-3 h-3 text-neutral-500" />}
                                </span>
                                <div className="min-w-0">
                                    <p className={`text-sm font-medium leading-snug ${p.granted ? 'text-white' : 'text-neutral-500'}`}>{p.zh}</p>
                                    <p className={`text-[11px] mt-0.5 tracking-wide ${p.granted ? 'text-neutral-400' : 'text-neutral-600'}`}>
                                        {p.granted ? p.en : 'SVIP 特邀限定 · By Invitation'}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* ── 02. Credential + Timetable ─────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                    {/* Digital Credential Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className="lg:col-span-5 relative rounded-3xl overflow-hidden bg-[#0E0D0B]/80 backdrop-blur-2xl border w-full max-w-md mx-auto lg:max-w-none"
                        style={{ borderColor: tier.accentLine, boxShadow: `0 30px 80px rgba(0,0,0,0.75), 0 0 70px ${tier.glow}` }}
                    >
                        {/* Tier band */}
                        <div className="h-1.5 w-full" style={{ background: tier.gradient }} />
                        {/* Slow light sweep */}
                        <motion.div
                            aria-hidden
                            className="absolute inset-y-0 -left-1/2 w-1/2 pointer-events-none"
                            style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.06), transparent)' }}
                            animate={{ x: ['0%', '400%'] }}
                            transition={{ duration: 6, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                        />

                        <div className="relative p-7 sm:p-8 flex flex-col items-center">
                            <div className="w-full flex items-center justify-between">
                                <img src="/vis_logo_white.png" alt="VIS" className="h-10 w-10 object-contain opacity-95" />
                                <div className="text-right">
                                    <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-white/45">Admission</p>
                                    <p className="text-xs font-medium tracking-wider" style={{ color: tier.accent }}>{tier.passEn}</p>
                                </div>
                            </div>

                            <div className="w-full mt-6 text-center">
                                <span
                                    className="inline-block px-4 py-1 rounded-full text-sm font-bold tracking-[0.3em] text-[#14120E] pl-[calc(1rem+0.3em)]"
                                    style={{ background: tier.gradient }}
                                >
                                    {tier.code}
                                </span>
                                <p className="mt-3 text-2xl font-serif text-white tracking-wide truncate">{displayName}</p>
                                <p className="mt-1 text-sm text-neutral-300">{tier.zh} · {tier.passZh}</p>
                            </div>

                            <div className="mt-6 p-4 bg-white rounded-2xl shadow-xl shadow-black/50">
                                <QRCodeSVG value={qrValue} size={176} level="H" includeMargin={false} fgColor="#14120E" />
                            </div>

                            <p className="mt-4 text-sm text-white/85 text-center">請於中山堂貴賓專屬櫃檯出示此憑證</p>
                            <p className="mt-1 text-[11px] font-mono tracking-wider text-white/40 text-center">
                                動態憑證 · 每 30 秒自動更新 · {new Date().toLocaleTimeString([], { hour12: false })}
                            </p>

                            <div className="w-full mt-6 pt-5 border-t border-dashed border-white/12 space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-white/40">Member No.</p>
                                        <p className="mt-0.5 text-sm font-mono text-white/90 tracking-wider">{memberNo}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-white/40">Valid</p>
                                        <p className="mt-0.5 text-sm font-mono tracking-wider" style={{ color: tier.accent }}>{tier.validity}</p>
                                    </div>
                                </div>
                                {profile.identity_type && (
                                    <div className="pt-2.5 border-t border-white/8 flex items-center justify-between text-xs">
                                        <span className="font-mono tracking-[0.2em] uppercase text-white/40 text-[11px]">Identity · 身分別</span>
                                        <button
                                            type="button"
                                            onClick={handleOpenIdentityModal}
                                            className="font-medium text-white/90 hover:text-[#DFBA87] transition-colors cursor-pointer"
                                        >
                                            {profile.identity_type}
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsWalletOpen(true)}
                                className="mt-6 w-full py-3 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.10] text-sm text-neutral-200 hover:text-white tracking-wider flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] cursor-pointer"
                            >
                                <CalendarPlus className="w-4 h-4" style={{ color: tier.accent }} />
                                <span>加入行事曆 · Add to Calendar</span>
                            </button>
                        </div>
                    </motion.div>

                    {/* Personal Timetable */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className={`lg:col-span-7 ${glassCard} p-6 sm:p-8 flex flex-col`}
                    >
                        <div className="flex items-end justify-between gap-3 border-b border-white/10 pb-4">
                            <div>
                                <p className={eyebrow} style={{ color: tier.accent }}>Your Timetable</p>
                                <h3 className="mt-1 text-xl font-serif text-white tracking-wide">您的專屬入場日程</h3>
                            </div>
                            <span className="text-xs text-neutral-400 font-mono">2027 · 台北中山堂</span>
                        </div>

                        <ul className="mt-2 divide-y divide-white/8 flex-grow">
                            {sessions.map((s) => (
                                <li key={s.date} className={`py-4 flex items-center gap-4 ${s.granted ? '' : 'opacity-55'}`}>
                                    <div className="w-16 shrink-0 text-center">
                                        <p className="text-2xl font-serif text-white leading-none">{s.date}</p>
                                        <p className="mt-1 text-[11px] text-neutral-400 tracking-widest">週{s.week}</p>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm sm:text-base text-white font-medium">{s.zh}</p>
                                        <p className="text-xs text-neutral-400 font-mono mt-0.5">{s.time} · {s.en}</p>
                                    </div>
                                    {s.granted ? (
                                        <span
                                            className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold border"
                                            style={{ color: tier.accent, borderColor: tier.accentLine, background: tier.accentSoft }}
                                        >
                                            <Check className="w-3 h-3 stroke-[3]" />
                                            <span>{s.date === '1/6' ? '專屬入場' : '優先通行'}</span>
                                        </span>
                                    ) : (
                                        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] sm:text-xs text-neutral-400 border border-white/12 bg-white/[0.03]">
                                            <Lock className="w-3 h-3" />
                                            <span>SVIP 限定</span>
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>

                        <div className="mt-4 pt-5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-start gap-2.5">
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: tier.accent }} />
                                <div>
                                    <p className="text-white/90">台北中山堂・延平南路 98 號</p>
                                    <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">捷運西門站 5 號出口步行約 1 分鐘</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <Mail className="w-4 h-4 mt-0.5 shrink-0" style={{ color: tier.accent }} />
                                <div>
                                    <p className="text-white/90">VIP 貴賓辦公室</p>
                                    <a href="mailto:visvipteam@gmail.com" className="text-xs text-neutral-400 hover:text-white underline underline-offset-4 decoration-white/20 transition-colors duration-300">
                                        visvipteam@gmail.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* ── 03. My Collection ──────────────────────────────────── */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className={`mt-6 ${glassCard} p-6 sm:p-8`}
                >
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
                        <div>
                            <p className={eyebrow} style={{ color: tier.accent }}>Scan & Save Concierge</p>
                            <h3 className="mt-1 text-xl font-serif text-white tracking-wide">我的展會典藏 · My Collection</h3>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <span className="px-3 py-1 rounded-full text-xs font-mono border" style={{ color: tier.accent, borderColor: tier.accentLine, background: tier.accentSoft }}>
                                {myCollections.length} 件收藏
                            </span>
                            <button
                                type="button"
                                onClick={handleStartScanner}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#DFBA87] hover:bg-[#cf9e5e] text-[#14120E] text-xs font-bold tracking-wider transition-all duration-300 active:scale-95 cursor-pointer"
                            >
                                <Camera className="w-3.5 h-3.5" />
                                <span>開啟相機掃碼</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowExploreModal(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs text-neutral-200 tracking-wider transition-all duration-300 active:scale-95 cursor-pointer"
                            >
                                <Compass className="w-3.5 h-3.5" style={{ color: tier.accent }} />
                                <span>探索展品</span>
                            </button>
                        </div>
                    </div>

                    {/* How it works */}
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { n: '01', t: '逛展遇見心動', d: '於展位欣賞實體作品' },
                            { n: '02', t: '對準立牌掃碼', d: '開啟鏡頭掃描作品立牌 QR' },
                            { n: '03', t: '離場隨時回看', d: '規格與售價自動存入此清單' },
                        ].map((s) => (
                            <div key={s.n} className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                                <span className="text-lg font-serif leading-none" style={{ color: tier.accent }}>{s.n}</span>
                                <div>
                                    <p className="text-sm text-white font-medium">{s.t}</p>
                                    <p className="text-xs text-neutral-400 mt-0.5">{s.d}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-neutral-400 leading-relaxed">
                        ✦ 雙向尊榮管家：於展位鑑賞試戴時，亦可出示您的貴賓憑證 QR Code，由品牌管家直接為您將心儀作品收錄至此。
                    </p>

                    {myCollections.length === 0 ? (
                        <div className="mt-5 border border-dashed border-white/15 rounded-2xl p-6 text-center">
                            <p className="text-sm text-neutral-300 leading-relaxed">
                                目前尚無收藏紀錄。於展會現場掃描展位上的作品立牌，作品即會自動在此呈現。
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowExploreModal(true)}
                                className="mt-3 inline-flex items-center gap-1.5 text-xs underline underline-offset-4 hover:text-white transition-colors duration-300 cursor-pointer"
                                style={{ color: tier.accent }}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>搶先預覽並體驗收藏示範作品 →</span>
                            </button>
                        </div>
                    ) : (
                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {myCollections.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors duration-300 group"
                                >
                                    <Link href={`/vip/product/${item.id}`} className="flex items-center gap-3.5 flex-1 min-w-0">
                                        <div className="w-16 h-16 rounded-xl bg-neutral-900 overflow-hidden shrink-0 border border-white/10">
                                            {item.images && item.images[0] ? (
                                                <img src={item.images[0]} alt={item.title_zh} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">VIS</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-mono truncate" style={{ color: tier.accent }}>
                                                {item.brand_name_zh} {item.booth_number ? `｜ ${item.booth_number}` : ''}
                                            </p>
                                            <h4 className="text-sm font-serif text-white truncate">{item.title_zh}</h4>
                                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                <span className="text-xs font-mono text-neutral-300">{item.price_display || '私洽 / Inquire'}</span>
                                                {item.collection_notes && (
                                                    <span className="text-[11px] px-1.5 py-0.5 rounded border" style={{ color: tier.accent, borderColor: tier.accentLine }}>
                                                        ✦ 品牌管家收錄
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Link href={`/vip/product/${item.id}`} className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors duration-300" title="查看作品頁面">
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={(e) => handleRemoveCollection(item.id, e)}
                                            className="p-2 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-white/10 transition-colors duration-300 cursor-pointer"
                                            title="從收藏中移除"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.section>

                {/* ── 04. Curated Experiences ────────────────────────────── */}
                <section className="mt-6 grid grid-cols-2 gap-4">
                    {[
                        { href: '/vip/blind-box', img: '/vip_lobby_bg.jpg', tag: 'Curated', title: '品味預測迎賓禮', sub: 'Taste Prediction Gift' },
                        { href: '/vip/story', img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop', tag: 'Aesthetic', title: '你與哪位藝術家有所共感？', sub: 'Artist Resonance' },
                    ].map((c) => (
                        <motion.button
                            key={c.href}
                            whileHover={{ scale: 0.985 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => router.push(c.href)}
                            className="aspect-[4/5] sm:aspect-[16/9] p-5 sm:p-7 flex flex-col justify-between text-left rounded-3xl border border-white/12 relative overflow-hidden group shadow-2xl shadow-black/60 cursor-pointer"
                        >
                            <img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/25 to-black/85" />
                            <span className="relative z-10 text-[11px] font-mono tracking-[0.35em] uppercase font-semibold text-[#DFBA87]">{c.tag}</span>
                            <div className="relative z-10">
                                <h3 className="text-base sm:text-xl font-serif text-white tracking-wide leading-snug">{c.title}</h3>
                                <p className="mt-1 text-xs text-white/60 tracking-wider">{c.sub} →</p>
                            </div>
                        </motion.button>
                    ))}
                </section>

                {/* ── 05. Entry Notice ───────────────────────────────────── */}
                <section className={`mt-6 ${glassCard} p-6 sm:p-7`}>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" style={{ color: tier.accent }} />
                        <h4 className="text-sm font-semibold text-white tracking-wider">貴賓入場與權益維護須知</h4>
                    </div>
                    <ul className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
                        <li className="p-4 rounded-2xl bg-white/[0.03] border border-white/8"><strong className="text-white font-medium">個人專屬不可轉讓</strong><br />本數位憑證為貴賓個人專屬權益，嚴禁轉傳、重製或轉讓他人使用。</li>
                        <li className="p-4 rounded-2xl bg-white/[0.03] border border-white/8"><strong className="text-white font-medium">單一時段單次核銷</strong><br />為維護觀展品質與安全，同一帳號於單一時段限單次掃碼入場。</li>
                        <li className="p-4 rounded-2xl bg-white/[0.03] border border-white/8"><strong className="text-white font-medium">登入身份永久保留</strong><br />登入後系統將自動為您保留 {tier.code} 貴賓身份，無需重複驗證。</li>
                    </ul>
                </section>

                {/* Admin-only CRM link — visible only to admin accounts */}
                {ADMIN_EMAILS.includes(profile.email ?? '') && (
                    <motion.button
                        whileHover={{ scale: 0.995 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push('/vip/admin')}
                        className="mt-6 w-full py-4 px-6 flex items-center justify-between rounded-2xl border border-white/12 hover:border-[#DFBA87]/50 bg-black/40 backdrop-blur-md transition-all duration-500 group cursor-pointer"
                    >
                        <div className="flex items-center gap-3 text-left">
                            <Settings className="w-4 h-4 text-[#DFBA87]" />
                            <div>
                                <p className="text-xs tracking-[0.3em] uppercase font-medium text-white/85">CRM 後台管理</p>
                                <p className="text-[11px] tracking-wider mt-0.5 text-white/45">貴賓名單 / 行銷活動 / 入場掃描</p>
                            </div>
                        </div>
                        <span className="text-sm text-white/40 transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </motion.button>
                )}
            </main>

            {/* Modal: Camera QR Code Scanner */}
            <AnimatePresence>
                {isScannerOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[#141210] border border-[#DFBA87]/30 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative"
                        >
                            <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                <div className="text-left">
                                    <span className="text-[11px] font-mono tracking-widest text-[#DFBA87] uppercase">Artwork QR Scanner</span>
                                    <h3 className="text-base font-serif text-white font-medium">掃描展位作品立牌</h3>
                                </div>
                                <button onClick={handleCloseScanner} className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative aspect-square w-full bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
                                <div id="vip-artwork-scanner-view" className="w-full h-full" />
                                {scannerError && (
                                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-black/85 text-sm text-rose-300 space-y-3">
                                        <p>{scannerError}</p>
                                        <button onClick={handleCloseScanner} className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs">
                                            關閉
                                        </button>
                                    </div>
                                )}
                            </div>

                            <input type="file" ref={fileInputRef} accept="image/*" capture="environment" onChange={handleFileUploadScan} className="hidden" />

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3 px-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl text-xs text-neutral-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                            >
                                <Camera className="w-4 h-4 text-[#DFBA87]" />
                                <span>拍照 / 從相簿上傳立牌條碼</span>
                            </button>

                            <p className="text-xs text-neutral-400 font-light leading-relaxed">
                                請將鏡頭對準展位桌上的作品專屬立牌 QR Code，系統將自動帶您進入該作品的典藏頁面。
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
                            className="bg-[#141210] border border-white/15 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative my-8"
                        >
                            <div className="flex justify-between items-start border-b border-white/10 pb-3">
                                <div className="text-left">
                                    <span className="text-[11px] tracking-widest text-[#DFBA87] uppercase font-mono">Fair Showcase</span>
                                    <h3 className="text-lg font-serif text-white font-medium">大會精選參展作品巡禮</h3>
                                    <p className="text-xs text-neutral-400 font-light mt-0.5">點擊【收藏】即可模擬現場掃碼，存入您的個人典藏清單。</p>
                                </div>
                                <button onClick={() => setShowExploreModal(false)} className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 text-left">
                                {featuredProducts.map((p) => {
                                    const isSaved = myCollections.some(c => c.id === p.id);
                                    return (
                                        <div key={p.id} className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#DFBA87]/40 transition-all duration-300">
                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
                                                {p.images && p.images[0] ? (
                                                    <img src={p.images[0]} alt={p.title_zh} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">VIS</div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[11px] font-mono text-[#DFBA87] truncate">{p.brand_name_zh}</span>
                                                    {p.booth_number && <span className="text-[11px] text-neutral-400 font-mono shrink-0">{p.booth_number}</span>}
                                                </div>
                                                <h4 className="text-sm font-serif text-white font-medium truncate">{p.title_zh}</h4>
                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-xs font-mono text-neutral-300">{p.price_display || '私洽 / Inquire'}</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleToggleSaveProduct(p, e)}
                                                        className={`px-3 py-1 rounded-lg text-[11px] font-medium tracking-wider transition-all duration-300 flex items-center gap-1 cursor-pointer ${
                                                            isSaved ? 'bg-[#DFBA87]/20 border border-[#DFBA87] text-[#DFBA87]' : 'bg-white/10 hover:bg-white/20 text-white'
                                                        }`}
                                                    >
                                                        {isSaved ? (<><Check className="w-3 h-3" /><span>已收藏</span></>) : (<><Heart className="w-3 h-3" /><span>收藏</span></>)}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-3 border-t border-white/10 flex justify-between items-center gap-3">
                                <span className="text-[11px] text-neutral-500 font-light">現場掃描作品立牌亦會即時同步存入此處。</span>
                                <button onClick={() => setShowExploreModal(false)} className="px-4 py-2 bg-[#DFBA87] hover:bg-[#cf9e5e] text-[#14120E] font-bold rounded-xl text-xs tracking-wider shrink-0 cursor-pointer">
                                    完成體驗
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add to Calendar Modal */}
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
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-[#141210] border border-white/12 rounded-3xl text-white w-full max-w-md p-8 relative flex flex-col items-center"
                        >
                            <button onClick={() => setIsWalletOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xs tracking-[0.35em] text-[#DFBA87] uppercase mb-6 font-medium">加入行事曆 · Add to Calendar</h3>

                            <div className="w-full rounded-2xl bg-white/[0.04] border p-5 mb-6" style={{ borderColor: tier.accentLine }}>
                                <div className="flex items-center justify-between">
                                    <img src="/vis_logo_white.png" alt="VIS" className="h-8 w-8 object-contain" />
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-[0.2em] text-[#14120E]" style={{ background: tier.gradient }}>
                                        {tier.code}
                                    </span>
                                </div>
                                <p className="mt-4 text-lg font-serif">{displayName}</p>
                                <p className="text-xs text-neutral-400">{tier.zh} · {tier.passZh}</p>
                                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <p className="text-[11px] tracking-[0.25em] uppercase text-neutral-500">Event</p>
                                        <p className="text-neutral-200 mt-0.5">VIS Contemporary Culture</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] tracking-[0.25em] uppercase text-neutral-500">Valid</p>
                                        <p className="font-mono mt-0.5" style={{ color: tier.accent }}>{tier.validity}</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-neutral-400">台北中山堂・延平南路 98 號</p>
                            </div>

                            <div className="w-full grid grid-cols-2 gap-3">
                                <a
                                    href={googleCalendarUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-3 rounded-xl bg-white/5 border border-white/12 hover:border-[#DFBA87] hover:text-[#DFBA87] text-center text-xs tracking-wider text-neutral-200 transition-all duration-300"
                                >
                                    Google 日曆
                                </a>
                                <button
                                    onClick={generateICS}
                                    className="py-3 rounded-xl bg-white/5 border border-white/12 hover:border-[#DFBA87] hover:text-[#DFBA87] text-center text-xs tracking-wider text-neutral-200 transition-all duration-300 cursor-pointer"
                                >
                                    Apple / Outlook
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Personal Identity Switcher Modal */}
            <AnimatePresence>
                {showIdentityModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-4 overflow-y-auto"
                    >
                        <motion.div
                            initial={{ scale: 0.96, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.96, y: 20, opacity: 0 }}
                            className="bg-[#141210] border border-[#DFBA87]/40 rounded-3xl text-white w-full max-w-lg p-6 sm:p-8 relative shadow-2xl my-8"
                        >
                            <button
                                type="button"
                                onClick={() => setShowIdentityModal(false)}
                                className="absolute top-5 right-5 p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="space-y-1.5 pr-8">
                                <span className="text-[11px] font-mono tracking-[0.28em] uppercase text-[#DFBA87] font-semibold">
                                    Personal Identity · 貴賓個人身分別
                                </span>
                                <h3 className="text-xl font-serif text-white tracking-wide">
                                    檢視或變更您的個人身分別
                                </h3>
                                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                                    您的通行禮遇等級為 <strong style={{ color: tier.accent }}>{tier.code} {tier.zh}</strong>。下方為您的個人收藏與專業身分別設定，讓 VIS 為您提供更契合的策展體驗與交流媒合。
                                </p>
                            </div>

                            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                                {IDENTITY_OPTIONS.map((opt) => {
                                    const isSelected = selectedIdentity === opt;
                                    return (
                                        <div
                                            key={opt}
                                            onClick={() => setSelectedIdentity(opt)}
                                            className={`p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between gap-2.5 ${
                                                isSelected
                                                    ? 'bg-gradient-to-r from-[#DFBA87]/20 via-[#DFBA87]/10 to-white/[0.04] border-[#DFBA87] text-white shadow-md shadow-[#DFBA87]/10'
                                                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/12 text-neutral-300'
                                            }`}
                                        >
                                            <span className="text-xs sm:text-sm font-medium leading-snug">{opt}</span>
                                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                isSelected ? 'border-[#DFBA87] bg-[#DFBA87]' : 'border-white/30 bg-black/40'
                                            }`}>
                                                {isSelected && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedIdentity === '其他' && (
                                <div className="mt-4">
                                    <input
                                        type="text"
                                        value={otherIdentityText}
                                        onChange={(e) => setOtherIdentityText(e.target.value)}
                                        placeholder="請輸入您的身分別"
                                        className="w-full bg-white/[0.06] border border-white/20 focus:border-[#DFBA87] rounded-xl px-4 py-3 text-sm text-white placeholder-white/35 focus:outline-none"
                                    />
                                </div>
                            )}

                            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowIdentityModal(false)}
                                    className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                >
                                    取消
                                </button>
                                <button
                                    type="button"
                                    disabled={savingIdentity || !selectedIdentity || (selectedIdentity === '其他' && !otherIdentityText.trim())}
                                    onClick={handleSaveIdentity}
                                    className="px-6 py-2.5 rounded-xl bg-[#DFBA87] hover:bg-[#cf9e5e] text-[#14120E] text-xs font-bold tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                                >
                                    {savingIdentity ? '儲存中...' : '確認儲存身分別'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile bottom identity + scan bar */}
            <div className="fixed bottom-0 inset-x-0 z-40 md:hidden px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-black via-black/85 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-full border bg-black/70 backdrop-blur-md" style={{ borderColor: tier.accentLine }}>
                        <TierIcon className="w-4 h-4" style={{ color: tier.accent }} />
                        <span className="text-xs font-bold tracking-[0.15em]" style={{ color: tier.accent }}>{tier.code}</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleStartScanner}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-[#DFBA87] text-[#14120E] text-sm font-bold tracking-wider shadow-2xl shadow-black/80 active:scale-95 transition-all duration-300 cursor-pointer"
                    >
                        <Camera className="w-4 h-4" />
                        <span>掃描作品立牌</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
