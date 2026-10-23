'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Maximize2, Minimize2, Play, Pause, 
  QrCode, X, ArrowUp, ArrowUpRight
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
  const contentVersionRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Display API
  const fetchDisplayData = async () => {
    try {
      const res = await fetch('/api/perspectives/display', { cache: 'no-store' });
      if (!res.ok) throw new Error('Network response error');
      const json: DisplayApiResponse = await res.json();

      if (json && json.items) {
        if (json.campaign.content_version !== contentVersionRef.current) {
          contentVersionRef.current = json.campaign.content_version;
          setData(json);
          cachedDataRef.current = json;
        } else if (!data) {
          setData(json);
          cachedDataRef.current = json;
        }
      }
    } catch (err) {
      console.warn('API sync warning, keeping offline cache (LED-008):', err);
      if (!data && cachedDataRef.current) {
        setData(cachedDataRef.current);
      }
    }
  };

  // Initial fetch and 30s auto-refresh polling (LED-007)
  useEffect(() => {
    fetchDisplayData();
    const interval = setInterval(fetchDisplayData, 30000);
    return () => clearInterval(interval);
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
    if (item.question_id === 'q2') return '對你來說，美的事物，它的價值是什麼？一個句話形容。';
    if (item.question_id === 'q3') return '如果希望台灣成為一個更有美感的地方，你最希望大家開始重視什麼？';
    return '美，如何成為我們共同的價值？';
  };

  return (
    <div className="min-h-screen bg-[#F6F3ED] text-[#1C1814] font-sans selection:bg-[#DFBA87] selection:text-black relative overflow-x-hidden pb-24">
      
      {/* ─────────────────────────────────────────────────────────────
          1. FULL-BLEED ARCHITECTURAL BACKGROUND FROM VIP LOBBY
      ───────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <img
          src="/vip_lobby_bg.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{ filter: 'brightness(0.42) saturate(0.8)' }}
        />
        {/* Warm ivory / champagne gradient overlay preserving authentic architectural lighting */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(246,243,237,0.85) 0%, rgba(240,235,225,0.65) 40%, rgba(246,243,237,0.92) 100%)'
          }}
        />
        {/* Subtle gold ambient glow top */}
        <div 
          className="absolute inset-0" 
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(223,186,135,0.18) 0%, transparent 65%)' }} 
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EXHIBITION MASTHEAD (SLEEK & MINIMAL PER UI/UX PRO MAX)
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[#E5DDD0]/80 bg-[#F6F3ED]/85 backdrop-blur-xl transition-all shadow-xs">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 py-3.5 sm:py-4 space-y-3 sm:space-y-4">
          
          {/* Top Bar: VIS Logo (Left) + Scannable QR Code & Controls (Right) */}
          <div className="flex items-center justify-between gap-4">
            
            {/* Top-Left: VIS Logo + Subtitle */}
            <div className="flex items-center gap-3.5">
              <Link 
                href="/" 
                className="flex items-center gap-2 group transition-opacity hover:opacity-80"
                title="返回 VIS 首頁"
              >
                <img 
                  src="/vis_logo.png" 
                  alt="VIS" 
                  className="h-8 sm:h-9 w-auto object-contain"
                />
              </Link>
              <div className="hidden sm:block h-4 w-px bg-[#D8CFBF]" />
              <span className="hidden sm:inline-block text-[10px] sm:text-[11px] font-mono tracking-[0.2em] uppercase text-[#8C6226] font-semibold">
                The Question of the Year · 年度文化命題
              </span>
            </div>

            {/* Top-Right: Scannable QR Code Card & Exhibition Controls */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              
              {/* Operator Utility Tools: Auto-scroll & Fullscreen */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Auto Scroll Toggle */}
                <button
                  type="button"
                  onClick={() => setIsAutoScroll(prev => !prev)}
                  className={`px-3 py-1.5 rounded-full border text-[11px] font-mono tracking-wider flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
                    isAutoScroll
                      ? 'bg-[#DFBA87]/20 text-[#8C6226] border-[#DFBA87]/50 font-semibold shadow-2xs'
                      : 'bg-white/80 text-[#574D43] border-[#E0D7C8] hover:text-[#1C1814] hover:bg-white'
                  }`}
                  title="切換畫面自動漫遊慢速滾動 (快捷鍵: 空白鍵)"
                >
                  {isAutoScroll ? <Play className="w-3 h-3 text-[#8C6226] fill-[#8C6226]" /> : <Pause className="w-3 h-3 text-[#7A6B5C]" />}
                  <span className="hidden md:inline">{isAutoScroll ? '巡覽中' : '已暫停'}</span>
                </button>

                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 sm:p-2 rounded-full bg-white/80 hover:bg-[#DFBA87] hover:text-black text-[#4A3F35] border border-[#E0D7C8] transition-all duration-300 cursor-pointer shadow-2xs"
                  title="切換全螢幕 (快捷鍵: 按 F)"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* The Scannable QR Code Badge (Top-Right of Public Digital Wall) */}
              <div
                onClick={() => setShowQrModal(true)}
                className="group relative flex items-center gap-2.5 sm:gap-3 bg-white/90 hover:bg-white backdrop-blur-xl border border-[#DFBA87]/50 hover:border-[#B58544] rounded-2xl p-1.5 sm:p-2 shadow-xs hover:shadow-lg hover:shadow-[#DFBA87]/15 transition-all duration-300 cursor-pointer ring-1 ring-[#DFBA87]/20 hover:ring-[#DFBA87]/40"
                title="點擊放大 QR Code · 掃碼提報觀點"
              >
                {/* QR Code Container */}
                <div className="bg-white p-1 sm:p-1.5 rounded-xl border border-[#EDE5D8] shadow-2xs group-hover:scale-[1.02] transition-transform duration-300 flex-shrink-0">
                  <QRCodeSVG
                    value={submissionUrl}
                    size={80}
                    level="H"
                    includeMargin={false}
                    fgColor="#1C1814"
                    className="w-12 h-12 sm:w-[68px] sm:h-[68px] lg:w-[78px] lg:h-[78px]"
                  />
                </div>

                {/* Text & Prompt */}
                <div className="flex flex-col justify-center text-left space-y-0.5 pr-1 sm:pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DFBA87] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#8C6226]" />
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.16em] uppercase text-[#8C6226] font-semibold whitespace-nowrap">
                      LIVE CO-CREATE
                    </span>
                  </div>

                  <div className="text-xs sm:text-[13px] lg:text-sm font-serif font-medium text-[#1C1814] tracking-wider leading-tight group-hover:text-[#8C6226] transition-colors whitespace-nowrap">
                    掃碼參與作答
                  </div>

                  <div className="text-[9px] sm:text-[10px] font-mono text-[#7A6B5C] tracking-tight flex items-center gap-1 whitespace-nowrap">
                    <span>即時登牆播映</span>
                    <ArrowUpRight className="w-3 h-3 text-[#8C6226] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Central Exhibition Banner: Generous Breathing Room */}
          <div className="text-center max-w-4xl mx-auto space-y-2 pt-1 pb-1 sm:pt-2 sm:pb-2">
            <h1 className="text-xs sm:text-sm font-serif tracking-[0.28em] uppercase text-[#8C6226] font-medium">
              HOW CAN AESTHETICS BECOME OUR SHARED VALUE?
            </h1>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#1C1814] tracking-[0.08em] font-normal drop-shadow-xs">
              美，如何成為我們共同的價值？
            </h2>
            <div className="w-8 h-[1px] bg-[#DFBA87] mx-auto mt-2.5 rounded-full opacity-70" />
          </div>

        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CANVAS: LIVING PERSPECTIVE WALL
             Only displays: Question, Answer, Name
          ───────────────────────────────────────────────────────────── */}
      <main className="max-w-[1720px] mx-auto px-4 sm:px-8 lg:px-12 pt-8 sm:pt-12 relative z-10">
        {isEmergency ? (
          /* Emergency Broadcast Card (LED-010) */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-3xl mx-auto space-y-6 bg-white/90 border border-amber-500/40 p-12 sm:p-16 rounded-3xl shadow-2xl my-12 backdrop-blur-md"
          >
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-serif text-[#1C1814] tracking-wider">
                {data?.display.emergency_message_en || 'VIS 2027 — HOW CAN AESTHETICS BECOME OUR SHARED VALUE?'}
              </h1>
              <p className="text-lg text-[#8C6226] font-serif tracking-widest">
                {data?.display.emergency_message_zh || 'VIS 2027 當代生活文化大展 · 美，如何成為我們共同的價值？'}
              </p>
            </div>
          </motion.div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="text-center max-w-lg mx-auto py-24 space-y-5">
            <h3 className="text-xl font-serif text-[#1C1814]">尚無觀點展示</h3>
            <button
              onClick={() => setShowQrModal(true)}
              className="px-6 py-2.5 rounded-full bg-[#DFBA87] text-[#1C1814] text-xs font-bold hover:bg-[#cf9e5e] shadow-md shadow-[#DFBA87]/20 transition-colors cursor-pointer"
            >
              立即掃碼參與
            </button>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────
             DYNAMIC EDITORIAL WALL (DENSE MULTI-COLUMN GRID)
             - Featured perspectives: span 2 cols, significantly larger
             - Standard perspectives: span 1 col, harmoniously smaller
             - Contains ONLY: Question, Answer, Name
          ────────────────────────────────────────────────────────── */
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 [grid-auto-flow:dense]"
          >
            {items.map((item, idx) => {
              const isFeatured = Boolean(item.featured);
              const questionText = getQuestionPrompt(item);

              return (
                <motion.article
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: Math.min(idx * 0.04, 0.6) }}
                  onClick={() => setSelectedItem(item)}
                  className={
                    isFeatured
                      ? /* FEATURED / ENHANCED CARD (俐落大氣、跨 2 欄、高級香檳金光澤) */
                        "col-span-1 md:col-span-2 relative group rounded-2xl p-7 sm:p-9 lg:p-10 transition-all duration-300 ease-out bg-gradient-to-br from-white/95 via-[#FCF9F3]/90 to-[#F7EFE2]/90 border border-[#DFBA87] hover:border-[#B58544] shadow-md hover:shadow-xl hover:shadow-[#DFBA87]/15 hover:-translate-y-1 backdrop-blur-xl overflow-hidden flex flex-col justify-between cursor-pointer"
                      : /* STANDARD CARD (極簡俐落、單欄、通透純淨) */
                        "col-span-1 relative group rounded-2xl p-6 sm:p-7 transition-all duration-300 ease-out bg-white/80 hover:bg-white/95 border border-[#E5DDD0] hover:border-[#B58544] shadow-xs hover:shadow-md hover:shadow-[#DFBA87]/10 hover:-translate-y-0.5 backdrop-blur-md overflow-hidden flex flex-col justify-between cursor-pointer"
                  }
                >
                  {/* 1. 問題 (Question) + 2. 答案 (Answer) */}
                  <div className="space-y-3">
                    <p className={`font-serif tracking-wide leading-relaxed ${
                      isFeatured 
                        ? 'text-xs sm:text-sm text-[#8C6226] font-medium' 
                        : 'text-[11px] sm:text-xs text-[#8C6226] font-medium'
                    }`}>
                      {questionText}
                    </p>

                    <blockquote className={
                      isFeatured 
                        ? "text-2xl sm:text-3xl lg:text-[2.1rem] font-serif text-[#1C1814] leading-[1.4] tracking-wide font-normal drop-shadow-xs my-3" 
                        : "text-base sm:text-lg font-serif text-[#1C1814] leading-[1.65] tracking-wide font-normal my-2"
                    }>
                      “{item.answer}”
                    </blockquote>
                  </div>

                  {/* 3. 名字 (Name) */}
                  <div className={`pt-3.5 flex items-center justify-end ${
                    isFeatured ? "border-t border-[#DFBA87]/30" : "border-t border-[#EAE3D6]"
                  }`}>
                    <span className={
                      isFeatured
                        ? "text-base sm:text-lg font-serif text-[#875F24] font-semibold tracking-wider"
                        : "text-xs sm:text-sm font-serif text-[#3D332A] font-medium tracking-wider"
                    }>
                      — {item.name}
                    </span>
                  </div>
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
            className="p-3 rounded-full bg-white/90 hover:bg-white border border-[#DFBA87]/60 text-[#875F24] hover:text-[#1C1814] transition-all shadow-lg shadow-[#DFBA87]/15 backdrop-blur-xl cursor-pointer hover:scale-105 active:scale-95"
            title="回到頂部"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL A: CINEMATIC SPOTLIGHT VIEW FOR ANY PERSPECTIVE
          Only displays: Question, Answer, Name
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-w-3xl w-full bg-[#FAF7F2] border-2 border-[#DFBA87]/60 rounded-3xl p-8 sm:p-14 shadow-2xl space-y-7 overflow-hidden text-[#1C1814]"
            >
              {/* Top ambient gold light */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#DFBA87]/20 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-black/5 hover:bg-black/10 text-[#4A3F35] hover:text-[#1C1814] transition-colors cursor-pointer"
                title="關閉 (ESC)"
              >
                <X className="w-5 h-5" />
              </button>

              {/* 1. 問題 (Question) */}
              <div className="p-3.5 rounded-2xl bg-[#FAF2E6] border border-[#DFBA87]/50 text-xs sm:text-sm text-[#8C6226] font-serif leading-relaxed font-medium">
                {getQuestionPrompt(selectedItem)}
              </div>

              {/* 2. 答案 (Answer) */}
              <div className="space-y-4">
                <span className="text-[#DFBA87] font-serif text-5xl leading-none block -mb-4">“</span>
                <blockquote className="text-2xl sm:text-4xl md:text-5xl font-serif text-[#1C1814] leading-snug md:leading-tight tracking-wide font-normal">
                  {selectedItem.answer}
                </blockquote>
                <span className="text-[#DFBA87] font-serif text-5xl leading-none block text-right -mt-4">”</span>
              </div>

              {/* 3. 名字 (Name) */}
              <div className="pt-6 border-t border-[#E5DDD0] flex items-center justify-between">
                <div className="text-xl sm:text-2xl font-serif text-[#875F24] font-medium tracking-wider">
                  — {selectedItem.name}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-5 py-2.5 rounded-xl bg-[#DFBA87] text-[#1C1814] text-xs font-bold hover:bg-[#cf9e5e] shadow-md shadow-[#DFBA87]/25 transition-colors cursor-pointer"
                >
                  返回 The Question of the Year · 年度文化命題
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MODAL B: PARTICIPATION QR CODE MODAL (ENLARGED PRESENTATION)
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-w-md w-full bg-[#FAF7F2] border border-[#DFBA87]/60 rounded-3xl p-8 sm:p-10 text-center space-y-6 shadow-2xl text-[#1C1814] overflow-hidden"
            >
              {/* Top ambient gold light */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[150px] bg-[#DFBA87]/25 rounded-full blur-3xl pointer-events-none" />

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full bg-black/5 hover:bg-black/10 text-[#7A6B5C] hover:text-[#1C1814] transition-colors cursor-pointer"
                title="關閉視窗 (ESC)"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2 pt-2">
                <span className="text-[10.5px] font-mono tracking-[0.22em] uppercase text-[#8C6226] block font-semibold">
                  THE QUESTION OF THE YEAR · 年度文化命題
                </span>
                <h3 className="text-xl sm:text-2xl font-serif text-[#1C1814] font-normal">
                  美，如何成為我們共同的價值？
                </h3>
                <p className="text-xs text-[#7A6B5C] font-serif leading-relaxed max-w-xs mx-auto">
                  拿起手機相機掃描，立即選題填寫你的觀點，審核後即時同步登牆播映。
                </p>
              </div>

              {/* QR Code Container */}
              <div className="p-6 bg-white rounded-2xl inline-block shadow-md border border-[#E5DDD0] ring-1 ring-[#DFBA87]/20">
                <QRCodeSVG
                  value={submissionUrl}
                  size={220}
                  level="H"
                  includeMargin={false}
                  fgColor="#1C1814"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#E5DDD0] text-[11px] font-mono text-[#7A6B5C]">
                <span>{submissionUrl.replace(/^https?:\/\//, '')}</span>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-3 rounded-xl bg-white hover:bg-[#FAF2E6] text-[#1C1814] text-xs font-mono font-medium transition-colors border border-[#D8CFBF] hover:border-[#DFBA87] cursor-pointer shadow-2xs"
              >
                關閉視窗 (ESC)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
