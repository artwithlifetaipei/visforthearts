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
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

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
    booth_type: 'A01', // specific booth code
    zone_preference_1: '明日經典展區 - A01 展台式展位 - A01 (近主入口處) (NT$42,000)',
    zone_preference_2: '文化實體展區 - A4 展台式展位 - A4 (離主入口最近) (NT$42,000)',
    zone_preference_3: '匠心藝藏展區 - B1 500*460cm 獨立展位 B1 - 入口處兩側 (NT$108,000)',
    concept_brief: '',
    deposit_proof_base64: '',
    deposit_proof_filename: '',
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Bilingual Dictionary
  const dict = {
    zh: {
      title: "參展意向申請登記",
      backBtn: "返回申請說明 BACK",
      step1: "1. 品牌基本資料",
      step2: "2. 展位意向選擇",
      step3: "3. 保證金繳交",
      step4: "4. 確認送出",
      brandZhLabel: "品牌中文名稱 *",
      brandZhPlaceholder: "例如：蘭蕙雅集",
      brandEnLabel: "品牌英文名稱 *",
      brandEnPlaceholder: "e.g. Lan Hui Atelier",
      companyLabel: "公司行號（中文）",
      companyPlaceholder: "例如：台灣藝術文化有限公司",
      taxIdLabel: "公司統一編號（統編）",
      taxIdPlaceholder: "例如：12345678（僅限台灣實體公司填寫）",
      contactLabel: "負責人 / 聯絡人姓名 *",
      contactPlaceholder: "請輸入姓名",
      emailLabel: "聯絡人電子信箱 *",
      prefilled: "此欄位已自動填入您的註冊帳號 (不可修改)",
      phoneLabel: "聯絡人電話",
      websiteLabel: "品牌官方網站",
      instagramLabel: "Instagram / 社群連結",
      addressLabel: "聯繫地址 *",
      addressPlaceholder: "例如：台北市信義區市民大道二段 XX 號 X 樓",
      next: "下一步 Next",
      prev: "上一步 Back",
      submit: "確認送出 SUBMIT",
      submitting: "遞交中 Submitting...",
      successTitle: "參展意向申請已完成遞交",
      successText: "執行委員會已成功收到貴品牌的參展意向書與保證金匯款憑證。執行委員會將進行專業評估審核，並於 2026 年 10 月 20 日 發布第一階段評選結果通知至您的聯繫信箱。",
      successSubText: "若是成功入選後，大會工作小組將主動與您對接後續行政與古蹟策展事宜",
      backHome: "返回官網首頁",
      floorPlanTitle: "展位平面參考圖 Floor Plan Reference",
      floorPlanNote: "* 展位配置說明：展區將會分別為 DISPLAY STAND 展台式展位 (A1-A5) 與 INDEPENDENT BOOTH 獨立展位 (B1-B3) 兩種，此展位價格將因位置而異。例如：大展出入口兩側展位價格最高。",
      specTitle: "展位規格與價格 SPEC",
      includeTitle: "展位包含項目 INCLUDES",
      noteTitle: "說明 NOTE",
      preferenceTitle: "志願選擇 Preferences",
      preference1: "第一志願展區 *",
      preference2: "第二志願展區 *",
      preference3: "第三志願展區 *",
      conceptTitle: "品牌參展核心概念簡述 (250字內) *",
      conceptPlaceholder: "請簡述貴品牌預計展出的核心概念、陳列特色，以及如何結合中山堂古蹟空間底蘊進行美學演繹。",
      depositAmountLabel: "保證金金額 DEPOSIT AMOUNT",
      remittanceDomestic: "國內匯款 (Domestic Remittance)",
      remittanceIntl: "國外匯款 (International Remittance)",
      remittanceNote: `* 匯款時請務必在備註欄填寫「${formData.brand_name_zh || '您的品牌名稱'} VIS保證金」。匯款完成後請將網銀扣款截圖或ATM交易明細拍照上傳至下方。`,
      remittanceTaxNote: "* 所有展位與保證金價格均不含稅 (All prices listed above are exclusive of tax).",
      uploadTitle: "上傳匯款憑證截圖 *",
      uploadText: "點擊或拖曳圖片至此處上傳",
      uploadSubtext: "支援 JPG, PNG 格式，檔案大小不超過 2MB",
      verificationTitle: "4. 確認參展意向資訊 Verification & Submit",
      brandVerify: "品牌名稱 Brand",
      companyVerify: "公司行號 Company",
      taxIdVerify: "統一編號 Tax ID",
      contactVerify: "負責聯絡人 Contact",
      emailVerify: "聯繫信箱 Email",
      phoneVerify: "電話 Phone",
      addressVerify: "聯繫地址 Address",
      sectorVerify: "擬參展展區 Sector",
      stallVerify: "展位意向 Stall Code",
      priceVerify: "預計單價 Stall Price",
      depositVerify: "保證金狀態 Deposit",
      conceptVerify: "參展核心概念 Concept Brief",
      depositPaidStatus: "NT$ 20,000 (憑證已上傳)",
      term1: "我同意為維護大展申請公正秩序，申請單位須於提交申請表之同時，匯款繳交保證金新台幣 20,000 元整，並提供匯款證明。我保證上述填寫內容與所附匯款截圖資訊均屬實，若未依規定或逾期繳納者，視同未完成申請手續，主辦單位將不予受理審查。",
      term2: "未錄取單位之退款 經審查未獲錄取之單位，主辦單位將於公告錄取名單後之 14 個工作日內，將保證金無息退還至申請單位之原匯款帳戶。退款所產生之銀行跨行匯款手續費，將由退款金額中逕行扣除。",
      agreeTerms1: "我同意大會隱私權保護政策與個人資料收集聲明。",
      agreeTerms2: "我確認已完成匯款且上傳之憑證真實無誤。",
      loginRequired: "請先登入以開始參展申請",
      loginRequiredSub: "大會線上申請系統需要驗證您的參展品牌身份。點擊下方按鈕即可返回登入或註冊新帳號。",
      loginRedirectBtn: "前往登入 / 註冊"
    },
    en: {
      title: "Exhibitor Application Portal",
      backBtn: "BACK TO INFO",
      step1: "1. Brand Profile",
      step2: "2. Booth Preference",
      step3: "3. Deposit Proof",
      step4: "4. Confirmation",
      brandZhLabel: "Brand Name (Chinese) *",
      brandZhPlaceholder: "e.g. Lan Hui Atelier",
      brandEnLabel: "Brand Name (English) *",
      brandEnPlaceholder: "e.g. Lan Hui Atelier",
      companyLabel: "Registered Company Name (Chinese)",
      companyPlaceholder: "e.g. Taiwan Art and Culture Ltd.",
      taxIdLabel: "Company Tax ID / Business Registration",
      taxIdPlaceholder: "e.g. 12345678 (If applicable)",
      contactLabel: "Contact Name *",
      contactPlaceholder: "Enter contact person's name",
      emailLabel: "Contact Email *",
      prefilled: "Pre-filled with your registered account (read-only)",
      phoneLabel: "Contact Phone Number",
      websiteLabel: "Official Website",
      instagramLabel: "Instagram / Social Link",
      addressLabel: "Mailing Address *",
      addressPlaceholder: "e.g. Room A, 5F, No. 24, Sec. 1, Zhongxiao East Road, Taipei",
      next: "Next Step",
      prev: "Previous",
      submit: "Submit Application",
      submitting: "Submitting...",
      successTitle: "Application Submitted Successfully",
      successText: "The Executive Committee has received your proposal and deposit proof. The committee will conduct a professional review and announce Stage 1 selection results via email on October 20, 2026.",
      successSubText: "Upon selection, our working group will contact you for subsequent administrative and historic site curation details.",
      backHome: "Back to Home",
      floorPlanTitle: "Exhibition Floor Plan Reference",
      floorPlanNote: "* Booth layout: Stalls are divided into DISPLAY STAND (A1-A5) and INDEPENDENT BOOTH (B1-B3). Booth pricing varies by location, with booths on both sides of main entrances having the highest fee.",
      specTitle: "Booth Dimensions & Price",
      includeTitle: "Booth Inclusions",
      noteTitle: "Note",
      preferenceTitle: "Stalls Choice Preferences",
      preference1: "1st Preference Zone *",
      preference2: "2nd Preference Zone *",
      preference3: "3rd Preference Zone *",
      conceptTitle: "Brand Concept & Exhibition Summary (Max 250 chars) *",
      conceptPlaceholder: "Briefly describe your concept, exhibition style, and how your layout aligns with the historical heritage of Zhongshan Hall.",
      depositAmountLabel: "Deposit Amount",
      remittanceDomestic: "Domestic Remittance (Taiwan)",
      remittanceIntl: "International Remittance",
      remittanceNote: `* Please ensure you write "${formData.brand_name_en || 'Your Brand Name'} VIS Deposit" in the memo. Upload a transaction screenshot or photo of ATM receipt below.`,
      remittanceTaxNote: "* All prices listed above are exclusive of tax.",
      uploadTitle: "Upload Remittance Proof *",
      uploadText: "Click or drag image here to upload",
      uploadSubtext: "Supports JPG, PNG, WEBP (Max 2MB)",
      verificationTitle: "Verification & Submit",
      brandVerify: "Brand Name",
      companyVerify: "Company Name",
      taxIdVerify: "Tax ID",
      contactVerify: "Contact Person",
      emailVerify: "Email Address",
      phoneVerify: "Phone Number",
      addressVerify: "Mailing Address",
      sectorVerify: "Selected Sector",
      stallVerify: "Stall Codes",
      priceVerify: "Estimated Price",
      depositVerify: "Deposit Status",
      conceptVerify: "Concept Brief",
      depositPaidStatus: "NT$ 20,000 (Proof Uploaded)",
      term1: "To maintain registration order, applicants must pay a deposit of NT$ 20,000 and provide transaction proof upon submitting this form. I guarantee all info and uploaded images are genuine. Applications without payment or late payment will be voided.",
      term2: "Refunds for Non-selected Brands: Brands not selected will receive a full interest-free deposit refund within 14 working days of the official announcement, sent to the original remittance account. Interbank transfer fees will be deducted from the refund.",
      agreeTerms1: "I agree to the VIS Privacy Policy and Personal Data Collection Statement.",
      agreeTerms2: "I confirm that payment is completed and the uploaded proof is genuine.",
      loginRequired: "Please sign in to begin application",
      loginRequiredSub: "Our application portal requires verification of your brand credentials. Click below to sign in or register an account.",
      loginRedirectBtn: "Proceed to Login / Register"
    }
  };

  const getZoneDescription = (zoneId: string, l: 'zh' | 'en') => {
    if (l === 'zh') {
      if (zoneId === 'artsy') return '最適合新銳品牌：適合產品較小、或產品較少之微型精緻展出的潛力舞台。';
      if (zoneId === 'premier') return '成熟品牌首選：加大展位與主入口高曝光。';
      return '適合需要專屬獨立空間，來聚焦表現品牌工藝美學者，同時，亦有全大展唯二的雙倍大器格局展位，完整構築沈浸式體驗。';
    } else {
      if (zoneId === 'artsy') return 'Ideal for emerging brands: A promising platform for micro-exhibitions with smaller or fewer products.';
      if (zoneId === 'premier') return 'Top choice for established brands: Larger booths and high exposure near the main entrance.';
      return 'Perfect for brands needing dedicated spaces to focus on craftsmanship. Features double-sized grand layout booths for immersive curation.';
    }
  };

  const getZoneNote = (zoneId: string, l: 'zh' | 'en') => {
    if (l === 'zh') {
      if (zoneId === 'artsy') return '大會提供各展位 1展台，尺寸為 H90.5 * W60.5 * 60.5cm，下方可置物。\n參展品牌人員皆可於現場進行銷售，不抽成。\n額外需求：倉儲區收費為每平方米 1000元/四日。';
      if (zoneId === 'premier') return '參展品牌人員皆可於現場進行銷售，不抽成。\n大會提供各展位 1展台，尺寸為 H90.5 * W60.5 * 60.5cm，下方可置物。\nM1-M8展台數2，分別為：H90.5 * W97.3 * 47.5與H90.5 * W60.5 * 60.5cm。\n額外需求：倉儲區收費為每平方米 1000元/四日。';
      return '*備註：該展區，全展位挑高皆為460cm。';
    } else {
      if (zoneId === 'artsy') return 'Includes 1 counter (H90.5 * W60.5 * 60.5cm) with lower storage.\nOn-site sales allowed, 0% commission.\nExtra storage: NT$ 1,000 per sqm / 4 days.';
      if (zoneId === 'premier') return 'On-site sales allowed, 0% commission.\nIncludes 1 counter (H90.5 * W60.5 * 60.5cm) with lower storage.\nM1-M8 provides 2 counters: H90.5*W97.3*47.5 & H90.5*W60.5*60.5cm.\nExtra storage: NT$ 1,000 per sqm / 4 days.';
      return '*Note: Ceiling height is 460cm for all booths in this sector.';
    }
  };

  const getZoneIncludes = (zone: any, l: 'zh' | 'en') => {
    if (l === 'zh') {
      const list = [
        `3 天展出時間 (1/8 - 1/10) + 1 天佈展安裝`,
        `參展商專屬通行證 ${zone.includes.exhibitorPasses} 張`
      ];
      if (zone.includes.vipPasses !== null) {
        list.push(`大會專屬 VIP 貴賓邀請函 ${zone.includes.vipPasses} 張`);
      }
      if (zone.includes.storageArea) {
        list.push(zone.includes.storageArea);
      }
      if (zone.includes.vipLoungeSeating) {
        list.push(zone.includes.vipLoungeSeating);
      }
      return list;
    } else {
      const list = [
        `3 Days Exhibition (Jan 8-10) + 1 Day Installation`,
        `${zone.includes.exhibitorPasses} Exhibitor Passes`
      ];
      if (zone.includes.vipPasses !== null) {
        list.push(`${zone.includes.vipPasses} VIP Invitation Passes`);
      }
      if (zone.id === 'atelier') {
        list.push('Includes Storage Area 300*300cm');
        list.push('Includes 2F VIP Lounge (2 tables, 4 chairs)');
      }
      return list;
    }
  };

  // Check auth session via active listener subscription (highly reliable & avoids race conditions)
  useEffect(() => {
    let isMounted = true;

    // 0. Synchronously check sessionStorage for instant zero-latency login validation
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

    // 1. Initial manual load as fallback
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (isMounted && initialSession) {
        setSession(initialSession);
        setAuthChecking(false);
        try {
          sessionStorage.setItem('vis_temp_session', JSON.stringify(initialSession));
        } catch (e) {}
      }
    }).catch(err => {
      console.warn('Initial session load check omitted:', err);
    });

    // 2. Active event listener subscription
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
    const { name: fieldName, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [fieldName]: value };
      
      // Auto mapping for step choices
      if (fieldName === 'zone_preference_1') {
        // Detect selected zone & booth by matching values
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
      alert(lang === 'zh' ? '請上傳圖片檔案 (PNG, JPEG, WebP)' : 'Please upload an image file (PNG, JPEG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert(lang === 'zh' ? '檔案不能超過 2MB (為確保連線穩定並防止後台逾時，請將圖片壓縮至 2MB 以下)' : 'File size cannot exceed 2MB. Please compress your image.');
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
        setSubmitError(result.error || (lang === 'zh' ? '提交申請時發生錯誤，請稍後再試。' : 'Failed to submit application. Please try again.'));
      }
    } catch (err: any) {
      setSubmitError(lang === 'zh' ? '系統連線異常，請確認網路連線。' : 'Network error. Please check your internet connection.');
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
          <div className="absolute top-4 left-4 w-2.5 h-2.5 border-t-[0.5px] border-l-[0.5px] border-neutral-400 opacity-30"></div>
          <div className="absolute top-4 right-4 w-2.5 h-2.5 border-t-[0.5px] border-r-[0.5px] border-neutral-400 opacity-30"></div>
          <div className="absolute bottom-4 left-4 w-2.5 h-2.5 border-b-[0.5px] border-l-[0.5px] border-neutral-400 opacity-30"></div>
          <div className="absolute bottom-4 right-4 w-2.5 h-2.5 border-b-[0.5px] border-r-[0.5px] border-neutral-400 opacity-30"></div>
          
          <img 
            src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
            alt="VIS Logo" 
            className="h-10 mx-auto mb-8 object-contain"
          />

          <h2 className="font-serif-garamond text-xl font-light tracking-wide text-[#0D0D0D] mb-4">
            {dict[lang].loginRequired}
          </h2>
          <p className="text-xs text-[#0D0D0D]/65 leading-relaxed tracking-wider mb-8">
            {dict[lang].loginRequiredSub}
          </p>
          <Link 
            href="/exhibitor/portal"
            className="block w-full bg-[#C9A96E] hover:bg-[#B39359] text-white text-xs font-semibold tracking-widest uppercase py-3.5 shadow-md transition-colors"
          >
            {dict[lang].loginRedirectBtn}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#0D0D0D] font-sans relative overflow-hidden select-none pb-20">
      {/* Background Graphic Accents */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{
            background: 'linear-gradient(180deg, rgba(245,242,235,0.82) 0%, rgba(240,235,225,0.6) 40%, rgba(245,242,235,0.88) 100%)'
          }}
        />
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
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-1.5 text-[10px] tracking-widest font-semibold bg-[#C9A96E] text-white px-3.5 py-1.5 hover:bg-[#B39359] active:scale-95 transition-all duration-200 uppercase cursor-pointer shadow-sm"
            title={lang === 'zh' ? 'Switch to English' : '切換為繁體中文'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 opacity-90">
              <path d="M7.75 2.75a.75.75 0 0 0-1.5 0v1.258a32.987 32.987 0 0 0-3.599.278.75.75 0 1 0 .198 1.487A31.545 31.545 0 0 1 8.7 5.545 19.381 19.381 0 0 1 7 9.56a19.418 19.418 0 0 1-1.002-1.05.75.75 0 0 0-1.144.97c.4.473.845.91 1.33 1.305A19.441 19.441 0 0 1 4 12.5H2.75a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5H11a19.5 19.5 0 0 1-2.184-2.195 19.38 19.38 0 0 0 1.683-3.77A31.456 31.456 0 0 1 14.25 6.8v1.45a.75.75 0 0 0 1.5 0V4a.75.75 0 0 0-.75-.75h-7.25ZM6 17.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1-.75-.75Z" />
            </svg>
            {lang === 'zh' ? 'EN' : '繁中'}
          </button>
          
          <Link 
            href="/exhibitor" 
            className="text-xs tracking-[0.2em] font-light hover:text-[#C9A96E] transition-colors duration-300 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {dict[lang].backBtn}
          </Link>
        </div>
      </nav>

      {/* Multi-step Container */}
      <main className={`relative z-10 mx-auto px-6 pt-10 transition-all duration-300 ${currentStep === 2 ? 'max-w-6xl' : 'max-w-4xl'}`}>
        
        {/* Step Indicator Progress Bar */}
        {!submitSuccess && (
          <div className="mb-10">
            <div className="flex justify-between text-[10px] md:text-xs tracking-[0.15em] text-[#0D0D0D]/50 uppercase mb-3">
              <span className={currentStep >= 1 ? 'text-[#C9A96E] font-semibold' : ''}>{dict[lang].step1}</span>
              <span className={currentStep >= 2 ? 'text-[#C9A96E] font-semibold' : ''}>{dict[lang].step2}</span>
              <span className={currentStep >= 3 ? 'text-[#C9A96E] font-semibold' : ''}>{dict[lang].step3}</span>
              <span className={currentStep >= 4 ? 'text-[#C9A96E] font-semibold' : ''}>{dict[lang].step4}</span>
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
            <h2 className="text-2xl md:text-3xl font-serif-garamond font-light tracking-wide mb-4">{dict[lang].successTitle}</h2>
            <p className="text-sm text-[#0D0D0D]/75 leading-relaxed mb-6 font-light">
              {dict[lang].successText}
            </p>
            <div className="border-t border-[#0D0D0D]/5 pt-6 flex flex-col items-center gap-2">
              <p className="text-xs text-[#0D0D0D]/50">{dict[lang].successSubText}</p>
              <Link 
                href="/"
                className="mt-4 bg-[#0D0D0D] hover:bg-neutral-800 text-white font-medium text-xs tracking-widest uppercase px-6 py-3 rounded transition-colors"
              >
                {dict[lang].backHome}
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
                  {dict[lang].step1} <span className="font-mono text-xs text-neutral-400 font-light ml-2">Brand Identity</span>
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">{dict[lang].brandZhLabel}</label>
                    <input 
                      type="text" 
                      name="brand_name_zh"
                      value={formData.brand_name_zh}
                      onChange={handleTextChange}
                      placeholder={dict[lang].brandZhPlaceholder}
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">{dict[lang].brandEnLabel}</label>
                    <input 
                      type="text" 
                      name="brand_name_en"
                      value={formData.brand_name_en}
                      onChange={handleTextChange}
                      placeholder={dict[lang].brandEnPlaceholder}
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">{dict[lang].companyLabel}</label>
                    <input 
                      type="text" 
                      name="company_name_zh"
                      value={formData.company_name_zh}
                      onChange={handleTextChange}
                      placeholder={dict[lang].companyPlaceholder}
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">{dict[lang].taxIdLabel}</label>
                    <input 
                      type="text" 
                      name="company_tax_id"
                      value={formData.company_tax_id}
                      onChange={handleTextChange}
                      placeholder={dict[lang].taxIdPlaceholder}
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">{dict[lang].contactLabel}</label>
                    <input 
                      type="text" 
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleTextChange}
                      placeholder={dict[lang].contactPlaceholder}
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">{dict[lang].emailLabel}</label>
                    <input 
                      type="email" 
                      name="contact_email"
                      value={formData.contact_email}
                      readOnly
                      placeholder={dict[lang].emailPlaceholder}
                      className="w-full text-sm border border-[#0D0D0D]/10 bg-neutral-100 text-neutral-500 rounded px-4 py-2.5 outline-none cursor-not-allowed font-mono"
                      required
                    />
                    <span className="text-[10.5px] text-neutral-600 mt-1.5 block font-medium">{dict[lang].prefilled}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">{dict[lang].phoneLabel} *</label>
                    <input 
                      type="tel" 
                      name="contact_phone"
                      value={formData.contact_phone}
                      onChange={handleTextChange}
                      placeholder="e.g. +886 912345678"
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">{dict[lang].websiteLabel}</label>
                    <input 
                      type="url" 
                      name="website_url"
                      value={formData.website_url}
                      onChange={handleTextChange}
                      placeholder={dict[lang].websitePlaceholder}
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">{dict[lang].instagramLabel}</label>
                    <input 
                      type="text" 
                      name="instagram_url"
                      value={formData.instagram_url}
                      onChange={handleTextChange}
                      placeholder={dict[lang].instagramPlaceholder}
                      className="w-full text-sm border border-[#0D0D0D]/10 focus:border-[#C9A96E] rounded px-4 py-2.5 outline-none bg-white/50 transition-colors"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">{dict[lang].addressLabel}</label>
                    <input 
                      type="text" 
                      name="contact_address"
                      value={formData.contact_address}
                      onChange={handleTextChange}
                      placeholder={dict[lang].addressPlaceholder}
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
                  {dict[lang].step2} <span className="font-mono text-xs text-neutral-400 font-light ml-2">Exhibition Preference</span>
                </h2>

                {/* Visual Layout Info Callout */}
                <div className="mb-8 p-6 bg-[#FAF9F6] border border-[#C9A96E]/20 text-[#0D0D0D]/90 text-sm leading-relaxed rounded-none shadow-sm flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-1">
                    <p className="font-serif-garamond text-base text-[#C9A96E] font-medium tracking-wide mb-3 uppercase">
                      展位與展區規劃說明 / Booth & Zone Guide
                    </p>
                    <p className="mb-3 font-normal leading-relaxed text-[#0D0D0D]">
                      展位規劃分為 <strong>DISPLAY STAND 展台式展位 (A1-A5)</strong> 與 <strong>INDEPENDENT BOOTH 獨立展位 (B1-B3)</strong> 兩種，其價格依展位位置有所區分。例如：大展出入口兩側展位價格最高。
                    </p>
                  </div>
                  <div className="w-full md:w-px md:h-20 bg-[#C9A96E]/25 self-stretch"></div>
                  <div className="flex-1">
                    <p className="font-serif-garamond text-xs text-[#0D0D0D]/65 font-medium tracking-wider uppercase mb-2">
                      三大核心規劃展區 / Three Core Sectors
                    </p>
                    <ul className="text-xs space-y-1 text-[#0D0D0D]/80 font-normal leading-relaxed">
                      <li><strong>I. 明日經典展區</strong> Future Classics Sector</li>
                      <li><strong>II. 文化實體展區</strong> Cultural Entities Sector</li>
                      <li><strong>III. 匠心藝藏展區</strong> Designer & Atelier Brand Sector</li>
                    </ul>
                  </div>
                </div>

                {/* Floor Plan Image Reference */}
                <div className="mb-8 bg-white border border-[#C9A96E]/20 p-4 rounded-none shadow-sm">
                  <h3 className="text-xs font-semibold text-[#C9A96E] tracking-wider uppercase mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> {dict[lang].floorPlanTitle}
                  </h3>
                  <div className="aspect-[2/1] w-full overflow-hidden border border-[#0D0D0D]/5 bg-[#FAF9F6] flex items-center justify-center relative">
                    <img 
                      src="/floor_plan_2027.png" 
                      alt="VIS 2027 Exhibition Floor Plan" 
                      className="w-full h-auto object-contain max-h-[450px]"
                    />
                  </div>
                  <p className="text-[10px] text-[#0D0D0D]/75 font-normal mt-2 text-center">
                    {dict[lang].floorPlanNote}
                  </p>
                </div>

                {/* Specifications & Inclusions */}
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
                              {lang === 'zh' ? zone.nameZh : zone.nameEn}
                            </h3>
                            <p className="text-[10px] text-[#0D0D0D]/65 font-medium tracking-widest uppercase mt-0.5">
                              {zone.nameEn}
                            </p>
                            <p className="text-[12.5px] text-[#0D0D0D] font-normal mt-3.5 leading-relaxed text-center px-3 py-2 bg-[#C9A96E]/5 rounded border border-[#C9A96E]/10">
                              {getZoneDescription(zone.id, lang)}
                            </p>
                            <div className="absolute top-0 right-0 font-serif-garamond text-neutral-200 text-2xl font-bold select-none opacity-40">
                              {zone.numeral}
                            </div>
                          </div>

                          {/* Pricing Table */}
                          <div className="pt-4 flex-grow">
                            <h4 className="text-[9px] font-semibold tracking-[0.15em] text-[#C9A96E] uppercase mb-2.5">{dict[lang].specTitle}</h4>
                            <div className="border border-[#0D0D0D]/10 rounded-none overflow-hidden mb-4">
                              <table className="w-full text-left border-collapse text-[11px]">
                                <thead>
                                  <tr className="bg-[#FAF9F6] border-b border-[#0D0D0D]/10 text-[#0D0D0D]/80 font-mono text-[9px] font-semibold uppercase tracking-wider">
                                    <th className="p-2 font-medium">{lang === 'zh' ? '類型 / 規格' : 'Type / Spec'}</th>
                                    <th className="p-2 font-medium text-center">{lang === 'zh' ? '數量' : 'Qty'}</th>
                                    <th className="p-2 font-medium text-right">{lang === 'zh' ? '單價' : 'Price'} (NT$)</th>
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
                                        <span className="text-[10px] text-[#0D0D0D]/70 mt-0.5 block">
                                          {lang === 'zh' 
                                            ? (booth.dimensions ? `尺寸: ${booth.dimensions}` : booth.note)
                                            : (booth.dimensions ? `Size: ${booth.dimensions}` : (booth.note === '近主入口處' ? 'Near main entrance' : (booth.note === '中段區域' ? 'Middle zone' : (booth.note === '距主入口處較遠' ? 'Farther zone' : booth.note))))
                                          }
                                        </span>
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
                            <h4 className="text-[9px] font-semibold tracking-[0.15em] text-[#C9A96E] uppercase mb-2.5">{dict[lang].includeTitle}</h4>
                            <ul className="text-[12px] text-[#0D0D0D]/90 space-y-1.5 mb-6 font-normal">
                              {getZoneIncludes(zone, lang).map((incl, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-[#C9A96E] text-[10px] mt-0.5">•</span>
                                  <span>{incl}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Note / Footer */}
                          <div className="bg-[#FAF9F6] p-3 border border-[#0D0D0D]/10 text-[11px] text-[#0D0D0D]/80 font-normal leading-relaxed mt-auto whitespace-pre-line">
                            <span className="font-semibold text-[#C9A96E] block mb-0.5 text-[8px] uppercase tracking-wider">{dict[lang].noteTitle}</span>
                            {getZoneNote(zone.id, lang)}
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
                      {dict[lang].preferenceTitle}
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">{dict[lang].preference1}</label>
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
                              const displayVal = `${zone.sectorLabel} ${lang === 'zh' ? zone.nameZh : zone.nameEn} — ${booth.code} (${booth.price.toLocaleString()})`;
                              return (
                                <option key={`${zone.id}-${idx}`} value={val}>
                                  {displayVal}
                                </option>
                              );
                            })
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">{dict[lang].preference2}</label>
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
                              const displayVal = `${zone.sectorLabel} ${lang === 'zh' ? zone.nameZh : zone.nameEn} — ${booth.code} (${booth.price.toLocaleString()})`;
                              return (
                                <option key={`${zone.id}-${idx}`} value={val}>
                                  {displayVal}
                                </option>
                              );
                            })
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase mb-2">{dict[lang].preference3}</label>
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
                              const displayVal = `${zone.sectorLabel} ${lang === 'zh' ? zone.nameZh : zone.nameEn} — ${booth.code} (${booth.price.toLocaleString()})`;
                              return (
                                <option key={`${zone.id}-${idx}`} value={val}>
                                  {displayVal}
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
                      <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/80 uppercase">{dict[lang].conceptTitle}</label>
                      <span className={`text-[10.5px] font-mono ${formData.concept_brief.length > 250 ? 'text-rose-500 font-bold' : 'text-neutral-500 font-medium'}`}>
                        {formData.concept_brief.length} / 250
                      </span>
                    </div>
                    <textarea 
                      name="concept_brief"
                      value={formData.concept_brief}
                      onChange={handleTextChange}
                      placeholder={dict[lang].conceptPlaceholder}
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
                  {dict[lang].step3} <span className="font-mono text-xs text-neutral-400 font-light ml-2">Deposit Submission</span>
                </h2>

                <div className="space-y-6">
                  <div className="bg-[#FAF9F6] border border-[#C9A96E]/20 p-5 rounded-lg">
                    <h3 className="text-xs font-semibold text-[#C9A96E] tracking-wider uppercase mb-3">{lang === 'zh' ? '大會指定匯款帳戶' : 'VIS Bank Account Details'}</h3>
                    <div className="text-xs text-[#0D0D0D]/80 space-y-2.5 font-mono">
                      <div>
                        <span className="text-[#0D0D0D]/75 block text-[10.5px] uppercase font-sans font-semibold tracking-wide">{dict[lang].depositAmountLabel}</span>
                        <span className="text-[#C9A96E] text-base font-bold">NT$ {DEPOSIT_AMOUNT.toLocaleString()} 元整</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6 border-t border-[#0D0D0D]/10 pt-4">
                        <div className="space-y-2">
                          <span className="text-[#C9A96E] text-xs font-semibold block uppercase tracking-wider">{dict[lang].remittanceDomestic}</span>
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
                          <span className="text-[#C9A96E] text-xs font-semibold block uppercase tracking-wider">{dict[lang].remittanceIntl}</span>
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
                        <p>{dict[lang].remittanceNote}</p>
                        <p className="text-rose-600 font-semibold">{dict[lang].remittanceTaxNote}</p>
                      </div>
                    </div>
                  </div>

                  {/* Upload Drop Zone */}
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-[#0D0D0D]/70 uppercase mb-2">{dict[lang].uploadTitle}</label>
                    
                    {!previewImage ? (
                      <div className="border-2 border-dashed border-[#C9A96E]/20 hover:border-[#C9A96E]/50 transition-colors rounded-lg p-8 bg-[#FAF9F6] text-center flex flex-col items-center justify-center cursor-pointer relative group">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="w-10 h-10 text-[#C9A96E]/60 group-hover:scale-105 transition-transform mb-3" />
                        <p className="text-xs font-semibold text-[#C9A96E] tracking-wider uppercase mb-1">{dict[lang].uploadText}</p>
                        <p className="text-[11px] text-[#0D0D0D]/70">{dict[lang].uploadSubtext}</p>
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
                  {dict[lang].verificationTitle}
                </h2>

                <div className="space-y-6">
                  {/* Info Table */}
                  <div className="bg-[#FAF9F6] border border-[#0D0D0D]/10 rounded-lg p-5 text-xs space-y-3 font-mono">
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">{dict[lang].brandVerify}</span>
                      <span className="col-span-2 font-medium text-[#0D0D0D]">{formData.brand_name_zh} ({formData.brand_name_en})</span>
                    </div>
                    {formData.company_name_zh && (
                      <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                        <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">{dict[lang].companyVerify}</span>
                        <span className="col-span-2 font-medium text-[#0D0D0D]">{formData.company_name_zh}</span>
                      </div>
                    )}
                    {formData.company_tax_id && (
                      <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                        <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">{dict[lang].taxIdVerify}</span>
                        <span className="col-span-2 font-medium text-[#0D0D0D] font-mono">{formData.company_tax_id}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">{dict[lang].contactVerify}</span>
                      <span className="col-span-2 font-medium text-[#0D0D0D]">{formData.contact_name}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">{dict[lang].emailVerify}</span>
                      <span className="col-span-2 font-medium text-[#0D0D0D]">{formData.contact_email}</span>
                    </div>
                    {formData.contact_phone && (
                      <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                        <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">{dict[lang].phoneVerify}</span>
                        <span className="col-span-2 font-medium text-[#0D0D0D]">{formData.contact_phone}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">{dict[lang].addressVerify}</span>
                      <span className="col-span-2 font-medium text-[#0D0D0D]">{formData.contact_address}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">{dict[lang].sectorVerify}</span>
                      <span className="col-span-2 font-medium text-[#C9A96E]">{selectedZone?.sectorLabel} — {lang === 'zh' ? selectedZone?.nameZh : selectedZone?.nameEn}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">{dict[lang].stallVerify}</span>
                      <div className="col-span-2 font-medium text-[#C9A96E] font-sans space-y-1">
                        <div>{lang === 'zh' ? '第一志願：' : '1st Pref: '}{formData.zone_preference_1}</div>
                        <div>{lang === 'zh' ? '第二志願：' : '2nd Pref: '}{formData.zone_preference_2}</div>
                        <div>{lang === 'zh' ? '第三志願：' : '3rd Pref: '}{formData.zone_preference_3}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">{dict[lang].priceVerify}</span>
                      <span className="col-span-2 font-semibold text-[#0D0D0D]">NT$ {selectedBooth?.price?.toLocaleString() || '—'} ({lang === 'zh' ? '不含稅' : 'exclusive of tax'})</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-[#0D0D0D]/10 pb-2">
                      <span className="text-[#0D0D0D]/75 font-sans font-medium tracking-wide">{dict[lang].depositVerify}</span>
                      <span className="col-span-2 font-semibold text-emerald-600 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> {dict[lang].depositPaidStatus}
                      </span>
                    </div>
                    <div className="pt-2">
                      <span className="text-[#0D0D0D]/75 block font-sans font-semibold tracking-wide mb-1">{dict[lang].conceptVerify}</span>
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
                        {dict[lang].term1}
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
                        {dict[lang].term2}
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
                  <ArrowLeft className="w-3.5 h-3.5" /> {dict[lang].prev}
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
                  {dict[lang].next} <ArrowRight className="w-3.5 h-3.5" />
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
                      {dict[lang].submitting}
                    </>
                  ) : (
                    <>
                      {dict[lang].submit}
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
