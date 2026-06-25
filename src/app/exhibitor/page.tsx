'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, ShieldCheck, Mail, MapPin, Calendar, HelpCircle, Loader2 } from 'lucide-react';
import { ALL_ZONES, APPLICATION_DEADLINE, KEY_DATES } from '@/lib/exhibitorConstants';
import { supabase } from '@/lib/supabase';

export default function ExhibitorLandingPage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [mounted, setMounted] = useState(false);

  // Auth states
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    setMounted(true);
    const updateCountdown = () => {
      const difference = APPLICATION_DEADLINE.getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage({ text: '', type: '' });

    if (password !== confirmPassword) {
      setAuthMessage({ text: '密碼與確認密碼不符 Password mismatch', type: 'error' });
      setAuthLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setAuthMessage({ text: `註冊失敗: ${error.message}`, type: 'error' });
      } else {
        if (data?.session) {
          setSession(data.session);
          setAuthMessage({ text: '註冊成功！已自動登入並解鎖完整資訊。', type: 'success' });
        } else {
          setAuthMessage({ 
            text: '註冊成功！驗證信件已寄出，請至您的信箱點擊連結驗證以解鎖展位與價格資訊。 (若未收到請檢查垃圾信箱)', 
            type: 'success' 
          });
        }
      }
    } catch (err: any) {
      setAuthMessage({ text: `註冊異常: ${err.message || err}`, type: 'error' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage({ text: '', type: '' });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthMessage({ text: `登入失敗: ${error.message}`, type: 'error' });
      } else {
        setSession(data.session);
        setAuthMessage({ text: '登入成功！已解鎖參展商資訊。', type: 'success' });
      }
    } catch (err: any) {
      setAuthMessage({ text: `登�  return (
    <div className="min-h-screen relative bg-[#FAF9F6] text-[#0D0D0D] font-sans-outfit selection:bg-[#C9A96E] selection:text-white overflow-hidden pb-24">
      {/* Load Fonts */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Outfit:wght@200;300;400;500;600;700&display=swap');
        .font-serif-garamond { font-family: 'Cormorant Garamond', Georgia, serif; }
        .font-sans-outfit { font-family: 'Outfit', sans-serif; }
      `}} />

      {/* Background Image Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.04] bg-cover bg-center z-0 bg-fixed"
        style={{ backgroundImage: `url('/venue_bg.jpg')` }}
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,#C9A96E08,transparent_55%)] z-0" />

      {/* Sticky Navbar */}
      <nav className="sticky top-0 bg-[#FAF9F6]/75 backdrop-blur-xl border-b border-[#0D0D0D]/5 z-50 py-5 px-6 md:px-12 flex justify-between items-center transition-all duration-300">
        <Link href="/" className="flex items-center">
          <img 
            src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
            alt="VIS Logo" 
            className="h-10 w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-6">
          {session && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#0D0D0D]/50 font-light font-mono">
              <span>已登入：{session.user?.email}</span>
              <button 
                onClick={handleLogout} 
                className="text-[#C9A96E] hover:text-[#B39359] hover:underline ml-1 cursor-pointer font-medium"
              >
                登出 LOGOUT
              </button>
            </div>
          )}
          <Link 
            href="/" 
            className="text-xs tracking-[0.25em] font-light hover:text-[#C9A96E] transition-colors duration-300 flex items-center gap-2 border-b border-transparent hover:border-[#C9A96E] pb-0.5"
          >
            返回官網 BACK TO HOME
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 pt-16 md:pt-28 text-center flex flex-col items-center">
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-xs md:text-sm tracking-[0.4em] text-[#C9A96E] font-medium uppercase mb-4"
        >
          2027 VIS Lifestyle and Art Festival
        </motion.p>
        
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl md:text-6xl font-serif-garamond tracking-[0.05em] font-light leading-tight mb-3 text-[#0D0D0D]"
        >
          參展商專屬申請入口
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-sm md:text-base font-serif-garamond tracking-[0.25em] text-[#0D0D0D]/50 italic mb-10"
        >
          Exhibitor Application Portal
        </motion.p>

        {/* Banner image with premium frame */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl aspect-[3/1] md:aspect-[4/1] rounded-none overflow-hidden relative shadow-[0_15px_40px_rgba(0,0,0,0.05)] border border-[#C9A96E]/20 mb-16 p-1 bg-white"
        >
          <div className="w-full h-full overflow-hidden relative border border-[#C9A96E]/10">
            <div className="absolute inset-0 bg-[#C9A96E]/8 mix-blend-multiply z-10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 z-10" />
            <img 
              src="/exhibitor_banner_new.png" 
              alt="Zhongshan Hall Interior" 
              className="w-full h-full object-cover filter brightness-[0.9] contrast-[1.03] transition-transform duration-10000 ease-out hover:scale-105"
            />
          </div>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-base md:text-lg max-w-3xl text-[#0D0D0D]/85 font-light leading-relaxed tracking-wider mb-12 font-serif-garamond"
        >
          不斷地聚集著品味人士所建構而成的高質量場域，VIS 不只是一個博覽會，而是一個最適合「高客單價品牌」的導客解決方案。
        </motion.p>

        {/* Countdown Timer */}
        {mounted && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/60 backdrop-blur-md rounded-none p-6 border border-[#C9A96E]/20 shadow-[0_10px_30px_rgba(201,169,110,0.03)] w-full max-w-xl mb-16 relative"
          >
            <div className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C9A96E]/30 to-transparent" />
            <div className="flex items-center justify-center gap-2 mb-5 text-[#C9A96E]">
              <Clock className="w-4 h-4 animate-pulse" />
              <span className="text-[10px] tracking-[0.3em] font-semibold uppercase">申請截止倒數 COUNTDOWN TO DEADLINE</span>
            </div>
            <div className="grid grid-cols-4 gap-3 md:gap-5">
              <div className="border border-[#C9A96E]/15 p-3 bg-white/40">
                <span className="block text-2.5xl md:text-3.5xl font-light font-serif-garamond text-[#0D0D0D] tracking-wide">{timeLeft.days}</span>
                <span className="text-[9px] tracking-widest text-[#0D0D0D]/40 font-medium uppercase mt-1 block">天 Days</span>
              </div>
              <div className="border border-[#C9A96E]/15 p-3 bg-white/40">
                <span className="block text-2.5xl md:text-3.5xl font-light font-serif-garamond text-[#0D0D0D] tracking-wide">{timeLeft.hours}</span>
                <span className="text-[9px] tracking-widest text-[#0D0D0D]/40 font-medium uppercase mt-1 block">時 Hours</span>
              </div>
              <div className="border border-[#C9A96E]/15 p-3 bg-white/40">
                <span className="block text-2.5xl md:text-3.5xl font-light font-serif-garamond text-[#0D0D0D] tracking-wide">{timeLeft.minutes}</span>
                <span className="text-[9px] tracking-widest text-[#0D0D0D]/40 font-medium uppercase mt-1 block">分 Mins</span>
              </div>
              <div className="border border-[#C9A96E]/15 p-3 bg-white/40">
                <span className="block text-2.5xl md:text-3.5xl font-light font-serif-garamond text-[#0D0D0D] tracking-wide">{timeLeft.seconds}</span>
                <span className="text-[9px] tracking-widest text-[#0D0D0D]/40 font-medium uppercase mt-1 block">秒 Secs</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Hero CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-5 mb-24 relative z-20"
        >
          {session ? (
            <Link 
              href="/exhibitor/apply"
              className="bg-[#0D0D0D] hover:bg-[#C9A96E] text-white font-medium text-xs tracking-[0.25em] px-10 py-5 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] uppercase flex items-center justify-center gap-2 group"
            >
              立即線上申請 APPLY ONLINE
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          ) : (
            <button 
              onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-[#0D0D0D] hover:bg-[#C9A96E] text-white font-medium text-xs tracking-[0.25em] px-10 py-5 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] uppercase flex items-center justify-center gap-2 group cursor-pointer"
            >
              立即線上申請 APPLY ONLINE
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          )}
          <a 
            href="mailto:artwithlifetaipei@gmail.com?subject=索取 2027 VIS 參展簡章"
            className="border border-[#0D0D0D]/40 hover:border-[#0D0D0D] hover:bg-[#0D0D0D] hover:text-white text-[#0D0D0D] font-medium text-xs tracking-[0.25em] px-10 py-5 transition-all duration-300 active:scale-[0.98] uppercase flex items-center justify-center gap-2"
          >
            索取完整簡章 PROSPECTUS
          </a>
        </motion.div>
      </header>

      {/* Conditionally reveal details based on session */}
      {session ? (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Dual Funnel (Process) Section */}
          <section className="bg-white/90 border-y border-[#0D0D0D]/5 py-24 px-6 md:px-12 relative z-10">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif-garamond text-center font-light tracking-[0.1em] mb-3">
                申請流程 Application Procedure
              </h2>
              <p className="text-[10px] text-center text-[#0D0D0D]/40 font-light tracking-[0.2em] uppercase mb-16">
                Two-Step Direct Funnel Process
              </p>
              
              <div className="grid md:grid-cols-2 gap-10 relative">
                {/* Step 1 */}
                <div className="bg-[#FAF9F6] border border-[#C9A96E]/20 p-8 rounded-none relative shadow-[0_10px_35px_rgba(0,0,0,0.02)] hover:border-[#C9A96E]/50 transition-all duration-500 group">
                  <div className="absolute top-6 right-6 bg-[#C9A96E]/10 border border-[#C9A96E]/30 text-[#C9A96E] w-8 h-8 rounded-full flex items-center justify-center font-serif-garamond font-bold text-sm">
                    1
                  </div>
                  <h3 className="text-sm font-semibold text-[#C9A96E] tracking-[0.2em] uppercase mb-4">階段一：線上申請與保證金</h3>
                  <p className="text-xs text-[#0D0D0D]/75 font-light leading-relaxed">
                    填寫品牌中英文資訊、負責人聯絡管道、展位意向，並於表單內提交保證金 NT$20,000 的匯款證明截圖以啟動評選程序。
                  </p>
                  <div className="mt-6 pt-4 border-t border-[#0D0D0D]/5 text-[10px] text-[#0D0D0D]/40 font-light italic">
                    * 若評選未通過，保證金將全額原帳戶退還。
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-[#FAF9F6] border border-[#0D0D0D]/10 p-8 rounded-none relative shadow-[0_10px_35px_rgba(0,0,0,0.02)] hover:border-[#C9A96E]/40 transition-all duration-500">
                  <div className="absolute top-6 right-6 bg-neutral-100 border border-neutral-300 text-neutral-500 w-8 h-8 rounded-full flex items-center justify-center font-serif-garamond font-bold text-sm">
                    2
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-5 h-5 text-[#C9A96E]" />
                    <h3 className="text-sm font-semibold text-[#0D0D0D]/85 tracking-[0.2em] uppercase">階段二：協作平台與合約簽署</h3>
                  </div>
                  <p className="text-xs text-[#0D0D0D]/75 font-light leading-relaxed">
                    評選通過後，獲選品牌將收到數位邀請函，登入協作儀表板 (Brand Portal) 線上簽署展位規範、繳納尾款並提報媒體素材。
                  </p>
                  <div className="mt-6 pt-4 border-t border-[#0D0D0D]/5 text-[10px] text-[#C9A96E] font-medium tracking-wider">
                    *需經評選委員會評選通過，針對正式入選品牌使用
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Exhibition Zones Pricing Section */}
          <section className="max-w-7xl mx-auto px-6 py-28 relative z-10">
            <h2 className="text-3xl md:text-4xl font-serif-garamond text-center font-light tracking-[0.08em] mb-3">
              三大展區規格與參展費用
            </h2>
            <p className="text-[10px] text-center text-[#0D0D0D]/40 font-light tracking-[0.25em] uppercase mb-4">
              Exhibition Sectors & Stall Specifications
            </p>
            <p className="text-[9px] text-rose-500/80 text-center tracking-widest uppercase mb-16">
              * 所有價格均不含稅 / All prices listed above are exclusive of tax
            </p>

            <div className="grid lg:grid-cols-3 gap-10">
              {ALL_ZONES.map((zone) => (
                <div 
                  key={zone.id}
                  className="bg-white rounded-none border border-[#C9A96E]/20 overflow-hidden flex flex-col hover:border-[#C9A96E]/50 hover:shadow-xl transition-all duration-500 p-1 group"
                >
                  <div className="border border-[#C9A96E]/10 p-6 flex flex-col h-full bg-white">
                    {/* Header */}
                    <div className="text-center pb-6 border-b border-[#0D0D0D]/5 relative">
                      <div className="text-[#C9A96E] text-[10px] font-semibold tracking-[0.25em] uppercase mb-1">
                        {zone.sectorLabel}
                      </div>
                      <h3 className="font-serif-garamond text-2xl font-normal tracking-wide text-[#0D0D0D]">
                        {zone.nameZh}
                      </h3>
                      <p className="text-[9px] text-[#0D0D0D]/40 font-light tracking-widest uppercase mt-0.5">
                        {zone.nameEn}
                      </p>
                      <div className="absolute top-0 right-0 font-serif-garamond text-neutral-200 text-3xl font-bold select-none opacity-50">
                        {zone.numeral}
                      </div>
                    </div>

                    {/* Pricing Table */}
                    <div className="pt-6 flex-grow">
                      <h4 className="text-[10px] font-semibold tracking-[0.15em] text-[#C9A96E] uppercase mb-3.5">展位規格與價格 SPEC</h4>
                      <div className="border border-[#0D0D0D]/10 rounded-none overflow-hidden mb-6">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#FAF9F6] border-b border-[#0D0D0D]/10 text-[#0D0D0D]/60 font-mono text-[9px] uppercase tracking-wider">
                              <th className="p-3 font-medium">類型 / 規格</th>
                              <th className="p-3 font-medium text-right">單價 (NT$)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {zone.booths.map((booth, bIdx) => (
                              <tr 
                                key={bIdx} 
                                className="border-b border-[#0D0D0D]/5 last:border-0 hover:bg-[#FAF9F6]/50 transition-colors"
                              >
                                <td className="p-3 font-light">
                                  <span className="font-semibold block text-[#0D0D0D] tracking-wide">{booth.code}</span>
                                  <span className="text-[9px] text-[#0D0D0D]/40 mt-0.5 block">{booth.dimensions ? `尺寸: ${booth.dimensions}` : booth.note}</span>
                                </td>
                                <td className="p-3 text-right font-mono font-medium text-[#C9A96E] text-xs">
                                  ${booth.price.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Includes list */}
                      <h4 className="text-[10px] font-semibold tracking-[0.15em] text-[#C9A96E] uppercase mb-3.5">展位包含項目 INCLUDES</h4>
                      <ul className="text-xs text-[#0D0D0D]/75 space-y-2.5 mb-8 font-light">
                        <li className="flex items-start gap-2.5">
                          <span className="text-[#C9A96E] text-[10px] mt-0.5">•</span>
                          <span>3 天展出時間 (1/8 - 1/10) + 1 天佈展安裝</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-[#C9A96E] text-[10px] mt-0.5">•</span>
                          <span>參展商專屬通行證 {zone.includes.exhibitorPasses} 張</span>
                        </li>
                        {zone.includes.vipPasses !== null && (
                          <li className="flex items-start gap-2.5">
                            <span className="text-[#C9A96E] text-[10px] mt-0.5">•</span>
                            <span>大會專屬 VIP 貴賓邀請函 {zone.includes.vipPasses} 張 (可線上提報)</span>
                          </li>
                        )}
                        {zone.includes.storageArea && (
                          <li className="flex items-start gap-2.5">
                            <span className="text-[#C9A96E] text-[10px] mt-0.5">•</span>
                            <span className="font-medium text-[#0D0D0D]">{zone.includes.storageArea}</span>
                          </li>
                        )}
                        {zone.includes.vipLoungeSeating && (
                          <li className="flex items-start gap-2.5">
                            <span className="text-[#C9A96E] text-[10px] mt-0.5">•</span>
                            <span className="font-medium text-[#C9A96E]">{zone.includes.vipLoungeSeating}</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Note / Footer */}
                    <div className="bg-[#FAF9F6] p-4 border border-[#0D0D0D]/5 text-[10px] text-[#0D0D0D]/50 font-light leading-relaxed mt-auto">
                      <span className="font-semibold text-[#C9A96E] block mb-1 text-[9px] uppercase tracking-wider">說明 NOTE</span>
                      {zone.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Timeline Section */}
          <section className="bg-white/80 border-y border-[#0D0D0D]/5 py-24 px-6 md:px-12 relative z-10">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif-garamond text-center font-light tracking-[0.1em] mb-3">
                大會關鍵日程
              </h2>
              <p className="text-[10px] text-center text-[#0D0D0D]/40 font-light tracking-[0.2em] uppercase mb-20">
                Key Timeline and Critical Dates
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative">
                {KEY_DATES.map((item, idx) => (
                  <div key={idx} className="relative flex flex-col items-center text-center p-4 group">
                    {/* Visual Line connector */}
                    {idx < 3 && (
                      <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[1px] bg-[#C9A96E]/20 z-0" />
                    )}
                    <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#C9A96E]/30 flex items-center justify-center mb-5 z-10 shadow-sm text-[#C9A96E] group-hover:bg-[#C9A96E] group-hover:text-white transition-all duration-300">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h4 className="font-mono text-[#C9A96E] text-xs font-semibold tracking-wider mb-2">{item.dateStr}</h4>
                    <p className="text-xs text-[#0D0D0D]/85 font-medium tracking-wide">{item.labelZh}</p>
                    <p className="text-[9px] text-[#0D0D0D]/40 uppercase tracking-widest mt-1">{item.labelEn}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Contact & Final CTA */}
          <section className="max-w-3xl mx-auto px-6 py-28 text-center relative z-10">
            <p className="text-sm text-[#0D0D0D]/60 font-light leading-relaxed tracking-wider mb-10 font-serif-garamond">
              如對參展規範、費用或古蹟陳列規定有任何疑問，歡迎來信諮詢執行委員會秘書處。
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-5 mb-10">
              <Link 
                href="/exhibitor/apply"
                className="bg-[#0D0D0D] hover:bg-[#C9A96E] text-white font-medium text-xs tracking-[0.25em] px-10 py-5 transition-all duration-300 shadow-md flex items-center justify-center gap-2 group uppercase active:scale-[0.98]"
              >
                立即線上申請 ONLINE APPLICATION
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>

            <div className="flex justify-center items-center gap-2 text-xs text-[#0D0D0D]/50 font-mono">
              <Mail className="w-4 h-4 text-[#C9A96E]" />
              <span>大會聯絡信箱：</span>
              <a href="mailto:artwithlifetaipei@gmail.com" className="text-[#C9A96E] hover:text-[#B39359] hover:underline font-medium">
                artwithlifetaipei@gmail.com
              </a>
            </div>
          </section>
        </motion.div>
      ) : (
        /* If NOT logged in, show the elegant Lock & Auth Box */
        <section id="auth-section" className="max-w-7xl mx-auto px-6 py-24 relative z-10 scroll-mt-20">
          <div className="w-full max-w-md mx-auto bg-white border border-[#C9A96E]/20 p-1 rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.03)] relative z-10">
            <div className="border border-[#C9A96E]/10 p-8 md:p-10 flex flex-col">
              <div className="w-10 h-10 rounded-full border border-[#C9A96E]/30 flex items-center justify-center bg-[#C9A96E]/5 mx-auto text-[#C9A96E] mb-5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif-garamond text-[#0D0D0D] font-normal tracking-[0.1em] text-center mb-1">
                申請參展入口
              </h2>
              <p className="text-[9px] text-[#0D0D0D]/40 font-light tracking-[0.25em] uppercase text-center mb-6">
                EXHIBITOR APPLICATION ENTRANCE
              </p>
              <p className="text-xs text-[#0D0D0D]/60 font-light leading-relaxed text-center mb-8">
                展區規劃、展位費用及大會關鍵日程僅供註冊品牌查閱。請先登入或註冊您的帳號以解鎖瀏覽。
              </p>

              {/* Form Tabs */}
              <div className="flex border-b border-[#0D0D0D]/10 mb-8">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthMessage({ text: '', type: '' });
                  }}
                  className={`flex-1 pb-3 text-xs tracking-[0.2em] font-medium uppercase border-b transition-all duration-300 cursor-pointer ${
                    authMode === 'register' ? 'border-b-2 border-b-[#C9A96E] text-[#C9A96E]' : 'border-transparent text-[#0D0D0D]/40 hover:text-[#0D0D0D]/75'
                  }`}
                >
                  註冊 SIGN UP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthMessage({ text: '', type: '' });
                  }}
                  className={`flex-1 pb-3 text-xs tracking-[0.2em] font-medium uppercase border-b transition-all duration-300 cursor-pointer ${
                    authMode === 'login' ? 'border-b-2 border-b-[#C9A96E] text-[#C9A96E]' : 'border-transparent text-[#0D0D0D]/40 hover:text-[#0D0D0D]/75'
                  }`}
                >
                  登入 LOG IN
                </button>
              </div>

              <form onSubmit={authMode === 'register' ? handleSignUp : handleLogIn} className="space-y-6 text-left">
                <div className="relative border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                  <label className="block text-[8px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">電子信箱 Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                    required
                    disabled={authLoading}
                  />
                </div>

                <div className="relative border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                  <label className="block text-[8px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">密碼 Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                    required
                    disabled={authLoading}
                    minLength={6}
                  />
                </div>

                {authMode === 'register' && (
                  <div className="relative border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                    <label className="block text-[8px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">確認密碼 Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                      required
                      disabled={authLoading}
                      minLength={6}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#0D0D0D] hover:bg-[#C9A96E] text-white py-3.5 rounded-none text-xs font-semibold tracking-[0.25em] uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-8 cursor-pointer active:scale-[0.99] shadow-md"
                >
                  {authLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      處理中 PROCESSING...
                    </span>
                  ) : authMode === 'register' ? (
                    '註冊並解鎖 SIGN UP & UNLOCK'
                  ) : (
                    '登入並解鎖 LOG IN & UNLOCK'
                  )}
                </button>

                {authMessage.text && (
                  <div className={`text-[11px] font-light leading-relaxed p-3 rounded-none border text-center mt-4 ${
                    authMessage.type === 'error' 
                      ? 'text-rose-600 bg-rose-50 border-rose-100' 
                      : 'text-[#8C7853] bg-[#C9A96E]/5 border-[#C9A96E]/15'
                  }`}>
                    {authMessage.text}
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}d:opacity-50 mt-6 cursor-pointer"
              >
                {authLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    處理中 PROCESSING...
                  </span>
                ) : authMode === 'register' ? (
                  '註冊並解鎖 SIGN UP & UNLOCK'
                ) : (
                  '登入並解鎖 LOG IN & UNLOCK'
                )}
              </button>

              {authMessage.text && (
                <div className={`text-[11px] font-light leading-relaxed p-3 rounded border text-center mt-4 ${
                  authMessage.type === 'error' 
                    ? 'text-rose-600 bg-rose-50 border-rose-100' 
                    : 'text-emerald-700 bg-emerald-50 border-emerald-100'
                }`}>
                  {authMessage.text}
                </div>
              )}
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
