'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

type BrandEntry = {
    id: string;
    name_zh: string;
    name_en: string;
    instagram_handle: string;
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

export default function TicketRegistrationPage() {
    // Database data
    const [brands, setBrands] = useState<BrandEntry[]>([]);
    const [slots, setSlots] = useState<SlotEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form inputs
    const [selectedBrandId, setSelectedBrandId] = useState('');
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

    // Load initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch brands
                const { data: brandsData, error: brandsErr } = await supabase
                    .from('ticket_brands')
                    .select('*')
                    .order('name_zh', { ascending: true });

                // Fetch slots
                const { data: slotsData, error: slotsErr } = await supabase
                    .from('ticket_slots')
                    .select('*')
                    .order('id', { ascending: true });

                if (brandsData) setBrands(brandsData);
                if (slotsData) setSlots(slotsData);

                // Auto-select first brand if available
                if (brandsData && brandsData.length > 0) {
                    setSelectedBrandId(brandsData[0].id);
                }
            } catch (err) {
                console.error('Failed to load database values:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    // Get selected brand object
    const selectedBrand = brands.find(b => b.id === selectedBrandId);

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
                    brandId: selectedBrandId,
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

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-[#C9A96E] selection:text-black">
            {/* Background Full-bleed Image with subtle blur & dark overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                    src="/vip_lobby_bg.png"
                    alt=""
                    className="w-full h-full object-cover opacity-25 brightness-50 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/80 via-neutral-900/90 to-neutral-950" />
            </div>

            {/* Content Wrapper */}
            <div className="w-full max-w-2xl px-6 py-16 z-10 relative flex flex-col justify-center min-h-screen">
                {/* Header Logo */}
                <div className="flex flex-col items-center mb-10 text-center">
                    <img
                        src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png"
                        alt="VIS FOR THE ARTS"
                        className="h-10 invert brightness-200 mb-6 opacity-90"
                    />
                    <h1 className="text-xs uppercase tracking-[0.4em] text-[#C9A96E] font-medium">Digital Entrance Pass</h1>
                    <div className="w-8 h-[0.5px] bg-[#C9A96E] mt-4 opacity-50" />
                </div>

                <AnimatePresence mode="wait">
                    {!mintedTicket ? (
                        <motion.div
                            key="form-container"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white/[0.03] border border-white/10 backdrop-blur-2xl p-8 rounded-2xl shadow-2xl"
                        >
                            {/* Brand dropdown */}
                            <div className="mb-8">
                                <label className="block text-[10px] uppercase tracking-[0.2em] text-[#C9A96E] font-semibold mb-3">
                                    Invitation Source 邀請參展品牌
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedBrandId}
                                        onChange={(e) => setSelectedBrandId(e.target.value)}
                                        className="w-full bg-neutral-900 border border-white/15 px-4 py-3 rounded-lg text-sm text-neutral-100 focus:outline-none focus:border-[#C9A96E] transition-colors appearance-none cursor-pointer"
                                    >
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name_zh} {b.name_en ? `(${b.name_en})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                                        ▼
                                    </div>
                                </div>
                            </div>

                            {/* Welcome text */}
                            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-lg mb-8">
                                <p className="text-sm font-light leading-relaxed text-neutral-300 tracking-wide">
                                    歡迎來到 VIS for the Arts。感謝您與{' '}
                                    <span className="text-[#C9A96E] font-medium underline underline-offset-4">
                                        {selectedBrand ? selectedBrand.name_zh : '參展品牌'}
                                    </span>{' '}
                                    共同支持當代設計、文化、藝術，探索當代美學的無界限。
                                    <br />
                                    <span className="block mt-2 font-medium text-neutral-200">
                                        您的專屬觀展憑證已解鎖。請選擇入場時段，完成數位憑證鑄造。
                                    </span>
                                </p>
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
                                            className="w-full bg-neutral-900 border border-white/10 px-4 py-3 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-[#C9A96E] transition-colors"
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
                                            className="w-full bg-neutral-900 border border-white/10 px-4 py-3 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-[#C9A96E] transition-colors"
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
                                                    className={`border rounded-lg p-4 transition-all ${
                                                        isFull
                                                            ? 'border-neutral-800 bg-neutral-950/40 text-neutral-600'
                                                            : isSelected
                                                            ? 'border-[#C9A96E] bg-white/[0.04]'
                                                            : 'border-white/10 bg-neutral-900/40 hover:border-white/20'
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
                                                                <span className="font-medium mr-2 text-neutral-200">{s.date_str}</span>
                                                                <span className="font-light text-neutral-400">{s.name_zh}</span>
                                                                <span className="block text-[11px] text-neutral-500 mt-0.5">{s.time_range}</span>
                                                            </div>
                                                        </label>

                                                        {/* Badge & Action */}
                                                        <div>
                                                            {isFull ? (
                                                                <div className="flex flex-col items-end gap-1.5">
                                                                    <span className="text-[10px] bg-red-950/40 text-red-400 px-2 py-0.5 rounded border border-red-900/30">
                                                                        已額滿
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setSelectedSlotId(s.id)}
                                                                        className="text-[11px] text-[#C9A96E] hover:underline"
                                                                    >
                                                                        展開候補登記
                                                                    </button>
                                                                </div>
                                                            ) : isWarning ? (
                                                                <span className="text-[10px] bg-amber-950/40 text-amber-400 px-2 py-0.5 rounded border border-amber-900/30">
                                                                    名額即將額滿
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] bg-green-950/40 text-green-400 px-2 py-0.5 rounded border border-green-900/30">
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
                                                            className="mt-4 pt-4 border-t border-white/5 space-y-3"
                                                        >
                                                            <p className="text-[11px] text-neutral-400">
                                                                該時段目前已滿額。您可以留下您的 Email，一有名額釋出我們會立刻系統通知您候補。
                                                            </p>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="email"
                                                                    value={waitlistEmail}
                                                                    onChange={(e) => setWaitlistEmail(e.target.value)}
                                                                    placeholder="請輸入候補通知 Email"
                                                                    className="flex-1 bg-neutral-950 border border-white/10 px-3 py-2 rounded text-xs focus:outline-none focus:border-[#C9A96E]"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    disabled={isSubmittingWaitlist}
                                                                    onClick={() => handleJoinWaitlist(s.id)}
                                                                    className="bg-[#C9A96E] text-black text-xs font-semibold px-4 py-2 rounded hover:bg-[#b8975d] transition-colors disabled:opacity-50"
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
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <label className="flex items-start gap-3 cursor-pointer text-xs leading-relaxed text-neutral-300 font-light">
                                        <input
                                            type="checkbox"
                                            checked={agreeIg}
                                            onChange={(e) => setAgreeIg(e.target.checked)}
                                            className="accent-[#C9A96E] mt-1 cursor-pointer"
                                        />
                                        <span>
                                            我同意於入場時出示已追蹤{' '}
                                            <strong className="text-white">@visforthearts</strong> 與{' '}
                                            <strong className="text-[#C9A96E]">
                                                {selectedBrand ? selectedBrand.instagram_handle : '@參展商品牌'}
                                            </strong>{' '}
                                            之 Instagram 畫面。我暸解若未出示，主辦單位有權取消此專屬憑證之入場資格。
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-3 cursor-pointer text-xs leading-relaxed text-neutral-300 font-light">
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

                                    <label className="flex items-start gap-3 cursor-pointer text-xs leading-relaxed text-neutral-300 font-light">
                                        <input
                                            type="checkbox"
                                            checked={agreePrivacy}
                                            onChange={(e) => setAgreePrivacy(e.target.checked)}
                                            className="accent-[#C9A96E] mt-1 cursor-pointer"
                                        />
                                        <span>
                                            我同意 VIS for the Arts 隱私權政策，並願意接收未來的展會與活動資訊。
                                        </span>
                                    </label>
                                </div>

                                {submitError && (
                                    <div className="text-sm bg-red-950/25 border border-red-900/40 p-4 rounded-lg text-red-400 font-light">
                                        ⚠️ {submitError}
                                    </div>
                                )}

                                {/* CTA Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-[#C9A96E] hover:bg-[#b8975d] disabled:opacity-50 text-black text-xs uppercase tracking-[0.4em] font-semibold py-4 rounded-lg transition-colors shadow-lg shadow-[#C9A96E]/10"
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
                            className="bg-neutral-900 border border-[#C9A96E]/30 p-8 rounded-2xl shadow-2xl text-center space-y-6"
                        >
                            <div className="w-12 h-12 rounded-full bg-green-950/50 border border-green-800/40 text-green-400 flex items-center justify-center mx-auto text-xl">
                                ✓
                            </div>
                            <div>
                                <h2 className="text-lg font-medium tracking-wide">憑證鑄造成功！</h2>
                                <p className="text-xs text-neutral-400 mt-2">
                                    電子票券已成功發送至您的信箱：<strong className="text-neutral-200">{email}</strong>。<br/>
                                    現場參觀時請出示此畫面或信件 QR Code 核銷。
                                </p>
                            </div>

                            {/* Digital Pass Preview */}
                            <div className="border border-white/5 bg-neutral-950/60 p-6 rounded-lg max-w-sm mx-auto text-left space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                    <span className="text-[10px] uppercase tracking-wider text-[#C9A96E]">VIS ENTRY PASS</span>
                                    <span className="text-[9px] font-mono text-neutral-500">{mintedTicket.id.slice(0, 8)}...</span>
                                </div>
                                <div className="space-y-3 text-xs">
                                    <div>
                                        <div className="text-[9px] uppercase text-neutral-500 tracking-wider">Guest 貴賓姓名</div>
                                        <div className="text-neutral-200 text-sm font-medium">{name}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] uppercase text-neutral-500 tracking-wider">Invitation Source 邀請商</div>
                                        <div className="text-neutral-200 text-sm">{selectedBrand ? selectedBrand.name_zh : ''}</div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] uppercase text-neutral-500 tracking-wider">Time Slot 預約場次</div>
                                        <div className="text-neutral-200 text-sm">
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
                                className="text-xs text-[#C9A96E] hover:underline"
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
