'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatBoothDisplay } from '@/lib/exhibitorConstants';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, X, Calendar, FileCheck, Users, Image as ImageIcon, LogOut, ShieldCheck, 
  HelpCircle, ArrowRight, Sparkles, Loader2, CheckCircle2, QrCode, Globe, Ticket
} from 'lucide-react';
import { ExhibitorLanguageProvider, useExhibitorLanguage } from '@/lib/ExhibitorLanguageContext';

const ADMIN_EMAILS = [
  'artwithlifetaipei@gmail.com',
  'ameliecykuo@gmail.com',
  'amelie@theartpressasia.com',
  'visvipteam@gmail.com',
];

function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    }
  } catch {
    // Ignore storage restriction errors in private / in-app browsers
  }
  return null;
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage restriction errors
  }
}

function safeRemoveStorage(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignore storage restriction errors
  }
}

function ExhibitorPortalLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, toggleLang, t } = useExhibitorLanguage();
  
  // Auth state with safe storage caching for instant loads (<3s)
  const [session, setSession] = useState<any>(() => {
    const saved = safeGetStorage('vis_portal_session');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });
  
  const [userEmail, setUserEmail] = useState<string>(() => {
    return safeGetStorage('vis_portal_user_email') || '';
  });

  const [brandData, setBrandData] = useState<any>(() => {
    const saved = safeGetStorage('vis_portal_brand_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.booth_type === 'string' && (parsed.booth_type.includes('S01') || parsed.booth_type.includes('S06') || parsed.booth_type === 'S-2x2')) {
          parsed.booth_type = 'A01';
          safeSetStorage('vis_portal_brand_data', JSON.stringify(parsed));
        }
        return parsed;
      } catch { return null; }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(() => {
    const cached = safeGetStorage('vis_portal_brand_data');
    if (cached) return false; // bypass initial load screen if cache exists
    return true;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSent, setLoginSent] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');

  // Check auth on mount & purge stale PWA / SW caches
  useEffect(() => {
    // Purge outdated Service Worker caches and check for updates
    if (typeof window !== 'undefined') {
      try {
        if ('caches' in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => {
              if (key === 'others' || key === 'start-url' || key === 'next-data' || key.includes('precache')) {
                caches.delete(key);
              }
            });
          });
        }
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
              registration.update();
            });
          });
        }
      } catch {
        // ignore
      }
    }

    // Fallback timeout: if auth checks take more than 2.5 seconds, force setIsLoading(false) to prevent infinite spinner
    const fallbackTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    const checkAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          safeSetStorage('vis_portal_session', JSON.stringify(currentSession));
          const email = currentSession.user?.email || '';
          setUserEmail(email);
          safeSetStorage('vis_portal_user_email', email);
          await fetchBrandInfo(email);
        } else {
          setSession(null);
          setBrandData(null);
          safeRemoveStorage('vis_portal_session');
          safeRemoveStorage('vis_portal_user_email');
          safeRemoveStorage('vis_portal_brand_data');
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
          safeSetStorage('vis_portal_session', JSON.stringify(currentSession));
          const email = currentSession.user?.email || '';
          setUserEmail(email);
          safeSetStorage('vis_portal_user_email', email);
          await fetchBrandInfo(email);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setBrandData(null);
          safeRemoveStorage('vis_portal_session');
          safeRemoveStorage('vis_portal_user_email');
          safeRemoveStorage('vis_portal_brand_data');
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
          // Auto-heal: try to insert brand record using authenticated session
          const isMicro = approvedApp.booth_type === 'T';
          const { data: newBrand } = await supabase
            .from('exhibitor_brands')
            .insert({
              application_id: approvedApp.id,
              brand_name_zh: approvedApp.brand_name_zh,
              brand_name_en: approvedApp.brand_name_en || approvedApp.brand_name_zh,
              zone_id: approvedApp.zone_id,
              booth_type: approvedApp.booth_type,
              is_micro_exposure: isMicro,
              portal_email: formattedEmail,
              custom_fee: approvedApp.custom_fee ?? null,
              discount_note: approvedApp.discount_note ?? null,
            })
            .select()
            .maybeSingle();

          if (newBrand) {
            data = newBrand;
          } else {
            // Insert may have failed or already exists — try refetch
            const { data: refetch } = await supabase
              .from('exhibitor_brands')
              .select('*')
              .eq('portal_email', formattedEmail)
              .maybeSingle();

            if (refetch) {
              data = refetch;
            } else {
              // Final fallback: build complete in-memory brand from approved application so portal renders immediately
              data = {
                id: approvedApp.id,
                application_id: approvedApp.id,
                brand_name_zh: approvedApp.brand_name_zh,
                brand_name_en: approvedApp.brand_name_en || approvedApp.brand_name_zh,
                zone_id: approvedApp.zone_id,
                booth_type: approvedApp.booth_type,
                is_micro_exposure: isMicro,
                portal_email: formattedEmail,
                created_at: approvedApp.created_at,
                custom_fee: approvedApp.custom_fee ?? null,
                discount_note: approvedApp.discount_note ?? null,
                _fallback: true,
              };
            }
          }
        }
      }

      if (data) {
        if (data.booth_type && (data.booth_type.includes('S01') || data.booth_type.includes('S06') || data.booth_type === 'S-2x2')) {
          data.booth_type = 'A01';
        }
        setBrandData(data);
        safeSetStorage('vis_portal_brand_data', JSON.stringify(data));
      } else {
        // Admin bypass: auto-create mock brand in DB
        if (ADMIN_EMAILS.includes(formattedEmail)) {
          const { data: newBrand } = await supabase
            .from('exhibitor_brands')
            .insert({
              brand_name_zh: '大會測試品牌 (管理員)',
              brand_name_en: 'VIS Admin Test Brand',
              zone_id: 'artsy',
              booth_type: 'A01',
              is_micro_exposure: false,
              portal_email: formattedEmail,
            })
            .select()
            .maybeSingle();
          
          if (newBrand) {
            setBrandData(newBrand);
            safeSetStorage('vis_portal_brand_data', JSON.stringify(newBrand));
          } else {
            const fallbackBrand = {
              id: '00000000-0000-0000-0000-000000000000',
              brand_name_zh: '大會測試品牌 (管理員)',
              brand_name_en: 'VIS Admin Test Brand',
              zone_id: 'artsy',
              booth_type: 'A01',
              is_micro_exposure: false,
              portal_email: formattedEmail,
            };
            setBrandData(fallbackBrand);
            safeSetStorage('vis_portal_brand_data', JSON.stringify(fallbackBrand));
          }
        } else {
          setBrandData(null);
          safeRemoveStorage('vis_portal_brand_data');
        }
      }
    } catch (e) {
      console.error('Error fetching brand data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Password Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginMessage('');

    const formattedEmail = loginEmail.toLowerCase().trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password: loginPassword,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          setLoginMessage(
            lang === 'en'
              ? 'Invalid email or password. If you have not set a password yet, click "First time login or set password" below to activate your account.'
              : '帳號或密碼輸入錯誤。若您尚未設定過登入密碼，請點擊下方「首次登入或設定密碼」自訂密碼以開通後台。'
          );
        } else {
          setLoginMessage(lang === 'en' ? `Login failed: ${error.message}` : `登入失敗: ${error.message}`);
        }
        setLoginLoading(false);
        return;
      }

      // Check if email is in exhibitor_brands
      const { data: allowedBrand } = await supabase
        .from('exhibitor_brands')
        .select('id')
        .eq('portal_email', formattedEmail)
        .maybeSingle();

      let allowed = !!allowedBrand;

      if (!allowed) {
        // Also check if email exists as an approved application in exhibitor_applications
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
        setLoginMessage(
          lang === 'en'
            ? 'Your account has not been approved by the organizer or exhibitor records were not found. Please confirm your email is identical to your application.'
            : '您的帳號尚未被主辦單位核准入選，或查無參展商資料。若已核准，請確認帳號是否與申請時一致。'
        );
        await supabase.auth.signOut();
        setLoginLoading(false);
        return;
      }

      // Login success: onAuthStateChange will trigger and set session / brandData
    } catch (err: any) {
      setLoginMessage(lang === 'en' ? `Login error: ${err.message || err}` : `登入異常: ${err.message || err}`);
    } finally {
      setLoginLoading(false);
    }
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
          booth_type: 'A01',
          concept_brief: '融入東方古典意象的琉璃陳設展位。',
          status: 'approved',
          deposit_paid: true,
        })
        .select()
        .single();

      if (appErr) {
        setLoginMessage(`Demo Login Failed: ${appErr.message}`);
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
        setLoginMessage(`Demo Login Failed (Brand): ${brandErr.message}`);
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
          setLoginMessage(`Demo Login Failed (SignUp): ${signUpError.message}`);
        } else {
          // Retry login
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: demoEmail,
            password: 'vis2027exhibitor',
          });
          if (retryError) {
            setLoginMessage(`Demo Login Failed (Retry): ${retryError.message}`);
          }
        }
      }
    } catch (ex) {
      setLoginMessage(lang === 'en' ? 'Demo login initialization exception.' : 'Demo 帳號初始化異常，請以普通帳號登入。');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    safeRemoveStorage('vis_portal_session');
    safeRemoveStorage('vis_portal_user_email');
    safeRemoveStorage('vis_portal_brand_data');
    router.push('/exhibitor');
  };

  // Nav Items configuration with full bilingual translations
  const getNavItems = () => {
    const isMicro = brandData?.is_micro_exposure || brandData?.booth_type === 'T';
    return [
      {
        name: lang === 'en' ? 'Module A — Schedule & Finance' : '模組 A — 時程與財務管理',
        href: '/exhibitor/portal',
        icon: Calendar,
      },
      {
        name: lang === 'en' ? 'Module B — Compliance Agreement' : '模組 B — 展位規範簽署',
        href: '/exhibitor/portal/compliance',
        icon: FileCheck,
      },
      {
        name: lang === 'en' ? 'Module C — VIP Guest Invitations' : '模組 C — VIP 專屬貴賓邀請',
        href: '/exhibitor/portal/vip',
        icon: Users,
        badge: isMicro ? (lang === 'en' ? 'Standard Only' : '限一般展商') : null,
        disabled: isMicro,
      },
      {
        name: lang === 'en' ? 'Module D — Media & PR Kit' : '模組 D — 媒體公關素材',
        href: '/exhibitor/portal/media',
        icon: ImageIcon,
        badge: isMicro ? (lang === 'en' ? 'Standard Only' : '限一般展商') : null,
        disabled: isMicro,
      },
      {
        name: lang === 'en' ? 'Module E — Artworks & Table Tents' : '模組 E — 展品與立牌標籤',
        href: '/exhibitor/portal/products',
        icon: QrCode,
        badge: lang === 'en' ? 'New' : '新功能',
      },
      {
        name: lang === 'en' ? 'Module F — VIP Reception & Leads' : '模組 F — 現場貴賓接待與商機',
        href: '/exhibitor/portal/leads',
        icon: Sparkles,
        badge: lang === 'en' ? 'VIP Concierge' : 'VIP管家',
      },
      {
        name: lang === 'en' ? 'Module G — Public Registration Link' : '模組 G — 公眾專屬預約連結',
        href: '/exhibitor/portal/tickets',
        icon: Ticket,
        badge: lang === 'en' ? 'General Admission' : '一般大眾',
      },
    ];
  };

  // 1. Full Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center font-sans-outfit">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#DFBA87] mx-auto" />
          <p className="text-xs text-neutral-500 font-light tracking-[0.2em] uppercase">
            {t('載入品牌專屬中心 Loading...', 'Loading Exhibitor Collaboration Portal...')}
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state - Show Premium login screen with prominent language toggle
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col p-6 font-sans-outfit text-white relative overflow-hidden justify-center items-center">
        
        {/* Decorative elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#C9A96E]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#C9A96E]/5 rounded-full blur-3xl" />

        <div className="w-full max-w-md bg-[#111111] border border-white/5 p-8 rounded-xl relative z-10 shadow-2xl">
          
          {/* Top Row: Logo + Prominent One-Click English Button */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <img 
              src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
              alt="VIS" 
              className="h-8 filter invert brightness-200"
            />
            
            {/* Prominent One-Click English Toggle for Foreign Brands */}
            <button
              type="button"
              onClick={toggleLang}
              className={`
                px-3 py-1.5 rounded-full border text-xs font-semibold tracking-wider transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-md
                ${lang === 'en'
                  ? 'bg-[#DFBA87] text-black border-[#DFBA87] hover:bg-[#c9a370]'
                  : 'bg-[#DFBA87]/15 hover:bg-[#DFBA87] hover:text-black text-[#DFBA87] border-[#DFBA87]/50'
                }
              `}
              title={lang === 'zh' ? '切換為英文 Switch to English' : '切換為繁體中文 Switch to Chinese'}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '🌐 一鍵轉英文 English' : '🌐 繁體中文'}</span>
            </button>
          </div>
          
          <h2 className="text-xl md:text-2xl font-serif-garamond text-center font-normal tracking-wider mb-2 text-[#DFBA87]">
            {t('參展品牌協作中心', 'Exhibitor Portal')}
          </h2>
          <p className="text-[10px] text-center text-neutral-400 font-light tracking-[0.2em] uppercase mb-8">
            {t('Exhibitor Collaboration Portal', 'Official Exhibitor Management')}
          </p>

          <AnimatePresence mode="wait">
            <motion.form 
              key="login-form"
              onSubmit={handleLoginSubmit}
              className="space-y-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div>
                <label className="block text-[10px] font-semibold tracking-widest text-[#DFBA87] uppercase mb-2">
                  {t('登錄電子信箱 EMAIL ADDRESS', 'Registered Email Address')}
                </label>
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder={t('ENTER YOUR REGISTERED EMAIL', 'ENTER YOUR REGISTERED EMAIL')}
                  className="w-full text-center text-xs tracking-wider border border-white/10 focus:border-[#C9A96E] bg-white/5 rounded px-4 py-3 outline-none text-white transition-all uppercase"
                  required
                  disabled={loginLoading}
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold tracking-widest text-[#DFBA87] uppercase mb-2">
                  {t('密碼 PASSWORD', 'Password')}
                </label>
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder={t('ENTER YOUR PASSWORD', 'ENTER YOUR PASSWORD')}
                  className="w-full text-center text-xs tracking-wider border border-white/10 focus:border-[#C9A96E] bg-white/5 rounded px-4 py-3 outline-none text-white transition-all"
                  required
                  disabled={loginLoading}
                />
              </div>

              <button 
                type="submit" 
                disabled={loginLoading}
                className="w-full bg-[#C9A96E] hover:bg-[#B39359] text-white py-3 rounded text-xs font-semibold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-[#C9A96E]/20"
              >
                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('登入協作平台 LOGIN TO PORTAL', 'LOG IN TO PORTAL')}
              </button>

              {/* First-time setup & Forgot password prominent buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <Link 
                  href={`/exhibitor/reset-password${loginEmail ? `?email=${encodeURIComponent(loginEmail)}` : ''}`}
                  className="w-full inline-flex items-center justify-center gap-2 border border-[#DFBA87]/40 hover:border-[#DFBA87] hover:bg-[#DFBA87]/10 text-[#DFBA87] py-2.5 rounded text-xs font-medium tracking-wider transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" /> 
                  {t('首次登入或設定密碼？點此立即啟用帳號 →', 'First time login or set password? Activate account →')}
                </Link>

                <div className="text-center">
                  <Link 
                    href={`/exhibitor/reset-password${loginEmail ? `?email=${encodeURIComponent(loginEmail)}` : ''}`}
                    className="text-[10px] text-neutral-400 hover:text-[#DFBA87] underline underline-offset-4 tracking-wider transition-colors inline-block"
                  >
                    {t('忘記密碼？以安全驗證碼重設密碼 Reset Password', 'Forgot password? Reset password with security code')}
                  </Link>
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-[9px] text-neutral-500 font-semibold tracking-widest uppercase">
                  {t('或者 OR', 'OR')}
                </span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              {/* Quick Local Demo Login Button */}
              <button 
                type="button"
                onClick={handleDemoLogin}
                disabled={loginLoading}
                className="w-full border border-dashed border-[#DFBA87]/45 hover:border-[#DFBA87] hover:bg-[#DFBA87]/5 text-[#DFBA87] py-3 rounded text-xs font-semibold tracking-[0.15em] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" /> {t('快速本地測試登入 (DEMO KEY)', 'QUICK DEMO LOGIN (DEMO KEY)')}
              </button>

              {loginMessage && (
                <p className="text-[11px] text-rose-400 font-light leading-relaxed whitespace-pre-wrap text-center bg-rose-500/10 p-3 rounded border border-rose-500/20">{loginMessage}</p>
              )}
            </motion.form>
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
            <h2 className="text-lg font-serif-garamond text-[#DFBA87] tracking-wider">
              {t('信箱授權未核對', 'Email Authorization Pending')}
            </h2>
            <p className="text-xs text-neutral-400 font-light leading-relaxed mt-2">
              {t(
                `您已成功登入系統，但信箱 (${userEmail}) 尚未被入選為 2027 VIS 參展品牌。`,
                `You have logged in, but your email (${userEmail}) is not associated with an approved 2027 VIS exhibitor.`
              )}
            </p>
          </div>
          <div className="space-y-3 pt-4">
            <button 
              onClick={handleLogout}
              className="w-full bg-[#C9A96E] hover:bg-[#B39359] text-white py-2.5 rounded text-xs font-semibold tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> {t('登出並返回', 'Log Out & Return')}
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

      {/* Mobile Sticky Top Header with English Toggle */}
      <div className="md:hidden sticky top-0 bg-[#0D0D0D]/90 backdrop-blur-md border-b border-white/5 z-50 p-4 flex justify-between items-center w-full">
        <Link href="/exhibitor/portal">
          <img 
            src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
            alt="VIS" 
            className="h-7 filter invert brightness-200"
          />
        </Link>
        <div className="flex items-center gap-2.5">
          {/* Prominent Mobile English Toggle */}
          <button
            type="button"
            onClick={toggleLang}
            className={`px-2.5 py-1.5 rounded-md border text-xs font-bold flex items-center gap-1 transition-all ${
              lang === 'en'
                ? 'bg-[#DFBA87] text-black border-[#DFBA87]'
                : 'bg-[#DFBA87]/15 text-[#DFBA87] border-[#DFBA87]/40 hover:border-[#DFBA87]'
            }`}
            title={lang === 'zh' ? '一鍵轉英文 Switch to English' : '切換繁體中文 Switch to Chinese'}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? 'EN 英文' : '中文'}</span>
          </button>

          <Link
            href="/exhibitor/portal/leads?scan=true"
            className="p-1.5 bg-[#DFBA87] text-black rounded text-xs flex items-center gap-1 font-semibold shadow-md shadow-[#DFBA87]/20"
            title={t('現場接待掃碼', 'VIP Check-in')}
          >
            <QrCode className="w-4 h-4" />
            <span className="text-[11px]">{t('接待掃碼', 'Scan')}</span>
          </Link>
          <button 
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="text-[#DFBA87] hover:text-white transition-colors p-1"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-[57px] md:top-0 bottom-0 left-0 w-64 bg-[#0A0A0A] border-r border-white/5 z-40 
        transform md:transform-none transition-transform duration-300 ease-in-out flex flex-col justify-between
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 space-y-6">
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
              {t('參展品牌協作中心', 'Exhibitor Collaboration')}
            </p>
          </div>

          {/* Brand Info Display Card */}
          <div className="bg-white/[0.02] border border-white/5 rounded p-4 space-y-2">
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono block">Current Brand</span>
            <h3 className="text-sm font-semibold text-white tracking-wide">
              {lang === 'en' ? (brandData?.brand_name_en || brandData?.brand_name_zh) : brandData?.brand_name_zh}
            </h3>
            <p className="text-[10px] text-neutral-400 font-light truncate">
              {lang === 'en' ? brandData?.brand_name_zh : (brandData?.brand_name_en || '')}
            </p>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#C9A96E]/10 border border-[#C9A96E]/20 text-[9px] text-[#DFBA87]">
              <span>{t('展位規格: ', 'Booth: ')}{formatBoothDisplay(brandData?.booth_type, brandData?.zone_id)}</span>
            </div>
          </div>

          {/* Bilingual Switcher Card in Sidebar */}
          <div className="bg-[#141414] border border-white/5 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <Globe className="w-3 h-3 text-[#DFBA87]" />
                <span>{t('語系切換 LANGUAGE', 'PORTAL LANGUAGE')}</span>
              </span>
              <span className="text-[9px] text-[#DFBA87] font-bold">{lang === 'en' ? 'ENGLISH' : '繁體中文'}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setLang('zh')}
                className={`py-1.5 rounded text-xs font-semibold tracking-wider transition-all text-center ${
                  lang === 'zh' 
                    ? 'bg-[#DFBA87] text-black font-bold shadow-sm' 
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                繁體中文
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`py-1.5 rounded text-xs font-semibold tracking-wider transition-all text-center ${
                  lang === 'en' 
                    ? 'bg-[#DFBA87] text-black font-bold shadow-sm' 
                    : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Quick Concierge Scan Action Button */}
          <Link
            href="/exhibitor/portal/leads?scan=true"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-[#DFBA87] hover:bg-[#c9a370] text-black font-semibold text-xs rounded transition-all shadow-md shadow-[#DFBA87]/20 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>{t('📷 現場貴賓接待掃碼', '📷 Concierge VIP Check-in')}</span>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
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

          {/* Admin Mode Switcher Button */}
          {ADMIN_EMAILS.map(e => e.toLowerCase().trim()).includes((userEmail || '').toLowerCase().trim()) && (
            <div className="pt-2 border-t border-white/5 mt-2">
              <Link
                href="/exhibitor/admin"
                className="flex items-center justify-between p-3 rounded text-xs tracking-wider border border-[#DFBA87]/40 bg-[#DFBA87]/10 text-[#DFBA87] hover:bg-[#DFBA87]/20 transition-all font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#DFBA87]" />
                  <span>{t('大會審查管理後台', 'Admin Review Dashboard')}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
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
            <LogOut className="w-3.5 h-3.5" /> {t('登出 LOGOUT', 'LOG OUT')}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-6 md:p-12 z-10 relative overflow-x-hidden">
        
        {/* Prominent Desktop Top Header Bar with One-Click English Button */}
        <header className="hidden md:flex items-center justify-between pb-6 mb-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-neutral-400 font-mono">
              {t('參展品牌協作中心', 'Exhibitor Portal')} /
            </span>
            <span className="text-sm font-semibold text-white tracking-wide">
              {lang === 'en' ? (brandData?.brand_name_en || brandData?.brand_name_zh) : brandData?.brand_name_zh}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#C9A96E]/10 border border-[#C9A96E]/20 text-[#DFBA87]">
              {formatBoothDisplay(brandData?.booth_type, brandData?.zone_id)}
            </span>
          </div>

          {/* Prominent One-Click English / Chinese Toggle Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleLang}
              className={`
                px-4 py-2 rounded-full border transition-all duration-300 flex items-center gap-2.5 font-semibold text-xs tracking-wider cursor-pointer shadow-lg
                ${lang === 'en'
                  ? 'bg-[#DFBA87] text-black border-[#DFBA87] hover:bg-[#c9a370] shadow-[#DFBA87]/20 font-bold'
                  : 'bg-[#181818] hover:bg-[#DFBA87]/20 text-[#DFBA87] border-[#DFBA87]/50 hover:border-[#DFBA87] shadow-black/50'
                }
              `}
              title={lang === 'zh' ? '點擊一鍵轉英文 (One-Click English Translation)' : '點擊切換為繁體中文 (Switch to Traditional Chinese)'}
            >
              <Globe className="w-4 h-4" />
              <span>{lang === 'zh' ? '🌐 一鍵轉英文 English' : '🌐 切換繁體中文 (Chinese)'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${lang === 'en' ? 'bg-black text-[#DFBA87]' : 'bg-[#DFBA87]/20 text-[#DFBA87]'}`}>
                {lang === 'en' ? 'EN ACTIVE' : 'ONE-CLICK'}
              </span>
            </button>
          </div>
        </header>

        {children}
      </main>

    </div>
  );
}

export default function ExhibitorPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ExhibitorLanguageProvider>
      <ExhibitorPortalLayoutContent>
        {children}
      </ExhibitorPortalLayoutContent>
    </ExhibitorLanguageProvider>
  );
}
