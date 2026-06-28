'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Clock, ShieldCheck, Mail, Calendar, Loader2, X } from 'lucide-react';
import { ALL_ZONES, APPLICATION_DEADLINE, KEY_DATES } from '@/lib/exhibitorConstants';
import { supabase } from '@/lib/supabase';

export default function ExhibitorLandingPage() {
  const router = useRouter();
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

  // Login Modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [modalEmail, setModalEmail] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState({ text: '', type: '' });

  // Custom Cursor state
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [cursorHovered, setCursorHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Countdown logic
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

    // Cursor tracking
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
      window.removeEventListener('mousemove', handleMouseMove);
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
        email: email.toLowerCase().trim(),
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
        email: email.toLowerCase().trim(),
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

  const handleModalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalMessage({ text: '', type: '' });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: modalEmail.toLowerCase().trim(),
        password: modalPassword,
      });

      if (error) {
        setModalMessage({ text: `登入失敗: ${error.message}`, type: 'error' });
      } else {
        // Double check if they are an approved exhibitor (have a record in exhibitor_brands or approved application)
        if (data?.user?.email) {
          const formattedEmail = data.user.email.toLowerCase().trim();
          const ADMIN_EMAILS = ['artwithlifetaipei@gmail.com', 'ameliecykuo@gmail.com'];
          
          let allowed = ADMIN_EMAILS.includes(formattedEmail);
          
          if (!allowed) {
            try {
              const { data: brandData } = await supabase
                .from('exhibitor_brands')
                .select('id')
                .eq('portal_email', formattedEmail)
                .maybeSingle();
              if (brandData) allowed = true;
            } catch (e) {
              console.error('Error checking brandData in modal login:', e);
            }
          }

          if (!allowed) {
            try {
              const { data: appData } = await supabase
                .from('exhibitor_applications')
                .select('id')
                .eq('contact_email', formattedEmail)
                .eq('status', 'approved')
                .maybeSingle();
              if (appData) allowed = true;
            } catch (e) {
              console.error('Error checking appData in modal login:', e);
            }
          }

          if (!allowed) {
            setModalMessage({ 
              text: '您的帳號尚未被主辦單位核准入選，或查無參展商資料。若已核准，請確認帳號是否與申請時一致。', 
              type: 'error' 
            });
            // Sign them back out to prevent accessing other parts
            await supabase.auth.signOut();
            return;
          }
        }

        setModalMessage({ text: '登入成功！跳轉中...', type: 'success' });
        
        // Wait a small moment for UX, then redirect
        setTimeout(() => {
          setIsLoginModalOpen(false);
          router.push('/exhibitor/portal');
        }, 800);
      }
    } catch (err: any) {
      setModalMessage({ text: `登入異常: ${err.message || err}`, type: 'error' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  return (
    <div className="min-h-screen relative bg-[#FAF9F6] text-[#0D0D0D] font-sans-outfit selection:bg-[#C9A96E] selection:text-white overflow-hidden pb-24">
      {/* Load Fonts and Global Custom Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Outfit:wght@200;300;400;500;600;700&display=swap');
        
        :root {
            --gold: #C9A96E;
            --text: #0D0D0D;
        }

        .font-serif-garamond { font-family: 'Cormorant Garamond', Georgia, serif; }
        .font-sans-outfit { font-family: 'Outfit', sans-serif; }

        /* Noise grain texture overlay */
        .noise-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZmlsdGVyIGlkPSJub2lzZUZpbHRlciI+CiAgICA8ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC42NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPgogIDwvZmlsdGVyPgogIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZUZpbHRlcikiLz4KPC9zdmc+');
            opacity: 0.04; pointer-events: none; z-index: 9000;
        }

        /* Custom lag-free interactive items cursor indicator */
        @media (min-width: 768px) {
            html, body, a, button, input, select, textarea {
                cursor: none !important;
            }
        }

        .btn-pola {
            display: inline-block;
            background: var(--text);
            color: white;
            padding: 1.25rem 3rem;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.4em;
            font-weight: 700;
            transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            text-decoration: none;
            border: 1px solid var(--text);
            text-align: center;
        }
        .btn-pola:hover {
            background: var(--gold);
            border-color: var(--gold);
            color: white;
        }

        .btn-pola-gold {
            display: inline-block;
            background: var(--gold);
            color: white;
            padding: 1.25rem 3rem;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.4em;
            font-weight: 700;
            transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            text-decoration: none;
            border: 1px solid var(--gold);
            text-align: center;
        }
        .btn-pola-gold:hover {
            background: var(--text);
            border-color: var(--text);
            color: white;
        }

        .btn-pola-outline {
            display: inline-block;
            background: transparent;
            color: var(--text);
            padding: 1.25rem 3rem;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.4em;
            font-weight: 700;
            transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            text-decoration: none;
            border: 1px solid rgba(13, 13, 13, 0.3);
            text-align: center;
        }
        .btn-pola-outline:hover {
            background: var(--text);
            border-color: var(--text);
            color: white;
        }
      `}} />

      {/* Noise grain texture fixed background */}
      <div className="noise-overlay" />

      {/* Custom Cursor Follower */}
      <motion.div 
        className="fixed top-0 left-0 pointer-events-none z-[10000] hidden md:flex items-center justify-center rounded-full border border-[#C9A96E]"
        animate={{
          x: mousePosition.x - (cursorHovered ? 20 : 12.5),
          y: mousePosition.y - (cursorHovered ? 20 : 12.5),
          width: cursorHovered ? 40 : 25,
          height: cursorHovered ? 40 : 25,
          borderColor: cursorHovered ? '#C9A96E' : '#C9A96E',
        }}
        transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      >
        {!cursorHovered && <div className="w-1 h-1 bg-[#C9A96E] rounded-full" />}
      </motion.div>

      {/* Sticky Navbar */}
      <nav className="sticky top-0 bg-[#FAF9F6]/80 backdrop-blur-md border-b border-[#0D0D0D]/5 z-50 py-5 px-6 md:px-12 flex justify-between items-center transition-all duration-300">
        <Link 
          href="/" 
          className="flex items-center"
          onMouseEnter={() => setCursorHovered(true)} 
          onMouseLeave={() => setCursorHovered(false)}
        >
          <img 
            src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
            alt="VIS Logo" 
            className="h-10 w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-6">
          {session && (
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-[#0D0D0D]/50 font-light font-sans-outfit tracking-wider uppercase">
              <span>已登入 LOGGED IN：{session.user?.email}</span>
              <button 
                onClick={handleLogout} 
                className="text-[#C9A96E] hover:text-[#B39359] hover:underline ml-1.5 cursor-pointer font-medium uppercase border-0 bg-transparent"
                onMouseEnter={() => setCursorHovered(true)} 
                onMouseLeave={() => setCursorHovered(false)}
              >
                登出 LOGOUT
              </button>
            </div>
          )}
          <Link 
            href="/" 
            className="text-[10px] tracking-[0.25em] font-light hover:text-[#C9A96E] transition-colors duration-300 flex items-center gap-2 border-b border-transparent hover:border-[#C9A96E] pb-0.5 uppercase"
            onMouseEnter={() => setCursorHovered(true)} 
            onMouseLeave={() => setCursorHovered(false)}
          >
            返回官網 BACK TO HOME
          </Link>
        </div>
      </nav>

      {/* Top Banner Section */}
      <div className="w-full max-w-7xl mx-auto px-6 pt-6 md:pt-10 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full aspect-[3/1] md:aspect-[4.5/1] rounded-none overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-[#C9A96E]/25 p-1 bg-white"
        >
          <div className="w-full h-full overflow-hidden relative border border-[#C9A96E]/15">
            <div className="absolute inset-0 bg-[#C9A96E]/5 mix-blend-multiply z-10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 z-10" />
            <img 
              src="/exhibitor_banner_new_v3.jpg" 
              alt="Zhongshan Hall Interior" 
              className="w-full h-full object-cover filter brightness-[0.85] contrast-[1.03] transition-transform duration-[12s] ease-out hover:scale-105"
            />
          </div>
        </motion.div>
      </div>

      {/* Hero Section */}
      <header className="relative z-10 max-w-5xl mx-auto px-6 pt-10 md:pt-14 text-center flex flex-col items-center">
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-xs md:text-sm tracking-[0.4em] text-[#C9A96E] font-semibold uppercase mb-4"
        >
          2027 VIS Lifestyle and Art Festival
        </motion.p>
        
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-3xl md:text-5xl font-serif-garamond tracking-[0.1em] font-light leading-tight mb-3 text-[#0D0D0D]"
        >
          參展專屬申請入口
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-xs md:text-sm font-serif-garamond tracking-[0.3em] text-[#0D0D0D]/40 uppercase mb-10"
        >
          Exhibitor Application Portal
        </motion.p>

        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-base md:text-lg max-w-3xl text-[#0D0D0D]/85 font-light leading-relaxed tracking-wider mb-10 font-serif-garamond italic"
        >
          作為持續聚集著品味人士所建構而成的場域，<br />在台灣，VIS 不只是一個博覽會，<br />而是一個最適合「高客單價品牌」的導客解決方案。
        </motion.p>
        
        {/* Countdown Timer & Hero CTA Buttons Side by Side for balanced landscape layout */}
        <div className="w-full flex flex-col items-center gap-8 mb-12">
          {mounted && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/40 backdrop-blur-md rounded-none p-5 border border-[#C9A96E]/20 shadow-[0_10px_30px_rgba(201,169,110,0.02)] w-full max-w-xl relative"
            >
              <div className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#C9A96E]/30 to-transparent" />
              <div className="flex items-center justify-center gap-2 mb-4 text-[#C9A96E]">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] tracking-[0.3em] font-semibold uppercase">申請截止倒數 COUNTDOWN TO DEADLINE</span>
              </div>
              <div className="grid grid-cols-4 gap-3 md:gap-5">
                <div className="border border-[#C9A96E]/15 p-2 bg-white/40">
                  <span className="block text-xl md:text-2.5xl font-light font-serif-garamond text-[#0D0D0D] tracking-wide">{timeLeft.days}</span>
                  <span className="text-[8px] tracking-widest text-[#0D0D0D]/40 font-medium uppercase mt-0.5 block">天 Days</span>
                </div>
                <div className="border border-[#C9A96E]/15 p-2 bg-white/40">
                  <span className="block text-xl md:text-2.5xl font-light font-serif-garamond text-[#0D0D0D] tracking-wide">{timeLeft.hours}</span>
                  <span className="text-[8px] tracking-widest text-[#0D0D0D]/40 font-medium uppercase mt-0.5 block">時 Hours</span>
                </div>
                <div className="border border-[#C9A96E]/15 p-2 bg-white/40">
                  <span className="block text-xl md:text-2.5xl font-light font-serif-garamond text-[#0D0D0D] tracking-wide">{timeLeft.minutes}</span>
                  <span className="text-[8px] tracking-widest text-[#0D0D0D]/40 font-medium uppercase mt-0.5 block">分 Mins</span>
                </div>
                <div className="border border-[#C9A96E]/15 p-2 bg-white/40">
                  <span className="block text-xl md:text-2.5xl font-light font-serif-garamond text-[#0D0D0D] tracking-wide">{timeLeft.seconds}</span>
                  <span className="text-[8px] tracking-widest text-[#0D0D0D]/40 font-medium uppercase mt-0.5 block">秒 Secs</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Hero CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-3xl"
          >
            {session ? (
              <Link 
                href="/exhibitor/apply"
                className="btn-pola flex-1"
                onMouseEnter={() => setCursorHovered(true)} 
                onMouseLeave={() => setCursorHovered(false)}
              >
                立即線上申請 APPLY ONLINE
              </Link>
            ) : (
              <button 
                onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-pola cursor-pointer flex-1"
                onMouseEnter={() => setCursorHovered(true)} 
                onMouseLeave={() => setCursorHovered(false)}
              >
                立即線上申請 APPLY ONLINE
              </button>
            )}
            <a 
              href="mailto:artwithlifetaipei@gmail.com?subject=2027 VIS 參展簡章"
              className="btn-pola-outline flex-1"
              onMouseEnter={() => setCursorHovered(true)} 
              onMouseLeave={() => setCursorHovered(false)}
            >
              2027 簡章 2027 Guidelines
            </a>
            <button
              onClick={() => {
                if (session) {
                  router.push('/exhibitor/portal');
                } else {
                  setModalEmail('');
                  setModalPassword('');
                  setModalMessage({ text: '', type: '' });
                  setIsLoginModalOpen(true);
                }
              }}
              className="btn-pola-gold flex-1 cursor-pointer"
              onMouseEnter={() => setCursorHovered(true)} 
              onMouseLeave={() => setCursorHovered(false)}
            >
              已獲准入選品牌登入 BRAND LOGIN
            </button>
          </motion.div>
          {session && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-[10px] text-[#0D0D0D]/50 font-light tracking-widest mt-4 text-center z-10"
            >
              目前登入帳號 CURRENT EMAIL: <strong className="text-[#0D0D0D] font-medium">{session.user?.email}</strong> 
              <button 
                onClick={handleLogout}
                className="ml-3 text-[#C9A96E] hover:text-[#B39359] underline bg-transparent border-0 cursor-pointer text-[10px] tracking-widest font-semibold uppercase"
                onMouseEnter={() => setCursorHovered(true)} 
                onMouseLeave={() => setCursorHovered(false)}
              >
                登出 LOGOUT
              </button>
            </motion.p>
          )}
        </div>
      </header>

      {/* Conditionally reveal details based on session */}
      {session ? (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Dual Funnel (Process) Section */}
          <section className="bg-white/70 border-y border-[#0D0D0D]/5 py-24 px-6 md:px-12 relative z-10">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif-garamond text-center font-light tracking-[0.1em] mb-2 text-[#0D0D0D]">
                申請流程
              </h2>
              <p className="text-[10px] text-center text-[#0D0D0D]/40 font-light tracking-[0.25em] uppercase mb-16">
                Application Procedure
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 relative">
                {/* Step 1 */}
                <div className="bg-white border border-[#C9A96E]/20 p-1 rounded-none shadow-[0_10px_35px_rgba(0,0,0,0.02)] relative z-10 flex flex-col">
                  <div className="border border-[#C9A96E]/10 p-8 flex-grow bg-white">
                    <div className="absolute top-6 right-6 bg-[#C9A96E] text-white w-8 h-8 rounded-full flex items-center justify-center font-serif-garamond font-bold text-sm">
                      1
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-[#C9A96E]" />
                      <h3 className="text-sm font-semibold text-[#0D0D0D]/85 tracking-[0.2em] uppercase">階段一：線上申請與審查</h3>
                    </div>
                    <p className="text-xs text-[#0D0D0D]/75 font-light leading-relaxed">
                      填寫參展品牌基本資料、提報產品照片與陳列規劃概念，並於線上完成意向保證金支付。
                    </p>
                    <div className="mt-6 pt-4 border-t border-[#0D0D0D]/5 text-[10px] text-[#C9A96E] font-medium tracking-wider">
                      *若評選未通過，大會將於公告後將意向保證金全額原路退還。
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white border border-[#0D0D0D]/10 p-1 rounded-none shadow-[0_10px_35px_rgba(0,0,0,0.02)] relative z-10 flex flex-col">
                  <div className="border border-[#0D0D0D]/5 p-8 flex-grow bg-white">
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
            </div>
          </section>



          {/* Timeline Section */}
          <section className="bg-white/80 border-y border-[#0D0D0D]/5 py-24 px-6 md:px-12 relative z-10">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif-garamond text-center font-light tracking-[0.1em] mb-2 text-[#0D0D0D]">
                關鍵日程
              </h2>
              <p className="text-[10px] text-center text-[#0D0D0D]/40 font-light tracking-[0.25em] uppercase mb-16">
                Key Dates & Timeline
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
                {KEY_DATES.map((item, idx) => (
                  <div key={idx} className="relative flex flex-col items-center text-center p-6 border border-[#C9A96E]/10 bg-white/40 hover:border-[#C9A96E]/30 transition-all duration-300">
                    {/* Visual Line connector */}
                    {idx < 3 && (
                      <div className="hidden md:block absolute top-[2.25rem] left-[65%] w-[70%] h-[0.5px] bg-[#C9A96E]/20 z-0" />
                    )}
                    <div className="w-10 h-10 rounded-full bg-[#FAF9F6] border border-[#C9A96E]/30 flex items-center justify-center mb-5 z-10 shadow-sm text-[#C9A96E]">
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
                className="btn-pola"
                onMouseEnter={() => setCursorHovered(true)} 
                onMouseLeave={() => setCursorHovered(false)}
              >
                立即線上申請 APPLY ONLINE
              </Link>
            </div>

            <div className="flex justify-center items-center gap-2 text-xs text-[#0D0D0D]/50 font-mono">
              <Mail className="w-4 h-4 text-[#C9A96E]" />
              <span>大會聯絡信箱：</span>
              <a 
                href="mailto:artwithlifetaipei@gmail.com" 
                className="text-[#C9A96E] hover:text-[#B39359] hover:underline font-medium"
                onMouseEnter={() => setCursorHovered(true)} 
                onMouseLeave={() => setCursorHovered(false)}
              >
                artwithlifetaipei@gmail.com
              </a>
            </div>
          </section>
        </motion.div>
      ) : (
        /* If NOT logged in, show the elegant Lock & Auth Box */
        <section id="auth-section" className="max-w-7xl mx-auto px-6 py-24 relative z-10 scroll-mt-20">
          <div className="w-full max-w-md mx-auto bg-white border border-[#C9A96E]/20 p-1 rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.03)] relative z-10">
            <div className="border border-[#C9A96E]/10 p-8 md:p-10 flex flex-col bg-white">
              <div className="w-10 h-10 rounded-full border border-[#C9A96E]/30 flex items-center justify-center bg-[#C9A96E]/5 mx-auto text-[#C9A96E] mb-5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif-garamond text-[#0D0D0D] font-normal tracking-[0.1em] text-center mb-1">
                申請參展入口
              </h2>
              <p className="text-[9px] text-[#0D0D0D]/40 font-light tracking-[0.25em] uppercase text-center mb-6">
                EXHIBITOR APPLICATION ENTRANCE
              </p>
              <p className="text-xs text-[#0D0D0D]/60 font-light leading-relaxed text-center mb-8 font-serif-garamond">
                展區規劃、展位費用及大會關鍵日程僅供註冊品牌查閱。<br/>請先登入或註冊您的帳號以解鎖瀏覽。
              </p>

              {/* Form Tabs */}
              <div className="flex border-b border-[#0D0D0D]/10 mb-8">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthMessage({ text: '', type: '' });
                  }}
                  className={`flex-1 pb-3 text-xs tracking-[0.2em] font-medium uppercase border-b transition-all duration-300 cursor-pointer border-0 bg-transparent ${
                    authMode === 'register' ? 'border-b-2 border-b-[#C9A96E] text-[#C9A96E]' : 'border-transparent text-[#0D0D0D]/40 hover:text-[#0D0D0D]/75'
                  }`}
                  onMouseEnter={() => setCursorHovered(true)} 
                  onMouseLeave={() => setCursorHovered(false)}
                >
                  註冊 SIGN UP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthMessage({ text: '', type: '' });
                  }}
                  className={`flex-1 pb-3 text-xs tracking-[0.2em] font-medium uppercase border-b transition-all duration-300 cursor-pointer border-0 bg-transparent ${
                    authMode === 'login' ? 'border-b-2 border-b-[#C9A96E] text-[#C9A96E]' : 'border-transparent text-[#0D0D0D]/40 hover:text-[#0D0D0D]/75'
                  }`}
                  onMouseEnter={() => setCursorHovered(true)} 
                  onMouseLeave={() => setCursorHovered(false)}
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
                    onMouseEnter={() => setCursorHovered(true)} 
                    onMouseLeave={() => setCursorHovered(false)}
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
                    onMouseEnter={() => setCursorHovered(true)} 
                    onMouseLeave={() => setCursorHovered(false)}
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
                      onMouseEnter={() => setCursorHovered(true)} 
                      onMouseLeave={() => setCursorHovered(false)}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#0D0D0D] hover:bg-[#C9A96E] text-white py-3.5 rounded-none text-xs font-semibold tracking-[0.25em] uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-8 cursor-pointer active:scale-[0.99] shadow-md border-0"
                  onMouseEnter={() => setCursorHovered(true)} 
                  onMouseLeave={() => setCursorHovered(false)}
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

      {/* Premium Login Modal for Approved Brands */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setIsLoginModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-[#111111] border border-[#C9A96E]/20 p-1 rounded-none shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative"
              onClick={(e) => e.stopPropagation()} // Prevent close on clicking inside the card
            >
              <div className="border border-[#C9A96E]/10 p-8 md:p-10 flex flex-col bg-[#111111] text-white">
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-white bg-transparent border-0 cursor-pointer p-1"
                  onMouseEnter={() => setCursorHovered(true)} 
                  onMouseLeave={() => setCursorHovered(false)}
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full border border-[#C9A96E]/30 flex items-center justify-center bg-[#C9A96E]/5 mx-auto text-[#C9A96E] mb-5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                
                <h2 className="text-xl font-serif-garamond text-[#DFBA87] font-normal tracking-[0.1em] text-center mb-1">
                  已獲准入選品牌登入
                </h2>
                <p className="text-[9px] text-neutral-400 font-light tracking-[0.25em] uppercase text-center mb-6">
                  APPROVED BRAND LOGIN
                </p>
                <p className="text-xs text-neutral-400 font-light leading-relaxed text-center mb-8 font-serif-garamond">
                  請輸入您當初申請時設定的帳號與密碼。<br/>登入成功後，將直接跳轉至參展協作平台。
                </p>

                <form onSubmit={handleModalLogin} className="space-y-6 text-left">
                  <div className="relative border-b border-white/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                    <label className="block text-[8px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">電子信箱 Email Address</label>
                    <input
                      type="email"
                      value={modalEmail}
                      onChange={(e) => setModalEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-white transition-all placeholder:text-neutral-700"
                      required
                      disabled={modalLoading}
                      onMouseEnter={() => setCursorHovered(true)} 
                      onMouseLeave={() => setCursorHovered(false)}
                    />
                  </div>

                  <div className="relative border-b border-white/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                    <label className="block text-[8px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">密碼 Password</label>
                    <input
                      type="password"
                      value={modalPassword}
                      onChange={(e) => setModalPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-white transition-all placeholder:text-neutral-700"
                      required
                      disabled={modalLoading}
                      minLength={6}
                      onMouseEnter={() => setCursorHovered(true)} 
                      onMouseLeave={() => setCursorHovered(false)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="w-full bg-[#C9A96E] hover:bg-[#B39359] text-white py-3.5 rounded-none text-xs font-semibold tracking-[0.25em] uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-8 cursor-pointer active:scale-[0.99] shadow-md border-0"
                    onMouseEnter={() => setCursorHovered(true)} 
                    onMouseLeave={() => setCursorHovered(false)}
                  >
                    {modalLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        驗證登入中 VERIFYING...
                      </span>
                    ) : (
                      '驗證並登入 VERIFY & LOGIN'
                    )}
                  </button>

                  {modalMessage.text && (
                    <div className={`text-[11px] font-light leading-relaxed p-3 rounded-none border text-center mt-4 ${
                      modalMessage.type === 'error' 
                        ? 'text-rose-400 bg-rose-950/20 border-rose-500/20' 
                        : 'text-[#DFBA87] bg-[#C9A96E]/5 border-[#C9A96E]/15'
                    }`}>
                      {modalMessage.text}
                    </div>
                  )}
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
