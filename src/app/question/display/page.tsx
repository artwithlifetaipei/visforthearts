'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Maximize2, Minimize2, 
  X, ArrowUp, ArrowUpRight, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

interface DisplayItem {
  id: string;
  name: string;
  answer: string;
  type: string;
  role_title: string | null;
  display_order: number | null;
  featured: boolean;
  question_id?: string | null;
  question_prompt?: string | null;
  updated_at: string;
}

interface DisplayApiResponse {
  campaign: {
    slug: string;
    question_en: string;
    question_zh: string;
    content_version: number;
  };
  display: {
    mode: 'normal' | 'latest' | 'filtered' | 'emergency';
    duration_seconds: number;
    transition: string;
    emergency_message_en: string;
    emergency_message_zh: string;
    updated_at: string;
  };
  items: DisplayItem[];
}

export default function PerspectiveDisplayWall() {
  const [data, setData] = useState<DisplayApiResponse | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DisplayItem | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const cachedDataRef = useRef<DisplayApiResponse | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Display API (Always fetch freshest items, no-cache)
  const fetchDisplayData = async () => {
    try {
      const res = await fetch(`/api/perspectives/display?t=${Date.now()}`, { 
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      });
      if (!res.ok) throw new Error('Network response error');
      const json: DisplayApiResponse = await res.json();

      if (json && Array.isArray(json.items)) {
        setData(json);
        cachedDataRef.current = json;
      }
    } catch (err) {
      console.warn('API sync warning, keeping offline cache (LED-008):', err);
      if (!data && cachedDataRef.current) {
        setData(cachedDataRef.current);
      }
    }
  };

  // Initial fetch, 8s auto-refresh polling, and immediate refetch on tab focus
  useEffect(() => {
    fetchDisplayData();
    const interval = setInterval(fetchDisplayData, 8000);
    const onFocus = () => fetchDisplayData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (selectedItem) setSelectedItem(null);
        if (showQrModal) setShowQrModal(false);
      } else if (e.key === ' ' && !selectedItem && !showQrModal) {
        e.preventDefault();
        setIsAutoScroll(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, showQrModal]);

  // Track window scroll for scroll-to-top button
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }

      // If user scrolls manually while auto-scroll is on, temporarily pause drift
      if (isAutoScroll && !isPausedByUser) {
        setIsPausedByUser(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          setIsPausedByUser(false);
        }, 5000);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isAutoScroll, isPausedByUser]);

  // Smooth Gentle Ambient Auto-Scroll for Large Screens & Exhibition Displays
  useEffect(() => {
    if (!isAutoScroll || isPausedByUser || selectedItem || showQrModal || data?.display.mode === 'emergency') {
      return;
    }

    let animationFrameId: number;
    let lastTime = performance.now();

    const scrollStep = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      // Drift speed: ~24px per second for comfortable ambient viewing
      const pixelsToScroll = (24 * delta) / 1000;

      // Check if near bottom
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 6;

      if (atBottom) {
        // Pause at bottom for 5 seconds, then gracefully scroll back to top
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 5000);
        return;
      }

      window.scrollBy({ top: pixelsToScroll, left: 0 });
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isAutoScroll, isPausedByUser, selectedItem, showQrModal, data]);

  const items = useMemo(() => {
    return data?.items || [];
  }, [data]);

  const isEmergency = data?.display.mode === 'emergency';

  const submissionUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/question`
    : 'https://www.visforthearts.com/question';

  const getQuestionPrompt = (item: DisplayItem) => {
    if (item.question_prompt) return item.question_prompt;
    if (item.question_id === 'q1') return '你認為，一個真正懂得欣賞美的社會，應該具備什麼樣的特質？';
    if (item.question_id === 'q2') return '對你來說，美的事物，它的價值是什麼？一句話形容。';
    if (item.question_id === 'q3') return '如果希望台灣成為一個更有美感的地方，你最希望大家開始重視什麼？';
    return '美，如何成為我們共同的價值？';
  };

  return (
    <div className="min-h-screen bg-[#0A0908] text-[#F3EFEA] font-sans selection:bg-[#DFBA87] selection:text-black relative overflow-x-hidden pb-24">
      
      {/* ─────────────────────────────────────────────────────────────
          1. FULL-BLEED AUTHENTIC ARCHITECTURAL BACKGROUND (VIP LOBBY)
      ───────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <img
          src="/vip_lobby_bg.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
        />
        {/* Dark moody architectural gradient overlay matching reference */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 to-black/90" />
        {/* Subtle warm gold ambient vignette */}
        <div 
          className="absolute inset-0" 
          style={{ background: 'radial-gradient(circle at 50% 20%, rgba(223,186,135,0.14) 0%, transparent 75%)' }} 
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EXHIBITION MASTHEAD (SLEEK & MINIMAL PER UI/UX PRO MAX)
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/50 backdrop-blur-xl transition-all shadow-sm">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 py-3.5 sm:py-4 space-y-3 sm:space-y-4">
          
          {/* Top Bar: VIS Logo (Left) + Scannable QR Code & Controls (Right) */}
          <div className="flex items-center justify-between gap-4">
            
            {/* Top-Left: VIS Logo (Enlarged) + Subtitle */}
            <div className="flex items-center gap-4 sm:gap-5">
              <Link 
                href="/" 
                className="flex items-center gap-2 group transition-opacity hover:opacity-85"
                title="返回 VIS 首頁"
              >
                <img 
                  src="/vis_logo.png" 
                  alt="VIS" 
                  className="h-12 sm:h-14 md:h-16 w-auto object-contain drop-shadow-sm brightness-110"
                />
              </Link>
              <div className="hidden sm:block h-7 sm:h-9 w-px bg-white/20" />
              <div className="hidden sm:flex flex-col justify-center space-y-0.5">
                <span className="text-[11px] sm:text-xs font-mono tracking-[0.22em] uppercase text-[#DFBA87] font-semibold">
                  The Question of the Year
                </span>
                <span className="text-xs sm:text-sm font-serif text-white/90 tracking-[0.16em] font-medium">
                  年度文化命題
                </span>
              </div>
            </div>

            {/* Top-Right: Prominent Direct-Scan QR Code Card + Fullscreen Button */}
            <div className="flex items-center gap-3 sm:gap-4">
              
              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 sm:p-2.5 rounded-full bg-white/10 hover:bg-[#DFBA87] hover:text-black text-neutral-300 border border-white/20 transition-all duration-300 cursor-pointer shadow-xs"
                title="切換全螢幕 (快捷鍵: 按 F)"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* The Prominent Scannable QR Code Card (Direct Scan for Visitors) */}
              <div
                onClick={() => setShowQrModal(true)}
                className="group relative flex items-center gap-3 sm:gap-4 bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-[#DFBA87]/50 hover:border-[#DFBA87] rounded-2xl p-2.5 sm:p-3 shadow-xl hover:shadow-2xl hover:shadow-[#DFBA87]/20 transition-all duration-300 cursor-pointer ring-1 ring-[#DFBA87]/30"
                title="手機直接掃描 QR Code 即時參與 · 點擊可放大全螢幕展示"
              >
                {/* Large High-Contrast QR Code */}
                <div className="bg-white p-2 rounded-xl border border-white/20 shadow-xs group-hover:scale-[1.02] transition-transform duration-300 flex-shrink-0">
                  <QRCodeSVG
                    value={submissionUrl}
                    size={110}
                    level="H"
                    includeMargin={false}
                    fgColor="#111111"
                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-[104px] md:h-[104px]"
                  />
                </div>

                {/* Direct Action Guidance Typography */}
                <div className="flex flex-col justify-center text-left space-y-1 pr-1 sm:pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DFBA87] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#DFBA87]" />
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.18em] uppercase text-[#DFBA87] font-bold whitespace-nowrap">
                      SCAN TO PARTICIPATE
                    </span>
                  </div>

                  <div className="text-sm sm:text-base font-serif font-semibold text-white tracking-wider leading-tight group-hover:text-[#DFBA87] transition-colors whitespace-nowrap">
                    手機掃碼參與作答
                  </div>

                  <div className="text-[10px] sm:text-[11px] text-neutral-400 font-sans tracking-wide leading-tight flex items-center gap-1">
                    <span>即時上傳觀點</span>
                    <span className="text-[#DFBA87]">✦</span>
                    <span>大會現場輪播</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN PERSPECTIVES STREAM
      ───────────────────────────────────────────────────────────── */}
      <main className="relative z-10 max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 pt-8 sm:pt-12">
        {isEmergency ? (
          /* Emergency Broadcast Mode */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-3xl mx-auto space-y-6 bg-black/70 border border-[#DFBA87]/40 p-12 sm:p-16 rounded-3xl shadow-2xl my-12 backdrop-blur-xl"
          >
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-wider">
                {data?.display.emergency_message_en || 'VIS 2027 — HOW CAN AESTHETICS BECOME OUR SHARED VALUE?'}
              </h1>
              <p className="text-lg text-[#DFBA87] font-serif tracking-widest">
                {data?.display.emergency_message_zh || 'VIS 2027 當代生活文化大展 · 美，如何成為我們共同的價值？'}
              </p>
            </div>
          </motion.div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="text-center max-w-lg mx-auto py-24 space-y-5">
            <h3 className="text-xl font-serif text-white">尚無觀點展示</h3>
            <button
              onClick={() => setShowQrModal(true)}
              className="px-6 py-2.5 rounded-full bg-[#DFBA87] text-[#14120E] text-xs font-bold hover:bg-[#cf9e5e] shadow-md shadow-[#DFBA87]/20 transition-colors cursor-pointer"
            >
              立即掃碼參與
            </button>
          </div>
        ) : (
          /* Borderless Architectural Typography Flow */
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 lg:gap-x-16 gap-y-12 lg:gap-y-16 items-start"
          >
            {items.map((item, idx) => {
              const isFeatured = Boolean(item.featured);
              const questionText = getQuestionPrompt(item);

              return (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: Math.min(idx * 0.05, 0.5) }}
                  onClick={() => setSelectedItem(item)}
                  className={
                    isFeatured
                      ? "col-span-1 md:col-span-2 group relative cursor-pointer p-6 sm:p-8 -m-3 sm:-m-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-[#DFBA87]/30 hover:border-[#DFBA87]/60 transition-all duration-500 backdrop-blur-md flex flex-col justify-between shadow-xl"
                      : "col-span-1 group relative cursor-pointer p-6 sm:p-7 -m-3 sm:-m-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 hover:border-[#DFBA87]/40 transition-all duration-500 backdrop-blur-md flex flex-col justify-between shadow-lg"
                  }
                >
                  <div className="space-y-3.5">
                    {/* 1. 問題 (Question) */}
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DFBA87]" />
                      <p className="text-xs sm:text-[13px] font-serif text-[#DFBA87] tracking-wider font-medium leading-relaxed">
                        {questionText}
                      </p>
                    </div>

                    {/* 2. 答案 (Answer Quote with architectural left line) */}
                    <div className={
                      isFeatured 
                        ? "border-l-2 border-[#DFBA87] pl-5 sm:pl-7 my-3 sm:my-4" 
                        : "border-l border-white/20 pl-4 sm:pl-5 my-2.5 sm:my-3"
                    }>
                      <blockquote className={
                        isFeatured 
                          ? "text-2xl sm:text-3xl lg:text-[2.2rem] font-serif text-white leading-[1.48] tracking-wide font-normal group-hover:text-[#F3E2C8] transition-colors duration-300 drop-shadow-sm" 
                          : "text-base sm:text-lg lg:text-xl font-serif text-white/90 leading-[1.68] tracking-wide font-normal group-hover:text-white transition-colors duration-300"
                      }>
                        “{item.answer}”
                      </blockquote>
                    </div>
                  </div>

                  {/* 3. 名字 (Name) & 職稱 (Role) */}
                  <div className="flex items-center justify-end mt-4 sm:mt-5 flex-wrap gap-x-2">
                    <span className={
                      isFeatured
                        ? "text-base sm:text-lg font-serif text-[#DFBA87] font-medium tracking-widest"
                        : "text-xs sm:text-sm font-serif text-neutral-300 font-medium tracking-wider"
                    }>
                      — {item.name}
                    </span>
                    {item.role_title && (
                      <span className={
                        isFeatured
                          ? "text-xs sm:text-sm font-sans text-neutral-300 font-normal tracking-wide"
                          : "text-[11px] sm:text-xs font-sans text-neutral-400 font-normal"
                      }>
                        · {item.role_title}
                      </span>
                    )}
                  </div>

                  {/* Baseline Hairline Separator */}
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-[#DFBA87]/30 to-transparent mt-6 sm:mt-8 group-hover:via-[#DFBA87]/60 transition-all duration-500" />
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          4. UNOBTRUSIVE FLOATING CONTROLS (BOTTOM RIGHT)
      ───────────────────────────────────────────────────────────── */}
      {showScrollTop && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="p-3 rounded-full bg-black/70 hover:bg-[#DFBA87] hover:text-black border border-[#DFBA87]/50 text-[#DFBA87] transition-all shadow-lg shadow-black/50 backdrop-blur-xl cursor-pointer hover:scale-105 active:scale-95"
            title="回到頂部"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL A: FULL PERSPECTIVE VIEW
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-w-2xl w-full bg-[#141210] border border-[#DFBA87]/40 rounded-3xl p-8 sm:p-12 space-y-8 shadow-2xl text-white"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="關閉"
              >
                <X className="w-5 h-5" />
              </button>

              {/* 1. 問題 (Question) */}
              <div className="space-y-1">
                <div className="text-[11px] font-mono tracking-widest text-[#DFBA87] uppercase font-semibold">
                  PERSPECTIVE ON
                </div>
                <h3 className="text-sm sm:text-base font-serif text-[#DFBA87] font-medium leading-relaxed">
                  {getQuestionPrompt(selectedItem)}
                </h3>
              </div>

              {/* 2. 答案 (Answer Quote) */}
              <div className="relative pl-6 sm:pl-8 border-l-2 border-[#DFBA87] py-2">
                <span className="text-[#DFBA87]/30 font-serif text-5xl leading-none block -mb-4">“</span>
                <blockquote className="text-xl sm:text-2xl md:text-3xl font-serif text-white leading-relaxed font-normal">
                  {selectedItem.answer}
                </blockquote>
                <span className="text-[#DFBA87]/30 font-serif text-5xl leading-none block text-right -mt-4">”</span>
              </div>

              {/* 3. 名字 (Name) & 職稱 (Role) */}
              <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xl sm:text-2xl font-serif text-[#DFBA87] font-medium tracking-wider flex items-center gap-2 flex-wrap">
                  <span>— {selectedItem.name}</span>
                  {selectedItem.role_title && (
                    <span className="text-sm sm:text-base font-sans text-neutral-300 font-normal">
                      · {selectedItem.role_title}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#DFBA87] text-[#14120E] text-xs font-bold hover:bg-[#cf9e5e] shadow-md shadow-[#DFBA87]/25 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  返回 The Question of the Year · 年度文化命題
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL B: PARTICIPATION QR CODE MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-w-md w-full bg-[#141210] border border-[#DFBA87]/50 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl text-white overflow-hidden"
            >
              {/* Top ambient gold light */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[150px] bg-[#DFBA87]/20 rounded-full blur-3xl pointer-events-none" />

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="關閉"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-mono tracking-[0.25em] text-[#DFBA87] uppercase font-bold">
                  LIVE PARTICIPATION
                </span>
                <h3 className="text-xl sm:text-2xl font-serif text-white font-medium">
                  手機掃描 QR Code 參與作答
                </h3>
                <p className="text-xs text-neutral-300 font-light max-w-xs mx-auto pt-1 leading-relaxed">
                  打開手機相機對準下方條碼，即可直接開啟文化命題問答頁面
                </p>
              </div>

              {/* Jumbo High-Contrast QR Code */}
              <div className="inline-block p-4 sm:p-5 bg-white rounded-3xl border border-white/20 shadow-2xl">
                <QRCodeSVG
                  value={submissionUrl}
                  size={240}
                  level="H"
                  includeMargin={false}
                  fgColor="#000000"
                  className="w-52 h-52 sm:w-60 sm:h-60"
                />
              </div>

              <div className="space-y-2 pt-1 text-center">
                <div className="text-[11px] font-mono text-[#DFBA87] flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#DFBA87]" />
                  <span>提交後即刻匯入現場觀點之牆動態聯播</span>
                </div>
                <div className="text-[10px] text-neutral-400 font-sans">
                  亦可直接造訪：visforthearts.com/question
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 px-4 text-center text-xs text-neutral-400 font-mono bg-black/50 backdrop-blur-md">
        <div>VIS Contemporary Culture · Perspective Live Display 2027 · Taipei Zhongshan Hall</div>
      </footer>

    </div>
  );
}
