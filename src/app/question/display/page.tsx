'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Maximize2, Minimize2, Sparkles, AlertTriangle, Play, Pause, 
  QrCode, X, Filter, ArrowUp, RefreshCw, Eye, Share2, Layers
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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'featured' | 'q1' | 'q2' | 'q3'>('all');
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

  // Data processing: items filtering
  const allItems = useMemo(() => {
    return data?.items || [];
  }, [data]);

  const featuredCount = useMemo(() => {
    return allItems.filter(i => i.featured).length;
  }, [allItems]);

  const q1Count = useMemo(() => {
    return allItems.filter(i => i.question_id === 'q1').length;
  }, [allItems]);

  const q2Count = useMemo(() => {
    return allItems.filter(i => i.question_id === 'q2').length;
  }, [allItems]);

  const q3Count = useMemo(() => {
    return allItems.filter(i => i.question_id === 'q3').length;
  }, [allItems]);

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'featured') {
      return allItems.filter(i => i.featured);
    }
    if (selectedFilter === 'q1') {
      return allItems.filter(i => i.question_id === 'q1');
    }
    if (selectedFilter === 'q2') {
      return allItems.filter(i => i.question_id === 'q2');
    }
    if (selectedFilter === 'q3') {
      return allItems.filter(i => i.question_id === 'q3');
    }
    return allItems;
  }, [allItems, selectedFilter]);

  const isEmergency = data?.display.mode === 'emergency';

  const submissionUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/question`
    : 'https://www.visforthearts.com/question';

  const getQuestionLabel = (qid?: string | null) => {
    if (qid === 'q1') return '問題一：社會特質';
    if (qid === 'q2') return '問題二：美的價值';
    if (qid === 'q3') return '問題三：台灣實踐';
    return null;
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
          2. EXHIBITION MASTHEAD & LIVE STATUS CONTROLS
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[#E5DDD0]/80 bg-[#F6F3ED]/85 backdrop-blur-xl transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-14 py-4 space-y-4">
          
          {/* Top Bar: Fair Meta + Action Shortcuts */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <Link 
                href="/" 
                className="font-serif tracking-widest text-[#1C1814] font-semibold text-sm hover:text-[#8C6226] transition-colors"
              >
                VIS 2027
              </Link>
              <span className="text-[#A89F91]">/</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-[#DFBA87]/20 text-[#8C6226] border border-[#DFBA87]/50 font-bold">
                Living Perspective Wall
              </span>
              <span className="text-[#7A6B5C] font-mono text-[11px] hidden sm:inline">
                臺北中山堂 中正廳現場播映
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Auto Scroll Toggle */}
              <button
                type="button"
                onClick={() => setIsAutoScroll(prev => !prev)}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-mono tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAutoScroll
                    ? 'bg-[#DFBA87]/25 text-[#8C6226] border-[#DFBA87]/60 font-semibold shadow-xs'
                    : 'bg-white/80 text-[#574D43] border-[#E0D7C8] hover:text-[#1C1814] hover:bg-white'
                }`}
                title="切換現場畫面自動巡覽慢速滾動 (快捷鍵: 空白鍵)"
              >
                {isAutoScroll ? <Play className="w-3 h-3 text-[#8C6226] fill-[#8C6226]" /> : <Pause className="w-3 h-3 text-[#7A6B5C]" />}
                <span>{isAutoScroll ? '巡覽中 (AUTO)' : '已暫停 (PAUSE)'}</span>
              </button>

              {/* QR Code Trigger */}
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-[#4A3F35] hover:text-[#8C6226] border border-[#E0D7C8] text-[11px] font-mono tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="顯示觀眾提報 QR Code"
              >
                <QrCode className="w-3.5 h-3.5 text-[#8C6226]" />
                <span className="hidden sm:inline font-medium">參與作答</span>
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 rounded-full bg-white/80 hover:bg-[#DFBA87] hover:text-black text-[#4A3F35] border border-[#E0D7C8] transition-all cursor-pointer shadow-xs"
                title="切換全螢幕 (按 F)"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Central Exhibition Banner: The Question of the Year */}
          <div className="text-center max-w-4xl mx-auto space-y-2 pt-1 pb-1">
            <h1 className="text-xs sm:text-sm md:text-base font-serif tracking-[0.25em] uppercase text-[#8C6226] font-medium">
              HOW CAN BEAUTY BECOME OUR SHARED VALUE?
            </h1>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#1C1814] tracking-widest font-normal drop-shadow-xs">
              美，如何成為我們共同的價值？
            </h2>
            <p className="text-[11px] sm:text-xs text-[#574D43] font-light tracking-wider max-w-2xl mx-auto">
              凝聚公眾對美的社會特質、心靈價值與台灣美感實踐的深刻凝視 · 臺北中山堂現場共創觀點之牆
            </p>
          </div>

          {/* Bottom Filter & Stat Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E5DDD0]">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-[#1C1814] text-white font-semibold shadow-md'
                    : 'bg-white/80 hover:bg-white text-[#574D43] hover:text-[#1C1814] border border-[#E0D7C8] shadow-xs'
                }`}
              >
                全部觀點 ({allItems.length})
              </button>

              <button
                onClick={() => setSelectedFilter('featured')}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedFilter === 'featured'
                    ? 'bg-[#DFBA87] text-[#1C1814] font-bold shadow-md shadow-[#DFBA87]/25'
                    : 'bg-[#DFBA87]/15 hover:bg-[#DFBA87]/25 text-[#875F24] border border-[#DFBA87]/40 font-medium'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#875F24]" />
                <span>★ 大會精選 ({featuredCount})</span>
              </button>

              <button
                onClick={() => setSelectedFilter('q1')}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  selectedFilter === 'q1'
                    ? 'bg-[#1C1814] text-white font-semibold shadow-md'
                    : 'bg-white/80 hover:bg-white text-[#574D43] hover:text-[#1C1814] border border-[#E0D7C8] shadow-xs'
                }`}
              >
                問題一：社會特質 ({q1Count})
              </button>

              <button
                onClick={() => setSelectedFilter('q2')}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  selectedFilter === 'q2'
                    ? 'bg-[#1C1814] text-white font-semibold shadow-md'
                    : 'bg-white/80 hover:bg-white text-[#574D43] hover:text-[#1C1814] border border-[#E0D7C8] shadow-xs'
                }`}
              >
                問題二：美的價值 ({q2Count})
              </button>

              <button
                onClick={() => setSelectedFilter('q3')}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  selectedFilter === 'q3'
                    ? 'bg-[#1C1814] text-white font-semibold shadow-md'
                    : 'bg-white/80 hover:bg-white text-[#574D43] hover:text-[#1C1814] border border-[#E0D7C8] shadow-xs'
                }`}
              >
                問題三：台灣實踐 ({q3Count})
              </button>
            </div>

            <div className="text-[11px] font-mono text-[#7A6B5C] hidden md:flex items-center gap-2">
              <span>點擊任一張觀點卡即可特寫聚焦</span>
              <span className="opacity-30">·</span>
              <Link href="/question" target="_blank" className="text-[#8C6226] hover:underline font-medium">
                前往手機提報頁面 ↗
              </Link>
            </div>
          </div>

        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CANVAS: LIVING PERSPECTIVE WALL (GRID OF ALL PERSPECTIVES)
      ───────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-14 pt-8 sm:pt-12 relative z-10">
        {isEmergency ? (
          /* Emergency Broadcast Card (LED-010) */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-3xl mx-auto space-y-6 bg-white/90 border border-amber-500/40 p-12 sm:p-16 rounded-3xl shadow-2xl my-12 backdrop-blur-md"
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-serif text-[#1C1814] tracking-wider">
                {data?.display.emergency_message_en || 'VIS 2027 — HOW CAN BEAUTY BECOME OUR SHARED VALUE?'}
              </h1>
              <p className="text-lg text-[#8C6226] font-serif tracking-widest">
                {data?.display.emergency_message_zh || 'VIS 2027 當代生活文化大展 · 美，如何成為我們共同的價值？'}
              </p>
            </div>
            <div className="text-xs text-[#7A6B5C] font-mono tracking-widest">
              TAIPEI ZHONGSHAN HALL · 2027.01.07 – 01.09
            </div>
          </motion.div>
        ) : filteredItems.length === 0 ? (
          /* Empty State */
          <div className="text-center max-w-lg mx-auto py-24 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-white/80 border border-[#E0D7C8] flex items-center justify-center mx-auto text-[#8C6226] shadow-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-serif text-[#1C1814]">尚未有符合此分類的觀點展示</h3>
            <p className="text-xs text-[#574D43] font-light leading-relaxed">
              歡迎掃描現場 QR Code，成為第一位留下關於美之價值的共創者。
            </p>
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
          ────────────────────────────────────────────────────────── */
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 [grid-auto-flow:dense]"
          >
            {filteredItems.map((item, idx) => {
              const isFeatured = Boolean(item.featured);
              const qLabel = getQuestionLabel(item.question_id);

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
                      ? /* FEATURED / ENHANCED CARD (比較大、跨 2 欄、醒目金色光澤) */
                        "col-span-1 md:col-span-2 relative group rounded-3xl p-7 sm:p-9 lg:p-10 transition-all duration-500 bg-gradient-to-br from-white via-[#FCF8F2] to-[#F7EDE0] border-2 border-[#DFBA87] hover:border-[#B58544] shadow-[0_16px_40px_-10px_rgba(223,186,135,0.25)] hover:shadow-[0_22px_55px_-8px_rgba(223,186,135,0.35)] hover:-translate-y-1.5 backdrop-blur-2xl overflow-hidden flex flex-col justify-between cursor-pointer ring-1 ring-[#DFBA87]/30"
                      : /* STANDARD CARD (比較小、單欄、明亮溫潤白皙玻璃卡片) */
                        "col-span-1 relative group rounded-2xl p-6 sm:p-7 transition-all duration-500 bg-white/85 hover:bg-white/98 border border-[#E2D8C9] hover:border-[#B58544]/60 shadow-md shadow-[#DFBA87]/5 hover:shadow-xl hover:shadow-[#DFBA87]/15 hover:-translate-y-1 backdrop-blur-xl overflow-hidden flex flex-col justify-between cursor-pointer"
                  }
                >
                  {/* Subtle Corner Glow for Featured Cards */}
                  {isFeatured && (
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#DFBA87]/20 rounded-full blur-3xl pointer-events-none group-hover:bg-[#DFBA87]/30 transition-all duration-700" />
                  )}

                  {/* Top Metadata & Curatorial Pills */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {isFeatured ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-[#DFBA87]/30 to-amber-500/20 border border-[#DFBA87]/60 text-[#875F24] text-[10px] font-mono tracking-[0.2em] uppercase font-bold shadow-xs">
                            <Sparkles className="w-3 h-3 text-[#875F24] fill-[#875F24]" />
                            <span>大會精選 · CURATORIAL SELECTION</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#FAF5EC] border border-[#E5DDD0] text-[#7A6B5C] text-[10px] font-mono tracking-widest uppercase font-medium">
                            {item.type === 'visitor'
                              ? 'VISITOR 觀眾'
                              : item.type === 'vis_people'
                              ? 'VIS 團隊'
                              : item.type === 'artist'
                              ? 'ARTIST 藝術家'
                              : item.type === 'vip'
                              ? 'VIP 貴賓'
                              : 'EXHIBITOR 參展商'}
                          </span>
                        )}

                        {/* Question Badge */}
                        {qLabel && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#DFBA87]/15 border border-[#DFBA87]/35 text-[#875F24] text-[10px] font-mono tracking-wider font-medium">
                            {qLabel}
                          </span>
                        )}

                        {item.role_title && isFeatured && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-black/5 border border-black/10 text-[#574D43] text-[10px] font-mono tracking-wider">
                            {item.role_title}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-[#8C6226] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-semibold">
                        特寫 ↗
                      </span>
                    </div>

                    {/* Main Perspective Quote (Featured = 大字級, Regular = 雅緻標準字級) */}
                    <div className={isFeatured ? "my-5 relative" : "my-4 relative"}>
                      {isFeatured ? (
                        <div className="space-y-1">
                          <span className="text-[#DFBA87]/70 font-serif text-4xl sm:text-5xl leading-none select-none block -mb-2">“</span>
                          <blockquote className="text-2xl sm:text-3xl lg:text-[2.15rem] font-serif text-[#1C1814] leading-[1.38] tracking-wide font-normal drop-shadow-xs">
                            {item.answer}
                          </blockquote>
                          <span className="text-[#DFBA87]/70 font-serif text-4xl sm:text-5xl leading-none select-none block text-right -mt-2">”</span>
                        </div>
                      ) : (
                        <blockquote className="text-base sm:text-lg font-serif text-[#1C1814] leading-relaxed tracking-wide font-normal">
                          “{item.answer}”
                        </blockquote>
                      )}
                    </div>
                  </div>

                  {/* Bottom Author Attribution & Metadata */}
                  <div className={
                    isFeatured
                      ? "pt-4 border-t border-[#DFBA87]/30 flex items-center justify-between"
                      : "pt-3 border-t border-[#E5DDD0] flex items-center justify-between"
                  }>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        {isFeatured && <span className="text-amber-500 text-xs">★</span>}
                        <span className={
                          isFeatured
                            ? "text-lg sm:text-xl font-serif text-[#875F24] font-semibold tracking-wider"
                            : "text-xs sm:text-sm font-serif text-[#2B231D] font-medium tracking-wider"
                        }>
                          — {item.name}
                        </span>
                      </div>
                      {!isFeatured && item.role_title && (
                        <span className="text-[10px] text-[#7A6B5C] font-sans tracking-wide pl-3">
                          {item.role_title}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-[#A89F91]">
                      #{item.display_order ? String(item.display_order).padStart(2, '0') : item.id.slice(-4)}
                    </span>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          4. FLOATING PARTICIPATION DOCK (BOTTOM CENTER)
      ───────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowQrModal(true)}
          className="px-5 py-2.5 rounded-full bg-white/95 hover:bg-white border-2 border-[#DFBA87] hover:border-[#B58544] text-[#875F24] text-xs font-mono font-bold tracking-wider flex items-center gap-2 shadow-2xl shadow-[#DFBA87]/25 backdrop-blur-xl transition-all duration-300 hover:scale-105 cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-[#875F24]" />
          <span>掃描 QR Code · 留下你對美的觀點（即時登牆）</span>
        </button>

        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="p-2.5 rounded-full bg-white/95 hover:bg-white border border-[#DFBA87]/50 text-[#875F24] hover:text-[#1C1814] transition-all shadow-xl backdrop-blur-xl cursor-pointer"
            title="回到頂部"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL A: CINEMATIC SPOTLIGHT VIEW FOR ANY PERSPECTIVE
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

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {selectedItem.featured && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFBA87]/25 border border-[#DFBA87]/60 text-[#875F24] text-xs font-mono tracking-widest uppercase font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>大會精選觀點 · CURATORIAL SELECTION</span>
                  </span>
                )}

                {selectedItem.question_id && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#DFBA87]/15 border border-[#DFBA87]/40 text-[#875F24] text-xs font-mono tracking-wider font-medium">
                    {getQuestionLabel(selectedItem.question_id)}
                  </span>
                )}

                <span className="px-3 py-1 rounded-full bg-black/5 border border-black/10 text-xs font-mono text-[#574D43] uppercase tracking-wider">
                  {selectedItem.role_title || selectedItem.type}
                </span>
              </div>

              {/* Specific Question Prompt Banner */}
              {selectedItem.question_prompt && (
                <div className="p-3.5 rounded-2xl bg-[#FAF2E6] border border-[#DFBA87]/50 text-xs sm:text-sm text-[#875F24] font-serif flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-[#875F24]" />
                  <span className="leading-relaxed font-medium">題目：{selectedItem.question_prompt}</span>
                </div>
              )}

              {/* Highlight Quote */}
              <div className="space-y-4">
                <span className="text-[#DFBA87] font-serif text-5xl leading-none block -mb-4">“</span>
                <blockquote className="text-2xl sm:text-4xl md:text-5xl font-serif text-[#1C1814] leading-snug md:leading-tight tracking-wide font-normal">
                  {selectedItem.answer}
                </blockquote>
                <span className="text-[#DFBA87] font-serif text-5xl leading-none block text-right -mt-4">”</span>
              </div>

              {/* Author & Footer Action */}
              <div className="pt-6 border-t border-[#E5DDD0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xl sm:text-2xl font-serif text-[#875F24] font-medium tracking-wider">
                    — {selectedItem.name}
                  </div>
                  {selectedItem.role_title && (
                    <div className="text-xs text-[#7A6B5C] font-sans">
                      {selectedItem.role_title}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-50 text-[#1C1814] text-xs font-mono flex items-center gap-1.5 transition-colors border border-[#D8CFBF] shadow-xs cursor-pointer font-medium"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#875F24]" />
                    <span>我也要留下觀點</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="px-5 py-2.5 rounded-xl bg-[#DFBA87] text-[#1C1814] text-xs font-bold hover:bg-[#cf9e5e] shadow-md shadow-[#DFBA87]/25 transition-colors cursor-pointer"
                  >
                    返回觀點之牆
                  </button>
                </div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-md w-full bg-[#FAF7F2] border border-[#DFBA87]/50 rounded-3xl p-8 text-center space-y-6 shadow-2xl text-[#1C1814]"
            >
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-2 text-[#7A6B5C] hover:text-[#1C1814] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2">
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#875F24] block font-bold">
                  THE QUESTION OF THE YEAR 2027
                </span>
                <h3 className="text-xl font-serif text-[#1C1814]">
                  美，如何成為我們共同的價值？
                </h3>
                <p className="text-xs text-[#574D43] font-light leading-relaxed">
                  使用手機相機掃描下方 QR Code，於三道具體文化提問中任選一題回答。通過審核後將即時登上臺北中山堂現場觀點之牆。
                </p>
              </div>

              {/* QR Code Container */}
              <div className="p-6 bg-white rounded-2xl inline-block shadow-md border border-[#E5DDD0]">
                <QRCodeSVG
                  value={submissionUrl}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="text-[11px] font-mono text-[#7A6B5C]">
                網址：visforthearts.com/question
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-3 rounded-xl bg-white hover:bg-neutral-100 text-[#1C1814] text-xs font-mono font-medium transition-colors border border-[#D8CFBF] cursor-pointer"
              >
                關閉視窗
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
