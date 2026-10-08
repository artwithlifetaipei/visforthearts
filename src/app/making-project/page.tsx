'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, ShieldCheck, X, FileText, Loader2, Sparkles, Layers, Compass, Check, Maximize2, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const MAKING_PROJECT_FEE = 12000;

const MATERIAL_CATEGORIES = [
  '生活家具器物 Lifestyle Objects',
  '金屬工藝 Metal & Goldsmith',
  '陶瓷物件 Ceramic & Pottery',
  '木作細工 Fine Woodwork',
  '玻璃工藝 Studio Glass',
  '纖維織物 Fiber & Textile',
  '複合媒材 Mixed Media',
  '其他原創造物 Other Original Crafts'
];

export default function MakingProjectPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreeTerms1, setAgreeTerms1] = useState(false);
  const [agreeTerms2, setAgreeTerms2] = useState(false);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  // Lightbox Modal for Scenography Images
  const [activeImageModal, setActiveImageModal] = useState<{
    src: string;
    captionZh: string;
    captionEn: string;
    titleZh: string;
    titleEn: string;
  } | null>(null);

  // Auth session state
  const [session, setSession] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Form Fields State
  const [formData, setFormData] = useState({
    brand_name_zh: '',
    brand_name_en: '',
    company_name_zh: '',
    company_tax_id: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contact_address: '',
    website_url: '',
    instagram_url: '',
    material_category: '生活家具器物 Lifestyle Objects',
    zone_id: 'artsy',
    booth_type: 'MAKING-PROJECT',
    zone_preference_1: '造物計畫特展席位 (NT$12,000 / 4天)',
    zone_preference_2: '無',
    zone_preference_3: '無',
    concept_brief: '',
    deposit_proof_base64: '',
    deposit_proof_filename: '',
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Check auth session
  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined') {
      try {
        const tempSessionStr = sessionStorage.getItem('vis_temp_session');
        if (tempSessionStr) {
          const s = JSON.parse(tempSessionStr);
          if (s) {
            setSession(s);
            setAuthChecking(false);
          }
        }
      } catch (e) {
        console.warn('sessionStorage check error:', e);
      }
    }

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (isMounted && initialSession) {
        setSession(initialSession);
        setAuthChecking(false);
        try {
          sessionStorage.setItem('vis_temp_session', JSON.stringify(initialSession));
        } catch (e) {}
      } else {
        setAuthChecking(false);
      }
    }).catch(() => {
      setAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      if (currentSession) {
        setSession(currentSession);
        setAuthChecking(false);
        try {
          sessionStorage.setItem('vis_temp_session', JSON.stringify(currentSession));
        } catch (e) {}
      } else {
        setSession(null);
        setAuthChecking(false);
        try {
          sessionStorage.removeItem('vis_temp_session');
        } catch (e) {}
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Pre-fill email from session if present
  useEffect(() => {
    if (session?.user?.email) {
      setFormData(prev => ({
        ...prev,
        contact_email: session.user.email,
      }));
    }
  }, [session]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Convert image to base64 with auto-compression
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(lang === 'zh' ? '請上傳圖片檔案 (PNG, JPEG, WebP)' : 'Please upload an image file (PNG, JPEG, WebP)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert(lang === 'zh' ? '檔案不能超過 15MB' : 'File size cannot exceed 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);

        setPreviewImage(compressedBase64);
        setFormData(prev => ({
          ...prev,
          deposit_proof_base64: compressedBase64,
          deposit_proof_filename: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
        }));
      };
      img.onerror = () => {
        setPreviewImage(rawDataUrl);
        setFormData(prev => ({
          ...prev,
          deposit_proof_base64: rawDataUrl,
          deposit_proof_filename: file.name,
        }));
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Step Validation
  const isStepValid = () => {
    if (currentStep === 1) {
      return (
        formData.brand_name_zh.trim() !== '' &&
        formData.brand_name_en.trim() !== '' &&
        formData.contact_name.trim() !== '' &&
        formData.contact_email.trim() !== '' &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email) &&
        formData.contact_address.trim() !== ''
      );
    }
    if (currentStep === 2) {
      return (
        formData.concept_brief.trim() !== '' &&
        formData.concept_brief.length <= 250
      );
    }
    if (currentStep === 3) {
      return formData.deposit_proof_base64 !== '';
    }
    return true;
  };

  // Submit Application
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const submissionData = {
        ...formData,
        zone_id: 'artsy',
        booth_type: 'MAKING-PROJECT',
        zone_preference_1: `造物計畫特展席位 (${formData.material_category}) (NT$12,000 / 4天)`,
      };

      const response = await fetch('/api/exhibitor/apply', {
        method: 'POST',
        headers,
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();
      if (result.success) {
        setSubmitSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setSubmitError(result.error || (lang === 'zh' ? '提交申請時發生錯誤，請稍後再試。' : 'Failed to submit application. Please try again.'));
      }
    } catch (err: any) {
      setSubmitError(lang === 'zh' ? '系統連線異常，請確認網路連線。' : 'Network error. Please check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-[#C9A96E]">
        <div className="text-center font-sans">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-xs font-light tracking-[0.2em] uppercase">載入中 Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] font-sans antialiased selection:bg-[#C9A96E]/20 relative overflow-x-hidden">
      {/* Editorial Font System Injection */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=Outfit:wght@200;300;400;500;600;700&family=Noto+Serif+TC:wght@300;400;500;600&family=Noto+Sans+TC:wght@300;400;500&display=swap');
        
        .font-serif-garamond { font-family: 'Cormorant Garamond', 'Noto Serif TC', Georgia, serif; }
        .font-sans-outfit { font-family: 'Outfit', 'Noto Sans TC', sans-serif; }
      `}</style>

      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8F5]/85 backdrop-blur-xl border-b border-[#C9A96E]/20 shadow-[0_4px_24px_rgba(201,169,110,0.04)] transition-all">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3.5 group">
            <img 
              src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
              alt="VIS Logo" 
              className="h-8 md:h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
            />
            <span className="w-px h-4.5 bg-[#C9A96E]/30 hidden sm:block" />
            <div className="hidden sm:flex flex-col">
              <span className="font-serif-garamond text-xs md:text-sm tracking-[0.28em] text-[#111111] font-medium uppercase leading-tight">
                THE MAKING PROJECT
              </span>
              <span className="text-[9px] font-sans-outfit tracking-[0.3em] text-[#8C7853] uppercase leading-tight font-light">
                2027 CURATORIAL CALL
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">
            {/* Language Switcher Segmented Pill */}
            <div className="flex items-center p-0.5 rounded-full border border-[#C9A96E]/30 bg-white/70 shadow-xs">
              <button
                onClick={() => setLang('zh')}
                className={`px-3 py-1 rounded-full text-[10px] font-sans-outfit font-medium tracking-wider transition-all duration-300 ${
                  lang === 'zh'
                    ? 'bg-[#C9A96E] text-white shadow-xs'
                    : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-full text-[10px] font-sans-outfit font-medium tracking-wider transition-all duration-300 ${
                  lang === 'en'
                    ? 'bg-[#C9A96E] text-white shadow-xs'
                    : 'text-[#1A1A1A]/60 hover:text-[#1A1A1A]'
                }`}
              >
                EN
              </button>
            </div>

            {/* Back to Home Button */}
            <Link 
              href="/"
              className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#0D0D0D]/10 bg-white/70 hover:border-[#C9A96E] hover:bg-white text-xs text-[#0D0D0D]/70 hover:text-[#8C7853] transition-all duration-300 shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
              <span className="text-[11px] font-sans-outfit tracking-widest uppercase hidden sm:inline">
                {lang === 'zh' ? '返回官網' : 'Main Site'}
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="pt-28 pb-24 px-6 md:px-12 max-w-5xl mx-auto relative">

        {/* ── Ambient Curatorial Lighting ── */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[720px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(201,169,110,0.14),transparent_70%)] blur-3xl pointer-events-none -z-10" />

        {/* ── Curation Intro Section ── */}
        <header className="relative py-12 md:py-16 text-center max-w-5xl mx-auto">
          {/* Curatorial Masthead Overline */}
          <div className="inline-flex items-center gap-3.5 mb-6">
            <span className="w-6 sm:w-12 h-px bg-gradient-to-r from-transparent to-[#C9A96E]" />
            <span className="text-[10px] sm:text-[11px] font-sans-outfit tracking-[0.34em] text-[#8C7853] uppercase font-medium">
              VIS 2027 CURATORIAL INITIATIVE // SPECIAL OPEN CALL
            </span>
            <span className="w-6 sm:w-12 h-px bg-gradient-to-l from-transparent to-[#C9A96E]" />
          </div>

          {/* Monumental Display Title */}
          <h1 className="font-serif-garamond text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-light tracking-[0.06em] text-[#0D0D0D] leading-[1.05] mb-3 uppercase">
            THE MAKING PROJECT
          </h1>

          {/* Bilingual Subtitle */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 mb-6">
            <span className="font-serif-garamond text-base sm:text-xl tracking-[0.28em] text-[#8C7853] font-normal uppercase">
              {lang === 'zh' ? '「造 物 計 畫」特 展 席 位 甄 選' : 'CURATORIAL OPEN CALL'}
            </span>
            <span className="hidden sm:inline text-[#C9A96E]/40">•</span>
            <span className="text-[11px] sm:text-xs font-sans-outfit tracking-[0.2em] text-[#1A1A1A]/50 uppercase font-light">
              {lang === 'zh' ? '專屬獨立創作者與小型工作室' : 'Independent Makers & Craft Studios'}
            </span>
          </div>

          {/* Curated Disciplines Ribbon */}
          <div className="my-8 py-3 max-w-3xl mx-auto border-y border-[#C9A96E]/25 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] sm:text-[11px] font-sans-outfit tracking-[0.22em] text-[#8C7853]/90 uppercase">
            <span>{lang === 'zh' ? '生活器物' : 'OBJECTS'}</span>
            <span className="text-[#C9A96E]/40">✦</span>
            <span>{lang === 'zh' ? '金工鍛造' : 'GOLDSMITH'}</span>
            <span className="text-[#C9A96E]/40">✦</span>
            <span>{lang === 'zh' ? '陶瓷陶藝' : 'CERAMICS'}</span>
            <span className="text-[#C9A96E]/40">✦</span>
            <span>{lang === 'zh' ? '木作細工' : 'WOODWORK'}</span>
            <span className="text-[#C9A96E]/40">✦</span>
            <span>{lang === 'zh' ? '玻璃工藝' : 'GLASS'}</span>
            <span className="text-[#C9A96E]/40">✦</span>
            <span>{lang === 'zh' ? '纖維織物' : 'TEXTILE'}</span>
            <span className="text-[#C9A96E]/40">✦</span>
            <span>{lang === 'zh' ? '複合媒材' : 'MIXED MEDIA'}</span>
          </div>

          {/* Curatorial Plaque */}
          <div className="bg-white/95 backdrop-blur-md border border-[#C9A96E]/30 p-6 sm:p-10 md:p-12 shadow-[0_20px_50px_rgba(201,169,110,0.06)] text-left relative overflow-hidden rounded-xs">
            {/* Architectural Corner Accents */}
            <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-[#C9A96E]/60 pointer-events-none" />
            <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-[#C9A96E]/60 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-[#C9A96E]/60 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-[#C9A96E]/60 pointer-events-none" />
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#C9A96E]/10 via-transparent to-transparent pointer-events-none" />

            {/* Curatorial Thesis Banner */}
            <div className="pb-7 mb-8 border-b border-[#C9A96E]/20 text-center sm:text-left">
              <div className="flex items-center gap-2 mb-2.5 justify-center sm:justify-start">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A96E]" />
                <span className="text-[10px] font-sans-outfit tracking-[0.3em] uppercase text-[#8C7853] font-semibold">
                  CURATORIAL THESIS // 策展宗旨
                </span>
              </div>
              <h3 className="font-serif-garamond text-base sm:text-lg md:text-xl lg:text-[22px] xl:text-[24px] text-[#111111] font-normal leading-[1.45] tracking-wide sm:whitespace-nowrap">
                {lang === 'zh' ? (
                  <>
                    <span className="inline-block">「支持更多獨立創作者的長遠實踐與持續發展，</span>
                    <span className="inline-block">為本計畫的核心宗旨。」</span>
                  </>
                ) : (
                  <span>"Supporting the long-term practice and flourishing of independent creators lies at the very core of this initiative."</span>
                )}
              </h3>
            </div>

            {/* Two-Column Grid: Left Manifesto / Right Criterion Card */}
            <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
              {/* Left Column: Philosophical Discourse */}
              <div className="lg:col-span-7 space-y-4 font-sans-outfit font-light text-sm sm:text-base leading-relaxed text-[#111111]/85 text-justify">
                {lang === 'zh' ? (
                  <>
                    <p className="leading-loose">
                      「造物計劃」邀請以個人或小型工作室為核心的獨立創作者，以強調人進行造物價值與意義為核，透過諸如陶、木、金屬、玻璃與纖維等材料，呈現各自對物件與生活的理解。
                    </p>
                    <p className="leading-loose text-[#111111]/75">
                      在 AI 興起、形式容易被大量生成與複製的時代，重新觀看人的判斷如何轉化為比例、觸感與差異，也讓觀眾透過觀看、選擇與使用，建立自己的品味。
                    </p>
                  </>
                ) : (
                  <>
                    <p className="leading-loose">
                      The Making Project invites independent creators centered around individuals or small studios to spotlight the intrinsic value and meaning of human making. Through materials such as ceramics, wood, metal, glass, and fiber, makers present their unique perspectives on objects and everyday living.
                    </p>
                    <p className="leading-loose text-[#111111]/75">
                      In an era where AI emerges and forms are easily generated and duplicated at scale, we revisit how human judgment translates into proportion, texture, and nuance — inviting audiences to cultivate their own taste through observation, selection, and daily use.
                    </p>
                  </>
                )}
              </div>

              {/* Right Column: Core Condition Pledge Plaque */}
              <div className="lg:col-span-5 bg-[#FAF8F5] border border-[#C9A96E]/40 p-6 md:p-7 relative flex flex-col justify-between shadow-xs">
                <div className="absolute -top-2.5 left-5 bg-[#8C7853] text-white px-2.5 py-0.5 text-[9px] font-sans-outfit tracking-[0.2em] uppercase font-bold">
                  {lang === 'zh' ? '唯一參展條件' : 'ESSENTIAL PREREQUISITE'}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2 mt-1">
                    <span className="text-[11px] font-sans-outfit tracking-[0.2em] uppercase text-[#8C7853] font-semibold">
                      {lang === 'zh' ? '作品絕非工廠製造' : 'STRICTLY NON-FACTORY PRODUCED'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-[13px] text-[#111111]/85 font-light leading-relaxed">
                    {lang === 'zh' ? (
                      <>
                        參展物件絕不可為<strong className="text-[#8C7853] font-semibold">工廠開模、代工流水線或工業量產製造</strong>。每一件作品必須由創作者個人或獨立工作室親手製作成形，保有雙手在塑形與打磨當下所賦予的溫度、觸感與不可替代的造物靈魂。
                      </>
                    ) : (
                      <>
                        Exhibited objects must strictly <strong className="text-[#8C7853] font-semibold">not be factory-manufactured, mass-molded, or mass-produced</strong>. Every piece must be crafted by hand in the studio, preserving human nuance and authenticity.
                      </>
                    )}
                  </p>
                </div>

                <div className="mt-4 pt-3.5 border-t border-[#C9A96E]/20 flex items-center justify-between text-[10px] font-sans-outfit tracking-wider text-[#8C7853]">
                  <span>100% STUDIO HANDCRAFT</span>
                  <Check className="w-3.5 h-3.5 text-[#C9A96E]" />
                </div>
              </div>
            </div>

            {/* Plaque Footer Info & Action Anchor */}
            <div className="mt-8 pt-6 border-t border-[#C9A96E]/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans-outfit text-[#8C7853]">
              <div className="flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 text-[#C9A96E]" />
                <span>
                  {lang === 'zh' 
                    ? '2027.01.06–01.09 台北中山堂光復廳・特展專屬席位' 
                    : 'Zhongshan Hall Guangfu Hall, Jan 6–9, 2027'}
                </span>
              </div>
              <a 
                href="#application-form" 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111111] hover:bg-[#8C7853] text-white text-[11px] font-sans-outfit tracking-[0.2em] uppercase transition-all duration-300 shadow-sm group"
              >
                <span>{lang === 'zh' ? '前往填寫申請表' : 'Apply for Stalls'}</span>
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </header>

        {/* ── Editorial Scenography Gallery Showcase ── */}
        <section className="space-y-6 pt-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#C9A96E]/20 pb-4 gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-sans-outfit tracking-[0.28em] text-[#8C7853] uppercase mb-1.5 font-medium">
                <Sparkles className="w-3 h-3 text-[#C9A96E]" />
                {lang === 'zh' ? '展台空間意象 SCENOGRAPHY MOCKUP' : 'SCENOGRAPHY & SPATIAL ESSENCE'}
              </div>
              <h3 className="text-2xl md:text-3xl font-serif-garamond text-[#0D0D0D] tracking-wide font-light">
                {lang === 'zh' ? '大平面共享展示空間・陳列模擬示意' : 'Shared Curated Display Table — Spatial Concept'}
              </h3>
            </div>
            <p className="text-xs font-sans-outfit text-[#0D0D0D]/65 max-w-md font-light leading-relaxed">
              {lang === 'zh'
                ? '大會提供統一白色大平面檯面，由策展團隊依光線與器型統一陳列，呈現人手造物之細膩差異、比例與觸感。'
                : 'A unified white platform curated by the VIS team, spotlighting human craftsmanship, proportions, and tactile nuances.'}
            </p>
          </div>

          {/* Dual Gallery Grid */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Photo 1 Card */}
            <div 
              onClick={() => setActiveImageModal({
                src: '/images/making-project/scenography_1.jpg',
                titleZh: '大平面白色展台整體意象',
                titleEn: 'Spatial Overview — Shared Platform',
                captionZh: '大會規劃之統一展台，以開闊視野與素雅白色為基底，讓每一件手工器物在空間光線與留白中自然對話。',
                captionEn: 'Unified white presentation platform designed by VIS, creating architectural breathing room for handcrafted objects in natural gallery light.'
              })}
              className="group bg-white/90 border border-[#C9A96E]/25 p-4 md:p-5 shadow-[0_4px_24px_rgba(201,169,110,0.04)] hover:shadow-[0_16px_40px_rgba(201,169,110,0.12)] hover:border-[#C9A96E]/60 transition-all duration-500 cursor-pointer flex flex-col justify-between"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#FAF9F6]">
                <img
                  src="/images/making-project/scenography_1.jpg"
                  alt="Scenography Spatial Overview"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-500 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-3.5 py-1.5 bg-white/95 backdrop-blur-sm text-[#0D0D0D] text-[11px] font-sans-outfit tracking-widest uppercase flex items-center gap-1.5 shadow-md">
                    <Maximize2 className="w-3.5 h-3.5 text-[#8C7853]" />
                    {lang === 'zh' ? '點擊放大檢視' : 'Enlarge Preview'}
                  </span>
                </div>
                <div className="absolute top-3 left-3 bg-[#0D0D0D]/80 backdrop-blur-sm text-[#FAF9F6] text-[10px] font-sans-outfit tracking-wider px-2.5 py-1 uppercase">
                  FIG 01・SPATIAL OVERVIEW
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#C9A96E]/15">
                <div className="flex items-baseline justify-between mb-1.5">
                  <h4 className="font-serif-garamond text-base md:text-lg text-[#0D0D0D] font-medium tracking-wide">
                    {lang === 'zh' ? '大平面白色展台整體意象' : 'Spatial Overview — Shared Platform'}
                  </h4>
                  <span className="text-[10px] font-sans-outfit text-[#8C7853] uppercase tracking-wider">
                    {lang === 'zh' ? '空間透視' : 'Perspective'}
                  </span>
                </div>
                <p className="text-xs font-sans-outfit text-[#0D0D0D]/70 font-light leading-relaxed">
                  {lang === 'zh'
                    ? '大會規劃之統一展台，以開闊視野與素雅白色為基底，讓每一件手工器物在空間光線與留白中自然對話。'
                    : 'Unified white presentation platform designed by VIS, creating architectural breathing room for handcrafted objects in natural gallery light.'}
                </p>
              </div>
            </div>

            {/* Photo 2 Card */}
            <div 
              onClick={() => setActiveImageModal({
                src: '/images/making-project/scenography_2.jpg',
                titleZh: '器物尺度與陳列細節模擬',
                titleEn: 'Object Proportions & Display Nuance',
                captionZh: '單席位最多可有 4 件展示位置（寬深 10cm、高 30cm 以內），器型在漫射照明下展現質地紋理與手作溫度。',
                captionEn: 'Up to 4 pieces per stall (within 10×10×30 cm), highlighting proportions, clay glazes, and human handcraft under diffused exhibition illumination.'
              })}
              className="group bg-white/90 border border-[#C9A96E]/25 p-4 md:p-5 shadow-[0_4px_24px_rgba(201,169,110,0.04)] hover:shadow-[0_16px_40px_rgba(201,169,110,0.12)] hover:border-[#C9A96E]/60 transition-all duration-500 cursor-pointer flex flex-col justify-between"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#FAF9F6]">
                <img
                  src="/images/making-project/scenography_2.jpg"
                  alt="Scenography Object Nuance"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-500 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-3.5 py-1.5 bg-white/95 backdrop-blur-sm text-[#0D0D0D] text-[11px] font-sans-outfit tracking-widest uppercase flex items-center gap-1.5 shadow-md">
                    <Maximize2 className="w-3.5 h-3.5 text-[#8C7853]" />
                    {lang === 'zh' ? '點擊放大檢視' : 'Enlarge Preview'}
                  </span>
                </div>
                <div className="absolute top-3 left-3 bg-[#0D0D0D]/80 backdrop-blur-sm text-[#FAF9F6] text-[10px] font-sans-outfit tracking-wider px-2.5 py-1 uppercase">
                  FIG 02・TACTILE & SCALE
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#C9A96E]/15">
                <div className="flex items-baseline justify-between mb-1.5">
                  <h4 className="font-serif-garamond text-base md:text-lg text-[#0D0D0D] font-medium tracking-wide">
                    {lang === 'zh' ? '器物尺度與陳列細節模擬' : 'Object Proportions & Display Nuance'}
                  </h4>
                  <span className="text-[10px] font-sans-outfit text-[#8C7853] uppercase tracking-wider">
                    {lang === 'zh' ? '比例與紋理' : 'Texture & Scale'}
                  </span>
                </div>
                <p className="text-xs font-sans-outfit text-[#0D0D0D]/70 font-light leading-relaxed">
                  {lang === 'zh'
                    ? '單席位最多可有 4 件展示位置（寬深 10cm、高 30cm 以內），器型在漫射照明下展現質地紋理與手作溫度。'
                    : 'Up to 4 pieces per stall (within 10×10×30 cm), highlighting proportions, clay glazes, and human handcraft under diffused exhibition illumination.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Key Highlights & Operational Framework ── */}
        <section className="space-y-6 pt-4">
          {/* Exhibition Highlights Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/90 border border-[#C9A96E]/20 p-5 text-center shadow-[0_2px_12px_rgba(201,169,110,0.03)] hover:border-[#C9A96E]/60 transition-all">
              <span className="block text-[10px] uppercase font-sans-outfit tracking-widest text-[#8C7853] mb-1 font-medium">Dates & Venue</span>
              <p className="font-serif-garamond text-xl md:text-2xl font-light text-[#0D0D0D]">2027.01.06–01.09</p>
              <span className="text-[11px] font-sans-outfit text-[#0D0D0D]/50 block mt-0.5">
                {lang === 'zh' ? '台北中山堂光復廳' : 'Taipei Zhongshan Hall'}
              </span>
            </div>
            <div className="bg-white/95 border-2 border-[#C9A96E]/50 p-5 text-center shadow-[0_4px_16px_rgba(201,169,110,0.06)] hover:border-[#C9A96E] transition-all">
              <span className="block text-[10px] uppercase font-sans-outfit tracking-widest text-[#8C7853] mb-1 font-semibold">Exhibition Fee</span>
              <p className="font-serif-garamond text-2xl md:text-3xl font-normal text-[#8C7853]">NT$ 12,000</p>
              <span className="text-[11px] font-sans-outfit text-[#0D0D0D]/60 block mt-0.5 font-medium">
                {lang === 'zh' ? '專案席位 / 全展期四天' : 'Full 4-Day Period'}
              </span>
            </div>
            <div className="bg-white/90 border border-[#C9A96E]/20 p-5 text-center shadow-[0_2px_12px_rgba(201,169,110,0.03)] hover:border-[#C9A96E]/60 transition-all">
              <span className="block text-[10px] uppercase font-sans-outfit tracking-widest text-[#8C7853] mb-1 font-medium">Commission</span>
              <p className="font-serif-garamond text-2xl md:text-3xl font-light text-[#0D0D0D]">
                0%
              </p>
              <span className="text-[11px] font-sans-outfit text-[#0D0D0D]/50 block mt-0.5">
                {lang === 'zh' ? '現場銷售免抽成・自行收款' : 'Direct Creator Sales'}
              </span>
            </div>
            <div className="bg-white/90 border border-[#C9A96E]/20 p-5 text-center shadow-[0_2px_12px_rgba(201,169,110,0.03)] hover:border-[#C9A96E]/60 transition-all">
              <span className="block text-[10px] uppercase font-sans-outfit tracking-widest text-[#8C7853] mb-1 font-medium">Curation</span>
              <p className="font-serif-garamond text-lg md:text-xl font-light text-[#0D0D0D] mt-1">
                {lang === 'zh' ? 'VIS 統一陳列' : 'Curated Platform'}
              </p>
              <span className="text-[11px] font-sans-outfit text-[#0D0D0D]/50 block mt-0.5">
                {lang === 'zh' ? '大會規劃專屬檯面席位' : 'Shared Table Platform'}
              </span>
            </div>
          </div>

          {/* Curatorial & Operational Notice */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1: Scenography */}
            <div className="bg-white border border-[#C9A96E]/25 p-6 md:p-7 shadow-[0_2px_16px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-[#C9A96E]/60 transition-all">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#0D0D0D]/10">
                  <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#8C7853] font-semibold flex items-center gap-1.5">
                    <span className="text-[#C9A96E]">✦</span> SCENOGRAPHY
                  </span>
                  <span className="text-[10px] font-mono text-[#0D0D0D]/40 uppercase">01 / 03</span>
                </div>
                <h4 className="font-serif text-base text-[#0D0D0D] font-medium tracking-wide mb-4">
                  {lang === 'zh' ? '展台規劃與陳列' : 'Display Scenography'}
                </h4>
                <ul className="space-y-3 text-xs md:text-[13px] text-[#0D0D0D]/80 leading-relaxed text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-[#8C7853] mt-1 text-[10px]">■</span>
                    <span>
                      {lang === 'zh' ? (
                        <><strong>VIS 策展統一陳列</strong>：大會提供展示檯面，陳列由策展團隊統一規劃（非獨立攤位，創作者攜帶作品進駐）。</>
                      ) : (
                        <><strong>Unified Display Platform</strong>: Display tables curated uniformly by the VIS team (shared display, not isolated booths).</>
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8C7853] mt-1 text-[10px]">■</span>
                    <span>
                      {lang === 'zh' ? (
                        <><strong>席位規格</strong>：每席最多展示 4 件作品，單件以寬深各 10cm、高 30cm 內為原則（特殊尺寸可另議）。</>
                      ) : (
                        <><strong>Stall Capacity</strong>: Up to 4 display spots on table, max 10cm W × 10cm D × 30cm H (custom sizes negotiable).</>
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8C7853] mt-1 text-[10px]">■</span>
                    <span>
                      {lang === 'zh' ? (
                        <><strong>彈性遞補</strong>：展期可不限次更換上台作品，售出後亦可持續上架遞補。</>
                      ) : (
                        <><strong>Flexible Restocking</strong>: Pieces may be rotated or restocked without limit when sold.</>
                      )}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2: Sales & Logistics */}
            <div className="bg-white border border-[#C9A96E]/25 p-6 md:p-7 shadow-[0_2px_16px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-[#C9A96E]/60 transition-all">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#0D0D0D]/10">
                  <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#8C7853] font-semibold flex items-center gap-1.5">
                    <span className="text-[#C9A96E]">✦</span> SALES & LOGISTICS
                  </span>
                  <span className="text-[10px] font-mono text-[#0D0D0D]/40 uppercase">02 / 03</span>
                </div>
                <h4 className="font-serif text-base text-[#0D0D0D] font-medium tracking-wide mb-4">
                  {lang === 'zh' ? '現場展售與金流' : 'Sales & Logistics'}
                </h4>
                <ul className="space-y-3 text-xs md:text-[13px] text-[#0D0D0D]/80 leading-relaxed text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-[#8C7853] mt-1 text-[10px]">■</span>
                    <span>
                      {lang === 'zh' ? (
                        <><strong>0% 免抽成・自主收款</strong>：現場銷售免抽成，由品牌自行收款（支援現金、LINE Pay、刷卡機等），大會完全不經手款項。</>
                      ) : (
                        <><strong>0% Commission</strong>: Creators collect proceeds directly (cash, mobile pay, card terminals); fair takes zero cut.</>
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8C7853] mt-1 text-[10px]">■</span>
                    <span>
                      {lang === 'zh' ? (
                        <><strong>物流與包裝交付</strong>：現場作品進撤運輸、商品包裝及銷售交付由創作者全權負責。</>
                      ) : (
                        <><strong>Packaging & Delivery</strong>: On-site transport, packaging, and hand-off to buyers handled by creators.</>
                      )}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 3: Staffing */}
            <div className="bg-white border border-[#C9A96E]/25 p-6 md:p-7 shadow-[0_2px_16px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:border-[#C9A96E]/60 transition-all">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#0D0D0D]/10">
                  <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#8C7853] font-semibold flex items-center gap-1.5">
                    <span className="text-[#C9A96E]">✦</span> STAFFING
                  </span>
                  <span className="text-[10px] font-mono text-[#0D0D0D]/40 uppercase">03 / 03</span>
                </div>
                <h4 className="font-serif text-base text-[#0D0D0D] font-medium tracking-wide mb-4">
                  {lang === 'zh' ? '現場駐點交流' : 'On-Site Staffing'}
                </h4>
                <ul className="space-y-3 text-xs md:text-[13px] text-[#0D0D0D]/80 leading-relaxed text-left">
                  <li className="flex items-start gap-2">
                    <span className="text-[#8C7853] mt-1 text-[10px]">■</span>
                    <span>
                      {lang === 'zh' ? (
                        <><strong>四天全程駐點</strong>：四天展期營業時間內，創作者或品牌代表需全程駐點在場。</>
                      ) : (
                        <><strong>Full 4-Day Presence</strong>: Creators or brand reps must be present throughout open hours.</>
                      )}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#8C7853] mt-1 text-[10px]">■</span>
                    <span>
                      {lang === 'zh' ? (
                        <><strong>深度對話交流</strong>：向藏家與觀眾解說創作理念與工藝細節，直接經營品牌顧客。</>
                      ) : (
                        <><strong>Direct Engagement</strong>: Engage collectors and visitors directly, sharing artistic concepts and building clientele.</>
                      )}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Detailed Schedule & Venue Card */}
          <div className="bg-white border border-[#C9A96E]/30 p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-5 border-b border-[#0D0D0D]/10 gap-2">
              <div>
                <span className="text-[10px] font-mono tracking-[0.25em] text-[#8C7853] uppercase block">Venue & Schedule</span>
                <h3 className="text-base md:text-lg font-serif text-[#0D0D0D]">
                  {lang === 'zh' ? '展場地點與詳細時程表' : 'Venue & Detailed Schedule'}
                </h3>
              </div>
              <div className="text-xs text-[#0D0D0D]/70 md:text-right">
                <p className="font-medium text-[#0D0D0D]">
                  台北中山堂 Taipei Zhongshan Hall
                </p>
                <p className="text-[11px] text-[#0D0D0D]/50">
                  台北市中正區光復里延平南路 98 號 (No. 98, Yanping S Rd, Zhongzheng District, Taipei)
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 text-xs">
              {/* Day 1 */}
              <div className="bg-[#FAF9F6] border border-[#0D0D0D]/5 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-[#0D0D0D]/10 pb-1.5">
                  <span className="font-semibold text-[#8C7853]">
                    {lang === 'zh' ? '2027 年 1 月 6 日 星期三' : 'Wednesday, January 6, 2027'}
                  </span>
                  <span className="text-[10px] font-mono text-[#0D0D0D]/50">
                    {lang === 'zh' ? '佈展與貴賓預展' : 'Installation & Vernissage'}
                  </span>
                </div>
                <div className="space-y-1.5 text-[#0D0D0D]/80">
                  <p>• <strong>10:00 – 17:00</strong>｜{lang === 'zh' ? '佈展' : 'Installation'}</p>
                  <p>• <strong>18:00</strong>｜{lang === 'zh' ? '開幕酒會（僅限邀請）' : 'Vernissage (by invitation only)'}</p>
                  <p>• <strong>18:00 – 21:30</strong>｜{lang === 'zh' ? 'VIP 預展（僅限邀請）' : 'VIP Preview (by invitation only)'}</p>
                </div>
              </div>

              {/* Day 2 */}
              <div className="bg-[#FAF9F6] border border-[#0D0D0D]/5 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-[#0D0D0D]/10 pb-1.5">
                  <span className="font-semibold text-[#8C7853]">
                    {lang === 'zh' ? '2027 年 1 月 7 日 星期四' : 'Thursday, January 7, 2027'}
                  </span>
                  <span className="text-[10px] font-mono text-[#0D0D0D]/50">
                    {lang === 'zh' ? '公眾展期' : 'Public Day 1'}
                  </span>
                </div>
                <div className="text-[#0D0D0D]/80 space-y-1">
                  <p>• <strong>12:00 – 18:00</strong>｜{lang === 'zh' ? '公眾展期' : 'Public Day'}</p>
                </div>
              </div>

              {/* Day 3 */}
              <div className="bg-[#FAF9F6] border border-[#0D0D0D]/5 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-[#0D0D0D]/10 pb-1.5">
                  <span className="font-semibold text-[#8C7853]">
                    {lang === 'zh' ? '2027 年 1 月 8 日 星期五' : 'Friday, January 8, 2027'}
                  </span>
                  <span className="text-[10px] font-mono text-[#0D0D0D]/50">
                    {lang === 'zh' ? '公眾展期' : 'Public Day 2'}
                  </span>
                </div>
                <div className="text-[#0D0D0D]/80 space-y-1">
                  <p>• <strong>12:00 – 18:00</strong>｜{lang === 'zh' ? '公眾展期' : 'Public Day'}</p>
                </div>
              </div>

              {/* Day 4 */}
              <div className="bg-[#FAF9F6] border border-[#0D0D0D]/5 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-[#0D0D0D]/10 pb-1.5">
                  <span className="font-semibold text-[#8C7853]">
                    {lang === 'zh' ? '2027 年 1 月 9 日 星期六' : 'Saturday, January 9, 2027'}
                  </span>
                  <span className="text-[10px] font-mono text-[#0D0D0D]/50">
                    {lang === 'zh' ? '公眾展期與撤場' : 'Public Day 3 & Move-Out'}
                  </span>
                </div>
                <div className="space-y-1.5 text-[#0D0D0D]/80">
                  <p>• <strong>13:00 – 19:00</strong>｜{lang === 'zh' ? '公眾展期' : 'Public Day'}</p>
                  <p>• <strong>19:00 – 21:30</strong>｜{lang === 'zh' ? '撤場' : 'Move-Out'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Application & Review Procedure Card ── */}
          <div className="bg-white border border-[#C9A96E]/30 p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-6 border-b border-[#0D0D0D]/10 gap-2">
              <div>
                <span className="text-[10px] font-mono tracking-[0.25em] text-[#8C7853] uppercase block">Procedure & Selection</span>
                <h3 className="text-base md:text-lg font-serif text-[#0D0D0D]">
                  {lang === 'zh' ? '造物計畫申請與審核流程' : 'Application & Curatorial Review Procedure'}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#8C7853] bg-[#C9A96E]/10 px-3 py-1 border border-[#C9A96E]/30 self-start md:self-auto uppercase tracking-wider">
                {lang === 'zh' ? '4 階段審核機制' : '4-Stage Review Framework'}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Stage 1 */}
              <div className="bg-[#FAF9F6] border border-[#0D0D0D]/5 p-4.5 space-y-2 relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#0D0D0D]/10 mb-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#8C7853] font-semibold">STAGE 01</span>
                    <span className="text-[10px] font-mono text-[#0D0D0D]/40">STEP 1</span>
                  </div>
                  <h4 className="font-serif text-sm text-[#0D0D0D] font-medium mb-1.5">
                    {lang === 'zh' ? '線上申請與繳費' : 'Submission & Fee'}
                  </h4>
                  <p className="text-[#0D0D0D]/70 font-light leading-relaxed">
                    {lang === 'zh' 
                      ? '填寫創作者與品牌簡介、闡述手工藝造物理念，並於線上完成參展意向費用（NT$ 12,000）之匯款憑證上傳。'
                      : 'Complete creator profile, submit handcraft brief, and upload exhibition fee (NT$ 12,000) remittance receipt.'}
                  </p>
                </div>
              </div>

              {/* Stage 2 */}
              <div className="bg-[#FAF9F6] border border-[#0D0D0D]/5 p-4.5 space-y-2 relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#0D0D0D]/10 mb-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#8C7853] font-semibold">STAGE 02</span>
                    <span className="text-[10px] font-mono text-[#0D0D0D]/40">STEP 2</span>
                  </div>
                  <h4 className="font-serif text-sm text-[#0D0D0D] font-medium mb-1.5">
                    {lang === 'zh' ? '策展委員會資格審查' : 'Curatorial Review'}
                  </h4>
                  <p className="text-[#0D0D0D]/70 font-light leading-relaxed">
                    {lang === 'zh'
                      ? '評審委員會進行逐案審閱，嚴格把關「非工廠製造、純手作成形」核心原則，評估媒材工藝與展區風貌。'
                      : 'The curatorial jury reviews each submission, verifying strictly non-factory craftsmanship and aesthetic integrity.'}
                  </p>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="bg-[#C9A96E]/5 border-2 border-[#8C7853]/40 p-4.5 space-y-2 relative shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#8C7853]/20 mb-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#8C7853] font-bold">STAGE 03</span>
                    <span className="text-[9px] font-mono bg-[#8C7853] text-white px-1.5 py-0.5 rounded-xs font-semibold">核心確認</span>
                  </div>
                  <h4 className="font-serif text-sm text-[#0D0D0D] font-semibold mb-1.5 text-[#8C7853]">
                    {lang === 'zh' ? '官方核准與參展確立' : 'Official Approval & Admission'}
                  </h4>
                  <p className="text-[#0D0D0D]/90 font-medium leading-relaxed">
                    {lang === 'zh'
                      ? '【重要】收到大會官方信箱（artwithlifetaipei@gmail.com）發送之正式「核准錄取通知」後，始正式具備參展資格與保留席位。'
                      : '[CRITICAL] Participation and stall reservation are only officially confirmed upon receiving the formal Official Admission Notice from our official email.'}
                  </p>
                </div>
              </div>

              {/* Stage 4 */}
              <div className="bg-[#FAF9F6] border border-[#0D0D0D]/5 p-4.5 space-y-2 relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#0D0D0D]/10 mb-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#8C7853] font-semibold">STAGE 04</span>
                    <span className="text-[10px] font-mono text-[#0D0D0D]/40">STEP 4</span>
                  </div>
                  <h4 className="font-serif text-sm text-[#0D0D0D] font-medium mb-1.5">
                    {lang === 'zh' ? '進駐佈展與四天展期' : 'Installation & Fair'}
                  </h4>
                  <p className="text-[#0D0D0D]/70 font-light leading-relaxed">
                    {lang === 'zh'
                      ? '獲選創作者領取參展者證與 5 名貴賓名額，於 2027.01.06 進駐中山堂展台陳列佈展，展開全展期自主展售與交流。'
                      : 'Selected creators receive exhibitor badge & 5 VIP passes, installing on shared curated tables at Zhongshan Hall on Jan 6, 2027.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Review Clarification Callout */}
            <div className="mt-5 p-4 bg-[#FAF9F6] border-l-2 border-[#8C7853] text-xs text-[#0D0D0D]/80 leading-relaxed">
              <strong className="text-[#0D0D0D] font-semibold">
                {lang === 'zh' ? '💡 關於參展資格審核說明：' : '💡 Curatorial Review & Formal Participation Policy:'}
              </strong>
              {lang === 'zh' ? (
                <span>
                  送出本線上申請表與繳交參展費用係為啟動大會策展委員會之審查程序，<strong>並非送出即代表取得席位</strong>。為確保古蹟展場之展出水準與空間和諧，大會採嚴謹之策展甄選機制，<strong>申請單位須待收到大會官方正式發出之「核准錄取通知信」（由 artwithlifetaipei@gmail.com 寄發），方代表正式確立參展資格與保留展台席位</strong>。若經委員會評選未獲入選，大會將於公告結果後 14 個工作日內，將參展費用全額無息退還至原匯款帳戶，請創作者安心申請。
                </span>
              ) : (
                <span>
                  Submitting this application and remitting the fee initiates the curatorial review procedure and <strong>does not automatically grant an exhibition spot</strong>. To preserve curatorial excellence, <strong>participation and table reservations are only formally valid once you receive the official "Admission Approval Notice" from our email (artwithlifetaipei@gmail.com)</strong>. If not selected, the fee will be 100% refunded in full within 14 business days.
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Application Wizard Section ── */}
        <section id="application-form" className="py-12">
          {submitSuccess ? (
            /* Success Screen */
            <div className="bg-white border border-[#C9A96E]/30 p-10 md:p-16 text-center shadow-lg max-w-2xl mx-auto animate-fade-in">
              <div className="w-16 h-16 bg-[#C9A96E]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#C9A96E]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-serif text-[#0D0D0D] mb-3">
                {lang === 'zh' ? '「造物計畫」參展申請已完成遞交' : 'Application Submitted Successfully'}
              </h3>
              <p className="text-sm text-[#0D0D0D]/75 leading-relaxed mb-6 max-w-lg mx-auto">
                {lang === 'zh' 
                  ? '大會策展委員會已成功收到貴品牌的造物計畫意向書與參展費用（NT$ 12,000）匯款憑證。本計畫採嚴謹策展甄選機制，大會進行專業評估審核後，申請單位須於收到官方發出之正式核准錄取通知後，方代表正式取得參展席位。審查結果將發布至您的聯繫信箱。'
                  : 'The curatorial committee has successfully received your proposal and exhibition fee payment proof (NT$ 12,000). Applications undergo rigorous jury review; participation is officially confirmed upon receipt of the formal Admission Approval Notice via email.'}
              </p>
              <div className="bg-[#FAF9F6] border border-[#0D0D0D]/10 p-5 mb-8 text-xs text-[#0D0D0D]/70 leading-relaxed text-left max-w-md mx-auto">
                <p className="font-semibold text-[#8C7853] mb-1">
                  {lang === 'zh' ? '📌 審核須知與退款保證：' : '📌 Review Policy & Refund Guarantee:'}
                </p>
                <p>• {lang === 'zh' ? '收到大會官方信箱 ' : 'Admission notices will be sent from '}<span className="font-mono text-[#0D0D0D]">artwithlifetaipei@gmail.com</span>{lang === 'zh' ? ' 寄發之正式「核准錄取通知」後，始正式確立參展席位資格。' : '; participation is formally confirmed only upon receipt.'}</p>
                <p className="mt-1">• {lang === 'zh' ? '若未獲錄取，大會將於公告後 14 個工作日內，將參展費用全額無息退還至原匯款帳戶。' : 'If not selected, the exhibition fee will be fully refunded without interest within 14 business days.'}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/"
                  className="px-8 py-3 bg-[#0D0D0D] text-white text-xs font-mono tracking-widest uppercase hover:bg-[#8C7853] transition-colors"
                >
                  {lang === 'zh' ? '返回官網首頁' : 'Back to Home'}
                </Link>
                <button
                  onClick={() => {
                    setSubmitSuccess(false);
                    setCurrentStep(1);
                  }}
                  className="px-8 py-3 border border-[#0D0D0D]/20 text-[#0D0D0D] text-xs font-mono tracking-widest uppercase hover:border-[#C9A96E] hover:text-[#8C7853] transition-colors"
                >
                  {lang === 'zh' ? '填寫另一份申請' : 'Submit Another'}
                </button>
              </div>
            </div>
          ) : (
            /* Wizard Steps */
            <div>
              {/* Stepper Header */}
              <div className="mb-12">
                <div className="relative">
                  {/* Subtle connecting line for desktop */}
                  <div className="hidden md:block absolute top-[18px] left-[10%] right-[10%] h-[1px] bg-[#0D0D0D]/10 z-0" />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 relative z-10">
                    {[
                      { step: 1, zh: '品牌與創作者', en: 'Creator Profile' },
                      { step: 2, zh: '媒材與造物理念', en: 'Creation Brief' },
                      { step: 3, zh: '參展費用繳交', en: 'Exhibition Fee' },
                      { step: 4, zh: '確認與送出', en: 'Agreement' },
                    ].map((item) => {
                      const isActive = currentStep === item.step;
                      const isCompleted = currentStep > item.step;
                      return (
                        <div 
                          key={item.step}
                          className={`bg-white md:bg-transparent p-3 md:p-1 rounded-sm border md:border-none ${
                            isActive 
                              ? 'border-[#8C7853]/40 shadow-sm md:shadow-none' 
                              : 'border-[#0D0D0D]/5'
                          } text-center cursor-pointer transition-all group`}
                          onClick={() => {
                            if (item.step < currentStep) setCurrentStep(item.step);
                          }}
                        >
                          <div className="inline-flex items-center justify-center gap-2 mb-2">
                            <span className={`w-8 h-8 rounded-full text-xs font-mono flex items-center justify-center transition-all ${
                              isActive 
                                ? 'bg-[#8C7853] text-white shadow-md ring-4 ring-[#8C7853]/15 font-semibold' 
                                : isCompleted 
                                  ? 'bg-[#0D0D0D] text-white' 
                                  : 'bg-white border border-[#0D0D0D]/20 text-[#0D0D0D]/40 group-hover:border-[#8C7853]/50'
                            }`}>
                              {isCompleted ? '✓' : `0${item.step}`}
                            </span>
                          </div>
                          <span className={`block text-xs md:text-[13px] tracking-wide font-sans transition-colors ${
                            isActive 
                              ? 'text-[#8C7853] font-semibold' 
                              : isCompleted 
                                ? 'text-[#0D0D0D] font-medium' 
                                : 'text-[#0D0D0D]/40 group-hover:text-[#0D0D0D]/70'
                          }`}>
                            {lang === 'zh' ? item.zh : item.en}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {submitError && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-xs">
                  {submitError}
                </div>
              )}

              {/* Form Card */}
              <div className="bg-white border border-[#C9A96E]/20 p-8 md:p-12 shadow-sm">
                
                {/* ── STEP 1: Brand & Creator Info ── */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-serif tracking-wider text-[#0D0D0D] uppercase mb-1">
                        {lang === 'zh' ? '01. 品牌與創作者基本資料' : '01. Creator & Brand Profile'}
                      </h3>
                      <p className="text-xs text-[#0D0D0D]/50 font-light">
                        {lang === 'zh' ? '請填寫代表創作者或品牌的登記聯絡資訊。' : 'Please provide creator/brand identity details.'}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">
                          {lang === 'zh' ? '品牌 / 創作者中文名稱 *' : 'Brand / Creator Name (Chinese) *'}
                        </label>
                        <input
                          type="text"
                          name="brand_name_zh"
                          value={formData.brand_name_zh}
                          onChange={handleTextChange}
                          placeholder={lang === 'zh' ? '例如：拾物手作' : 'e.g. Shi Wu Crafts'}
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] px-3.5 py-3 outline-none transition-colors"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">
                          {lang === 'zh' ? '品牌 / 創作者英文名稱 *' : 'Brand / Creator Name (English) *'}
                        </label>
                        <input
                          type="text"
                          name="brand_name_en"
                          value={formData.brand_name_en}
                          onChange={handleTextChange}
                          placeholder="e.g. Atelier Objects"
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] px-3.5 py-3 outline-none transition-colors"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">
                          {lang === 'zh' ? '公司行號 / 工作室名稱（選填）' : 'Company / Studio Name (Optional)'}
                        </label>
                        <input
                          type="text"
                          name="company_name_zh"
                          value={formData.company_name_zh}
                          onChange={handleTextChange}
                          placeholder={lang === 'zh' ? '例如：拾物生活設計有限公司' : 'Registered company or studio'}
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] px-3.5 py-3 outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">
                          {lang === 'zh' ? '統一編號（選填）' : 'Tax ID (Optional)'}
                        </label>
                        <input
                          type="text"
                          name="company_tax_id"
                          value={formData.company_tax_id}
                          onChange={handleTextChange}
                          placeholder="例如：12345678"
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] px-3.5 py-3 outline-none transition-colors font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">
                          {lang === 'zh' ? '主要負責人 / 創作者姓名 *' : 'Contact Person / Maker Name *'}
                        </label>
                        <input
                          type="text"
                          name="contact_name"
                          value={formData.contact_name}
                          onChange={handleTextChange}
                          placeholder={lang === 'zh' ? '請輸入姓名' : 'Full Name'}
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] px-3.5 py-3 outline-none transition-colors"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">
                          {lang === 'zh' ? '聯絡信箱 Email *' : 'Contact Email *'}
                        </label>
                        <input
                          type="email"
                          name="contact_email"
                          value={formData.contact_email}
                          onChange={handleTextChange}
                          placeholder="creator@example.com"
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] px-3.5 py-3 outline-none transition-colors font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">
                          {lang === 'zh' ? '聯絡電話 / 手機' : 'Contact Phone'}
                        </label>
                        <input
                          type="tel"
                          name="contact_phone"
                          value={formData.contact_phone}
                          onChange={handleTextChange}
                          placeholder="0912-345-678"
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] px-3.5 py-3 outline-none transition-colors font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">
                          {lang === 'zh' ? '通訊地址 *' : 'Mailing Address *'}
                        </label>
                        <input
                          type="text"
                          name="contact_address"
                          value={formData.contact_address}
                          onChange={handleTextChange}
                          placeholder={lang === 'zh' ? '工作室或聯絡地址' : 'Studio / Mailing Address'}
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] px-3.5 py-3 outline-none transition-colors"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">
                          {lang === 'zh' ? '官方網站（選填）' : 'Official Website (Optional)'}
                        </label>
                        <input
                          type="url"
                          name="website_url"
                          value={formData.website_url}
                          onChange={handleTextChange}
                          placeholder="https://..."
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] px-3.5 py-3 outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">
                          {lang === 'zh' ? 'Instagram / 作品社群連結' : 'Instagram / Portfolio Link'}
                        </label>
                        <input
                          type="text"
                          name="instagram_url"
                          value={formData.instagram_url}
                          onChange={handleTextChange}
                          placeholder="https://instagram.com/..."
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] px-3.5 py-3 outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Creation Category & Brief ── */}
                {currentStep === 2 && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-base font-serif tracking-wider text-[#0D0D0D] uppercase mb-1">
                        {lang === 'zh' ? '02. 創作媒材與核心造物理念' : '02. Creation Category & Concept'}
                      </h3>
                      <p className="text-xs text-[#0D0D0D]/50 font-light">
                        {lang === 'zh' ? '說明您的創作媒材與物件核心思考。' : 'Describe your craftsmanship medium and concept.'}
                      </p>
                    </div>

                    {/* Pre-locked Scheme Banner */}
                    <div className="bg-[#FAF9F6] border border-[#C9A96E]/30 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-[#8C7853] block mb-0.5">Applied Scheme</span>
                        <h4 className="text-sm font-semibold text-[#0D0D0D]">
                          {lang === 'zh' ? '造物計畫特展席位 The Making Project Stall' : 'The Making Project Stall'}
                        </h4>
                        <p className="text-xs text-[#0D0D0D]/60 mt-1">
                          {lang === 'zh' 
                            ? '包含：大平面展示檯面席位（VIS 統一規劃）、四天展期現場銷售 0% 抽成、參展者證1張、與工作室貴賓名額5名' 
                            : 'Includes: Shared curated table display stall, 0% sales commission, 1 Exhibitor Badge & 5 Studio VIP Passes'}
                        </p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="text-xs text-[#0D0D0D]/50 block">
                          {lang === 'zh' ? '專案參展費' : 'Exhibition Fee'}
                        </span>
                        <span className="text-lg font-bold font-mono text-[#8C7853]">NT$ 12,000</span>
                      </div>
                    </div>

                    {/* Category Selector */}
                    <div>
                      <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">
                        {lang === 'zh' ? '主要創作媒材 / 物件類別 *' : 'Craft Medium / Object Category *'}
                      </label>
                      <select
                        name="material_category"
                        value={formData.material_category}
                        onChange={handleTextChange}
                        className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] px-3.5 py-3 outline-none bg-white transition-colors"
                        required
                      >
                        {MATERIAL_CATEGORIES.map((cat, idx) => (
                          <option key={idx} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Concept Brief */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase">
                          {lang === 'zh' ? '核心造物理念簡述 (250字內) *' : 'Core Making Concept (Max 250 words) *'}
                        </label>
                        <span className={`text-[10px] font-mono ${formData.concept_brief.length > 250 ? 'text-red-500 font-bold' : 'text-[#0D0D0D]/40'}`}>
                          {formData.concept_brief.length} / 250
                        </span>
                      </div>
                      <textarea
                        name="concept_brief"
                        value={formData.concept_brief}
                        onChange={handleTextChange}
                        rows={6}
                        placeholder={
                          lang === 'zh'
                            ? '請簡述貴品牌預計展出之物件核心觀點、人手觸感與比例細節，以及如何結合生活日常使用進行演繹。'
                            : 'Briefly describe your object philosophy, tactile qualities, proportions, and how your creations live in everyday life.'
                        }
                        className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] p-3.5 outline-none transition-colors leading-relaxed"
                        required
                      />
                      <p className="text-[11px] text-[#0D0D0D]/50 mt-1 italic">
                        {lang === 'zh' ? '* 將作為策展委員會評審了解創作者風格與精神之依據。' : '* Used by the curatorial committee to understand your artistic approach.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Exhibition Fee Payment ── */}
                {currentStep === 3 && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-base font-serif tracking-wider text-[#0D0D0D] uppercase mb-1">
                        {lang === 'zh' ? '03. 參展費用繳交' : '03. Exhibition Fee Payment'}
                      </h3>
                      <p className="text-xs text-[#0D0D0D]/50 font-light">
                        {lang === 'zh' ? '造物計畫四天展期參展費用為 NT$ 12,000 元整。' : 'The Making Project fee is NT$ 12,000 for the full 4-day period.'}
                      </p>
                    </div>

                    {/* Fee Summary Card */}
                    <div className="border border-[#C9A96E]/30 bg-[#FAF9F6] p-6 text-center">
                      <span className="text-[10px] font-mono tracking-widest text-[#8C7853] uppercase block mb-1">
                        Exhibition Fee Amount
                      </span>
                      <p className="text-3xl font-serif text-[#0D0D0D] font-light">
                        NT$ <span className="font-mono font-bold text-[#8C7853]">12,000</span>
                      </p>
                    </div>

                    {/* Bank Info */}
                    <div className="bg-[#FAF9F6] border border-[#C9A96E]/20 p-5 md:p-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Domestic Remittance */}
                        <div className="space-y-3">
                          <span className="text-[#C9A96E] text-xs font-semibold block uppercase tracking-wider font-mono">
                            {lang === 'zh' ? '國內匯款 (DOMESTIC REMITTANCE)' : 'DOMESTIC REMITTANCE'}
                          </span>
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="text-[#0D0D0D]/60 block text-[10px] font-sans font-medium tracking-wide">
                                銀行/分行 BANK / BRANCH
                              </span>
                              <span className="font-semibold text-neutral-800 text-sm">
                                808 玉山銀行 / 中崙分行
                              </span>
                            </div>
                            <div>
                              <span className="text-[#0D0D0D]/60 block text-[10px] font-sans font-medium tracking-wide">
                                帳號 ACCOUNT NUMBER
                              </span>
                              <span className="font-semibold text-[#C9A96E] font-mono text-sm tracking-wider">
                                0912940021772
                              </span>
                            </div>
                            <div>
                              <span className="text-[#0D0D0D]/60 block text-[10px] font-sans font-medium tracking-wide">
                                戶名 ACCOUNT NAME
                              </span>
                              <span className="font-semibold text-[#0D0D0D] leading-snug block">
                                泰德文化創意社 <span className="text-[11px] text-neutral-500 font-light">/ 或</span><br />
                                泰德文化創意社郭芝妘 <span className="text-[10.5px] text-neutral-500 font-light">（視銀行規定而異）</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* International Remittance */}
                        <div className="space-y-3 border-t md:border-t-0 md:border-l border-[#0D0D0D]/10 pt-4 md:pt-0 md:pl-6">
                          <span className="text-[#C9A96E] text-xs font-semibold block uppercase tracking-wider font-mono">
                            {lang === 'zh' ? '國外匯款 (INTERNATIONAL REMITTANCE)' : 'INTERNATIONAL REMITTANCE'}
                          </span>
                          <div className="space-y-2 text-xs font-mono">
                            <div>
                              <span className="text-[#0D0D0D]/60 block text-[10px] font-sans font-medium tracking-wide">
                                SWIFT CODE
                              </span>
                              <span className="font-semibold text-neutral-800 text-sm">
                                ESUNTWTP
                              </span>
                            </div>
                            <div>
                              <span className="text-[#0D0D0D]/60 block text-[10px] font-sans font-medium tracking-wide">
                                BENEFICIARY&apos;S NAME
                              </span>
                              <span className="font-semibold text-neutral-800 text-sm">
                                ART PRESS and Life Co.
                              </span>
                            </div>
                            <div>
                              <span className="text-[#0D0D0D]/60 block text-[10px] font-sans font-medium tracking-wide">
                                BENEFICIARY BRANCH
                              </span>
                              <span className="font-semibold text-neutral-800 text-sm">
                                E.Sun Bank / Zhonglun Branch
                              </span>
                            </div>
                            <div>
                              <span className="text-[#0D0D0D]/60 block text-[10px] font-sans font-medium tracking-wide">
                                ACCOUNT NUMBER
                              </span>
                              <span className="font-semibold text-[#C9A96E] text-sm tracking-wider">
                                0912940021772
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 text-xs text-[#8C7853] leading-relaxed">
                      {lang === 'zh' ? (
                        <>
                          💡 <strong>匯款備註說明：</strong> 匯款時請務必在備註欄填寫「<strong>{formData.brand_name_zh || '您的品牌名'}</strong>」，匯款完成後請將網銀扣款截圖或ATM交易明細拍照上傳至下方。
                        </>
                      ) : (
                        <>
                          💡 <strong>Payment Memo Note:</strong> Please include &quot;<strong>{formData.brand_name_en || formData.brand_name_zh || 'Your Brand Name'}</strong>&quot; in the transfer memo field, and upload transaction proof screenshot below.
                        </>
                      )}
                    </div>

                    {/* Upload Section */}
                    <div>
                      <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-3">
                        {lang === 'zh' ? '上傳參展費匯款憑證截圖 *' : 'Upload Remittance Proof *'}
                      </label>
                      <div className="border-2 border-dashed border-[#0D0D0D]/20 hover:border-[#C9A96E] p-8 text-center bg-[#FAF9F6] transition-colors relative">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {previewImage ? (
                          <div className="space-y-3">
                            <img
                              src={previewImage}
                              alt="Proof preview"
                              className="max-h-48 mx-auto rounded border border-[#0D0D0D]/10 shadow-sm"
                            />
                            <p className="text-xs text-emerald-700 font-medium">✓ 憑證圖檔已載入，點擊可重新更換</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="w-8 h-8 mx-auto text-[#8C7853] stroke-[1.5]" />
                            <p className="text-xs text-[#0D0D0D]/80">點擊或拖曳匯款截圖至此處上傳</p>
                            <p className="text-[10px] text-[#0D0D0D]/40 font-mono">支援 JPG, PNG, WEBP（檔案不超過 15MB）</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: Verification & Agreement ── */}
                {currentStep === 4 && (
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-base font-serif tracking-wider text-[#0D0D0D] uppercase mb-1">
                        {lang === 'zh' ? '04. 確認參展意向與專屬合約' : '04. Verification & Agreement'}
                      </h3>
                      <p className="text-xs text-[#0D0D0D]/50 font-light">
                        {lang === 'zh' ? '請最後核對填寫內容並閱讀造物計畫專屬協議。' : 'Review details and sign the agreement.'}
                      </p>
                    </div>

                    {/* Summary Table */}
                    <div className="border border-[#0D0D0D]/10 divide-y divide-[#0D0D0D]/10 text-xs">
                      <div className="grid grid-cols-3 p-3.5 bg-[#FAF9F6]">
                        <span className="font-semibold text-[#8C7853]">{lang === 'zh' ? '計畫項目' : 'Project'}</span>
                        <span className="col-span-2 text-[#0D0D0D] font-medium">
                          {lang === 'zh' 
                            ? 'VIS 2027 造物計畫（2027.01.06–01.09 台北中山堂）' 
                            : 'VIS 2027 The Making Project (Jan 6–9, 2027 Taipei Zhongshan Hall)'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 p-3.5">
                        <span className="font-semibold text-[#8C7853]">{lang === 'zh' ? '品牌 / 創作者' : 'Brand / Creator'}</span>
                        <span className="col-span-2 text-[#0D0D0D]">{formData.brand_name_zh} / {formData.brand_name_en}</span>
                      </div>
                      <div className="grid grid-cols-3 p-3.5">
                        <span className="font-semibold text-[#8C7853]">{lang === 'zh' ? '聯絡人 / 信箱' : 'Contact / Email'}</span>
                        <span className="col-span-2 text-[#0D0D0D]">{formData.contact_name} ({formData.contact_email})</span>
                      </div>
                      <div className="grid grid-cols-3 p-3.5">
                        <span className="font-semibold text-[#8C7853]">{lang === 'zh' ? '創作媒材類別' : 'Material Category'}</span>
                        <span className="col-span-2 text-[#0D0D0D]">{formData.material_category}</span>
                      </div>
                      <div className="grid grid-cols-3 p-3.5">
                        <span className="font-semibold text-[#8C7853]">{lang === 'zh' ? '參展費用' : 'Exhibition Fee'}</span>
                        <span className="col-span-2 font-mono font-bold text-[#8C7853]">
                          NT$ 12,000 {lang === 'zh' ? '（憑證已上傳）' : '(Proof Uploaded)'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 p-3.5">
                        <span className="font-semibold text-[#8C7853]">{lang === 'zh' ? '核心造物理念' : 'Concept Brief'}</span>
                        <span className="col-span-2 text-[#0D0D0D]/80 whitespace-pre-wrap">{formData.concept_brief}</span>
                      </div>
                    </div>

                    {/* Review & Formal Admission Notice Banner */}
                    <div className="bg-[#FAF9F6] border-l-2 border-[#8C7853] p-4 text-xs text-[#0D0D0D]/80 leading-relaxed">
                      <p className="font-semibold text-[#8C7853] mb-1">
                        {lang === 'zh' ? '📌 參展資格審查聲明：' : '📌 Formal Admission Policy:'}
                      </p>
                      <p>
                        {lang === 'zh'
                          ? '送出本申請與上傳費用水單為啟動審查程序。大會採嚴謹策展甄選，申請者須待收到大會官方信箱（artwithlifetaipei@gmail.com）正式寄發之「核准錄取通知」（Official Admission Notice）後，方代表正式取得參展席位。若未獲錄取，大會將於公告後 14 個工作日內全額無息退還參展費用。'
                          : 'Submitting this form initiates the curatorial review procedure. Participation and stall reservation are only officially confirmed upon receiving the formal Admission Approval Notice from artwithlifetaipei@gmail.com. If not selected, fees are 100% refunded within 14 business days.'}
                      </p>
                    </div>

                    {/* Agreement Checkboxes */}
                    <div className="space-y-4 pt-2">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={agreeTerms1}
                          onChange={(e) => setAgreeTerms1(e.target.checked)}
                          className="mt-1 w-4 h-4 accent-[#8C7853] rounded"
                        />
                        <span className="text-xs text-[#0D0D0D]/80 leading-relaxed">
                          {lang === 'zh' ? (
                            <>
                              <strong>【參展費用繳交與審核錄取協議】</strong> 我理解送出本申請表與繳交參展費用新台幣 12,000 元整係為啟動大會資格審查之必要程序；<strong>須待收到大會官方信箱（artwithlifetaipei@gmail.com）正式寄發之「核准錄取通知」（Official Admission Notice）後，始正式具備參展資格與保留展台席位</strong>。若經評審委員會審查未獲錄取之單位，大會將於公告錄取名單後 14 個工作日內，將參展費用 12,000 元整無息全額退還至原匯款帳戶；若通過評選獲得錄取，於錄取通知後 7 天內提出放棄者可扣除手續費退還 50% 參展費，逾期提出放棄者恕不予退款。
                            </>
                          ) : (
                            <>
                              <strong>[Exhibition Fee Payment & Admission Agreement]</strong> I understand that submitting this application with proof of NT$ 12,000 is required to initiate the curatorial review process; <strong>formal participation and table stall reservation are confirmed ONLY upon receiving the official "Admission Approval Notice" from artwithlifetaipei@gmail.com</strong>. If not selected by the jury, the full fee of NT$ 12,000 will be refunded without interest within 14 working days of result announcement; if selected, cancellation within 7 days is eligible for a 50% refund (less processing fees); cancellations beyond 7 days are non-refundable.
                            </>
                          )}
                        </span>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={agreeTerms2}
                          onChange={(e) => setAgreeTerms2(e.target.checked)}
                          className="mt-1 w-4 h-4 accent-[#8C7853] rounded"
                        />
                        <span className="text-xs text-[#0D0D0D]/80 leading-relaxed">
                          {lang === 'zh' ? (
                            <>
                              <strong>【原創造物、非工廠製造與展務承諾】</strong> 我保證展出之作品均為創作者原創手作物件（<strong>絕非工廠開模或流水線大量製造</strong>），符合「造物計畫」唯一核心準則。我理解並同意<strong>展台與陳列由 VIS 策展團隊統一規劃提供（非獨立攤位，創作者只需提供參展物件進駐）</strong>，現場交易由品牌自行收款（免抽成 0%），且<strong>四天展期營業時間內創作者或品牌代表需全程駐點</strong>向觀眾解說、交流並自行維護展品，並遵守大會隱私權保護政策與個人資料聲明。
                            </>
                          ) : (
                            <>
                              <strong>[Original Craft, Non-Factory Made & Exhibition Commitment]</strong> I warrant that all exhibited pieces are original handmade works (<strong>strictly non-factory molded or mass manufactured</strong>), adhering to the core principle of The Making Project. I understand and agree that <strong>display tables are curated uniformly by the VIS team (shared display table, not individual booths; creators only bring objects)</strong>, transactions are collected directly by the creator (0% commission), and <strong>creators or brand representatives must be present throughout the 4-day exhibition hours</strong> to communicate with visitors and safeguard exhibits, complying with fair policies.
                            </>
                          )}
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* ── Wizard Bottom Buttons ── */}
                <div className="flex justify-between items-center pt-8 mt-8 border-t border-[#0D0D0D]/10">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="px-6 py-2.5 border border-[#0D0D0D]/20 text-xs font-mono tracking-wider uppercase text-[#0D0D0D]/70 hover:border-[#0D0D0D] hover:text-[#0D0D0D] transition-colors"
                    >
                      ← {lang === 'zh' ? '上一步 Back' : 'Previous'}
                    </button>
                  ) : <div />}

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      disabled={!isStepValid()}
                      onClick={() => setCurrentStep(prev => prev + 1)}
                      className="px-8 py-3 bg-[#0D0D0D] text-white text-xs font-mono tracking-widest uppercase hover:bg-[#8C7853] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {lang === 'zh' ? '下一步 Next' : 'Next'} →
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting || !agreeTerms1 || !agreeTerms2}
                      onClick={handleSubmit}
                      className="px-10 py-3 bg-[#8C7853] text-white text-xs font-mono tracking-widest uppercase hover:bg-[#0D0D0D] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {lang === 'zh' ? '正在遞交申請 Submitting...' : 'Submitting...'}
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {lang === 'zh' ? '確認送出「造物計畫」申請 SUBMIT' : 'Submit Making Project Application'}
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>
            </div>
          )}
        </section>

      </main>

      {/* Lightbox Modal for Scenography Images */}
      {activeImageModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fade-in"
          onClick={() => setActiveImageModal(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-[#0D0D0D] border border-white/10 p-4 md:p-6 text-white shadow-2xl flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveImageModal(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white hover:text-black text-white flex items-center justify-center transition-all border border-white/20"
              aria-label="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative overflow-hidden flex-1 flex items-center justify-center min-h-0 bg-black/50 py-2">
              <img
                src={activeImageModal.src}
                alt={lang === 'zh' ? activeImageModal.titleZh : activeImageModal.titleEn}
                className="max-h-[68vh] w-auto max-w-full object-contain mx-auto shadow-lg"
              />
            </div>
            <div className="pt-4 border-t border-white/10 mt-3 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
              <div>
                <h5 className="font-serif text-sm font-medium text-[#C9A96E] tracking-wide">
                  {lang === 'zh' ? activeImageModal.titleZh : activeImageModal.titleEn}
                </h5>
                <p className="text-white/70 text-[11px] font-light mt-0.5 max-w-xl leading-relaxed">
                  {lang === 'zh' ? activeImageModal.captionZh : activeImageModal.captionEn}
                </p>
              </div>
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest whitespace-nowrap">
                VIS 2027 Scenography Concept
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#0D0D0D]/10 py-12 text-center text-xs text-[#0D0D0D]/40 font-mono tracking-widest">
        &copy; 2026 VIS Contemporary Culture. The Making Project. All rights reserved.
      </footer>
    </div>
  );
}
