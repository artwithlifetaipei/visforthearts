'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Calendar, FileCheck, Users, Image as ImageIcon, LogOut, ShieldCheck, 
  HelpCircle, ArrowRight, Sparkles, Loader2, CheckCircle2 
} from 'lucide-react';

const ADMIN_EMAILS = [
  'artwithlifetaipei@gmail.com',
  'ameliecykuo@gmail.com',
];

export default function ExhibitorPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Auth state with sessionStorage caching for instant loads (<3s)
  const [session, setSession] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('vis_portal_session');
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    }
    return null;
  });
  
  const [userEmail, setUserEmail] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('vis_portal_user_email') || '';
    }
    return '';
  });

  const [brandData, setBrandData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('vis_portal_brand_data');
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('vis_portal_brand_data');
      if (cached) return false; // bypass initial load screen if cache exists
    }
    return true;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSent, setLoginSent] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');

  // Check auth on mount
  useEffect(() => {
    // Fallback timeout: if auth checks take more than 2.5 seconds, force setIsLoading(false) to prevent infinite spinner
    const fallbackTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    const checkAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          sessionStorage.setItem('vis_portal_session', JSON.stringify(currentSession));
          const email = currentSession.user?.email || '';
          setUserEmail(email);
          sessionStorage.setItem('vis_portal_user_email', email);
          await fetchBrandInfo(email);
        } else {
          setSession(null);
          setBrandData(null);
          sessionStorage.removeItem('vis_portal_session');
          sessionStorage.removeItem('vis_portal_user_email');
          sessionStorage.removeItem('vis_portal_brand_data');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error during checkAuth:', err);
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      try {
        if (event === 'SIGNED_IN' && currentSession) {
          setSession(currentSession);
          sessionStorage.setItem('vis_portal_session', JSON.stringify(currentSession));
          const email = currentSession.user?.email || '';
          setUserEmail(email);
          sessionStorage.setItem('vis_portal_user_email', email);
          await fetchBrandInfo(email);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setBrandData(null);
          sessionStorage.removeItem('vis_portal_session');
          sessionStorage.removeItem('vis_portal_user_email');
          sessionStorage.removeItem('vis_portal_brand_data');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error in onAuthStateChange:', err);
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(fallbackTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchBrandInfo = async (email: string) => {
    try {
      const formattedEmail = email.toLowerCase().trim();
      
      // 1. Check if brand exists in database
      let { data, error } = await supabase
        .from('exhibitor_brands')
        .select('*')
        .eq('portal_email', formattedEmail)
        .maybeSingle();

      if (!data) {
        // 2. Fallback: check if there is an approved application for this email
        const { data: approvedApp } = await supabase
          .from('exhibitor_applications')
          .select('*')
          .eq('contact_email', formattedEmail)
          .eq('status', 'approved')
          .maybeSingle();

        if (approvedApp) {
          // Auto-heal: try to insert brand record
          const isMicro = approvedApp.booth_type === 'T';
          const { data: newBrand } = await supabase
            .from('exhibitor_brands')
            .insert({
              application_id: approvedApp.id,
              brand_name_zh: approvedApp.brand_name_zh,
              brand_name_en: approvedApp.brand_name_en,
              zone_id: approvedApp.zone_id,
              booth_type: approvedApp.booth_type,
              is_micro_exposure: isMicro,
              portal_email: formattedEmail,
            })
            .select()
            .maybeSingle();

          if (newBrand) {
            data = newBrand;
          } else {
            // Insert may have failed due to RLS or duplicate — try upsert or fetch again
            const { data: refetch } = await supabase
              .from('exhibitor_brands')
              .select('*')
              .eq('portal_email', formattedEmail)
              .maybeSingle();

            if (refetch) {
              data = refetch;
            } else {
              // Final fallback: build in-memory brand from approved application so portal renders
              data = {
                id: approvedApp.id,
                application_id: approvedApp.id,
                brand_name_zh: approvedApp.brand_name_zh,
                brand_name_en: approvedApp.brand_name_en,
                zone_id: approvedApp.zone_id,
                booth_type: approvedApp.booth_type,
                is_micro_exposure: isMicro,
                portal_email: formattedEmail,
                created_at: approvedApp.created_at,
                _fallback: true,
              };
            }
          }
        }
      }

      if (data) {
        setBrandData(data);
        sessionStorage.setItem('vis_portal_brand_data', JSON.stringify(data));
      } else {
        // Admin bypass: auto-create mock brand in DB
        if (ADMIN_EMAILS.includes(formattedEmail)) {
          const { data: newBrand } = await supabase
            .from('exhibitor_brands')
            .insert({
              brand_name_zh: '大會測試品牌 (管理員)',
              brand_name_en: 'VIS Admin Test Brand',
              zone_id: 'artsy',
              booth_type: 'S01-03,S06-08',
              is_micro_exposure: false,
              portal_email: formattedEmail,
            })
            .select()
            .maybeSingle();
          
          if (newBrand) {
            setBrandData(newBrand);
            sessionStorage.setItem('vis_portal_brand_data', JSON.stringify(newBrand));
          } else {
            const fallbackBrand = {
              id: '00000000-0000-0000-0000-000000000000',
              brand_name_zh: '大會測試品牌 (管理員)',
              brand_name_en: 'VIS Admin Test Brand',
              zone_id: 'artsy',
              booth_type: 'S01-03,S06-08',
              is_micro_exposure: false,
              portal_email: formattedEmail,
            };
            setBrandData(fallbackBrand);
            sessionStorage.setItem('vis_portal_brand_data', JSON.stringify(fallbackBrand));
          }
        } else {
          setBrandData(null);
          sessionStorage.removeItem('vis_portal_brand_data');
        }
      }
    } catch (e) {
      console.error('Error fetching brand data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginMessage('');

    const formattedEmail = loginEmail.toLowerCase().trim();

    // 1. Check if email is in exhibitor_brands
    const { data: allowedBrand } = await supabase
      .from('exhibitor_brands')
      .select('id')
      .eq('portal_email', formattedEmail)
      .maybeSingle();

    let allowed = !!allowedBrand;

    if (!allowed) {
      // 2. Also check if email exists as an approved application in exhibitor_applications
      const { data: allowedApp } = await supabase
        .from('exhibitor_applications')
        .select('id')
        .eq('contact_email', formattedEmail)
        .eq('status', 'approved')
        .maybeSingle();
      
      if (allowedApp) {
        allowed = true;
      }
    }

    if (!allowed && !ADMIN_EMAILS.includes(formattedEmail)) {
      setLoginMessage('此信箱尚未登錄為 2027 VIS 參展品牌。\n若您的品牌已通過首期評選，請洽大會秘書處確認登錄信箱。');
      setLoginLoading(false);
      return;
    }

    // Send magic link (OTP)
    const { error } = await supabase.auth.signInWithOtp({
      email: formattedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/exhibitor/portal`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setLoginMessage(`發送失敗: ${error.message}`);
    } else {
      setLoginSent(true);
      setLoginMessage('專屬協作中心登入連結已寄送至您的信箱，請查收。');
    }
    setLoginLoading(false);
  };

  // Demo Login Handler (Bypasses email for rapid local verification)
  const handleDemoLogin = async () => {
    setLoginLoading(true);
    setLoginMessage('');

    const demoEmail = 'demo-brand@visforthearts.com';

    // Check if brand exists, if not create a demo one
    const { data: existingBrand } = await supabase
      .from('exhibitor_brands')
      .select('*')
      .eq('portal_email', demoEmail)
      .maybeSingle();

    if (!existingBrand) {
      // 1. Create a mock application
      const { data: mockApp, error: appErr } = await supabase
        .from('exhibitor_applications')
        .insert({
          brand_name_zh: '琉璃藝坊 (測試)',
          brand_name_en: 'Amber Art Studio',
          contact_name: '蔡經理',
          contact_email: demoEmail,
          contact_phone: '0988-123-456',
          zone_id: 'artsy',
          booth_type: 'S01-03,S06-08',
          concept_brief: '融入東方古典意象的琉璃陳設展位。',
          status: 'approved',
          deposit_paid: true,
        })
        .select()
        .single();

      if (appErr) {
        setLoginMessage(`Demo 登入失敗 (Application): ${appErr.message}`);
        setLoginLoading(false);
        return;
      }

      // 2. Create the brand portal record
      const { error: brandErr } = await supabase
        .from('exhibitor_brands')
        .insert({
          application_id: mockApp.id,
          brand_name_zh: mockApp.brand_name_zh,
          brand_name_en: mockApp.brand_name_en,
          zone_id: mockApp.zone_id,
          booth_type: mockApp.booth_type,
          is_micro_exposure: false,
          portal_email: demoEmail,
        });

      if (brandErr) {
        setLoginMessage(`Demo 登入失敗 (Brand): ${brandErr.message}`);
        setLoginLoading(false);
        return;
      }
    }

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: 'vis2027exhibitor',
      });

      if (loginError) {
        // If password login fails, try creating the user
        const { error: signUpError } = await supabase.auth.signUp({
          email: demoEmail,
          password: 'vis2027exhibitor',
        });

        if (signUpError) {
          setLoginMessage(`Demo 登入失敗 (SignUp): ${signUpError.message}`);
        } else {
          // Retry login
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: demoEmail,
            password: 'vis2027exhibitor',
          });
          if (retryError) {
            setLoginMessage(`Demo 登入失敗 (Retry): ${retryError.message}`);
          }
        }
      }
    } catch (ex) {
      setLoginMessage('Demo 帳號初始化異常，請以普通 Magic Link 發送。');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('vis_portal_session');
    sessionStorage.removeItem('vis_portal_user_email');
    sessionStorage.removeItem('vis_portal_brand_data');
    router.push('/exhibitor');
  };

  // Nav Items configuration
  const getNavItems = () => {
    const isMicro = brandData?.is_micro_exposure || brandData?.booth_type === 'T';
    return [
      {
        name: '模組 A — 時程與財務管理',
        href: '/exhibitor/portal',
        icon: Calendar,
      },
      {
        name: '模組 B — 展位規範簽署',
        href: '/exhibitor/portal/compliance',
        icon: FileCheck,
      },
      {
        name: '模組 C — VIP 貴賓名單',
        href: '/exhibitor/portal/vip',
        icon: Users,
        badge: isMicro ? '限一般展商' : null,
        disabled: isMicro,
      },
      {
        name: '模組 D — 媒體公關素材',
        href: '/exhibitor/portal/media',
        icon: ImageIcon,
        badge: isMicro ? '限一般展商' : null,
        disabled: isMicro,
      },
    ];
  };

  // 1. Full Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center font-sans-outfit">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#DFBA87] mx-auto" />
          <p className="text-xs text-neutral-500 font-light tracking-[0.2em] uppercase">載入品牌專屬中心 Loading...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state - Show Premium login screen
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col p-6 font-sans-outfit text-white relative overflow-hidden justify-center items-center">
        
        {/* Decorative elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#C9A96E]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#C9A96E]/5 rounded-full blur-3xl" />

        <div className="w-full max-w-md bg-[#111111] border border-white/5 p-8 rounded-xl relative z-10">
          <img 
            src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
            alt="VIS" 
            className="h-10 mx-auto mb-8 filter invert brightness-200"
          />
          
          <h2 className="text-xl md:text-2xl font-serif-garamond text-center font-normal tracking-wider mb-2 text-[#DFBA87]">
            參展品牌協作中心
          </h2>
          <p className="text-[10px] text-center text-neutral-400 font-light tracking-[0.2em] uppercase mb-8">
            Exhibitor Collaboration Portal
          </p>

          <AnimatePresence mode="wait">
            {!loginSent ? (
              <motion.form 
                key="login-form"
                onSubmit={handleLoginSubmit}
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div>
                  <label className="block text-[10px] font-semibold tracking-widest text-[#DFBA87] uppercase mb-2">登錄電子信箱 EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="ENTER YOUR REGISTERED EMAIL"
                    className="w-full text-center text-xs tracking-wider border border-white/10 focus:border-[#C9A96E] bg-white/5 rounded px-4 py-3 outline-none text-white transition-all uppercase"
                    required
                    disabled={loginLoading}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loginLoading}
                  className="w-full bg-[#C9A96E] hover:bg-[#B39359] text-white py-3 rounded text-xs font-semibold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '傳送驗證連結 SEND MAGIC LINK'}
                </button>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink mx-4 text-[9px] text-neutral-500 font-semibold tracking-widest uppercase">或者 OR</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {/* Quick Local Demo Login Button */}
                <button 
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={loginLoading}
                  className="w-full border border-dashed border-[#DFBA87]/45 hover:border-[#DFBA87] hover:bg-[#DFBA87]/5 text-[#DFBA87] py-3 rounded text-xs font-semibold tracking-[0.15em] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" /> 快速本地測試登入 (DEMO KEY)
                </button>

                {loginMessage && (
                  <p className="text-[11px] text-rose-400 font-light leading-relaxed whitespace-pre-wrap text-center bg-rose-500/10 p-3 rounded border border-rose-500/20">{loginMessage}</p>
                )}
              </motion.form>
            ) : (
              <motion.div 
                key="login-success"
                className="text-center py-6 space-y-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-12 h-12 rounded-full border border-[#DFBA87] flex items-center justify-center bg-white/5 mx-auto text-[#DFBA87]">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-wider text-white">驗證信已寄出</h3>
                  <p className="text-xs text-neutral-400 font-light leading-relaxed mt-2">{loginMessage}</p>
                </div>
                <button 
                  onClick={() => setLoginSent(false)}
                  className="text-[10px] tracking-wider text-neutral-500 hover:text-white uppercase transition-colors"
                >
                  重新填寫信箱
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Logged In, but NOT in exhibitor_brands (unauthorized user logged into Supabase auth)
  if (session && !brandData) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col p-6 font-sans-outfit text-white relative overflow-hidden justify-center items-center">
        <div className="w-full max-w-md bg-[#111111] border border-[#C9A96E]/20 p-8 rounded-xl relative z-10 text-center space-y-6">
          <div className="w-12 h-12 rounded-full border border-[#DFBA87] flex items-center justify-center bg-white/5 mx-auto text-[#DFBA87]">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-serif-garamond text-[#DFBA87] tracking-wider">信箱授權未核對</h2>
            <p className="text-xs text-neutral-400 font-light leading-relaxed mt-2">
              您已成功登入系統，但信箱 (<strong className="text-white">{userEmail}</strong>) 尚未被登錄為 2027 VIS 參展品牌。
            </p>
          </div>
          <div className="space-y-3 pt-4">
            <button 
              onClick={handleLogout}
              className="w-full bg-[#C9A96E] hover:bg-[#B39359] text-white py-2.5 rounded text-xs font-semibold tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> 登出並返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logged In & Authorized - Render standard premium dashboard layout
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans-outfit flex flex-col md:flex-row relative">
      
      {/* Load Fonts */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Outfit:wght@200;300;400;500;600;700&display=swap');
        .font-serif-garamond { font-family: 'Cormorant Garamond', Georgia, serif; }
        .font-sans-outfit { font-family: 'Outfit', sans-serif; }
      `}} />

      {/* Fixed dashboard light bg pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(circle_at_center,#C9A96E_1px,transparent_1px)] bg-[size:24px_24px] z-0" />

      {/* Mobile Sticky Top Header */}
      <div className="md:hidden sticky top-0 bg-[#0D0D0D]/90 backdrop-blur-md border-b border-white/5 z-50 p-4 flex justify-between items-center w-full">
        <Link href="/exhibitor/portal">
          <img 
            src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
            alt="VIS" 
            className="h-7 filter invert brightness-200"
          />
        </Link>
        <button 
          onClick={() => setIsSidebarOpen(prev => !prev)}
          className="text-[#DFBA87] hover:text-white transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-[57px] md:top-0 bottom-0 left-0 w-64 bg-[#0A0A0A] border-r border-white/5 z-40 
        transform md:transform-none transition-transform duration-300 ease-in-out flex flex-col justify-between
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 space-y-8">
          {/* Logo block */}
          <div className="hidden md:block">
            <Link href="/exhibitor/portal">
              <img 
                src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
                alt="VIS" 
                className="h-9 filter invert brightness-200"
              />
            </Link>
            <p className="text-[9px] text-[#DFBA87] font-light tracking-[0.2em] uppercase mt-2">
              Exhibitor Collaboration
            </p>
          </div>

          {/* Brand Info Display Card */}
          <div className="bg-white/[0.02] border border-white/5 rounded p-4 space-y-2">
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono block">Current Brand</span>
            <h3 className="text-sm font-semibold text-white tracking-wide">{brandData?.brand_name_zh}</h3>
            <p className="text-[10px] text-neutral-400 font-light truncate">{brandData?.brand_name_en}</p>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#C9A96E]/10 border border-[#C9A96E]/20 text-[9px] text-[#DFBA87]">
              <span>展位規格: {brandData?.booth_type}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2">
            {getNavItems().map((item) => {
              const isActive = pathname === item.href;
              if (item.disabled) {
                return (
                  <div 
                    key={item.href}
                    className="flex items-center justify-between p-3 rounded text-xs tracking-wider border border-transparent text-neutral-600 cursor-not-allowed select-none bg-neutral-900/10"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-neutral-700" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[8px] bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded uppercase font-semibold">{item.badge}</span>
                    )}
                  </div>
                );
              }
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center justify-between p-3 rounded text-xs tracking-wider transition-all duration-300 border
                    ${isActive 
                      ? 'bg-[#C9A96E]/10 border-[#C9A96E]/30 text-[#DFBA87] font-medium' 
                      : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[8px] bg-[#C9A96E]/10 border border-[#C9A96E]/20 text-[#DFBA87] px-1.5 py-0.5 rounded uppercase font-semibold">{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-white/5 flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-neutral-500 text-[10px] truncate font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate">{userEmail}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full border border-white/5 hover:border-white/20 bg-white/5 text-neutral-400 hover:text-white py-2 rounded text-xs tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" /> 登出 LOGOUT
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-6 md:p-12 z-10 relative overflow-x-hidden">
        {children}
      </main>

    </div>
  );
}
