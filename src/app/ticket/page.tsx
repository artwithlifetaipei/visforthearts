'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { extractIgHandle } from '@/lib/brandUtils';

export const dynamic = 'force-dynamic';

type BrandEntry = {
    id: string;
    name_zh: string;
    name_en: string;
    instagram_handle: string;
    slug?: string;
    is_ticket_brand?: boolean;
};

type SlotEntry = {
    id: string;
    date_str: string;
    name_zh: string;
    name_en: string;
    time_range: string;
    max_tickets: number;
    booked_tickets: number;
};

const OFFICIAL_VIS_BRAND: BrandEntry = {
    id: 'vis-official',
    name_zh: 'VIS Contemporary Culture 大會官方',
    name_en: 'VIS Contemporary Culture Official',
    instagram_handle: '@visforthearts',
    slug: 'vis',
    is_ticket_brand: false,
};

function normalizeText(text: string): string {
    return (text || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '').trim();
}

function TicketRegistrationContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Database data
    const [brands, setBrands] = useState<BrandEntry[]>([OFFICIAL_VIS_BRAND]);
    const [slots, setSlots] = useState<SlotEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dbError, setDbError] = useState('');

    // Active resolved brand state
    const [activeBrand, setActiveBrand] = useState<BrandEntry>(OFFICIAL_VIS_BRAND);

    // Code input drawer for direct visitors
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [inputCode, setInputCode] = useState('');
    const [switchError, setSwitchError] = useState('');

    // Form inputs
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [selectedSlotId, setSelectedSlotId] = useState('');

    // Checkboxes
    const [agreeIg, setAgreeIg] = useState(false);
    const [agreeLimit, setAgreeLimit] = useState(false);
    const [agreePrivacy, setAgreePrivacy] = useState(false);

    // Waitlist states
    const [waitlistEmail, setWaitlistEmail] = useState('');
    const [waitlistFeedback, setWaitlistFeedback] = useState('');
    const [isSubmittingWaitlist, setIsSubmittingWaitlist] = useState(false);

    // Submission states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [mintedTicket, setMintedTicket] = useState<{ id: string; qrUrl: string } | null>(null);

    const [isMounted, setIsMounted] = useState(false);

    // Helper to resolve brand from a parameter string
    const resolveBrand = (query: string | null, brandList: BrandEntry[]): BrandEntry => {
        if (!query) return OFFICIAL_VIS_BRAND;
        const raw = decodeURIComponent(query).trim();
        const normalized = normalizeText(raw);

        if (!normalized || normalized === 'vis' || normalized === 'official' || normalized === 'visofficial') {
            return OFFICIAL_VIS_BRAND;
        }

        // 1. Exact ID match (case-insensitive)
        const matchById = brandList.find(b => b.id.toLowerCase() === raw.toLowerCase());
        if (matchById) return matchById;

        // 2. Exact slug match
        const matchBySlug = brandList.find(b => b.slug && normalizeText(b.slug) === normalized);
        if (matchBySlug) return matchBySlug;

        // 3. Normalized English name match
        const matchByEn = brandList.find(b => b.name_en && normalizeText(b.name_en) === normalized);
        if (matchByEn) return matchByEn;

        // 4. Normalized Chinese name match
        const matchByZh = brandList.find(b => b.name_zh && normalizeText(b.name_zh) === normalized);
        if (matchByZh) return matchByZh;

        // 5. Partial contains match (English or Chinese)
        const partialMatch = brandList.find(b => {
            const en = normalizeText(b.name_en);
            const zh = normalizeText(b.name_zh);
            return (en && (en.includes(normalized) || normalized.includes(en))) ||
                   (zh && (zh.includes(normalized) || normalized.includes(zh)));
        });
        if (partialMatch) return partialMatch;

        return OFFICIAL_VIS_BRAND;
    };

    // Load initial data
    useEffect(() => {
        setIsMounted(true);
        const loadData = async () => {
            try {
                // Fetch unified brands from /api/tickets/brands
                let loadedBrands: BrandEntry[] = [OFFICIAL_VIS_BRAND];
                try {
                    const brandsRes = await fetch('/api/tickets/brands');
                    if (brandsRes.ok) {
                        const brandsData = await brandsRes.json();
                        if (brandsData.brands && Array.isArray(brandsData.brands)) {
                            loadedBrands = brandsData.brands;
                        }
                    }
                } catch (bErr) {
                    console.warn('Failed to load /api/tickets/brands, falling back to direct table:', bErr);
                    // Fallback to direct supabase query
                    const { data: tbData } = await supabase.from('ticket_brands').select('*');
                    const { data: appData } = await supabase.from('exhibitor_applications').select('id, brand_name_zh, brand_name_en, instagram_url').eq('status', 'approved');

                    const fallbackMap = new Map<string, BrandEntry>();
                    fallbackMap.set('vis-official', OFFICIAL_VIS_BRAND);

                    if (appData) {
                        for (const app of appData) {
                            fallbackMap.set(app.id, {
                                id: app.id,
                                name_zh: app.brand_name_zh || app.brand_name_en || '',
                                name_en: app.brand_name_en || '',
                                instagram_handle: extractIgHandle(app.instagram_url, app.brand_name_en || app.brand_name_zh),
                                slug: (app.brand_name_en || app.brand_name_zh || app.id).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, ''),
                                is_ticket_brand: false,
                            });
                        }
                    }

                    if (tbData) {
                        for (const tb of tbData) {
                            fallbackMap.set(tb.id, {
                                id: tb.id,
                                name_zh: tb.name_zh,
                                name_en: tb.name_en,
                                instagram_handle: extractIgHandle(tb.instagram_handle, tb.name_en || tb.name_zh),
                                slug: (tb.name_en || tb.name_zh || tb.id).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, ''),
                                is_ticket_brand: true,
                            });
                        }
                    }
                    loadedBrands = Array.from(fallbackMap.values());
                }

                setBrands(loadedBrands);

                // Fetch slots
                const { data: slotsData, error: slotsErr } = await supabase
                    .from('ticket_slots')
                    .select('*')
                    .order('id', { ascending: true });

                if (slotsErr) {
                    throw new Error(`ticket_slots: ${slotsErr.message}`);
                }

                if (slotsData) setSlots(slotsData);

                // Resolve brand from URL query params
                const brandParam = searchParams.get('brand') || searchParams.get('b') || searchParams.get('brandId') || searchParams.get('code');
                const matched = resolveBrand(brandParam, loadedBrands);
                setActiveBrand(matched);

            } catch (err: any) {
                console.error('Failed to load database values:', err);
                setDbError(err.message || String(err));
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [searchParams]);

    // Handle manual code/brand switch
    const handleSwitchBrand = () => {
        if (!inputCode.trim()) {
            setSwitchError('請輸入品牌代碼或名稱。');
            return;
        }

        const resolved = resolveBrand(inputCode.trim(), brands);
        if (resolved.id === 'vis-official' && normalizeText(inputCode) !== 'vis' && normalizeText(inputCode) !== 'official') {
            setSwitchError('查無此邀請品牌代碼，已為您保留在大會官方通道。');
            setActiveBrand(OFFICIAL_VIS_BRAND);
            return;
        }

        setActiveBrand(resolved);
        setSwitchError('');
        setShowCodeInput(false);

        // Update URL cleanly without page reload
        const newUrl = resolved.id === 'vis-official' ? '/ticket' : `/ticket?brand=${encodeURIComponent(resolved.slug || resolved.id)}`;
        router.replace(newUrl, { scroll: false });
    };

    // Handle normal ticket registration
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');

        if (!name.trim()) {
            setSubmitError('請填寫姓名。');
            return;
        }
        if (!email.trim() || !email.includes('@')) {
            setSubmitError('請輸入正確的電子信箱。');
            return;
        }
        if (!selectedSlotId) {
            setSubmitError('請選擇觀展場次。');
            return;
        }

        const chosenSlot = slots.find(s => s.id === selectedSlotId);
        if (chosenSlot && chosenSlot.booked_tickets >= chosenSlot.max_tickets) {
            setSubmitError('此時段名額已滿，請點選該場次的候補按鈕加入候補。');
            return;
        }

        if (!agreeIg || !agreeLimit || !agreePrivacy) {
            setSubmitError('請勾選同意所有宣告條款方可進行鑄造。');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/tickets/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    brandId: activeBrand.id,
                    brandName: activeBrand.name_zh,
                    slotId: selectedSlotId
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error === 'SLOT_FULL') {
                    setSubmitError('該時段剛剛已額滿，請重新選擇其他時段或加入候補。');
                } else {
                    setSubmitError(data.error || '鑄造失敗，請稍後再試。');
                }
            } else {
                setMintedTicket({
                    id: data.ticketId,
                    qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${data.ticketId}`
                });
            }
        } catch (err: any) {
            setSubmitError('伺服器連線異常，請稍後再試。');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle joining waitlist
    const handleJoinWaitlist = async (slotId: string) => {
        setWaitlistFeedback('');
        const wEmail = waitlistEmail.trim() || email.trim();

        if (!wEmail || !wEmail.includes('@')) {
            setWaitlistFeedback('請提供正確的電子信箱以接收候補通知。');
            return;
        }

        setIsSubmittingWaitlist(true);

        try {
            const res = await fetch('/api/tickets/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: wEmail,
                    slotId: slotId
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setWaitlistFeedback(data.error || '候補登記失敗。');
            } else {
                setWaitlistFeedback('✓ 已成功登入候補名單！名額釋出時會優先通知您。');
                setWaitlistEmail('');
            }
        } catch (err) {
            setWaitlistFeedback('伺服器連線異常，請稍後再試。');
        } finally {
            setIsSubmittingWaitlist(false);
        }
    };

    if (isLoading || !isMounted) {
        return (
            <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-[#C9A96E] relative overflow-hidden">
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <img
                        src="/vip_lobby_bg.jpg"
                        alt=""
                        className="w-full h-full object-cover object-center"
                        style={{ filter: 'brightness(0.38) saturate(0.75)' }}
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(180deg, rgba(245,242,235,0.82) 0%, rgba(240,235,225,0.6) 40%, rgba(245,242,235,0.88) 100%)'
                        }}
                    />
                </div>
                <div className="text-center font-sans relative z-10">
                    <div className="w-8 h-8 border-t-2 border-[#C9A96E] rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-xs font-light tracking-[0.2em] uppercase text-[#1A1A1A]">票務系統載入中 Loading Ticket System...</p>
                </div>
            </div>
        );
    }

    const isOfficial = activeBrand.id === 'vis-official';

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-[#C9A96E] selection:text-white">
            {/* Full-bleed architectural background matching VIP dashboard light style */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <img
                    src="/vip_lobby_bg.jpg"
                    alt=""
                    className="w-full h-full object-cover object-center"
                    style={{ filter: 'brightness(0.38) saturate(0.75)' }}
                />
                {/* Warm light beige gradient overlay for readability */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(180deg, rgba(245,242,235,0.82) 0%, rgba(240,235,225,0.6) 40%, rgba(245,242,235,0.88) 100%)'
                    }}
                />
                {/* Subtle gold vignette top */}
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(223,186,135,0.08) 0%, transparent 65%)' }} />
            </div>

            {/* Content Wrapper */}
            <div className="w-full max-w-2xl px-6 py-16 z-10 relative flex flex-col justify-center min-h-screen">
                {/* Header Logo & Exhibition Dates */}
                <div className="flex flex-col items-center mb-8 text-center">
                    <img
                        src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png"
                        alt="VIS Contemporary Culture"
                        className="h-14 md:h-16 object-contain mb-4 opacity-100"
                    />
                    <h1 className="text-xs uppercase tracking-[0.4em] text-[#1A1A1A]/70 font-medium">Digital Entrance Pass</h1>
                    <div className="text-[12px] tracking-[0.25em] text-[#8C6D3B] font-serif mt-2 font-normal">
                        2027. 01. 06–01. 09
                    </div>
                    <div className="w-8 h-[0.5px] bg-[#1A1A1A]/20 mt-3" />
                </div>

                <AnimatePresence mode="wait">
                    {!mintedTicket ? (
                        <motion.div
                            key="form-container"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white/95 border border-[#C9A96E]/20 backdrop-blur-xl p-7 sm:p-9 rounded-none shadow-2xl relative"
                        >
                            {/* Corner Accents */}
                            <div className="absolute top-4 left-4 w-2 h-2 border-t-[0.5px] border-l-[0.5px] border-current opacity-30"></div>
                            <div className="absolute top-4 right-4 w-2 h-2 border-t-[0.5px] border-r-[0.5px] border-current opacity-30"></div>
                            <div className="absolute bottom-4 left-4 w-2 h-2 border-b-[0.5px] border-l-[0.5px] border-current opacity-30"></div>
                            <div className="absolute bottom-4 right-4 w-2 h-2 border-b-[0.5px] border-r-[0.5px] border-current opacity-30"></div>

                            {dbError && (
                                <div className="mb-8 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none font-light">
                                    <strong>⚠️ 資料庫載入失敗 / Database Load Error:</strong>
                                    <p className="mt-1 font-mono text-[10px]">{dbError}</p>
                                </div>
                            )}

                            {/* Brand Exclusive Invitation Card (No Dropdown - Dedicated Link Scheme) */}
                            <div className="mb-8 border border-[#C9A96E]/35 bg-gradient-to-b from-[#FAF8F5] to-[#F5EFE6] p-6 rounded-none relative shadow-sm">
                                {/* Inner micro accent */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E] animate-pulse"></span>
                                        <span className="text-[10px] uppercase tracking-[0.25em] text-[#A68042] font-semibold">
                                            {isOfficial ? 'OFFICIAL INVITATION // 大會官方觀展通道' : 'BRAND EXCLUSIVE INVITATION // 品牌專屬邀請'}
                                        </span>
                                    </div>
                                    {!isOfficial && (
                                        <span className="text-[9px] font-mono tracking-widest px-2 py-0.5 bg-[#C9A96E]/15 text-[#8C6D3B] border border-[#C9A96E]/30 uppercase">
                                            VERIFIED PASS
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1 mb-3.5">
                                    <div className="text-[9px] uppercase tracking-[0.2em] text-[#888888]">
                                        Invited By 邀請來源
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-serif text-[#1A1A1A] tracking-wide font-normal">
                                        {activeBrand.name_zh}
                                    </h2>
                                    {activeBrand.name_en && (
                                        <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#777777]">
                                            {activeBrand.name_en}
                                        </div>
                                    )}
                                </div>

                                <div className="text-xs font-light leading-relaxed text-[#444444] tracking-wide border-t border-[#E5DEC9] pt-3">
                                    {isOfficial ? (
                                        <>
                                            歡迎蒞臨 VIS Contemporary Culture。大會官方誠摯邀請您共赴 2027 當代生活文化盛宴。請於下方填妥貴賓資訊並選擇預約時段以領取專屬數位觀展憑證。
                                        </>
                                    ) : (
                                        <>
                                            歡迎來到 VIS Contemporary Culture。<strong className="font-medium text-[#1A1A1A]">{activeBrand.name_zh}</strong> 誠摯邀請您蒞臨，與我們一起，從文化與人文美學出發，探索當代生活，體驗這一屬於品味人士的跨界盛會。
                                            <span className="block mt-1.5 text-[#1A1A1A] font-medium">
                                                您的品牌專屬觀展名額已為您保留，請選擇預約時段並完成憑證領取。
                                            </span>
                                        </>
                                    )}
                                </div>

                                {/* Optional Switcher Drawer for Visitors holding an Invite Code */}
                                <div className="mt-4 pt-3 border-t border-[#E5DEC9]/80 flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCodeInput(!showCodeInput)}
                                        className="text-[11px] text-[#777777] hover:text-[#A68042] transition-colors flex items-center justify-between cursor-pointer group"
                                    >
                                        <span className="group-hover:underline">
                                            {isOfficial ? '✦ 持有品牌專屬邀請代碼？點此切換專屬通道' : '切換其他邀請代碼或回大會官方通道'}
                                        </span>
                                        <span className="text-[10px] font-mono text-[#A68042]">
                                            {showCodeInput ? '收起 ✕' : '輸入代碼 ＋'}
                                        </span>
                                    </button>

                                    <AnimatePresence>
                                        {showCodeInput && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden pt-2"
                                            >
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={inputCode}
                                                        onChange={(e) => {
                                                            setInputCode(e.target.value);
                                                            setSwitchError('');
                                                        }}
                                                        placeholder="請輸入品牌名稱或代碼 (如: sonnet, cwtch, 蒔蕼行...)"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleSwitchBrand();
                                                            }
                                                        }}
                                                        className="flex-1 bg-white border border-[#C9A96E]/40 px-3 py-2 rounded-none text-xs text-[#1A1A1A] placeholder-neutral-400 focus:outline-none focus:border-[#C9A96E]"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleSwitchBrand}
                                                        className="bg-[#1A1A1A] text-white text-xs px-4 py-2 rounded-none hover:bg-neutral-800 transition-colors tracking-widest font-light cursor-pointer"
                                                    >
                                                        切換
                                                    </button>
                                                </div>
                                                {switchError && (
                                                    <p className="text-[10px] text-rose-500 mt-1.5 font-light">{switchError}</p>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-[0.2em] text-[#C9A96E] font-semibold mb-2">
                                            Full Name 姓名
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="請輸入真實姓名以利核對"
                                            className="w-full bg-white/70 border border-neutral-200 px-4 py-3 rounded-none text-sm text-[#1A1A1A] placeholder-neutral-400 focus:outline-none focus:border-[#C9A96E] transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-[0.2em] text-[#C9A96E] font-semibold mb-2">
                                            Email 電子信箱
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="接收數位憑證票券信件"
                                            className="w-full bg-white/70 border border-neutral-200 px-4 py-3 rounded-none text-sm text-[#1A1A1A] placeholder-neutral-400 focus:outline-none focus:border-[#C9A96E] transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Slots choice */}
                                <div>
                                    <label className="block text-[10px] uppercase tracking-[0.2em] text-[#C9A96E] font-semibold mb-3">
                                        Select Time Slot 觀展場次選擇
                                    </label>
                                    <div className="space-y-3">
                                        {slots.map((s) => {
                                            const isFull = s.booked_tickets >= s.max_tickets;
                                            const ratio = s.booked_tickets / s.max_tickets;
                                            const isWarning = ratio >= 0.9 && !isFull;
                                            const isSelected = selectedSlotId === s.id;

                                            return (
                                                <div
                                                    key={s.id}
                                                    onClick={() => {
                                                        if (!isFull) setSelectedSlotId(s.id);
                                                    }}
                                                    className={`border rounded-none p-4 transition-all cursor-pointer ${
                                                        isFull
                                                            ? 'border-neutral-100 bg-neutral-50/40 text-neutral-400 cursor-not-allowed'
                                                            : isSelected
                                                            ? 'border-[#C9A96E] bg-[#C9A96E]/5'
                                                            : 'border-neutral-200 bg-white/60 hover:border-[#C9A96E]/40'
                                                    }`}
                                                >
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                            <input
                                                                type="radio"
                                                                name="slot"
                                                                value={s.id}
                                                                disabled={isFull}
                                                                checked={isSelected}
                                                                onChange={() => setSelectedSlotId(s.id)}
                                                                className="accent-[#C9A96E] w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                                                            />
                                                            <div className="text-sm">
                                                                <span className="font-medium mr-2 text-[#1A1A1A]">{s.date_str}</span>
                                                                <span className="font-light text-[#2D2D2D]">{s.name_zh}</span>
                                                                <span className="block text-[11px] text-neutral-400 mt-0.5">{s.time_range}</span>
                                                            </div>
                                                        </label>

                                                        {/* Badge & Action */}
                                                        <div>
                                                            {isFull ? (
                                                                <div className="flex flex-col items-end gap-1.5">
                                                                    <span className="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-none border border-red-200">
                                                                        已額滿
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSelectedSlotId(s.id)}
                                                                        className="text-[11px] text-[#C9A96E] hover:underline cursor-pointer"
                                                                    >
                                                                        展開候補登記
                                                                    </button>
                                                                </div>
                                                            ) : isWarning ? (
                                                                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-none border border-amber-200">
                                                                    名額即將額滿
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-none border border-green-200">
                                                                    尚有觀展名額
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Inline Waitlist drawer */}
                                                    {isFull && isSelected && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            className="mt-4 pt-4 border-t border-neutral-100 space-y-3"
                                                        >
                                                            <p className="text-[11px] text-neutral-500">
                                                                該時段目前已滿額。您可以留下您的 Email，一有名額釋出我們會立刻系統通知您候補。
                                                            </p>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="email"
                                                                    value={waitlistEmail}
                                                                    onChange={(e) => setWaitlistEmail(e.target.value)}
                                                                    placeholder="請輸入候補通知 Email"
                                                                    className="flex-1 bg-white border border-neutral-200 px-3 py-2 rounded-none text-xs text-[#1A1A1A] focus:outline-none focus:border-[#C9A96E]"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    disabled={isSubmittingWaitlist}
                                                                    onClick={() => handleJoinWaitlist(s.id)}
                                                                    className="bg-[#1A1A1A] text-white text-xs font-light tracking-widest px-4 py-2 rounded-none hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
                                                                >
                                                                    {isSubmittingWaitlist ? '登記中' : '加入候補'}
                                                                </button>
                                                            </div>
                                                            {waitlistFeedback && (
                                                                <p className="text-[11px] text-[#C9A96E] font-light">
                                                                    {waitlistFeedback}
                                                                </p>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Checkbox clauses */}
                                <div className="space-y-4 pt-4 border-t border-neutral-100">
                                    <label className="flex items-start gap-3 cursor-pointer text-xs leading-relaxed text-[#2D2D2D] font-light">
                                        <input
                                            type="checkbox"
                                            checked={agreeIg}
                                            onChange={(e) => setAgreeIg(e.target.checked)}
                                            className="accent-[#C9A96E] mt-1 cursor-pointer"
                                        />
                                        <span>
                                            為協助主辦單位妥善傳遞大展現場與觀展相關之即時資訊，我同意於入場時出示已追蹤{' '}
                                            <strong className="text-[#1A1A1A]">@visforthearts</strong>
                                            {!isOfficial && activeBrand.instagram_handle && activeBrand.instagram_handle !== '@visforthearts' && (
                                                <>
                                                    {' '}與{' '}
                                                    <strong className="text-[#A68042]">
                                                        {activeBrand.instagram_handle}
                                                    </strong>
                                                </>
                                            )}{' '}
                                            之 Instagram 畫面。我暸解若未出示，主辦單位有權取消此專屬憑證之入場資格。
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-3 cursor-pointer text-xs leading-relaxed text-[#2D2D2D] font-light">
                                        <input
                                            type="checkbox"
                                            checked={agreeLimit}
                                            onChange={(e) => setAgreeLimit(e.target.checked)}
                                            className="accent-[#C9A96E] mt-1 cursor-pointer"
                                        />
                                        <span>
                                            我已理解：為維護高質量的藝術觀展體驗與符合公共安全規範，本時段票券採總量管制。若遇現場人潮達場館容留上限，將啟動『一進一出』之動線管制。請持本憑證依序排隊等候進場。
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-3 cursor-pointer text-xs leading-relaxed text-[#2D2D2D] font-light">
                                        <input
                                            type="checkbox"
                                            checked={agreePrivacy}
                                            onChange={(e) => setAgreePrivacy(e.target.checked)}
                                            className="accent-[#C9A96E] mt-1 cursor-pointer"
                                        />
                                        <span>
                                            我同意 VIS Contemporary Culture 隱私權政策，並願意接收未來的展會與活動資訊。
                                        </span>
                                    </label>
                                </div>

                                {submitError && (
                                    <div className="text-sm bg-red-50 border border-red-200 p-4 rounded-none text-red-600 font-light">
                                        ⚠️ {submitError}
                                    </div>
                                )}

                                {/* CTA Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-[#1A1A1A] hover:bg-neutral-850 disabled:opacity-50 text-white text-xs uppercase tracking-[0.3em] font-light py-4 rounded-none transition-all shadow-md cursor-pointer"
                                >
                                    {isSubmitting ? '正在鑄造憑證中...' : '鑄造專屬電子票券'}
                                </button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="ticket-success-container"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white/95 border border-[#C9A96E]/20 p-8 rounded-none shadow-2xl text-center space-y-6 relative text-[#1A1A1A]"
                        >
                            {/* Corner Accents */}
                            <div className="absolute top-4 left-4 w-2 h-2 border-t-[0.5px] border-l-[0.5px] border-current opacity-30"></div>
                            <div className="absolute top-4 right-4 w-2 h-2 border-t-[0.5px] border-r-[0.5px] border-current opacity-30"></div>
                            <div className="absolute bottom-4 left-4 w-2 h-2 border-b-[0.5px] border-l-[0.5px] border-current opacity-30"></div>
                            <div className="absolute bottom-4 right-4 w-2 h-2 border-b-[0.5px] border-r-[0.5px] border-current opacity-30"></div>

                            <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 text-green-600 flex items-center justify-center mx-auto text-xl">
                                ✓
                            </div>
                            <div>
                                <h2 className="text-lg font-medium tracking-wide">憑證鑄造成功！</h2>
                                <p className="text-xs text-neutral-500 mt-2">
                                    電子票券已成功發送至您的信箱：<strong className="text-[#1A1A1A]">{email}</strong>。<br/>
                                    現場參觀時請出示此畫面或信件 QR Code 核銷。
                                </p>
                            </div>

                            {/* Digital Pass Preview */}
                            <div className="border border-neutral-100 bg-neutral-50/70 p-6 rounded-none max-w-sm mx-auto text-left space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
                                    <span className="text-[10px] uppercase tracking-wider text-[#DFBA87] font-semibold">VIS ENTRY PASS</span>
                                    <span className="text-[9px] font-mono text-neutral-400">{mintedTicket.id.slice(0, 8)}...</span>
                                </div>
                                <div className="space-y-3 text-xs">
                                    <div>
                                        <div className="text-[9px] uppercase text-neutral-400 tracking-wider">Guest 貴賓姓名</div>
                                        <div className="text-[#1A1A1A] text-sm font-medium">{name}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] uppercase text-neutral-400 tracking-wider">Invitation Source 邀請來源</div>
                                        <div className="text-[#1A1A1A] text-sm font-serif">{activeBrand.name_zh}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] uppercase text-neutral-400 tracking-wider">Time Slot 預約場次</div>
                                        <div className="text-[#1A1A1A] text-sm">
                                            {slots.find((s) => s.id === selectedSlotId)?.date_str}{' '}
                                            {slots.find((s) => s.id === selectedSlotId)?.name_zh}
                                        </div>
                                    </div>
                                </div>

                                {/* QR Render */}
                                <div className="pt-4 flex justify-center">
                                    <div className="bg-white p-2 rounded-lg inline-block shadow-md">
                                        <img
                                            src={mintedTicket.qrUrl}
                                            alt="Ticket QR Code"
                                            className="w-40 h-40"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setMintedTicket(null);
                                    setName('');
                                    setEmail('');
                                    setSelectedSlotId('');
                                    setAgreeIg(false);
                                    setAgreeLimit(false);
                                    setAgreePrivacy(false);
                                }}
                                className="text-xs text-[#1A1A1A]/60 hover:text-[#1A1A1A] hover:underline cursor-pointer"
                            >
                                ← 鑄造另一張票券
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function TicketRegistrationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-[#C9A96E]">
                <div className="w-8 h-8 border-t-2 border-[#C9A96E] rounded-full animate-spin"></div>
            </div>
        }>
            <TicketRegistrationContent />
        </Suspense>
    );
}
