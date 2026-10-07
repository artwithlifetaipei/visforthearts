'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, ShieldCheck, X, FileText, Loader2, Sparkles, Layers, Compass, Check } from 'lucide-react';
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
        <header className="py-12 md:py-16 text-center max-w-3xl mx-auto border-b border-[#C9A96E]/20">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-[#C9A96E]/30 bg-[#C9A96E]/5 text-[#8C7853] text-[10px] tracking-[0.3em] uppercase">
            <Sparkles className="w-3 h-3" /> VIS 2027 Special Curatorial Initiative
          </div>

          <h1 className="text-3xl md:text-5xl font-serif font-light tracking-wide text-[#0D0D0D] mb-4">
            {lang === 'zh' ? 'THE MAKING PROJECT' : 'THE MAKING PROJECT'}
          </h1>
          <h2 className="text-xl md:text-2xl font-light tracking-[0.2em] text-[#8C7853] mb-8">
            {lang === 'zh' ? '造物計畫 申請專區' : 'Curatorial Open Call'}
          </h2>

          {/* Core Philosophy Statement */}
          <div className="bg-white border border-[#C9A96E]/25 p-8 md:p-10 shadow-sm text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#C9A96E]/10 to-transparent pointer-events-none" />
            
            <p className="text-sm md:text-base leading-relaxed text-[#0D0D0D]/90 font-light mb-6 tracking-wide text-justify">
              {lang === 'zh' ? (
                <>
                  <span className="font-medium text-[#8C7853] block text-base md:text-lg mb-3">
                    造物，是將對生活的理解，轉化為具體形狀的過程。
                  </span>
                  在 AI 興起、形式愈來愈容易被大量生成與複製的時代，「造物計劃」將目光放回物件本身，重新觀看由人的手決定的比例、觸感與差異。
                </>
              ) : (
                <>
                  <span className="font-medium text-[#8C7853] block text-base md:text-lg mb-3">
                    Making is the process of translating one’s understanding of living into tangible forms.
                  </span>
                  In an era shaped by AI, where forms can be effortlessly synthesized and endlessly duplicated, The Making Project redirects its gaze back to the physical object itself — observing once more the proportions, tactile sensations, and human nuances dictated by the maker’s hands.
                </>
              )}
            </p>

            <p className="text-sm md:text-base leading-relaxed text-[#0D0D0D]/80 font-light tracking-wide text-justify">
              {lang === 'zh' ? (
                '透過不同獨立創作者的作品，讓觀眾看見當代人如何理解生活、使用物件，以及建立自己的品味。從創作者的製作，到使用者的選擇，一件物件所承載的觀點，在進入生活之後繼續延伸。'
              ) : (
                'Through the creations of independent makers, visitors discover how contemporaries comprehend life, interact with everyday objects, and cultivate their aesthetic taste. From the artisan’s crafting to the user’s choice, the philosophy embodied within an object continues to unfold as it enters everyday life.'
              )}
            </p>
          </div>

          {/* Exhibition Highlights Grid */}
          {/* Exhibition Highlights Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white border border-[#0D0D0D]/5 p-5 text-center">
              <span className="block text-[10px] uppercase font-mono tracking-widest text-[#8C7853] mb-1">Dates & Venue</span>
              <p className="text-sm font-medium text-[#0D0D0D]">2027.01.06–01.09</p>
              <span className="text-[11px] text-[#0D0D0D]/50 block mt-0.5">台北中山堂</span>
            </div>
            <div className="bg-white border border-[#C9A96E]/40 p-5 text-center bg-[#C9A96E]/[0.02]">
              <span className="block text-[10px] uppercase font-mono tracking-widest text-[#C9A96E] mb-1">Exhibition Fee</span>
              <p className="text-base font-semibold text-[#8C7853]">NT$ 12,000</p>
              <span className="text-[11px] text-[#0D0D0D]/60 block mt-0.5">專案參展費 / 全展期</span>
            </div>
            <div className="bg-white border border-[#0D0D0D]/5 p-5 text-center">
              <span className="block text-[10px] uppercase font-mono tracking-widest text-[#8C7853] mb-1">Commission</span>
              <p className="text-sm font-medium text-[#0D0D0D]">現場銷售 0%</p>
              <span className="text-[11px] text-[#0D0D0D]/50 block mt-0.5">免抽成・自行收款</span>
            </div>
            <div className="bg-white border border-[#0D0D0D]/5 p-5 text-center">
              <span className="block text-[10px] uppercase font-mono tracking-widest text-[#8C7853] mb-1">Curation</span>
              <p className="text-sm font-medium text-[#0D0D0D]">VIS 統一陳列</p>
              <span className="text-[11px] text-[#0D0D0D]/50 block mt-0.5">大會規劃專屬展台</span>
            </div>
          </div>

          {/* Detailed Schedule & Venue Card */}
          <div className="mt-6 bg-white border border-[#C9A96E]/30 p-6 md:p-8 shadow-sm text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-5 border-b border-[#0D0D0D]/10 gap-2">
              <div>
                <span className="text-[10px] font-mono tracking-[0.25em] text-[#8C7853] uppercase block">Venue & Schedule</span>
                <h3 className="text-base md:text-lg font-serif text-[#0D0D0D]">
                  展場地點與詳細時程表
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

          {/* Curatorial & Operational Notice */}
          <div className="mt-6 bg-white border border-[#C9A96E]/20 p-5 md:p-6 text-xs text-[#0D0D0D]/75 leading-relaxed grid md:grid-cols-3 gap-5">
            <div>
              <p className="font-semibold text-[#8C7853] uppercase tracking-wider text-[11px] mb-1">
                ✦ 展台規劃與陳列 Scenography
              </p>
              <p className="font-light text-[#0D0D0D]/80">
                大會提供展示檯面，展台與陳列由 VIS 策展團隊統一規劃提供（非獨立攤位，創作者只需提供參展物件進駐陳列），營造高質感的當代工藝聚落。
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#8C7853] uppercase tracking-wider text-[11px] mb-1">
                ✦ 現場展售與金流 Sales & Payment
              </p>
              <p className="font-light text-[#0D0D0D]/80">
                現場銷售 0% 免抽成。由創作者/品牌自行於現場收款（創作者可自備現金、LINE Pay、個人刷卡機等），大會完全不經手交易款項。
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#8C7853] uppercase tracking-wider text-[11px] mb-1">
                ✦ 現場駐點交流 Staffing
              </p>
              <p className="font-light text-[#0D0D0D]/80">
                四天展期營業時間內，創作者或品牌代表需全程駐點，在場向藏家與觀眾解說創作脈絡、深度交流並親自經營品牌客戶。
              </p>
            </div>
          </div>
        </header>

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
                <p className="font-semibold text-[#8C7853] mb-1">📌 審核與退款保證：</p>
                <p>• 評選結果將透過大會官方信箱 <span className="font-mono text-[#0D0D0D]">artwithlifetaipei@gmail.com</span> 寄發。</p>
                <p className="mt-1">• 若未獲錄取，大會將於公告後 14 個工作日內，將參展費用全額無息退還至原匯款帳戶。</p>
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
              <div className="mb-10">
                <div className="grid grid-cols-4 gap-2 border-b border-[#0D0D0D]/10 pb-4">
                  {[
                    { step: 1, zh: '1. 品牌與創作者', en: '1. Creator Profile' },
                    { step: 2, zh: '2. 媒材與造物理念', en: '2. Creation Brief' },
                    { step: 3, zh: '3. 參展費用繳交', en: '3. Exhibition Fee' },
                    { step: 4, zh: '4. 確認與送出', en: '4. Agreement' },
                  ].map((item) => (
                    <div 
                      key={item.step}
                      className={`text-center cursor-pointer transition-all ${
                        currentStep === item.step 
                          ? 'border-b-2 border-[#8C7853] pb-2 text-[#8C7853] font-semibold' 
                          : currentStep > item.step 
                            ? 'text-[#0D0D0D] font-medium' 
                            : 'text-[#0D0D0D]/30'
                      }`}
                      onClick={() => {
                        if (item.step < currentStep) setCurrentStep(item.step);
                      }}
                    >
                      <span className="block text-xs md:text-sm font-sans tracking-wide">
                        {lang === 'zh' ? item.zh : item.en}
                      </span>
                    </div>
                  ))}
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
                        <h4 className="text-sm font-semibold text-[#0D0D0D]">造物計畫特展席位 The Making Project Stall</h4>
                        <p className="text-xs text-[#0D0D0D]/60 mt-1">包含：獨立展台席位、四天展期現場銷售 0% 抽成、參展者證與貴賓觀展卡</p>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <span className="text-xs text-[#0D0D0D]/50 block">專案參展費</span>
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
                        <span className="font-semibold text-[#8C7853]">計畫項目 Project</span>
                        <span className="col-span-2 text-[#0D0D0D] font-medium">VIS 2027 造物計畫 The Making Project（2027.01.06–01.09 台北中山堂）</span>
                      </div>
                      <div className="grid grid-cols-3 p-3.5">
                        <span className="font-semibold text-[#8C7853]">品牌 / 創作者 Brand</span>
                        <span className="col-span-2 text-[#0D0D0D]">{formData.brand_name_zh} / {formData.brand_name_en}</span>
                      </div>
                      <div className="grid grid-cols-3 p-3.5">
                        <span className="font-semibold text-[#8C7853]">聯絡人 / 信箱 Contact</span>
                        <span className="col-span-2 text-[#0D0D0D]">{formData.contact_name} ({formData.contact_email})</span>
                      </div>
                      <div className="grid grid-cols-3 p-3.5">
                        <span className="font-semibold text-[#8C7853]">創作媒材類別 Category</span>
                        <span className="col-span-2 text-[#0D0D0D]">{formData.material_category}</span>
                      </div>
                      <div className="grid grid-cols-3 p-3.5">
                        <span className="font-semibold text-[#8C7853]">參展費用 Fee</span>
                        <span className="col-span-2 font-mono font-bold text-[#8C7853]">NT$ 12,000（憑證已上傳）</span>
                      </div>
                      <div className="grid grid-cols-3 p-3.5">
                        <span className="font-semibold text-[#8C7853]">核心造物理念 Brief</span>
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
                          <strong>【參展費用繳交與退款協議】</strong> 我同意為維護大展評審秩序，申請單位須於送出申請時繳交參展費用新台幣 12,000 元整並附上匯款證明。<strong>若經評審委員會審查未獲錄取之單位，大會將於公告錄取名單後 14 個工作日內，將參展費用 12,000 元整無息全額退還至原匯款帳戶</strong>；<strong>若通過評選獲得錄取，於錄取通知後 7 天內提出放棄者可扣除手續費退還 50% 參展費，逾期提出放棄者恕不予退款</strong>。
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
                          <strong>【原創造物、統一陳列與現場駐點承諾】</strong> 我保證展出之作品均為創作者原創物件，符合「造物計畫」核心精神。我理解並同意<strong>展台與陳列由 VIS 策展團隊統一規劃提供（非獨立攤位，創作者只需提供參展物件進駐）</strong>，現場交易由品牌自行收款（免抽成 0%），且<strong>四天展期營業時間內創作者或品牌代表需全程駐點</strong>向觀眾解說、交流並自行維護展品，並遵守大會隱私權保護政策與個人資料聲明。
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

      {/* Footer */}
      <footer className="border-t border-[#0D0D0D]/10 py-12 text-center text-xs text-[#0D0D0D]/40 font-mono tracking-widest">
        &copy; 2026 VIS Contemporary Culture. The Making Project. All rights reserved.
      </footer>
    </div>
  );
}
