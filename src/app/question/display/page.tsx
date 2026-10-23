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
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'featured' | 'visitors' | 'curatorial'>('all');
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
        setIsPausedByUser(true);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => {
            setIsPausedByUser(false);
          }, 2000);
        }, 5000);
      } else {
        window.scrollBy(0, pixelsToScroll);
      }

      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAutoScroll, isPausedByUser, selectedItem, showQrModal, data]);

  // Filtered perspectives
  const allItems = data?.items || [];
  const featuredCount = allItems.filter(i => i.featured).length;
  const visitorCount = allItems.filter(i => i.type === 'visitor').length;
  const curatorialCount = allItems.filter(i => ['vis_people', 'artist', 'vip', 'exhibitor'].includes(i.type)).length;

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'featured') {
      return allItems.filter(i => i.featured);
    }
    if (selectedFilter === 'visitors') {
      return allItems.filter(i => i.type === 'visitor');
    }
    if (selectedFilter === 'curatorial') {
      return allItems.filter(i => ['vis_people', 'artist', 'vip', 'exhibitor'].includes(i.type));
    }
    return allItems;
  }, [allItems, selectedFilter]);

  const isEmergency = data?.display.mode === 'emergency';
  const submissionUrl = 'https://www.visforthearts.com/question';

  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-[#DFBA87] selection:text-black font-sans relative pb-28">
      
      {/* ─────────────────────────────────────────────────────────────
          1. BACKGROUND ARCHITECTURAL ATMOSPHERE & AMBIENT GLOW
      ───────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Soft Golden Header Aura */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[550px] bg-[radial-gradient(ellipse_at_top,_rgba(223,186,135,0.07)_0%,_transparent_70%)]" />
        {/* Mid-canvas Warm Ambient Bloom */}
        <div className="absolute top-1/3 right-10 w-[600px] h-[600px] bg-[#DFBA87]/[0.025] rounded-full blur-[160px]" />
        <div className="absolute top-2/3 left-10 w-[700px] h-[700px] bg-[#DFBA87]/[0.02] rounded-full blur-[180px]" />
        {/* Subtle Architectural Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff06_1px,transparent_1px)] [background-size:40px_40px] opacity-60" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. EXHIBITION MASTHEAD & THE ANNUAL QUESTION HEADER
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#070707]/90 backdrop-blur-2xl border-b border-white/[0.07] px-4 sm:px-8 lg:px-14 py-5 sm:py-6 transition-all duration-300 shadow-xl shadow-black/40">
        <div className="max-w-7xl mx-auto space-y-5">
          
          {/* Top Row: Brand Eyebrow + Live Controller */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#DFBA87] animate-pulse shadow-[0_0_8px_#DFBA87]" />
              <span className="text-[11px] sm:text-xs font-mono tracking-[0.28em] uppercase text-[#DFBA87] font-medium">
                VIS CONTEMPORARY CULTURE 2027 · TAIPEI ZHONGSHAN HALL
              </span>
            </div>

            {/* Top Right Controls: Auto-Scroll, QR, Fullscreen */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {/* Auto-Scroll Toggle */}
              <button
                type="button"
                onClick={() => setIsAutoScroll(prev => !prev)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-mono tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isAutoScroll
                    ? 'bg-[#DFBA87]/15 text-[#DFBA87] border-[#DFBA87]/40 shadow-sm'
                    : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                }`}
                title="切換現場畫面自動巡覽慢速滾動 (快捷鍵: 空白鍵)"
              >
                {isAutoScroll ? <Play className="w-3 h-3 text-[#DFBA87] fill-[#DFBA87]" /> : <Pause className="w-3 h-3 text-neutral-400" />}
                <span>{isAutoScroll ? '巡覽中 (AUTO)' : '已暫停 (PAUSE)'}</span>
              </button>

              {/* QR Code Trigger */}
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-[#DFBA87] border border-white/10 text-[11px] font-mono tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                title="顯示觀眾提報 QR Code"
              >
                <QrCode className="w-3 h-3" />
                <span className="hidden sm:inline">參與作答</span>
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1.5 rounded-full bg-white/5 hover:bg-[#DFBA87] hover:text-black text-neutral-300 border border-white/10 transition-all cursor-pointer"
                title="切換全螢幕 (按 F)"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Central Exhibition Banner: The Question of the Year */}
          <div className="text-center max-w-4xl mx-auto space-y-2 pt-1 pb-1">
            <h1 className="text-xs sm:text-sm md:text-base font-serif tracking-[0.25em] uppercase text-[#E5C69F] font-light">
              {data?.campaign.question_en || 'WHAT DO YOU HOPE WILL STILL MATTER IN 100 YEARS?'}
            </h1>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-white tracking-widest font-normal drop-shadow-sm">
              {data?.campaign.question_zh || '一百年後，你希望什麼仍然重要？'}
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-400 font-light tracking-wider max-w-2xl mx-auto">
              聚集展場觀眾、藝術家、參展團隊與貴賓對未來百年的深刻凝視 · 臺北中山堂現場共創觀點之牆
            </p>
          </div>

          {/* Bottom Filter & Stat Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.05]">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  selectedFilter === 'all'
                    ? 'bg-white text-black font-semibold shadow'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                全部觀點 ({allItems.length})
              </button>

              <button
                onClick={() => setSelectedFilter('featured')}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedFilter === 'featured'
                    ? 'bg-[#DFBA87] text-black font-semibold shadow-md shadow-[#DFBA87]/20'
                    : 'bg-[#DFBA87]/10 hover:bg-[#DFBA87]/20 text-[#DFBA87] border border-[#DFBA87]/30'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>★ 大會精選 ({featuredCount})</span>
              </button>

              <button
                onClick={() => setSelectedFilter('visitors')}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  selectedFilter === 'visitors'
                    ? 'bg-white text-black font-semibold shadow'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                現場觀眾 ({visitorCount})
              </button>

              <button
                onClick={() => setSelectedFilter('curatorial')}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  selectedFilter === 'curatorial'
                    ? 'bg-white text-black font-semibold shadow'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                團隊與名家 ({curatorialCount})
              </button>
            </div>

            <div className="text-[11px] font-mono text-neutral-500 hidden md:flex items-center gap-2">
              <span>點擊任一張觀點卡即可特寫聚焦</span>
              <span className="opacity-30">·</span>
              <Link href="/question" target="_blank" className="text-[#DFBA87] hover:underline">
                前往手機提報頁面 ↗
              </Link>
            </div>
          </div>

        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CANVAS: LIVING PERSPECTIVE WALL (GRID OF ALL PERSPECTIVES)
      ───────────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-14 pt-8 sm:pt-12">
        {isEmergency ? (
          /* Emergency Broadcast Card (LED-010) */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-3xl mx-auto space-y-6 bg-[#0E0E0E] border border-amber-500/40 p-12 sm:p-16 rounded-3xl shadow-2xl my-12"
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-wider">
                {data?.display.emergency_message_en || 'VIS 2027 — LIVE PERSPECTIVE WALL'}
              </h1>
              <p className="text-lg text-[#DFBA87] font-serif tracking-widest">
                {data?.display.emergency_message_zh || 'VIS 2027 當代生活文化大展 · 現場觀點共創進行中'}
              </p>
            </div>
            <div className="text-xs text-neutral-400 font-mono tracking-widest">
              TAIPEI ZHONGSHAN HALL · 2027.01.07 – 01.09
            </div>
          </motion.div>
        ) : filteredItems.length === 0 ? (
          /* Empty State */
          <div className="text-center max-w-lg mx-auto py-24 space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#DFBA87]">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-serif text-white">尚未有符合此分類的觀點展示</h3>
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              歡迎掃描現場 QR Code，成為第一位留下未來百年提問解答的共創者。
            </p>
            <button
              onClick={() => setShowQrModal(true)}
              className="px-6 py-2.5 rounded-full bg-[#DFBA87] text-black text-xs font-semibold hover:bg-[#c9a370] transition-colors"
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
                        "col-span-1 md:col-span-2 relative group rounded-3xl p-7 sm:p-9 lg:p-10 transition-all duration-500 bg-gradient-to-br from-[#1C1813]/95 via-[#13100D]/90 to-[#0A0A0A]/95 border border-[#DFBA87]/40 hover:border-[#DFBA87]/90 shadow-[0_16px_50px_-15px_rgba(223,186,135,0.18)] hover:shadow-[0_22px_65px_-10px_rgba(223,186,135,0.28)] hover:-translate-y-1.5 backdrop-blur-2xl overflow-hidden flex flex-col justify-between cursor-pointer"
                      : /* STANDARD CARD (比較小、單欄、沉穩內斂黑曜石玻璃) */
                        "col-span-1 relative group rounded-2xl p-6 sm:p-7 transition-all duration-500 bg-[#0E0E0E]/85 hover:bg-[#141414]/95 border border-white/10 hover:border-[#DFBA87]/40 shadow-lg shadow-black/50 hover:shadow-xl hover:shadow-[#DFBA87]/5 hover:-translate-y-1 backdrop-blur-xl overflow-hidden flex flex-col justify-between cursor-pointer"
                  }
                >
                  {/* Subtle Corner Glow for Featured Cards */}
                  {isFeatured && (
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#DFBA87]/15 rounded-full blur-3xl pointer-events-none group-hover:bg-[#DFBA87]/25 transition-all duration-700" />
                  )}

                  {/* Top Metadata & Curatorial Pills */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {isFeatured ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#DFBA87]/25 to-[#DFBA87]/15 border border-[#DFBA87]/50 text-[#DFBA87] text-[10px] font-mono tracking-[0.2em] uppercase font-bold shadow-sm">
                            <Sparkles className="w-3 h-3 text-[#DFBA87] fill-[#DFBA87]" />
                            <span>大會精選 · CURATORIAL SELECTION</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-[10px] font-mono tracking-widest uppercase">
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

                        {item.role_title && isFeatured && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-[10px] font-mono tracking-wider">
                            {item.role_title}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        特寫 ↗
                      </span>
                    </div>

                    {/* Main Perspective Quote (Featured = 大字級, Regular = 雅緻標準字級) */}
                    <div className={isFeatured ? "my-5 relative" : "my-4 relative"}>
                      {isFeatured ? (
                        <div className="space-y-1">
                          <span className="text-[#DFBA87]/40 font-serif text-4xl sm:text-5xl leading-none select-none block -mb-2">“</span>
                          <blockquote className="text-2xl sm:text-3xl lg:text-[2.15rem] font-serif text-[#FFFDF8] leading-[1.38] tracking-wide font-normal drop-shadow-sm">
                            {item.answer}
                          </blockquote>
                          <span className="text-[#DFBA87]/40 font-serif text-4xl sm:text-5xl leading-none select-none block text-right -mt-2">”</span>
                        </div>
                      ) : (
                        <blockquote className="text-base sm:text-lg font-serif text-neutral-200 leading-relaxed tracking-wide font-light">
                          “{item.answer}”
                        </blockquote>
                      )}
                    </div>
                  </div>

                  {/* Bottom Author Attribution & Metadata */}
                  <div className={
                    isFeatured
                      ? "pt-4 border-t border-[#DFBA87]/20 flex items-center justify-between"
                      : "pt-3 border-t border-white/5 flex items-center justify-between"
                  }>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        {isFeatured && <span className="text-amber-400 text-xs">★</span>}
                        <span className={
                          isFeatured
                            ? "text-lg sm:text-xl font-serif text-[#DFBA87] font-semibold tracking-wider"
                            : "text-xs sm:text-sm font-serif text-neutral-300 font-medium tracking-wider"
                        }>
                          — {item.name}
                        </span>
                      </div>
                      {!isFeatured && item.role_title && (
                        <span className="text-[10px] text-neutral-500 font-sans tracking-wide pl-3">
                          {item.role_title}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-neutral-600">
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
          className="px-5 py-2.5 rounded-full bg-[#111111]/90 hover:bg-[#1A1A1A] border border-[#DFBA87]/50 hover:border-[#DFBA87] text-[#DFBA87] text-xs font-mono tracking-wider flex items-center gap-2 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 cursor-pointer"
        >
          <QrCode className="w-4 h-4 text-[#DFBA87]" />
          <span>掃描 QR Code · 留下你的百年觀點（即時登牆）</span>
        </button>

        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="p-2.5 rounded-full bg-[#111111]/90 hover:bg-[#1A1A1A] border border-white/20 text-neutral-300 hover:text-white transition-all shadow-xl backdrop-blur-xl cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-w-3xl w-full bg-[#100E0C] border border-[#DFBA87]/40 rounded-3xl p-8 sm:p-14 shadow-2xl space-y-8 overflow-hidden"
            >
              {/* Top ambient gold light */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#DFBA87]/15 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="關閉 (ESC)"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {selectedItem.featured && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFBA87]/20 border border-[#DFBA87]/50 text-[#DFBA87] text-xs font-mono tracking-widest uppercase font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>大會精選觀點 · CURATORIAL SELECTION</span>
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-neutral-300 uppercase tracking-wider">
                  {selectedItem.role_title || selectedItem.type}
                </span>
              </div>

              {/* Highlight Quote */}
              <div className="space-y-4">
                <span className="text-[#DFBA87] font-serif text-5xl leading-none block -mb-4">“</span>
                <blockquote className="text-2xl sm:text-4xl md:text-5xl font-serif text-[#FFFDF8] leading-snug md:leading-tight tracking-wide font-normal">
                  {selectedItem.answer}
                </blockquote>
                <span className="text-[#DFBA87] font-serif text-5xl leading-none block text-right -mt-4">”</span>
              </div>

              {/* Author & Footer Action */}
              <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xl sm:text-2xl font-serif text-[#DFBA87] font-medium tracking-wider">
                    — {selectedItem.name}
                  </div>
                  {selectedItem.role_title && (
                    <div className="text-xs text-neutral-400 font-sans">
                      {selectedItem.role_title}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-mono flex items-center gap-1.5 transition-colors border border-white/10 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-[#DFBA87]" />
                    <span>我也要留下觀點</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="px-5 py-2 rounded-xl bg-[#DFBA87] text-black text-xs font-semibold hover:bg-[#c9a370] transition-colors cursor-pointer"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-md w-full bg-[#111111] border border-white/15 rounded-3xl p-8 text-center space-y-6 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2">
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#DFBA87] block">
                  THE QUESTION OF THE YEAR 2027
                </span>
                <h3 className="text-xl font-serif text-white">
                  留下你的一百年觀點
                </h3>
                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                  使用手機相機掃描下方 QR Code，填寫並送出你的答案。通過審核後將即時登上臺北中山堂現場觀點之牆。
                </p>
              </div>

              {/* QR Code Container */}
              <div className="p-6 bg-white rounded-2xl inline-block shadow-xl">
                <QRCodeSVG
                  value={submissionUrl}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="text-[11px] font-mono text-neutral-500">
                網址：visforthearts.com/question
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-mono transition-colors border border-white/10"
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
