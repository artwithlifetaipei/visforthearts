'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DisplayItem {
  id: string;
  name: string;
  answer: string;
  type: string;
  role_title: string | null;
  display_order: number | null;
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const cachedDataRef = useRef<DisplayApiResponse | null>(null);
  const contentVersionRef = useRef<number>(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch Display API
  const fetchDisplayData = async () => {
    try {
      const res = await fetch('/api/perspectives/display', { cache: 'no-store' });
      if (!res.ok) throw new Error('Network response error');
      const json: DisplayApiResponse = await res.json();

      if (json && json.items) {
        // If content version changed or initial load, update
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

  // Carousel timer: advance every duration_seconds (LED-003)
  useEffect(() => {
    if (!data || data.display.mode === 'emergency' || data.items.length === 0) return;

    const duration = Math.max(5, Math.min(20, data.display.duration_seconds || 8)) * 1000;
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % data.items.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, data]);

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

  // Hotkey 'F' for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mouse activity reveal controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const isEmergency = data?.display.mode === 'emergency';
  const currentItem = data?.items?.[currentIndex] || null;

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-screen h-screen bg-[#050505] text-white overflow-hidden flex flex-col justify-between selection:bg-transparent cursor-none select-none"
    >
      {/* Background Architectural Ambient Texture */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-[#DFBA87]/[0.03] rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      </div>

      {/* Floating Kiosk Controls (Revealed on mouse move) */}
      <div
        className={`fixed top-4 right-4 z-50 flex items-center gap-2 transition-opacity duration-500 ${
          showControls ? 'opacity-100 cursor-default' : 'opacity-0 pointer-events-none'
        }`}
      >
        <span className="text-[10px] font-mono text-neutral-400 bg-black/60 px-2 py-1 rounded border border-white/10">
          按 F 切換全螢幕
        </span>
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded bg-black/70 hover:bg-[#DFBA87] hover:text-black text-white border border-white/20 transition-colors"
          title="切換全螢幕"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. HEADER: VIS IDENTITY & ANNUAL QUESTION (LED-002)
      ───────────────────────────────────────────────────────────── */}
      <header className="relative z-10 px-8 sm:px-16 pt-8 sm:pt-12 flex flex-col items-center text-center space-y-4">
        {/* Top Badge */}
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#DFBA87] animate-pulse" />
          <span className="text-[11px] sm:text-xs font-mono tracking-[0.35em] uppercase text-[#DFBA87] font-semibold">
            VIS Contemporary Culture 2027 · Taipei Zhongshan Hall
          </span>
          <span className="w-2 h-2 rounded-full bg-[#DFBA87] animate-pulse" />
        </div>

        {/* The Question of the Year Banner */}
        <div className="space-y-1.5 max-w-4xl mx-auto">
          <h2 className="text-sm sm:text-base md:text-lg font-serif tracking-[0.2em] uppercase text-neutral-300 font-light">
            {data?.campaign.question_en || 'WHAT DO YOU HOPE WILL STILL MATTER IN 100 YEARS?'}
          </h2>
          <h3 className="text-base sm:text-lg md:text-xl font-serif text-[#DFBA87] tracking-widest font-normal">
            {data?.campaign.question_zh || '一百年後，你希望什麼仍然重要？'}
          </h3>
        </div>

        <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#DFBA87]/40 to-transparent mt-2" />
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO CONTENT: SINGLE PERSPECTIVE DISPLAY (LED-001)
      ───────────────────────────────────────────────────────────── */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-8 sm:px-20 md:px-28 py-6">
        {isEmergency ? (
          /* Emergency Mode Card (LED-010) */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-3xl space-y-6 bg-[#0E0E0E] border border-amber-500/40 p-12 rounded-3xl shadow-2xl"
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
        ) : currentItem ? (
          /* Normal / Filtered Single Perspective Card */
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="text-center max-w-5xl mx-auto space-y-8"
            >
              {/* Type / Role Pill */}
              <div className="flex items-center justify-center gap-2">
                <span className="px-3.5 py-1 rounded-full text-[11px] font-mono tracking-widest uppercase bg-[#DFBA87]/15 text-[#DFBA87] border border-[#DFBA87]/30">
                  {currentItem.role_title
                    ? currentItem.role_title
                    : currentItem.type === 'vis_people'
                    ? 'VIS People'
                    : currentItem.type === 'artist'
                    ? 'Artist'
                    : currentItem.type === 'exhibitor'
                    ? 'Exhibitor'
                    : currentItem.type === 'vip'
                    ? 'VIP Guest'
                    : 'Visitor Perspective'}
                </span>
              </div>

              {/* Main Perspective Answer Quote (LED-005, LED-006) */}
              <blockquote className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-serif text-[#FBF6EE] leading-snug md:leading-tight tracking-wide font-normal drop-shadow-md">
                “{currentItem.answer}”
              </blockquote>

              {/* Author Display Name & Title */}
              <div className="space-y-1 pt-2">
                <div className="text-base sm:text-xl md:text-2xl font-serif text-[#DFBA87] tracking-wider font-medium">
                  — {currentItem.name}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          /* Default Empty / Standby Screen (LED-009) */
          <div className="text-center max-w-xl space-y-4">
            <h1 className="text-3xl sm:text-4xl font-serif text-white tracking-widest">
              VIS 2027 PERSPECTIVE WALL
            </h1>
            <p className="text-sm font-mono text-neutral-400 tracking-wider">
              掃描現場 QR Code · 留下你的 100 年觀點
            </p>
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. FOOTER: PROGRESS TICKER & QR CODE PROMPT
      ───────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 px-8 sm:px-16 pb-8 sm:pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500 border-t border-white/5 pt-6">
        <div className="flex items-center gap-2 text-neutral-400">
          <Sparkles className="w-3.5 h-3.5 text-[#DFBA87]" />
          <span>現場觀點即時輪播 · Scan QR Code on Venue to Participate</span>
        </div>

        {/* Counter and version */}
        {data && data.items.length > 0 && !isEmergency && (
          <div className="flex items-center gap-4 text-[11px] text-neutral-400">
            <span>
              Perspective {currentIndex + 1} of {data.items.length}
            </span>
            <div className="flex items-center gap-1">
              {data.items.slice(0, 15).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentIndex % 15 ? 'w-6 bg-[#DFBA87]' : 'w-1.5 bg-neutral-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </footer>

    </div>
  );
}
