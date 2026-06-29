'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, ShieldCheck, X, FileText, Loader2, Image as ImageIcon } from 'lucide-react';
import { ALL_ZONES, DEPOSIT_AMOUNT, ZONE_MAP } from '@/lib/exhibitorConstants';
import { supabase } from '@/lib/supabase';

export default function ExhibitorApplyPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreeTerms1, setAgreeTerms1] = useState(false);
  const [agreeTerms2, setAgreeTerms2] = useState(false);

  // Auth Protection state
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
    zone_id: 'artsy', // 'artsy' | 'premier' | 'atelier'
    booth_type: 'S01-03,S06-08', // specific booth code
    zone_preference_1: '藝蕙品牌展區 - S01-03,S06-08 展台式展位 - S01-03,S06-08 (近主入口處) (NT$42,000)',
    zone_preference_2: '精鑑品牌展區 - M9-M15 展台式展位 - M9 - M15 (離主入口最近) (NT$42,000)',
    zone_preference_3: '匠心藝藏品牌展區 - A-ENTRANCE 500*460cm 獨立展位 - 入口處兩側 (NT$108,000)',
    concept_brief: '',
    deposit_proof_base64: '',
    deposit_proof_filename: '',
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Check auth session
  useEffect(() => {
    const checkAuth = async () => {
      // Optimistic Check: If auth token exists in localStorage, skip loading overlay immediately
      if (typeof window !== 'undefined') {
        try {
          let hasToken = false;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              hasToken = true;
              break;
            }
          }
          if (hasToken) {
            setAuthChecking(false);
          }
        } catch (e) {}
      }

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setAuthChecking(false);
      } catch (err) {
        console.error('Failed to get session:', err);
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  // Pre-fill email from session
  useEffect(() => {
    if (session?.user?.email) {
      setFormData(prev => ({
        ...prev,
        contact_email: session.user.email,
      }));
    }
  }, [session]);

  // Handle Input Changes
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // If preference 1 changes, update zone_id and booth_type
      if (name === 'zone_preference_1') {
        for (const zone of ALL_ZONES) {
          for (const booth of zone.booths) {
            const val = `${zone.nameZh} - ${booth.code} ${booth.label} (NT$${booth.price.toLocaleString()})`;
            if (val === value) {
              updated.zone_id = zone.id;
              updated.booth_type = booth.code;
              break;
            }
          }
        }
      }
      return updated;
    });
  };

  // Convert image to base64
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('請上傳圖片檔案 (PNG, JPEG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('檔案不能超過 2MB (為確保連線穩定並防止後台逾時，請將圖片壓縮至 2MB 以下)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
      setFormData(prev => ({
        ...prev,
        deposit_proof_base64: reader.result as string,
        deposit_proof_filename: file.name,
      }));
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
        formData.zone_id !== '' &&
        formData.booth_type !== '' &&
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
      const response = await fetch('/api/exhibitor/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(result.error || '提交申請時發生錯誤，請稍後再試。');
      }
    } catch (err: any) {
      setSubmitError('系統連線異常，請確認網路連線。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Selected Zone Details helper
  const selectedZone = ZONE_MAP[formData.zone_id as 'artsy' | 'premier' | 'atelier'];
  const selectedBooth = selectedZone?.booths.find(b => b.code === formData.booth_type);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-[#C9A96E]">
        <div className="text-center font-sans-outfit">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-xs font-light tracking-[0.2em] uppercase">確認登入狀態 Checking Authorization...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Full-bleed architectural background overlay */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <img
            src="/vip_lobby_bg.jpg"
            alt=""
            className="w-full h-full object-cover object-center"
            style={{ filter: 'brightness(0.38) saturate(0.75)' }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(245,242,235,0.85) 0%, rgba(240,235,225,0.65) 40%, rgba(245,242,235,0.9) 100%)'
            }}
          />
        </div>

        <div className="max-w-md w-full bg-white/95 border border-[#C9A96E]/20 p-10 shadow-2xl relative z-10">
          <div className="absolute top-4 left-4 w-2 h-2 border-t-[0.5px] border-l-[0.5px] border-neutral-400 opacity-30"></div>
          <div className="absolute top-4 right-4 w-2 h-2 border-t-[0.5px] border-r-[0.5px] border-neutral-400 opacity-30"></div>
          <div className="absolute bottom-4 left-4 w-2 h-2 border-b-[0.5px] border-l-[0.5px] border-neutral-400 opacity-30"></div>
          <div className="absolute bottom-4 right-4 w-2 h-2 border-b-[0.5px] border-r-[0.5px] border-neutral-400 opacity-30"></div>
          
          <img 
            src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
            alt="VIS Logo" 
            className="h-10 mx-auto mb-8 object-contain"
          />

          <h2 className="font-serif-garamond text-xl font-light tracking-wide text-[#0D0D0D] mb-4">
            請先登入以開始參展申請
          </h2>
          <p className="text-xs text-[#0D0D0D]/65 leading-relaxed tracking-wider mb-8">
            大會線上申請系統需要驗證您的參展品牌身份。<br />
            點擊下方按鈕即可返回登入或註冊新帳號。
          </p>
          <Link
            href="/exhibitor"
            className="bg-[#0D0D0D] hover:bg-neutral-800 text-white font-medium text-[10px] tracking-widest uppercase transition-colors rounded py-3.5 px-6 block text-center"
          >
            前往登入 / 註冊 GO TO LOGIN
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[#FAF9F6] text-[#0D0D0D] font-sans-outfit selection:bg-[#C9A96E] selection:text-white pb-20">
      {/* Load Fonts */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Outfit:wght@200;300;400;500;600;700&display=swap');
        .font-serif-garamond { font-family: 'Cormorant Garamond', Georgia, serif; }
        .font-sans-outfit { font-family: 'Outfit', sans-serif; }
      `}} />

      {/* Background Image Overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <img
          src="/vip_lobby_bg.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{ filter: 'brightness(0.38) saturate(0.75)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(245,242,235,0.82) 0%, rgba(240,235,225,0.6) 40%, rgba(245,242,235,0.88) 100%)'
          }}
        />
        {/* Subtle gold vignette top */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(223,186,135,0.08) 0%, transparent 65%)' }} />
      </div>

      {/* Header navbar */}
      <nav className="bg-[#FAF9F6]/80 backdrop-blur-md border-b border-[#0D0D0D]/5 py-4 px-6 md:px-12 flex justify-between items-center relative z-10">
        <Link href="/exhibitor">
          <img 
            src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
            alt="VIS Logo" 
            className="h-10 w-auto object-contain"
          />
        </Link>
        <Link 
          href="/exhibitor" 
          className="text-xs tracking-[0.2em] font-light hover:text-[#C9A96E] transition-colors duration-300 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回申請說明 BACK
        </Link>
      </nav>

      {/* Multi-step Container */}
      <main className={`relative z-10 mx-auto px-6 pt-10 transition-all duration-300 ${currentStep === 2 ? 'max-w-6xl' : 'max-w-4xl'}`}>
        
        {/* Step Indicator Progress Bar */}
        {!submitSuccess && (
          <div className="mb-10">
            <div className="flex justify-between text-[10px] md:text-xs tracking-[0.15em] text-[#0D0D0D]/50 uppercase mb-3">
              <span className={currentStep >= 1 ? 'text-[#C9A96E] font-semibold' : ''}>1. 品牌基本資料</span>
              <span className={currentStep >= 2 ? 'text-[#C9A96E] font-semibold' : ''}>2. 展區意向選擇</span>
              <span className={currentStep >= 3 ? 'text-[#C9A96E] font-semibold' : ''}>3. 保證金繳交</span>
              <span className={currentStep >= 4 ? 'text-[#C9A96E] font-semibold' : ''}>4. 確認送出</span>
            </div>
            <div className="w-full bg-[#0D0D0D]/5 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#C9A96E] h-full transition-all duration-500 ease-out"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Screen */}
        {submitSuccess ? (
          <div className="bg-white/95 border border-[#C9A96E]/30 rounded-xl p-10 shadow-lg text-center my-10 max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-[#C9A96E]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#C9A96E]">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl md:text-3xl font-serif-garamond font-light tracking-wide mb-4">參展意向申請已完成遞交</h2>
            <p className="text-sm text-[#0D0D0D]/75 leading-relaxed mb-6 font-light">
              執行委員會已成功收到貴品牌的參展意向書與保證金匯款憑證。執行委員會將進行專業評估審核，並於 
              <strong className="font-medium text-[#C9A96E]"> 2026 年 10 月 20 日 </strong>
              發布第一階段評選結果通知至您的聯繫信箱。
            </p>
            <div className="border-t border-[#0D0D0D]/5 pt-6 flex flex-col items-center gap-2">
              <p className="text-xs text-[#0D0D0D]/50">若是成功入選後，大會工作小組將主動與您對接後續行政與古蹟策展事宜</p>
              <Link 
                href="/"
                className="mt-4 bg-[#0D0D0D] hover:bg-neutral-800 text-white font-medium text-xs tracking-widest uppercase px-6 py-3 rounded transition-colors"
              >
                返回官網首頁
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 border border-[#C9A96E]/15 rounded-xl p-6 md:p-10 shadow-md">
            
            {/* Error Message */}
            {submitError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded flex justify-between items-center">
                <span>{submitError}</span>
                <button onClick={() => setSubmitError(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 1: Basic Brand Info */}
            {currentStep === 1 && (
              <div>
                <h2 className="text-xl md:text-2xl font-serif-garamond font-normal tracking-wider mb-6 text-[#C9A96E] pb-2 border-b border-[#0D0D0D]/5">
                  1. 品牌基本資料 <span className="font-mono text-xs text-neutral-400 font-light ml-2">Brand Identity</span>
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">品牌中文名稱 *</label>
                    <input 
                      type="text" 
                      name="brand_name_zh"
                      value={formData.brand_name_zh}
                      onChange={handleTextChange}
                      placeholder="例如：蘭蕙雅集"
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">品牌英文名稱 *</label>
                    <input 
                      type="text" 
                      name="brand_name_en"
                      value={formData.brand_name_en}
                      onChange={handleTextChange}
                      placeholder="e.g. Lan Hui Atelier"
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">公司行號（中文）</label>
                    <input 
                      type="text" 
                      name="company_name_zh"
                      value={formData.company_name_zh}
                      onChange={handleTextChange}
                      placeholder="例如：台灣藝術文化有限公司"
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">公司統一編號（統編）</label>
                    <input 
                      type="text" 
                      name="company_tax_id"
                      value={formData.company_tax_id}
                      onChange={handleTextChange}
                      placeholder="例如：12345678（興趣於台灣實體公司填寫）"
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">負責人 / 聯絡人姓名 *</label>
                    <input 
                      type="text" 
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleTextChange}
                      placeholder="請輸入姓名"
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">聯絡人電子信箱 *</label>
                    <input 
                      type="email" 
                      name="contact_email"
                      value={formData.contact_email}
                      readOnly
                      placeholder="contact@yourbrand.com"
                      className="w-full text-sm border border-[#0D0D0D]/10 bg-neutral-100 text-neutral-500 rounded px-4 py-2.5 outline-none cursor-not-allowed font-mono"
                      required
                    />
                    <span className="text-[10.5px] text-neutral-600 mt-1.5 block font-medium">此欄位已自動填入您的註冊帳號 (不可修改) / Pre-filled with your registered account (read-only)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">聯絡人電話</label>
                    <input 
                      type="tel" 
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleTextChange}
                      placeholder="0912-345-678"
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">品牌官方網站</label>
                    <input 
                      type="url" 
                      name="website_url"
                      value={formData.website_url}
                      onChange={handleTextChange}
                      placeholder="https://www.yourbrand.com"
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">Instagram / 社群連結</label>
                    <input 
                      type="text" 
                      name="instagram_url"
                      value={formData.instagram_url}
                      onChange={handleTextChange}
                      placeholder="https://www.instagram.com/yourbrand"
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">聯繫地址 *</label>
                    <input 
                      type="text" 
                      name="contact_address"
                      value={formData.contact_address}
                      onChange={handleTextChange}
                      placeholder="例如：台北市信義區市民大道二段 XX 號 X 樓"
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                      required
                    />
                  </div>
                </div>

              </div>
            )}

            {/* Step 2: Exhibition Preferences */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-xl md:text-2xl font-serif-garamond font-normal tracking-wider mb-6 text-[#C9A96E] pb-2 border-b border-[#0D0D0D]/5">
                  2. 展區意向選擇 <span className="font-mono text-xs text-neutral-400 font-light ml-2">Exhibition Preference</span>
                </h2>

                {/* 展位平面參考圖 Floor Plan Reference */}
                <div className="mb-8 bg-white border border-[#C9A96E]/20 p-4 rounded-none shadow-sm">
                  <h3 className="text-xs font-semibold text-[#C9A96E] tracking-wider uppercase mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> 展位平面參考圖 Exhibition Floor Plan Reference
                  </h3>
                  <div className="aspect-[2/1] w-full overflow-hidden border border-[#0D0D0D]/5 bg-[#FAF9F6] flex items-center justify-center relative">
                    <img 
                      src="/floor_plan_2027.png" 
                      alt="VIS 2027 Exhibition Floor Plan" 
                      className="w-full h-auto object-contain max-h-[450px]"
                    />
                  </div>
                  <p className="text-[10px] text-[#0D0D0D]/75 font-normal mt-2 text-center">
                    * 中山堂展位配置圖：包含 KOL A/B 特展區、M01-M15 精鑑品牌展區及 S01-S15 藝蕙品牌展區。中央主走道寬 280cm，安全淨空 50cm，展位新間隔 65cm。
                  </p>
                </div>

                {/* 展區規格與費用資訊 */}
                <div className="mb-10">
                  <div className="grid lg:grid-cols-3 gap-6 mb-8">
                    {ALL_ZONES.map((zone) => (
                      <div 
                        key={zone.id}
                        className="bg-white rounded-none border border-[#C9A96E]/20 overflow-hidden flex flex-col p-1"
                      >
                        <div className="border border-[#C9A96E]/10 p-5 flex flex-col h-full bg-white text-left">
                          {/* Header */}
                          <div className="text-center pb-4 border-b border-[#0D0D0D]/5 relative">
                            <div className="text-[#C9A96E] text-[10px] font-semibold tracking-[0.25em] uppercase mb-1">
                              {zone.sectorLabel}
                            </div>
                            <h3 className="font-serif-garamond text-xl font-normal tracking-wide text-[#0D0D0D]">
                              {zone.nameZh}
                            </h3>
                            <p className="text-[10px] text-[#0D0D0D]/65 font-medium tracking-widest uppercase mt-0.5">
                              {zone.nameEn}
                            </p>
                            {zone.description && (
                              <p className="text-[12.5px] text-[#0D0D0D] font-semibold mt-3.5 leading-relaxed text-center px-3 py-2 bg-[#C9A96E]/5 rounded border border-[#C9A96E]/10">
                                {zone.description}
                              </p>
                            )}
                            <div className="absolute top-0 right-0 font-serif-garamond text-neutral-200 text-2xl font-bold select-none opacity-40">
                              {zone.numeral}
                            </div>
                          </div>

                          {/* Pricing Table */}
                          <div className="pt-4 flex-grow">
                            <h4 className="text-[9px] font-semibold tracking-[0.15em] text-[#C9A96E] uppercase mb-2.5">展位規格與價格 SPEC</h4>
                            <div className="border border-[#0D0D0D]/10 rounded-none overflow-hidden mb-4">
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                  <tr className="bg-[#FAF9F6] border-b border-[#0D0D0D]/10 text-[#0D0D0D]/80 font-mono text-[9px] font-semibold uppercase tracking-wider">
                                    <th className="p-2 font-medium">類型 / 規格</th>
                                    <th className="p-2 font-medium text-center">數量</th>
                                    <th className="p-2 font-medium text-right">單價 (NT$)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {zone.booths.map((booth, bIdx) => (
                                    <tr 
                                      key={bIdx} 
                                      className="border-b border-[#0D0D0D]/5 last:border-0 hover:bg-[#FAF9F6]/50 transition-colors"
                                    >
                                      <td className="p-2 font-light">
                                        <span className="font-semibold block text-[#0D0D0D] tracking-wide">{booth.code}</span>
                                        <span className="text-[10px] text-[#0D0D0D]/70 mt-0.5 block">{booth.dimensions ? `尺寸: ${booth.dimensions}` : booth.note}</span>
                                      </td>
                                      <td className="p-2 text-center font-mono font-semibold text-[#0D0D0D]/90">
                                        {booth.qty}
                                      </td>
                                      <td className="p-2 text-right font-mono font-medium text-[#C9A96E]">
                                        ${booth.price.toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Includes list */}
                            <h4 className="text-[9px] font-semibold tracking-[0.15em] text-[#C9A96E] uppercase mb-2.5">展位包含項目 INCLUDES</h4>
                            <ul className="text-[12px] text-[#0D0D0D]/90 space-y-1.5 mb-6 font-normal">
                              <li className="flex items-start gap-2">
                                <span className="text-[#C9A96E] text-[10px] mt-0.5">•</span>
                                <span>3 天展出時間 (1/8 - 1/10) + 1 天佈展安裝</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-[#C9A96E] text-[10px] mt-0.5">•</span>
                                <span>參展商專屬通行證 {zone.includes.exhibitorPasses} 張</span>
                              </li>
                              {zone.includes.vipPasses !== null && (
                                <li className="flex items-start gap-2">
                                  <span className="text-[#C9A96E] text-[10px] mt-0.5">•</span>
                                  <span>大會專屬 VIP 貴賓邀請函 {zone.includes.vipPasses} 張</span>
                                </li>
                              )}
                              {zone.includes.storageArea && (
                                <li className="flex items-start gap-2">
                                  <span className="text-[#C9A96E] text-[10px] mt-0.5">•</span>
                                  <span className="font-semibold text-[#0D0D0D]">{zone.includes.storageArea}</span>
                                </li>
                              )}
                              {zone.includes.vipLoungeSeating && (
                                <li className="flex items-start gap-2">
                                  <span className="text-[#C9A96E] text-[10px] mt-0.5">•</span>
                                  <span className="font-semibold text-[#C9A96E]">{zone.includes.vipLoungeSeating}</span>
                                </li>
                              )}
                            </ul>
                          </div>

                          {/* Note / Footer */}
                          <div className="bg-[#FAF9F6] p-3 border border-[#0D0D0D]/10 text-[11px] text-[#0D0D0D]/80 font-normal leading-relaxed mt-auto whitespace-pre-line">
                            <span className="font-semibold text-[#C9A96E] block mb-0.5 text-[8px] uppercase tracking-wider">說明 NOTE</span>
                            {zone.note}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-8 mt-10">
                  {/* Booth Preferences Order */}
                  <div>
                    <h3 className="text-sm font-semibold tracking-wider text-[#0D0D0D]/85 uppercase mb-4 border-b border-[#0D0D0D]/5 pb-2">
                      志願選擇 Preferences
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">第一志願展區 *</label>
                        <select 
                          name="zone_preference_1"
                          value={formData.zone_preference_1}
                          onChange={handleTextChange}
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] rounded px-3 py-2.5 outline-none bg-white text-[#0D0D0D] transition-colors"
                          required
                        >
                          {ALL_ZONES.flatMap(zone => 
                            zone.booths.map((booth, idx) => {
                              const val = `${zone.nameZh} - ${booth.code} ${booth.label} (NT$${booth.price.toLocaleString()})`;
                              return (
                                <option key={`${zone.id}-${idx}`} value={val}>
                                  {zone.sectorLabel} {zone.nameZh} — {booth.code} {booth.label} (${booth.price.toLocaleString()})
                                </option>
                              );
                            })
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">第二志願展區 *</label>
                        <select 
                          name="zone_preference_2"
                          value={formData.zone_preference_2}
                          onChange={handleTextChange}
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] rounded px-3 py-2.5 outline-none bg-white text-[#0D0D0D] transition-colors"
                          required
                        >
                          {ALL_ZONES.flatMap(zone => 
                            zone.booths.map((booth, idx) => {
                              const val = `${zone.nameZh} - ${booth.code} ${booth.label} (NT$${booth.price.toLocaleString()})`;
                              return (
                                <option key={`${zone.id}-${idx}`} value={val}>
                                  {zone.sectorLabel} {zone.nameZh} — {booth.code} {booth.label} (${booth.price.toLocaleString()})
                                </option>
                              );
                            })
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">第三志願展區 *</label>
                        <select 
                          name="zone_preference_3"
                          value={formData.zone_preference_3}
                          onChange={handleTextChange}
                          className="w-full text-xs border border-[#0D0D0D]/20 focus:border-[#C9A96E] rounded px-3 py-2.5 outline-none bg-white text-[#0D0D0D] transition-colors"
                          required
                        >
                          {ALL_ZONES.flatMap(zone => 
                            zone.booths.map((booth, idx) => {
                              const val = `${zone.nameZh} - ${booth.code} ${booth.label} (NT$${booth.price.toLocaleString()})`;
                              return (
                                <option key={`${zone.id}-${idx}`} value={val}>
                                  {zone.sectorLabel} {zone.nameZh} — {booth.code} {booth.label} (${booth.price.toLocaleString()})
                                </option>
                              );
                            })
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Concept brief */}
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase">品牌參展核心概念簡述 (250字內) *</label>
                      <span className={`text-[10.5px] font-mono ${formData.concept_brief.length > 250 ? 'text-rose-500 font-bold' : 'text-neutral-500 font-medium'}`}>
                        {formData.concept_brief.length} / 250
                      </span>
                    </div>
                    <textarea 
                      name="concept_brief"
                      value={formData.concept_brief}
                      onChange={handleTextChange}
                      placeholder="請簡述貴品牌預計展出的核心概念、陳列特色，以及如何結合中山堂古蹟空間底蘊進行美學演繹。"
                      rows={4}
                      className="w-full text-sm border border-[#0D0D0D]/20 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white text-[#0D0D0D] transition-colors resize-none"
                      maxLength={250}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Deposit Payment */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-xl md:text-2xl font-serif-garamond font-normal tracking-wider mb-6 text-[#C9A96E] pb-2 border-b border-[#0D0D0D]/5">
                  3. 保證金繳交 <span className="font-mono text-xs text-neutral-400 font-light ml-2">Deposit Submission</span>
                </h2>

                <div className="space-y-6">
                  <div className="bg-[#FAF9F6] border border-[#C9A96E]/20 p-5 rounded-lg">
                    <h3 className="text-xs font-semibold text-[#C9A96E] tracking-wider uppercase mb-3">大會指定匯款帳戶</h3>
                    <div className="text-xs text-[#0D0D0D]/80 space-y-2.5 font-mono">
                      <div>
                        <span className="text-[#0D0D0D]/75 block text-[10.5px] uppercase font-sans font-semibold tracking-wide">保證金金額 DEPOSIT AMOUNT</span>
                        <span className="text-[#C9A96E] text-base font-bold">NT$ {DEPOSIT_AMOUNT.toLocaleString()} 元整</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6 border-t border-[#0D0D0D]/10 pt-4">
                        <div className="space-y-2">
                          <span className="text-[#C9A96E] text-xs font-semibold block uppercase tracking-wider">國內匯款 (Domestic Remittance)</span>
                          <div className="space-y-1.5 text-[11px]">
                            <div>
                              <span className="text-[#0D0D0D]/70 block text-[10px] font-sans font-medium tracking-wide">銀行/分行 BANK / BRANCH</span>
                              <span className="font-semibold text-neutral-800">808 玉山銀行 / 中崙分行</span>
                            </div>
                            <div>
                              <span className="text-[#0D0D0D]/70 block text-[10px] font-sans font-medium tracking-wide">帳號 ACCOUNT NUMBER</span>
                              <span className="font-semibold text-[#C9A96E]">0912940021772</span>
                            </div>
                            <div>
                              <span className="text-[#0D0D0D]/70 block text-[10px] font-sans font-medium tracking-wide">戶名 ACCOUNT NAME</span>
                              <span className="font-semibold text-[#0D0D0D]">
                                泰德文化創意社 <span className="text-[10.5px] text-neutral-600 font-light">/ 或</span> <br className="hidden sm:inline" /> 泰德文化創意社郭芝妘 <span className="text-[10.5px] text-neutral-600 font-light">(視銀行規定而異)</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 border-t md:border-t-0 md:border-l border-[#0D0D0D]/10 pt-4 md:pt-0 md:pl-6">
                          <span className="text-[#C9A96E] text-xs font-semibold block uppercase tracking-wider">國外匯款 (International Remittance)</span>
                          <div className="space-y-1.5 text-[11px]">
                            <div>
                              <span className="text-[#0D0D0D]/70 block text-[10px] font-sans font-medium tracking-wide">SWIFT CODE</span>
                              <span className="font-semibold text-neutral-800">ESUNTWTP</span>
                            </div>
                            <div>
                              <span className="text-[#0D0D0D]/70 block text-[10px] font-sans font-medium tracking-wide">BENEFICIARY'S NAME</span>
                              <span className="font-semibold text-neutral-800">ART PRESS and Life Co.</span>
                            </div>
                            <div>
                              <span className="text-[#0D0D0D]/70 block text-[10px] font-sans font-medium tracking-wide">BENEFICIARY BRANCH</span>
                              <span className="font-semibold text-neutral-800">E.Sun Bank / Zhonglun Branch</span>
                            </div>
                            <div>
                              <span className="text-[#0D0D0D]/70 block text-[10px] font-sans font-medium tracking-wide">ACCOUNT NUMBER</span>
                              <span className="font-semibold text-[#C9A96E]">0912940021772</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-[11.5px] text-[#0D0D0D]/75 border-t border-[#0D0D0D]/10 pt-2.5 font-sans leading-relaxed space-y-1">
                        <p>* 匯款時請務必在備註欄填寫「<strong className="text-[#0D0D0D] font-semibold">{formData.brand_name_zh || '您的品牌名稱'} VIS保證金</strong>」。匯款完成後請將網銀扣款截圖或ATM交易明細拍照上傳至下方。</p>
                        <p className="text-rose-600 font-semibold">* 所有展位與保證金價格均不含稅 (All prices listed above are exclusive of tax).</p>
                      </div>
                    </div>
                  </div>

                  {/* Upload Drop Zone */}
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">上傳匯款憑證截圖 *</label>
                    
                    {!previewImage ? (
                      <div className="border-2 border-dashed border-[#C9A96E]/20 hover:border-[#C9A96E]/50 transition-colors rounded-lg p-8 bg-[#FAF9F6] text-center flex flex-col items-center justify-center cursor-pointer relative group">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="w-10 h-10 text-[#C9A96E]/60 group-hover:scale-105 transition-transform mb-3" />
                        <p className="text-xs font-semibold text-[#C9A96E] tracking-wider uppercase mb-1">點擊或拖曳圖片至此處上傳</p>
                        <p className="text-[11px] text-[#0D0D0D]/70">支援 JPG, PNG 格式，檔案大小不超過 2MB</p>
                      </div>
                    ) : (
                      <div className="border border-[#C9A96E]/30 rounded-lg p-4 bg-white relative">
                        <button 
                          onClick={() => {
                            setPreviewImage(null);
                            setFormData(prev => ({ ...prev, deposit_proof_base64: '', deposit_proof_filename: '' }));
                          }}
                          className="absolute top-2 right-2 bg-[#0D0D0D]/60 hover:bg-[#0D0D0D] text-white p-1 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="aspect-[3/2] w-full max-h-60 overflow-hidden rounded bg-[#FAF9F6] border border-[#0D0D0D]/5 mb-3 flex items-center justify-center">
                          <img 
                            src={previewImage} 
                            alt="Deposit Proof Preview" 
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#0D0D0D]/60 font-mono">
                          <FileText className="w-4 h-4 text-[#C9A96E]" />
                          <span className="truncate max-w-[80%]">{formData.deposit_proof_filename}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Summary & Confirm */}
            {currentStep === 4 && (
              <div>
                <h2 className="text-xl md:text-2xl font-serif-garamond font-normal tracking-wider mb-6 text-[#C9A96E] pb-2 border-b border-[#0D0D0D]/5">
                  4. 確認參展意向資訊 <span className="font-mono text-xs text-neutral-400 font-light ml-2">Verification & Submit</span>
                </h2>

                <div className="space-y-6">
                  {/* Info Table */}
                  <div className="bg-[#FAF9F6] border border-[#0D0D0D]/10 rounded-lg p-5 text-xs space-y-3 font-mono">
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">品牌名稱 Brand</span>
                      <span className="col-span-2 font-medium text-[#0D0D0D]">{formData.brand_name_zh} ({formData.brand_name_en})</span>
                    </div>
                    {formData.company_name_zh && (
                      <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                        <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">公司行號 Company</span>
                        <span className="col-span-2 font-medium text-[#0D0D0D]">{formData.company_name_zh}</span>
                      </div>
                    )}
                    {formData.company_tax_id && (
                      <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                        <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">統一編號 Tax ID</span>
                        <span className="col-span-2 font-medium text-[#0D0D0D] font-mono">{formData.company_tax_id}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">負責聯絡人 Contact</span>
                      <span className="col-span-2 font-medium text-[#0D0D0D]">{formData.contact_name}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">聯繫信箱 Email</span>
                      <span className="col-span-2 font-medium text-[#0D0D0D]">{formData.contact_email}</span>
                    </div>
                    {formData.contact_phone && (
                      <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                        <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">電話 Phone</span>
                        <span className="col-span-2 font-medium text-[#0D0D0D]">{formData.contact_phone}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">聯繫地址 Address</span>
                      <span className="col-span-2 font-medium text-[#0D0D0D]">{formData.contact_address}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">擬參展展區 Sector</span>
                      <span className="col-span-2 font-medium text-[#C9A96E]">{selectedZone?.sectorLabel} — {selectedZone?.nameZh}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">展位意向 Stall Code</span>
                      <div className="col-span-2 font-medium text-[#C9A96E] font-sans space-y-1">
                        <div>第一志願：{formData.zone_preference_1}</div>
                        <div>第二志願：{formData.zone_preference_2}</div>
                        <div>第三志願：{formData.zone_preference_3}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">預計單價 Stall Price</span>
                      <span className="col-span-2 font-semibold text-[#0D0D0D]">NT$ {selectedBooth?.price?.toLocaleString() || '—'} (不含稅 exclusive of tax)</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">保證金狀態 Deposit</span>
                      <span className="col-span-2 font-semibold text-emerald-600 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> NT$ {DEPOSIT_AMOUNT.toLocaleString()} (憑證已上傳)
                      </span>
                    </div>
                    <div className="pt-2">
                      <span className="text-[#0D0D0D]/75 block font-sans font-semibold tracking-wide mb-1">參展核心概念 Concept Brief</span>
                      <p className="font-sans text-[#0D0D0D]/80 leading-relaxed font-light whitespace-pre-wrap bg-white p-3 rounded border border-[#0D0D0D]/5">{formData.concept_brief}</p>
                    </div>
                  </div>

                  {/* Conditions Checkboxes */}
                  <div className="space-y-4 bg-[#C9A96E]/5 border border-[#C9A96E]/20 p-5 rounded-lg">
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        id="agree_terms_1"
                        checked={agreeTerms1}
                        onChange={(e) => setAgreeTerms1(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-[#C9A96E] cursor-pointer"
                      />
                      <label htmlFor="agree_terms_1" className="text-xs text-[#0D0D0D]/75 leading-relaxed font-light cursor-pointer">
                        我同意為維護大展申請公正秩序，申請單位須於提交申請表之同時，匯款繳交保證金新台幣 20,000 元整，並提供匯款證明。我保證上述填寫內容與所附匯款截圖資訊均屬實，若未依規定或逾期繳納者，視同未完成申請手續，主辦單位將不予受理審查。
                      </label>
                    </div>

                    <div className="flex items-start gap-3 border-t border-[#C9A96E]/15 pt-4">
                      <input 
                        type="checkbox" 
                        id="agree_terms_2"
                        checked={agreeTerms2}
                        onChange={(e) => setAgreeTerms2(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-[#C9A96E] cursor-pointer"
                      />
                      <label htmlFor="agree_terms_2" className="text-xs text-[#0D0D0D]/75 leading-relaxed font-light cursor-pointer">
                        未錄取單位之退款 經審查未獲錄取之單位，主辦單位將於公告錄取名單後之 <span className="text-[#C9A96E] font-semibold border-b border-[#C9A96E]/30 px-1">14</span> 個工作日內，將保證金無息退還至申請單位之原匯款帳戶。退款所產生之銀行跨行匯款手續費，將由退款金額中逕行扣除。
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step Navigation Buttons */}
            <div className="flex justify-between items-center mt-10 pt-6 border-t border-[#0D0D0D]/5">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={isSubmitting}
                  className="border border-[#0D0D0D]/20 hover:border-[#0D0D0D]/60 text-[#0D0D0D]/70 font-semibold text-xs tracking-widest uppercase px-6 py-3 rounded transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> 上一步 Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!isStepValid()}
                  className="bg-[#0D0D0D] hover:bg-neutral-800 text-white disabled:bg-neutral-200 disabled:text-neutral-400 font-semibold text-xs tracking-widest uppercase px-6 py-3 rounded transition-all duration-300 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  下一步 Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !agreeTerms1 || !agreeTerms2}
                  className="bg-[#C9A96E] hover:bg-[#B39359] text-white font-semibold text-xs tracking-widest uppercase px-8 py-3 rounded transition-all duration-300 flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      遞交中 Submitting...
                    </>
                  ) : (
                    <>
                      確認送出 SUBMIT
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
