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
  '氣味生活 Olfactory & Fragrance',
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
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans antialiased selection:bg-[#C9A96E]/20">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#0D0D0D]/5 transition-all">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img 
              src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
              alt="VIS Logo" 
              className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
            />
            <span className="text-[11px] font-mono tracking-[0.25em] text-[#8C7853] uppercase hidden sm:inline-block">
              Making Project
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="text-xs font-mono tracking-widest px-3 py-1.5 border border-[#0D0D0D]/10 hover:border-[#C9A96E] hover:text-[#C9A96E] transition-all bg-white"
            >
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
            <Link 
              href="/"
              className="text-xs text-[#0D0D0D]/60 hover:text-[#0D0D0D] tracking-widest font-mono flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'zh' ? '返回官網' : 'Home'}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="pt-28 pb-24 px-6 md:px-12 max-w-5xl mx-auto">

        {/* ── Curation Intro Section ── */}
        <header className="py-10 md:py-14 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 border border-[#C9A96E]/30 bg-[#C9A96E]/5 text-[#8C7853] text-[10px] font-mono tracking-[0.25em] uppercase rounded-full">
            <Sparkles className="w-3 h-3 text-[#C9A96E]" /> VIS 2027 Special Curatorial Initiative
          </div>

          <h1 className="text-3xl md:text-5xl font-serif font-light tracking-wide text-[#0D0D0D] mb-3">
            THE MAKING PROJECT
          </h1>
          <h2 className="text-base md:text-lg font-light tracking-[0.25em] text-[#8C7853] uppercase mb-10 font-mono">
            {lang === 'zh' ? '造物計畫 專屬申請' : 'Curatorial Open Call'}
          </h2>

          {/* Core Philosophy Statement */}
          <div className="bg-white border border-[#C9A96E]/25 p-8 md:p-12 shadow-[0_4px_30px_rgba(0,0,0,0.02)] text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#C9A96E]/10 to-transparent pointer-events-none" />
            
            <div className="space-y-5 text-sm md:text-base leading-relaxed font-light tracking-wide text-justify">
              {lang === 'zh' ? (
                <>
                  <span className="font-serif font-medium text-[#8C7853] block text-base md:text-lg mb-3 tracking-wide">
                    支持更多獨立創作者的長遠實踐與持續發展，為本計畫的核心宗旨。
                  </span>
                  <p className="text-[#0D0D0D]/90 leading-loose">
                    「造物計劃」邀請以個人或小型工作室為核心的獨立創作者，以強調人進行造物價值與意義為核，透過諸如陶、木、金屬、玻璃與纖維等材料，呈現各自對物件與生活的理解。
                  </p>
                  <p className="text-[#0D0D0D]/80 leading-loose">
                    在 AI 興起、形式容易被大量生成與複製的時代，重新觀看人的判斷如何轉化為比例、觸感與差異，也讓觀眾透過觀看、選擇與使用，建立自己的品味。
                  </p>
                </>
              ) : (
                <>
                  <span className="font-serif font-medium text-[#8C7853] block text-base md:text-lg mb-3 tracking-wide">
                    Supporting the long-term practice and flourishing of independent creators lies at the very core of this initiative.
                  </span>
                  <p className="text-[#0D0D0D]/90 leading-loose">
                    The Making Project invites independent creators centered around individuals or small studios to spotlight the intrinsic value and meaning of human making. Through materials such as ceramics, wood, metal, glass, and fiber, makers present their unique perspectives on objects and everyday living.
                  </p>
                  <p className="text-[#0D0D0D]/80 leading-loose">
                    In an era where AI emerges and forms are easily generated and duplicated at scale, we revisit how human judgment translates into proportion, texture, and nuance — inviting audiences to cultivate their own taste through observation, selection, and daily use.
                  </p>
                </>
              )}
            </div>

            {/* Essential Criterion Highlight Box */}
            <div className="mt-8 pt-6 border-t border-[#0D0D0D]/10">
              <div className="bg-[#FAF9F6] border-l-2 border-[#8C7853] p-5 md:p-6 rounded-r">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8C7853]" />
                  <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-[#8C7853] font-semibold">
                    {lang === 'zh' ? '【計畫唯一參展條件】' : '【Core Participation Criterion】'}
                  </span>
                </div>
                <div className="text-xs md:text-sm text-[#0D0D0D]/90 font-light leading-relaxed">
                  {lang === 'zh' ? (
                    <p>
                      <strong className="text-[#0D0D0D] font-semibold">作品絕非工廠製造：</strong>
                      秉持支持更多獨立創作者的長遠實踐與持續發展的核心價值，本計畫唯一的申請條件為：<strong className="text-[#8C7853] font-semibold">參展物件絕不可為工廠開模、代工流水線或工業化大量複製製造</strong>。每一件作品必須由創作者個人或獨立工作室親手製作成形，保有人的雙手在塑形與打磨當下所賦予的溫度、觸感與不可替代的造物靈魂。
                    </p>
                  ) : (
                    <p>
                      <strong className="text-[#0D0D0D] font-semibold">Strictly Non-Factory Produced:</strong>
                      Upholding our core mission to support the long-term practice and flourishing of independent creators, the sole prerequisite for this initiative is that <strong className="text-[#8C7853] font-semibold">exhibited objects must strictly not be factory-manufactured, mass-molded, or produced via industrial assembly lines</strong>. Every piece must be crafted by the individual creator or independent studio by hand, preserving the human touch, deliberate nuance, and irreplaceable soul embedded within.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Editorial Scenography Gallery Showcase ── */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#0D0D0D]/10 pb-4 gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-[0.25em] text-[#8C7853] uppercase mb-1.5">
                <Sparkles className="w-3 h-3 text-[#C9A96E]" />
                {lang === 'zh' ? '展台空間意象 SCENOGRAPHY MOCKUP' : 'SCENOGRAPHY & SPATIAL ESSENCE'}
              </div>
              <h3 className="text-xl md:text-2xl font-serif text-[#0D0D0D] tracking-wide">
                {lang === 'zh' ? '大平面共享展示空間・陳列模擬示意' : 'Shared Curated Display Table — Spatial Concept'}
              </h3>
            </div>
            <p className="text-xs text-[#0D0D0D]/60 max-w-md font-light leading-relaxed">
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
              className="group bg-white border border-[#0D0D0D]/10 p-4 md:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(201,169,110,0.12)] hover:border-[#C9A96E]/50 transition-all duration-500 cursor-pointer flex flex-col justify-between"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#FAF9F6]">
                <img
                  src="/images/making-project/scenography_1.jpg"
                  alt="Scenography Spatial Overview"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-500 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-3.5 py-1.5 bg-white/95 backdrop-blur-sm text-[#0D0D0D] text-[11px] font-mono tracking-widest uppercase flex items-center gap-1.5 shadow-md">
                    <Maximize2 className="w-3.5 h-3.5 text-[#8C7853]" />
                    {lang === 'zh' ? '點擊放大檢視' : 'Enlarge Preview'}
                  </span>
                </div>
                <div className="absolute top-3 left-3 bg-[#0D0D0D]/80 backdrop-blur-sm text-[#FAF9F6] text-[10px] font-mono tracking-wider px-2.5 py-1 uppercase">
                  FIG 01・SPATIAL OVERVIEW
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#0D0D0D]/5">
                <div className="flex items-baseline justify-between mb-1.5">
                  <h4 className="font-serif text-sm md:text-base text-[#0D0D0D] font-medium tracking-wide">
                    {lang === 'zh' ? '大平面白色展台整體意象' : 'Spatial Overview — Shared Platform'}
                  </h4>
                  <span className="text-[10px] font-mono text-[#8C7853] uppercase tracking-wider">
                    {lang === 'zh' ? '空間透視' : 'Perspective'}
                  </span>
                </div>
                <p className="text-xs text-[#0D0D0D]/70 font-light leading-relaxed">
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
              className="group bg-white border border-[#0D0D0D]/10 p-4 md:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_36px_rgba(201,169,110,0.12)] hover:border-[#C9A96E]/50 transition-all duration-500 cursor-pointer flex flex-col justify-between"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#FAF9F6]">
                <img
                  src="/images/making-project/scenography_2.jpg"
                  alt="Scenography Object Nuance"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-500 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-3.5 py-1.5 bg-white/95 backdrop-blur-sm text-[#0D0D0D] text-[11px] font-mono tracking-widest uppercase flex items-center gap-1.5 shadow-md">
                    <Maximize2 className="w-3.5 h-3.5 text-[#8C7853]" />
                    {lang === 'zh' ? '點擊放大檢視' : 'Enlarge Preview'}
                  </span>
                </div>
                <div className="absolute top-3 left-3 bg-[#0D0D0D]/80 backdrop-blur-sm text-[#FAF9F6] text-[10px] font-mono tracking-wider px-2.5 py-1 uppercase">
                  FIG 02・TACTILE & SCALE
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#0D0D0D]/5">
                <div className="flex items-baseline justify-between mb-1.5">
                  <h4 className="font-serif text-sm md:text-base text-[#0D0D0D] font-medium tracking-wide">
                    {lang === 'zh' ? '器物尺度與陳列細節模擬' : 'Object Proportions & Display Nuance'}
                  </h4>
                  <span className="text-[10px] font-mono text-[#8C7853] uppercase tracking-wider">
                    {lang === 'zh' ? '比例與紋理' : 'Texture & Scale'}
                  </span>
                </div>
                <p className="text-xs text-[#0D0D0D]/70 font-light leading-relaxed">
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
            <div className="bg-white border border-[#0D0D0D]/10 p-5 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-[#C9A96E]/50 transition-all">
              <span className="block text-[10px] uppercase font-mono tracking-widest text-[#8C7853] mb-1">Dates & Venue</span>
              <p className="text-sm font-medium text-[#0D0D0D]">2027.01.06–01.09</p>
              <span className="text-[11px] text-[#0D0D0D]/50 block mt-0.5">
                {lang === 'zh' ? '台北中山堂' : 'Taipei Zhongshan Hall'}
              </span>
            </div>
            <div className="bg-white border border-[#C9A96E]/40 p-5 text-center bg-[#C9A96E]/[0.02] shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-[#C9A96E] transition-all">
              <span className="block text-[10px] uppercase font-mono tracking-widest text-[#C9A96E] mb-1">Exhibition Fee</span>
              <p className="text-base font-semibold text-[#8C7853]">NT$ 12,000</p>
              <span className="text-[11px] text-[#0D0D0D]/60 block mt-0.5">
                {lang === 'zh' ? '專案參展費 / 全展期' : 'Full 4-Day Period'}
              </span>
            </div>
            <div className="bg-white border border-[#0D0D0D]/10 p-5 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-[#C9A96E]/50 transition-all">
              <span className="block text-[10px] uppercase font-mono tracking-widest text-[#8C7853] mb-1">Commission</span>
              <p className="text-sm font-medium text-[#0D0D0D]">
                {lang === 'zh' ? '現場銷售 0%' : '0% Commission'}
              </p>
              <span className="text-[11px] text-[#0D0D0D]/50 block mt-0.5">
                {lang === 'zh' ? '免抽成・自行收款' : 'Direct Creator Sales'}
              </span>
            </div>
            <div className="bg-white border border-[#0D0D0D]/10 p-5 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-[#C9A96E]/50 transition-all">
              <span className="block text-[10px] uppercase font-mono tracking-widest text-[#8C7853] mb-1">Curation</span>
              <p className="text-sm font-medium text-[#0D0D0D]">
                {lang === 'zh' ? 'VIS 統一陳列' : 'VIS Curated Display'}
              </p>
              <span className="text-[11px] text-[#0D0D0D]/50 block mt-0.5">
                {lang === 'zh' ? '大會規劃專屬展台' : 'Curated Table Scenography'}
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
                  <p>• <strong>12:00 – 19:00</strong>｜{lang === 'zh' ? '公眾展期' : 'Public Day'}</p>
                  <p>• <strong>19:00 – 21:30</strong>｜{lang === 'zh' ? '撤場' : 'Move-Out'}</p>
                </div>
              </div>
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
                  ? '大會策展委員會已成功收到貴品牌的造物計畫意向書與參展費用（NT$ 12,000）匯款憑證。執行委員會將進行專業評估審核，並發布評選結果通知至您的聯繫信箱。'
                  : 'The curatorial committee has successfully received your proposal and exhibition fee payment proof (NT$ 12,000). The committee will conduct a review and announce results via email.'}
              </p>
              <div className="bg-[#FAF9F6] border border-[#0D0D0D]/10 p-5 mb-8 text-xs text-[#0D0D0D]/70 leading-relaxed text-left max-w-md mx-auto">
                <p className="font-semibold text-[#8C7853] mb-1">
                  {lang === 'zh' ? '📌 審核與退款保證：' : '📌 Review & Refund Guarantee:'}
                </p>
                <p>• {lang === 'zh' ? '評選結果將透過大會官方信箱 ' : 'Review results will be sent from '}<span className="font-mono text-[#0D0D0D]">artwithlifetaipei@gmail.com</span>{lang === 'zh' ? ' 寄發。' : '.'}</p>
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
                            ? '包含：大平面展示檯面席位（VIS 統一規劃）、四天展期現場銷售 0% 抽成、參展者證與貴賓觀展卡' 
                            : 'Includes: Shared curated table display stall, 0% sales commission, Exhibitor badge & VIP Passes'}
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
                      <p className="text-[11px] text-[#0D0D0D]/60 mt-1">
                        {lang === 'zh' ? '（2027.01.06–01.09 台北中山堂展期，含佈展、VIP預展、開幕酒會與公眾展期，免銷售抽成）' : '(Jan 6–9, 2027 at Taipei Zhongshan Hall inclusive, 0% sales commission)'}
                      </p>
                    </div>

                    {/* Bank Info */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-[#FAF9F6] border border-[#0D0D0D]/10 p-5">
                        <span className="text-[10px] font-mono tracking-widest text-[#8C7853] uppercase block mb-2">
                          國內匯款帳戶 (Domestic Bank Transfer)
                        </span>
                        <div className="space-y-1.5 text-xs text-[#0D0D0D]/80">
                          <p><strong>銀行代號：</strong>013（國泰世華銀行）</p>
                          <p><strong>分行名稱：</strong>南門分行</p>
                          <p><strong>戶名：</strong>有相生活有限公司</p>
                          <p className="font-mono"><strong>帳號：</strong>264-03-501438-6</p>
                        </div>
                      </div>

                      <div className="bg-[#FAF9F6] border border-[#0D0D0D]/10 p-5">
                        <span className="text-[10px] font-mono tracking-widest text-[#8C7853] uppercase block mb-2">
                          國外匯款資訊 (International Wire)
                        </span>
                        <div className="space-y-1.5 text-xs text-[#0D0D0D]/80 font-mono">
                          <p><strong>Bank:</strong> Cathay United Bank (013)</p>
                          <p><strong>SWIFT Code:</strong> UWBKTWTP</p>
                          <p><strong>Beneficiary:</strong> YO SHIANG LIVING CO., LTD.</p>
                          <p><strong>Account:</strong> 264-03-501438-6</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 text-xs text-[#8C7853] leading-relaxed">
                      💡 <strong>匯款備註說明：</strong> 匯款時請務必在備註欄填寫「
                      <strong>{formData.brand_name_zh || '您的品牌/創作者名稱'} VIS造物</strong>
                      」，匯款完成後請將網銀扣款截圖或ATM交易明細拍照上傳至下方。
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
                              <strong>【參展費用繳交與退款協議】</strong> 我同意為維護大展評審秩序，申請單位須於送出申請時繳交參展費用新台幣 12,000 元整並附上匯款證明。<strong>若經評審委員會審查未獲錄取之單位，大會將於公告錄取名單後 14 個工作日內，將參展費用 12,000 元整無息全額退還至原匯款帳戶</strong>；<strong>若通過評選獲得錄取，於錄取通知後 7 天內提出放棄者可扣除手續費退還 50% 參展費，逾期提出放棄者恕不予退款</strong>。
                            </>
                          ) : (
                            <>
                              <strong>[Exhibition Fee Payment & Refund Agreement]</strong> To maintain curatorial integrity, applicants must submit the exhibition fee of NT$ 12,000 with proof of wire transfer upon applying. <strong>If not selected by the jury, the full exhibition fee of NT$ 12,000 will be refunded without interest to the original account within 14 working days of result announcement</strong>; <strong>if selected, cancellation within 7 days of notice is eligible for a 50% refund (less processing fees); cancellations beyond 7 days are strictly non-refundable</strong>.
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
