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
      setAuthMessage({ text: `登入異常: ${err.message || err}`, type: 'error' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <div className="min-h-screen relative bg-[#FAF9F6] text-[#0D0D0D] font-sans-outfit selection:bg-[#C9A96E] selection:text-white overflow-hidden pb-16">
      {/* Load Fonts */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Outfit:wght@200;300;400;500;600;700&display=swap');
        .font-serif-garamond { font-family: 'Cormorant Garamond', Georgia, serif; }
        .font-sans-outfit { font-family: 'Outfit', sans-serif; }
      `}} />

      {/* Background Image Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.06] bg-cover bg-center z-0 bg-fixed"
        style={{ backgroundImage: `url('/venue_bg.jpg')` }}
      />

      {/* Sticky Navbar */}
      <nav className="sticky top-0 bg-[#FAF9F6]/80 backdrop-blur-md border-b border-[#0D0D0D]/5 z-50 py-4 px-6 md:px-12 flex justify-between items-center transition-all duration-300">
        <Link href="/" className="flex items-center">
          <img 
            src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
            alt="VIS Logo" 
            className="h-10 w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-6">
          {session && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#0D0D0D]/60 font-light">
              <span>已登入：{session.user?.email}</span>
              <button 
                onClick={handleLogout} 
                className="text-[#C9A96E] hover:underline ml-1 cursor-pointer font-medium"
              >
                登出 LOGOUT
              </button>
            </div>
          )}
          <Link 
            href="/" 
            className="text-sm tracking-[0.2em] font-light hover:text-[#C9A96E] transition-colors duration-300 flex items-center gap-2 border-b border-transparent hover:border-[#C9A96E] pb-0.5"
          >
            返回官網 BACK TO HOME
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 pt-12 md:pt-20 text-center flex flex-col items-center">
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-xs md:text-sm tracking-[0.35em] text-[#C9A96E] font-medium uppercase mb-4"
        >
          2027 VIS Lifestyle and Art Festival
        </motion.p>
        
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-4xl md:text-6xl font-serif-garamond tracking-wide font-light leading-tight mb-2"
        >
          參展商專屬申請入口
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-lg md:text-xl font-serif-garamond tracking-widest text-[#0D0D0D]/60 italic mb-8"
        >
          Exhibitor Application Portal
        </motion.p>

        {/* Banner image with sepia/warm tone overlay */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full max-w-5xl aspect-[3/1] md:aspect-[4/1] rounded-lg overflow-hidden relative shadow-xl border border-[#C9A96E]/20 mb-12"
        >
          <div className="absolute inset-0 bg-[#C9A96E]/15 mix-blend-multiply z-10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 z-10" />
          <img 
            src="/exhibitor_banner_new.png" 
            alt="Zhongshan Hall Interior" 
            className="w-full h-full object-cover filter brightness-[0.85] contrast-[1.05]"
          />
        </motion.div>

        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-base md:text-lg max-w-3xl text-[#0D0D0D]/75 font-light leading-relaxed tracking-wider mb-10"
        >
          不斷地聚集著品味人士所建構而成的高質量場域，VIS 不只是一個博覽會，而是一個最適合「高客單價品牌」的導客解決方案。
        </motion.p>

        {/* Countdown Timer */}
        {mounted && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-[#C9A96E]/25 shadow-lg w-full max-w-xl mb-12"
          >
            <div className="flex items-center justify-center gap-2 mb-4 text-[#C9A96E]">
              <Clock className="w-5 h-5 animate-pulse" />
              <span className="text-xs tracking-[0.25em] font-semibold uppercase">申請截止倒數 COUNTDOWN TO DEADLINE</span>
            </div>
            <div className="grid grid-cols-4 gap-2 md:gap-4">
              <div className="bg-[#FAF9F6] p-3 rounded-lg border border-[#0D0D0D]/5">
                <span className="block text-2xl md:text-3xl font-bold font-serif-garamond text-[#C9A96E]">{timeLeft.days}</span>
                <span className="text-[10px] md:text-xs tracking-wider text-[#0D0D0D]/50 font-light">天 Days</span>
              </div>
              <div className="bg-[#FAF9F6] p-3 rounded-lg border border-[#0D0D0D]/5">
                <span className="block text-2xl md:text-3xl font-bold font-serif-garamond text-[#C9A96E]">{timeLeft.hours}</span>
                <span className="text-[10px] md:text-xs tracking-wider text-[#0D0D0D]/50 font-light">時 Hours</span>
              </div>
              <div className="bg-[#FAF9F6] p-3 rounded-lg border border-[#0D0D0D]/5">
                <span className="block text-2xl md:text-3xl font-bold font-serif-garamond text-[#C9A96E]">{timeLeft.minutes}</span>
                <span className="text-[10px] md:text-xs tracking-wider text-[#0D0D0D]/50 font-light">分 Mins</span>
              </div>
              <div className="bg-[#FAF9F6] p-3 rounded-lg border border-[#0D0D0D]/5">
                <span className="block text-2xl md:text-3xl font-bold font-serif-garamond text-[#C9A96E]">{timeLeft.seconds}</span>
                <span className="text-[10px] md:text-xs tracking-wider text-[#0D0D0D]/50 font-light">秒 Secs</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Hero CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 mb-20 relative z-20"
        >
          {session ? (
            <Link 
              href="/exhibitor/apply"
              className="bg-[#C9A96E] hover:bg-[#B39359] text-white font-medium text-sm tracking-[0.15em] px-8 py-4 rounded transition-all duration-300 shadow-md flex items-center justify-center gap-2 group"
            >
              立即線上申請 APPLY ONLINE
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <button 
              onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-[#C9A96E] hover:bg-[#B39359] text-white font-medium text-sm tracking-[0.15em] px-8 py-4 rounded transition-all duration-300 shadow-md flex items-center justify-center gap-2 group cursor-pointer"
            >
              立即線上申請 APPLY ONLINE
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          <a 
            href="mailto:artwithlifetaipei@gmail.com?subject=索取 2027 VIS 參展簡章"
            className="border border-[#C9A96E] hover:bg-[#C9A96E]/5 text-[#C9A96E] font-medium text-sm tracking-[0.15em] px-8 py-4 rounded transition-all duration-300 flex items-center justify-center gap-2"
          >
            索取完整簡章 PROSPECTUS
          </a>
        </motion.div>
      </header>

      {/* Conditionally reveal details based on session */}
      {session ? (
        <>
          {/* Dual Funnel (Process) Section */}
          <section className="bg-white/90 border-y border-[#0D0D0D]/5 py-16 px-6 md:px-12 relative z-10">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif-garamond text-center font-light tracking-widest mb-12">
                申請流程 Application Procedure
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8 relative">
                {/* Step 1 */}
                <div className="bg-[#FAF9F6] p-8 rounded-xl border border-[#C9A96E]/20 relative shadow-sm hover:shadow-md transition-shadow">
                  <div className="absolute top-4 right-4 bg-[#C9A96E] text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <h3 className="text-lg font-medium text-[#C9A96E] tracking-widest uppercase mb-3">階段一：線上申請與保證金</h3>
                  <div className="mt-4 pt-4 border-t border-[#0D0D0D]/5 text-xs text-[#0D0D0D]/50 italic">
                    * 若評選未通過，保證金將全額原帳戶退還。
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-[#FAF9F6] p-8 rounded-xl border border-[#0D0D0D]/10 relative shadow-sm bg-gradient-to-br from-[#FAF9F6] to-[#0D0D0D]/5">
                  <div className="absolute top-4 right-4 bg-neutral-400 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-[#C9A96E]" />
                    <h3 className="text-lg font-medium text-[#0D0D0D]/85 tracking-widest uppercase">階段二：協作平台與合約簽署</h3>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#0D0D0D]/5 text-xs text-[#C9A96E] font-medium">
                    *需經評選委員會評選通過，針對正式入選品牌使用
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Exhibition Zones Pricing Section */}
          <section className="max-w-7xl mx-auto px-6 py-20 relative z-10">
            <h2 className="text-3xl md:text-4xl font-serif-garamond text-center font-light tracking-widest mb-4">
              三大展區規格與參展費用
            </h2>
            <p className="text-sm text-[#0D0D0D]/50 text-center font-light tracking-widest uppercase mb-4">
              Exhibition Sectors & Stall Specifications
            </p>
            <p className="text-[10px] text-rose-500/80 text-center tracking-wider uppercase mb-12">
              * 所有價格均不含稅 / All prices listed above are exclusive of tax
            </p>

            <div className="grid lg:grid-cols-3 gap-8">
              {ALL_ZONES.map((zone, idx) => (
                <div 
                  key={zone.id}
                  className="bg-white rounded-xl shadow-md border border-[#C9A96E]/20 overflow-hidden flex flex-col hover:border-[#C9A96E]/50 transition-all duration-300 group"
                >
                  {/* Header */}
                  <div className="bg-[#0D0D0D] text-white p-6 text-center border-b border-[#C9A96E]/30 relative">
                    <div className="text-[#C9A96E] text-xs font-semibold tracking-[0.25em] uppercase mb-1">
                      {zone.sectorLabel}
                    </div>
                    <h3 className="font-serif-garamond text-xl font-normal tracking-wider text-[#FAF9F6]">
                      {zone.nameZh}
                    </h3>
                    <p className="text-[10px] text-neutral-400 font-light tracking-widest uppercase mt-0.5">
                      {zone.nameEn}
                    </p>
                    <div className="absolute top-2 right-4 font-serif-garamond text-neutral-700 text-3xl font-bold select-none">
                      {zone.numeral}
                    </div>
                  </div>

                  {/* Pricing Table */}
                  <div className="p-6 flex-grow">
                    <h4 className="text-xs font-semibold tracking-wider text-[#C9A96E] uppercase mb-3">展位規格與價格</h4>
                    <div className="border border-[#0D0D0D]/10 rounded overflow-hidden mb-6">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#FAF9F6] border-b border-[#0D0D0D]/10">
                            <th className="p-2.5 font-medium tracking-wide">類型 / 規格</th>
                            <th className="p-2.5 font-medium tracking-wide text-right">單價 (NT$)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {zone.booths.map((booth, bIdx) => (
                            <tr 
                              key={bIdx} 
                              className="border-b border-[#0D0D0D]/5 last:border-0 hover:bg-[#FAF9F6]/50 transition-colors"
                            >
                              <td className="p-2.5 font-light">
                                <span className="font-semibold block text-[#0D0D0D]">{booth.code}</span>
                                <span className="text-[10px] text-[#0D0D0D]/50">{booth.dimensions ? `尺寸: ${booth.dimensions}` : booth.note}</span>
                              </td>
                              <td className="p-2.5 text-right font-mono font-medium text-[#C9A96E]">
                                ${booth.price.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Includes list */}
                    <h4 className="text-xs font-semibold tracking-wider text-[#C9A96E] uppercase mb-3">展位包含項目</h4>
                    <ul className="text-xs text-[#0D0D0D]/75 space-y-2 mb-6 font-light">
                      <li className="flex items-start gap-2">
                        <span className="text-[#C9A96E]">•</span>
                        <span>3 天展出時間 (1/8 - 1/10) + 1 天佈展安裝</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#C9A96E]">•</span>
                        <span>參展商專屬通行證 {zone.includes.exhibitorPasses} 張</span>
                      </li>
                      {zone.includes.vipPasses !== null && (
                        <li className="flex items-start gap-2">
                          <span className="text-[#C9A96E]">•</span>
                          <span>大會專屬 VIP 貴賓邀請函 {zone.includes.vipPasses} 張 (可線上提報)</span>
                        </li>
                      )}
                      {zone.includes.storageArea && (
                        <li className="flex items-start gap-2">
                          <span className="text-[#C9A96E]">•</span>
                          <span className="font-medium">{zone.includes.storageArea}</span>
                        </li>
                      )}
                      {zone.includes.vipLoungeSeating && (
                        <li className="flex items-start gap-2">
                          <span className="text-[#C9A96E]">•</span>
                          <span className="font-medium text-[#C9A96E]">{zone.includes.vipLoungeSeating}</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Note / Footer */}
                  <div className="bg-[#FAF9F6] p-4 border-t border-[#0D0D0D]/5 text-[11px] text-[#0D0D0D]/60 font-light leading-relaxed">
                    <span className="font-medium text-[#C9A96E] block mb-1">說明 NOTE</span>
                    {zone.note}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Timeline Section */}
          <section className="bg-white/80 border-y border-[#0D0D0D]/5 py-16 px-6 md:px-12 relative z-10">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif-garamond text-center font-light tracking-widest mb-12">
                大會關鍵日程
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
                {KEY_DATES.map((item, idx) => (
                  <div key={idx} className="relative flex flex-col items-center text-center p-4">
                    {/* Visual Line connector */}
                    {idx < 3 && (
                      <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-[#C9A96E]/20 z-0" />
                    )}
                    <div className="w-12 h-12 rounded-full bg-[#FAF9F6] border border-[#C9A96E]/30 flex items-center justify-center mb-4 z-10 shadow-sm text-[#C9A96E]">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <h4 className="font-mono text-[#C9A96E] text-sm font-semibold mb-1">{item.dateStr}</h4>
                    <p className="text-xs text-[#0D0D0D]/80 font-medium tracking-wide">{item.labelZh}</p>
                    <p className="text-[10px] text-[#0D0D0D]/50 uppercase tracking-widest mt-0.5">{item.labelEn}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Contact & Final CTA */}
          <section className="max-w-3xl mx-auto px-6 py-20 text-center relative z-10">
            <p className="text-sm text-[#0D0D0D]/60 font-light leading-relaxed tracking-wider mb-10">
              如對參展規範、費用或古蹟陳列規定有任何疑問，歡迎來信諮詢執行委員會秘書處。
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <Link 
                href="/exhibitor/apply"
                className="bg-[#0D0D0D] hover:bg-neutral-800 text-[#FAF9F6] hover:text-white font-medium text-sm tracking-[0.15em] px-8 py-4 rounded transition-all duration-300 shadow-md flex items-center justify-center gap-2 group"
              >
                立即線上申請 ONLINE APPLICATION
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="flex justify-center items-center gap-2 text-xs text-[#0D0D0D]/60 font-mono">
              <Mail className="w-4 h-4 text-[#C9A96E]" />
              <span>大會聯絡信箱：</span>
              <a href="mailto:artwithlifetaipei@gmail.com" className="text-[#C9A96E] hover:underline font-medium">
                artwithlifetaipei@gmail.com
              </a>
            </div>
          </section>
        </>
      ) : (
        /* If NOT logged in, show the elegant Lock & Auth Box */
        <section id="auth-section" className="max-w-xl mx-auto px-6 py-20 relative z-10 scroll-mt-20">
          <div className="w-full max-w-md mx-auto bg-white border border-[#C9A96E]/30 p-8 rounded-xl relative z-10 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full border border-[#C9A96E] flex items-center justify-center bg-[#C9A96E]/5 mx-auto text-[#C9A96E] mb-4">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-serif-garamond text-[#0D0D0D] font-normal tracking-wider mb-2">
              申請參展入口
            </h2>
            <p className="text-[10px] text-[#0D0D0D]/50 font-light tracking-[0.2em] uppercase mb-6">
              EXHIBITOR APPLICATION ENTRANCE
            </p>
            <p className="text-xs text-[#0D0D0D]/70 font-light leading-relaxed mb-8">
              展區規劃、展位費用及大會關鍵日程僅供註冊品牌查閱。<br />
              請先登入或註冊您的帳號以解鎖瀏覽。
            </p>

            {/* Form Tabs */}
            <div className="flex border-b border-[#0D0D0D]/10 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthMessage({ text: '', type: '' });
                }}
                className={`flex-1 pb-3 text-xs tracking-widest font-semibold uppercase border-b-2 transition-all cursor-pointer ${
                  authMode === 'register' ? 'border-[#C9A96E] text-[#C9A96E]' : 'border-transparent text-[#0D0D0D]/40'
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
                className={`flex-1 pb-3 text-xs tracking-widest font-semibold uppercase border-b-2 transition-all cursor-pointer ${
                  authMode === 'login' ? 'border-[#C9A96E] text-[#C9A96E]' : 'border-transparent text-[#0D0D0D]/40'
                }`}
              >
                登入 LOG IN
              </button>
            </div>

            <form onSubmit={authMode === 'register' ? handleSignUp : handleLogIn} className="space-y-4 text-left">
              <div>
                <label className="block text-[9px] font-semibold tracking-wider text-[#C9A96E] uppercase mb-1.5">電子信箱 Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full text-xs tracking-wider border border-[#0D0D0D]/15 focus:border-[#C9A96E] bg-transparent rounded px-3 py-2 outline-none text-[#0D0D0D] transition-all"
                  required
                  disabled={authLoading}
                />
              </div>

              <div>
                <label className="block text-[9px] font-semibold tracking-wider text-[#C9A96E] uppercase mb-1.5">密碼 Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs tracking-wider border border-[#0D0D0D]/15 focus:border-[#C9A96E] bg-transparent rounded px-3 py-2 outline-none text-[#0D0D0D] transition-all"
                  required
                  disabled={authLoading}
                  minLength={6}
                />
              </div>

              {authMode === 'register' && (
                <div>
                  <label className="block text-[9px] font-semibold tracking-wider text-[#C9A96E] uppercase mb-1.5">確認密碼 Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs tracking-wider border border-[#0D0D0D]/15 focus:border-[#C9A96E] bg-transparent rounded px-3 py-2 outline-none text-[#0D0D0D] transition-all"
                    required
                    disabled={authLoading}
                    minLength={6}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-[#C9A96E] hover:bg-[#B39359] text-white py-2.5 rounded text-xs font-semibold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6 cursor-pointer"
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
