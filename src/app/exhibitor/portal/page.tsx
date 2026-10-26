'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { KEY_DATES, DEPOSIT_AMOUNT, ZONE_MAP, formatBoothDisplay, normalizeBoothCode, getBoothPrice } from '@/lib/exhibitorConstants';
import { motion } from 'framer-motion';
import { 
  Calendar, CreditCard, Award, ClipboardCheck, Users, 
  Image as ImageIcon, HelpCircle, Check, Clock, AlertTriangle,
  Building2, Copy, Mail, Lock, CheckCircle2, Upload, Eye, X, 
  FileText, Loader2
} from 'lucide-react';

function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(key);
    }
  } catch {
    // Ignore storage restriction errors
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

export default function ExhibitorDashboardPage({ brand: parentBrand }: { brand?: any }) {
  const [brand, setBrand] = useState<any>(() => {
    if (parentBrand) return parentBrand;
    const saved = safeGetStorage('vis_portal_brand_data');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [appData, setAppData] = useState<any>(() => {
    const saved = brand?.id ? safeGetStorage(`vis_portal_app_data_${brand.id}`) : null;
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    return !brand;
  });

  // Module completion status states
  const [complianceSigned, setComplianceSigned] = useState(false);
  const [vipCount, setVipCount] = useState(0);
  const [mediaCount, setMediaCount] = useState(0);
  const [qaCount, setQaCount] = useState(0);
  const [hasLogo, setHasLogo] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Payment proof states
  const [paymentProof, setPaymentProof] = useState<any>(() => {
    const saved = brand?.id ? safeGetStorage(`vis_portal_payment_proof_${brand.id}`) : null;
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofBase64, setProofBase64] = useState<string>('');
  const [lastFiveDigits, setLastFiveDigits] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [invoiceNote, setInvoiceNote] = useState<string>('');
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofSuccessMsg, setProofSuccessMsg] = useState('');
  const [proofErrorMsg, setProofErrorMsg] = useState('');

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setProofErrorMsg('檔案大小請勿超過 12MB');
      return;
    }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setProofBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand) return;
    if (!proofBase64 && !lastFiveDigits.trim()) {
      setProofErrorMsg('請至少上傳匯款單截圖或填寫匯款末五碼。');
      return;
    }

    setProofSubmitting(true);
    setProofErrorMsg('');
    setProofSuccessMsg('');

    try {
      const res = await fetch('/api/exhibitor/payment-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brand.id,
          email: brand.portal_email,
          receipt_base64: proofBase64,
          receipt_filename: proofFile?.name || 'remittance_slip.png',
          last_five_digits: lastFiveDigits.trim(),
          payment_date: paymentDate,
          amount: paymentAmount ? Number(paymentAmount) : undefined,
          note: invoiceNote.trim(),
        }),
      });

      const resJson = await res.json();
      if (!res.ok || resJson.error) {
        setProofErrorMsg(resJson.error || '提交失敗，請檢查網路連線。');
      } else {
        setPaymentProof(resJson.proof);
        safeSetStorage(`vis_portal_payment_proof_${brand.id}`, JSON.stringify(resJson.proof));
        setProofSuccessMsg('✓ 匯款水單已成功送出！大會財務組將進行核帳查對。');
        setTimeout(() => {
          setShowProofModal(false);
          setProofSuccessMsg('');
          setProofFile(null);
          setProofBase64('');
        }, 1500);
      }
    } catch (err: any) {
      setProofErrorMsg(`連線異常 (${err.message})，請檢查網路。`);
    } finally {
      setProofSubmitting(false);
    }
  };

  // Email binding state
  const isTemporaryEmail = Boolean(brand?.portal_email?.endsWith('@visforthearts.com'));
  const [showEmailBinding, setShowEmailBinding] = useState(false);
  const [bindingEmail, setBindingEmail] = useState('');
  const [bindingPassword, setBindingPassword] = useState('');
  const [bindingSubmitting, setBindingSubmitting] = useState(false);
  const [bindingSuccessMsg, setBindingSuccessMsg] = useState('');
  const [bindingErrorMsg, setBindingErrorMsg] = useState('');

  const handleBindEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindingEmail.trim() || !brand) return;

    setBindingSubmitting(true);
    setBindingErrorMsg('');
    setBindingSuccessMsg('');

    try {
      const res = await fetch('/api/exhibitor/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brand.id,
          new_email: bindingEmail.trim(),
          new_password: bindingPassword.trim() || undefined,
        }),
      });

      const resJson = await res.json();
      if (!res.ok || resJson.error) {
        setBindingErrorMsg(resJson.error || '綁定失敗，請稍候再試');
      } else {
        const updatedBrand = { ...brand, portal_email: resJson.portal_email };
        setBrand(updatedBrand);
        safeSetStorage('vis_portal_brand_data', JSON.stringify(updatedBrand));
        setBindingSuccessMsg(`✓ 電子信箱已成功綁定為：${resJson.portal_email}！未來您可直接以此信箱登入後台。`);
        setBindingEmail('');
        setBindingPassword('');
      }
    } catch (err: any) {
      setBindingErrorMsg(`連線異常 (${err.message})，請檢查網路連線。`);
    } finally {
      setBindingSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        let currentBrand = null;

        // Fetch brand from current session to ensure we have the absolute latest data from DB
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          const email = session.user.email.toLowerCase().trim();
          const { data } = await supabase
            .from('exhibitor_brands')
            .select('*')
            .eq('portal_email', email)
            .maybeSingle();
          currentBrand = data;

          // If exhibitor_brands has no row yet, fallback to exhibitor_applications
          if (!currentBrand) {
            const { data: approvedApp } = await supabase
              .from('exhibitor_applications')
              .select('*')
              .eq('contact_email', email)
              .eq('status', 'approved')
              .maybeSingle();

            if (approvedApp) {
              currentBrand = {
                id: approvedApp.id,
                application_id: approvedApp.id,
                brand_name_zh: approvedApp.brand_name_zh,
                brand_name_en: approvedApp.brand_name_en || approvedApp.brand_name_zh,
                zone_id: approvedApp.zone_id,
                booth_type: approvedApp.booth_type,
                is_micro_exposure: approvedApp.booth_type === 'T',
                portal_email: email,
                created_at: approvedApp.created_at,
                custom_fee: approvedApp.custom_fee ?? null,
                discount_note: approvedApp.discount_note ?? null,
                _fallback: true,
              };
            }
          }
        }

        // Fallback to cached state if session fetch fails (e.g. offline)
        if (!currentBrand) {
          currentBrand = brand;
        }

        if (currentBrand) {
          setBrand(currentBrand);
          safeSetStorage('vis_portal_brand_data', JSON.stringify(currentBrand));

          // Fetch all sub-module data in parallel to resolve waterfall
          const appPromise = currentBrand.application_id
            ? supabase
                .from('exhibitor_applications')
                .select('*')
                .eq('id', currentBrand.application_id)
                .maybeSingle()
                .then(res => res.data)
            : Promise.resolve(null);

          const compliancePromise = supabase
            .from('exhibitor_compliance')
            .select('*')
            .eq('brand_id', currentBrand.id)
            .maybeSingle()
            .then(res => res.data);

          const vipPromise = supabase
            .from('exhibitor_vip_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('brand_id', currentBrand.id)
            .then(res => res.count || 0);

          const mediaPromise = supabase
            .from('exhibitor_media_assets')
            .select('*', { count: 'exact', head: true })
            .eq('brand_id', currentBrand.id)
            .neq('file_type', 'pr_qa_submission')
            .neq('file_type', 'brand_logo_transparent')
            .then(res => res.count || 0);

          const logoPromise = supabase
            .from('exhibitor_media_assets')
            .select('id')
            .eq('brand_id', currentBrand.id)
            .eq('file_type', 'brand_logo_transparent')
            .maybeSingle()
            .then(res => !!res.data?.id);

          const qaPromise = supabase
            .from('exhibitor_media_assets')
            .select('file_url')
            .eq('brand_id', currentBrand.id)
            .eq('file_type', 'pr_qa_submission')
            .maybeSingle()
            .then(res => {
              if (res.data?.file_url) {
                try {
                  const parsed = JSON.parse(res.data.file_url);
                  let filled = 0;
                  ['q1', 'q2', 'q3', 'q4', 'q5'].forEach(k => {
                    if ((parsed[k] || '').trim().length > 0) filled += 1;
                  });
                  return filled;
                } catch { return 0; }
              }
              return 0;
            });

          const proofPromise = fetch(`/api/exhibitor/payment-proof?brand_id=${currentBrand.id}&email=${encodeURIComponent(currentBrand.portal_email || '')}`)
            .then(res => res.json())
            .then(res => res.proof || null)
            .catch(() => null);

          const [app, compliance, vipC, mediaC, qCount, hasLogoResult, proofData] = await Promise.all([
            appPromise,
            compliancePromise,
            vipPromise,
            mediaPromise,
            qaPromise,
            logoPromise,
            proofPromise
          ]);

          if (app) {
            setAppData(app);
            safeSetStorage(`vis_portal_app_data_${currentBrand.id}`, JSON.stringify(app));
          }
          if (proofData) {
            setPaymentProof(proofData);
            safeSetStorage(`vis_portal_payment_proof_${currentBrand.id}`, JSON.stringify(proofData));
          }
          setComplianceSigned(!!compliance);
          setVipCount(vipC);
          setMediaCount(mediaC);
          setQaCount(qCount);
          setHasLogo(hasLogoResult);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [parentBrand]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#DFBA87]">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-r-transparent border-[#DFBA87] rounded-full animate-spin mx-auto"></div>
          <p className="text-[10px] tracking-widest uppercase opacity-75">載入資訊中...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="text-center max-w-md mx-auto py-12">
        <AlertTriangle className="w-8 h-8 text-[#DFBA87] mx-auto mb-4" />
        <p className="text-sm font-light text-neutral-400">無法載入參展品牌資料，請重新登入或聯絡主辦單位。</p>
      </div>
    );
  }

  // Get zone/booth price
  const normalizedCode = normalizeBoothCode(brand.booth_type, brand.zone_id);
  const zone = ZONE_MAP[brand.zone_id as 'artsy' | 'premier' | 'atelier'];
  const boothInfo = zone?.booths.find(b => 
    b.code === brand.booth_type || 
    b.code === normalizedCode ||
    (normalizedCode && b.code.includes(normalizedCode))
  );
  const boothPrice = boothInfo?.price || getBoothPrice(brand.booth_type, brand.zone_id);

  // Check if brand has an approved custom fee or discount
  const rawCustomFee = brand.custom_fee ?? (appData as any)?.custom_fee;
  const discountNote = brand.discount_note || (appData as any)?.discount_note;
  const isCustomFeeSet = rawCustomFee !== null && rawCustomFee !== undefined && rawCustomFee !== '';
  const finalPayablePrice = isCustomFeeSet ? Number(rawCustomFee) : boothPrice;
  const hasDiscount = isCustomFeeSet && finalPayablePrice < boothPrice;

  // Determine current active timeline phase
  const getTimelineStatus = (dateItem: any) => {
    if (dateItem.statusOverride === 'completed') {
      return { label: '已完成 Completed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    }
    if (dateItem.statusOverride === 'active') {
      const today = new Date();
      const targetDate = dateItem.targetIso ? new Date(dateItem.targetIso) : new Date(dateItem.dateStr.replace(/\//g, '-'));
      const diffTime = Math.max(0, targetDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { 
        label: `進行中 Active (${diffDays > 0 ? `${diffDays}天後` : '即刻截止'})`, 
        color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
        active: true
      };
    }
    if (dateItem.statusOverride === 'pending') {
      return { label: '待辦中 Pending', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    }

    const today = new Date();
    const rawStr = dateItem.targetIso || dateItem.dateStr;
    const cleanStr = rawStr.replace(/[^0-9\/\-:]/g, ' ').trim().split(' ')[0];
    const targetDate = new Date(cleanStr.replace(/\//g, '-'));
    
    if (isNaN(targetDate.getTime())) {
      return { label: '待辦中 Pending', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    }

    // Reset hours for comparison
    today.setHours(0,0,0,0);
    targetDate.setHours(0,0,0,0);

    if (today > targetDate) {
      return { label: '已完成 Completed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    }
    
    return { label: '待辦中 Pending', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  };

  // Calculate overall modules progress
  const isMicro = brand.is_micro_exposure || brand.booth_type === 'T';
  const getProgress = () => {
    let completed = 1; // Module A is dynamic checklist, auto done
    const total = isMicro ? 2 : 4; // micro brand only does A & B

    if (complianceSigned) completed += 1;
    if (!isMicro) {
      if (vipCount > 0) completed += 1;
      if (mediaCount >= 3 && qaCount === 5 && hasLogo) completed += 1;
      else if (mediaCount >= 3 || qaCount > 0 || hasLogo) completed += 0.5;
    }

    return {
      percentage: Math.round((completed / total) * 100),
      completed,
      total
    };
  };

  const progress = getProgress();

  return (
    <div className="space-y-8 font-sans-outfit">
      
      {/* Welcome & Dashboard Banner */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif-garamond text-white tracking-wider">
            歡迎回到 {brand.brand_name_zh} 專屬協作中心
          </h1>
          <p className="text-xs text-neutral-400 font-light tracking-wide mt-1">
            大會數位協作服務平台已為您開啟。此處是您在 2027 VIS 策展與行政事務的中樞。
          </p>
        </div>
        <div className="text-xs bg-white/5 border border-white/10 px-4 py-2.5 rounded font-mono flex items-center gap-2 text-[#DFBA87]">
          <Award className="w-4 h-4" />
          <span>展位: {formatBoothDisplay(brand.booth_type, brand.zone_id)} ({zone?.nameZh || '大會特展'})</span>
        </div>
      </div>

      {/* Email Binding Banner */}
      <div className={`p-5 rounded-xl border transition-all ${
        isTemporaryEmail 
          ? 'bg-gradient-to-r from-amber-500/10 via-[#C9A96E]/10 to-transparent border-[#DFBA87]/30 shadow-lg' 
          : 'bg-white/[0.02] border-white/5'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isTemporaryEmail ? 'bg-[#DFBA87]/20 text-[#DFBA87]' : 'bg-white/5 text-neutral-400'
            }`}>
              <Mail className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-white">
                  {isTemporaryEmail ? '填入您的個人/公司常用電子信箱' : '參展商聯絡與登入信箱'}
                </h3>
                {isTemporaryEmail && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                    建議綁定
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 font-light leading-relaxed max-w-xl">
                {isTemporaryEmail 
                  ? `目前使用的是大會為您預設的專屬臨時帳號（${brand.portal_email}）。請在下方輸入您的常用 Email 即可完成綁定，未來可直接使用個人信箱登入後台並接收重要展務通知！`
                  : `目前綁定之聯絡與登入信箱：${brand.portal_email}`}
              </p>
            </div>
          </div>

          {!isTemporaryEmail && !showEmailBinding && (
            <button
              type="button"
              onClick={() => setShowEmailBinding(true)}
              className="text-xs text-[#DFBA87] hover:text-white border border-[#DFBA87]/30 hover:border-[#DFBA87] px-3.5 py-1.5 rounded transition-all whitespace-nowrap self-start sm:self-auto font-medium cursor-pointer"
            >
              更換綁定信箱
            </button>
          )}
        </div>

        {bindingSuccessMsg && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{bindingSuccessMsg}</span>
          </div>
        )}

        {(isTemporaryEmail || showEmailBinding) && (
          <form onSubmit={handleBindEmailSubmit} className="mt-4 pt-4 border-t border-white/5 space-y-3">
            {bindingErrorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{bindingErrorMsg}</span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] text-neutral-300 font-medium">
                  您的正式電子信箱 OFFICIAL EMAIL *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={bindingEmail}
                    onChange={(e) => setBindingEmail(e.target.value)}
                    placeholder="請輸入常用信箱（如 name@gmail.com）"
                    className="w-full text-xs bg-white/5 border border-white/10 focus:border-[#DFBA87] rounded-lg pl-9 pr-3 py-2.5 outline-none text-white transition-all placeholder:text-neutral-500 font-mono"
                  />
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] text-neutral-300 font-medium">
                  自訂登入密碼 PASSWORD (選填，至少 6 碼)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={bindingPassword}
                    onChange={(e) => setBindingPassword(e.target.value)}
                    placeholder="留空則沿用現有密碼"
                    minLength={6}
                    className="w-full text-xs bg-white/5 border border-white/10 focus:border-[#DFBA87] rounded-lg pl-9 pr-3 py-2.5 outline-none text-white transition-all placeholder:text-neutral-500 font-mono"
                  />
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={bindingSubmitting || !bindingEmail.trim()}
                className="bg-[#C9A96E] hover:bg-[#B39359] disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs px-4 py-2 rounded-lg font-semibold tracking-wider transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-[#C9A96E]/20"
              >
                {bindingSubmitting ? '更新綁定中...' : '確認綁定並更新信箱 Bind Email'}
              </button>
              {!isTemporaryEmail && (
                <button
                  type="button"
                  onClick={() => setShowEmailBinding(false)}
                  className="text-xs text-neutral-500 hover:text-white px-3 py-2 cursor-pointer"
                >
                  取消
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Progress Bar Card */}
      <div className="bg-[#111111] border border-white/5 p-6 rounded-xl relative overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#DFBA87]" />
            <span className="text-sm font-semibold tracking-wider text-white">協作任務完成進度</span>
          </div>
          <span className="font-mono text-sm font-bold text-[#DFBA87]">{progress.percentage}%</span>
        </div>
        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-4">
          <div 
            className="bg-[#C9A96E] h-full transition-all duration-700 ease-out"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
        
        {/* Module Sub checklist status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-light text-neutral-400">
          <div className="flex items-center gap-2 bg-white/5 p-2.5 rounded border border-white/5">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>模組 A：財務管理 (已開通)</span>
          </div>
          <div className={`flex items-center gap-2 p-2.5 rounded border ${complianceSigned ? 'bg-white/5 border-white/5 text-neutral-300' : 'bg-transparent border-dashed border-amber-500/20 text-neutral-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${complianceSigned ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>模組 B：規範同意 {complianceSigned ? '(已完成)' : '(待辦)'}</span>
          </div>
          {!isMicro ? (
            <>
              <div className={`flex items-center gap-2 p-2.5 rounded border ${vipCount > 0 ? 'bg-white/5 border-white/5 text-neutral-300' : 'bg-transparent border-dashed border-amber-500/20 text-neutral-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${vipCount > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>模組 C：專屬貴賓禮遇 ({vipCount}位)</span>
              </div>
              <div className={`flex items-center gap-2 p-2.5 rounded border ${(mediaCount >= 3 || qaCount > 0 || hasLogo) ? 'bg-white/5 border-white/5 text-neutral-300' : 'bg-transparent border-dashed border-amber-500/20 text-neutral-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${(mediaCount >= 3 && qaCount === 5 && hasLogo) ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>模組 D：媒體公關 ({hasLogo ? 'Logo✓' : 'Logo未傳'}・{mediaCount}/5張圖・回稿 {qaCount}/5題)</span>
              </div>
            </>
          ) : (
            <div className="col-span-2 flex items-center justify-center p-2.5 border border-dashed border-white/5 rounded text-[10px] text-neutral-600 tracking-wider">
              * 微型曝光品牌 (T區) 不適用模組 C 與 D 之專屬禮遇
            </div>
          )}
        </div>

        {/* Module G Notice Banner */}
        <div className="mt-4 pt-3.5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-lg border border-white/5">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#DFBA87] animate-pulse shrink-0" />
            <div className="text-xs">
              <span className="text-[#DFBA87] font-semibold mr-1.5">【模組 G 新上線】公眾專屬觀展預約連結：</span>
              <span className="text-neutral-300 font-light">提供一般民眾與社群粉絲免費預約門票，現場強制出示追蹤貴品牌 IG，無限額廣泛導客！</span>
            </div>
          </div>
          <Link
            href="/exhibitor/portal/tickets"
            className="text-xs text-[#DFBA87] hover:text-white underline underline-offset-4 flex items-center gap-1 font-medium shrink-0"
          >
            取得專屬連結 →
          </Link>
        </div>
      </div>

      {/* Date Kanban Timeline */}
      <div>
        <h2 className="text-sm font-semibold tracking-widest text-[#DFBA87] uppercase mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> 重要日程看板 Timeline Kanban
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KEY_DATES.map((date, idx) => {
            const status = getTimelineStatus(date);
            return (
              <div 
                key={idx}
                className="bg-[#111111] border border-white/5 rounded-xl p-5 hover:border-[#C9A96E]/20 transition-all"
              >
                <div className="text-[10px] font-mono font-semibold text-neutral-500 uppercase">大會日程 STAGE {idx + 1}</div>
                <div className="text-base font-bold text-white font-mono mt-1">{date.dateStr}</div>
                <div className="text-xs text-neutral-300 font-light mt-1.5">{date.labelZh}</div>
                <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-light mt-0.5">{date.labelEn}</div>
                {date.noteZh && (
                  <div className="text-[10px] text-[#DFBA87] mt-2 font-mono">{date.noteZh}</div>
                )}
                
                <div className={`mt-4 inline-block text-[9px] font-semibold tracking-wider px-2 py-1 rounded border uppercase ${status.color}`}>
                  {status.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Status Section */}
      <div>
        <h2 className="text-sm font-semibold tracking-widest text-[#DFBA87] uppercase mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4" /> 參展財務概況 Financial Ledger
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Deposit Card */}
          <div className="bg-[#111111] border border-white/5 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase">項目 ITEM</span>
                  <h3 className="text-base text-white font-medium mt-0.5">參展履約保證金</h3>
                </div>
                <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded uppercase font-semibold">
                  已確認 Received
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#DFBA87] mb-2">
                NT$ {DEPOSIT_AMOUNT.toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                您的保證金匯款憑證已被大會秘書處核對確認。參展保證金主要是為了確保展場設施及場地於佈撤展期間受到妥善維護。展覽結束並完成撤場後，經大會確認場地及設施完整還原、無損壞情形，即會全額退還保證金，可以放心！
              </p>

              <div className="mt-4 text-xs text-neutral-400 bg-black/40 border border-white/5 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between text-neutral-300">
                  <span className="text-[11px] text-neutral-500">已繳付至大會帳戶：</span>
                  <span className="font-mono text-neutral-200">808 玉山銀行 / 0912940021772</span>
                </div>
                <div className="text-[10.5px] text-neutral-500 leading-relaxed">
                  戶名：泰德文化創意社（活動結束場地設施點交完整無損後，全額無息退還至原帳戶）
                </div>
              </div>
            </div>
            <div className="border-t border-white/5 pt-4 mt-6 text-[10px] text-neutral-500 italic">
              * 展覽結束並完成撤場後，經大會確認場地及設施完整還原無損，保證金將於 14 個工作天內全額無息退還至原帳戶。
            </div>
          </div>

          {/* Booth Fee Card */}
          <div className="bg-[#111111] border border-white/5 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase">項目 ITEM</span>
                  <h3 className="text-base text-white font-medium mt-0.5">展位費款項 (尾款)</h3>
                </div>
                {paymentProof?.status === 'verified' ? (
                  <span className="text-xs bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 px-2.5 py-1 rounded font-semibold flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>已核帳結清 Paid</span>
                  </span>
                ) : paymentProof ? (
                  <span className="text-xs bg-amber-500/15 border border-amber-500/35 text-amber-300 px-2.5 py-1 rounded font-semibold flex items-center gap-1.5 shadow-sm">
                    <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                    <span>水單已提交·對帳中 Verifying</span>
                  </span>
                ) : (
                  <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded uppercase font-semibold">
                    待繳付 Pending Payment
                  </span>
                )}
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <div className="text-2xl font-bold font-mono text-[#DFBA87]">
                    NT$ {finalPayablePrice.toLocaleString()}
                  </div>
                  <span className="text-[10.5px] text-amber-300/90 font-sans border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">
                    未稅 (款項皆不含稅)
                  </span>
                  {hasDiscount && (
                    <span className="text-xs text-neutral-500 line-through font-mono">
                      原牌價 NT$ {boothPrice.toLocaleString()}
                    </span>
                  )}
                  {isCustomFeeSet && (
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-medium">
                      {hasDiscount ? '專案特惠價 Special Rate' : '大會核定金額 Approved'}
                    </span>
                  )}
                </div>
                {discountNote && (
                  <div className="mt-2 text-xs text-[#DFBA87] bg-[#DFBA87]/10 border border-[#DFBA87]/20 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
                    <span className="font-semibold text-neutral-300">優惠備註：</span>
                    <span>{discountNote}</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                展位規格為 <strong className="text-[#DFBA87]">{formatBoothDisplay(brand.booth_type, brand.zone_id)}</strong>。尾款請於大會指定截止日前完成匯付，並提供水單以利大會核帳。
              </p>

              {/* 匯款帳號資訊區塊 */}
              <div className="mt-4 bg-[#181818] border border-[#DFBA87]/30 rounded-lg p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-semibold text-[#DFBA87] tracking-wide flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#DFBA87]" />
                    大會指定匯款帳號（同保證金帳戶）
                  </span>
                  <span className="text-[10px] text-neutral-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded font-mono">
                    玉山銀行 808
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-[11px] text-neutral-400">銀行 / 分行：</span>
                    <span className="font-medium text-white font-mono">808 玉山銀行 中崙分行</span>
                  </div>

                  <div className="flex items-center justify-between bg-black/60 rounded px-3 py-2 border border-[#DFBA87]/25">
                    <div>
                      <span className="text-[10px] text-neutral-400 block font-sans">匯款帳號 ACCOUNT NUMBER</span>
                      <span className="font-mono text-base font-bold text-[#DFBA87] tracking-wider select-all">
                        0912940021772
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('0912940021772')}
                      className="inline-flex items-center gap-1.5 text-xs text-neutral-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1 rounded transition active:scale-95"
                    >
                      {copiedAccount ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">已複製</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-[#DFBA87]" />
                          <span>複製帳號</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-start justify-between text-neutral-300 pt-0.5">
                    <span className="text-[11px] text-neutral-400 flex-shrink-0">帳戶戶名：</span>
                    <span className="font-medium text-white text-right leading-snug">
                      泰德文化創意社 <br />
                      <span className="text-[10px] text-neutral-400 font-light">
                        (或 泰德文化創意社郭芝妘，視各家銀行系統規定)
                      </span>
                    </span>
                  </div>
                </div>

                {/* 國際匯款折疊 */}
                <details className="text-[11px] text-neutral-400 group pt-1 border-t border-white/5">
                  <summary className="cursor-pointer text-[#DFBA87]/80 hover:text-[#DFBA87] transition flex items-center justify-between select-none py-0.5">
                    <span>國外匯款資訊 (International Wire)</span>
                    <span className="text-[9px] text-neutral-500 group-open:rotate-180 transition">▼</span>
                  </summary>
                  <div className="mt-1.5 p-2.5 bg-black/40 rounded border border-white/5 font-mono text-[10.5px] space-y-0.5 text-neutral-300">
                    <div><span className="text-neutral-500">SWIFT:</span> ESUNTWTP</div>
                    <div><span className="text-neutral-500">BENEFICIARY:</span> ART PRESS and Life Co.</div>
                    <div><span className="text-neutral-500">BRANCH:</span> E.Sun Bank / Zhonglun Branch</div>
                    <div><span className="text-neutral-500">ACCOUNT:</span> 0912940021772</div>
                  </div>
                </details>

                <div className="border-t border-white/10 pt-3 text-[11px] space-y-2.5">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 text-amber-200/95 leading-relaxed space-y-1">
                    <div className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs">
                      <span>🧾</span>
                      <span>發票開立說明（全展款項皆不含稅）：</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 font-light leading-relaxed pl-5">
                      本展各項款項<strong>皆不含稅</strong>。若貴品牌需要開立公司發票，請於 <strong className="text-[#DFBA87]">12/20 前</strong> 提出申請並提供公司發票抬頭與統一編號（可透過大會官方 LINE：<span className="text-[#DFBA87] font-mono">@vis_culture</span> 提供），以利相關部門進行準備；<strong>實體發票將於進場當天統一提供</strong>。
                    </p>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      INTERACTIVE REMITTANCE PROOF & REPORTING COMPONENT
                  ───────────────────────────────────────────────────────────── */}
                  <div className="pt-2">
                    {paymentProof ? (
                      <div className="bg-black/60 border border-[#DFBA87]/40 rounded-xl p-4 space-y-3 shadow-lg">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                          <span className="text-xs font-semibold text-[#DFBA87] flex items-center gap-1.5">
                            {paymentProof.status === 'verified' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                            )}
                            <span>{paymentProof.status === 'verified' ? '大會已確認核訖 (款項入帳完成)' : '已提交水單憑證 (大會財務對帳中)'}</span>
                          </span>
                          <span className="text-[10.5px] font-mono text-neutral-400">
                            {paymentProof.submitted_at?.split('T')[0] || paymentProof.created_at?.split('T')[0]}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-[#141414] rounded-lg p-3 text-xs border border-white/5">
                          <div>
                            <span className="text-[10px] text-neutral-500 block">匯款末五碼</span>
                            <span className="font-mono text-sm font-bold text-white tracking-wider">
                              {paymentProof.last_five_digits || '以水單為準'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-500 block">匯付金額</span>
                            <span className="font-mono text-sm font-bold text-[#DFBA87]">
                              {paymentProof.amount ? `NT$ ${paymentProof.amount.toLocaleString()}` : `NT$ ${finalPayablePrice.toLocaleString()}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-500 block">匯款日期</span>
                            <span className="font-mono text-xs text-neutral-300 block mt-0.5">
                              {paymentProof.payment_date || '-'}
                            </span>
                          </div>
                        </div>

                        {paymentProof.note && (
                          <div className="text-[11px] text-neutral-300 bg-black/40 border border-white/5 rounded-md p-2.5">
                            <span className="text-neutral-500">發票抬頭統編／備註：</span>
                            <span className="text-white ml-1 font-mono">{paymentProof.note}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          {paymentProof.receipt_url && (
                            <button
                              type="button"
                              onClick={() => setProofPreviewUrl(paymentProof.receipt_url)}
                              className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white border border-white/15 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#DFBA87]" />
                              <span>檢視已上傳水單</span>
                            </button>
                          )}
                          {paymentProof.status !== 'verified' && (
                            <button
                              type="button"
                              onClick={() => {
                                setLastFiveDigits(paymentProof.last_five_digits || '');
                                setPaymentDate(paymentProof.payment_date || new Date().toISOString().split('T')[0]);
                                setPaymentAmount(paymentProof.amount ? String(paymentProof.amount) : String(finalPayablePrice));
                                setInvoiceNote(paymentProof.note || '');
                                setShowProofModal(true);
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-[#DFBA87]/15 hover:bg-[#DFBA87]/25 text-xs text-[#DFBA87] border border-[#DFBA87]/35 transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>重新上傳／更正憑證</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-black/50 border border-dashed border-[#DFBA87]/40 rounded-xl p-4 space-y-3 shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <Upload className="w-4 h-4 text-[#DFBA87]" />
                            <span>線上提交匯款水單／截圖回報</span>
                          </span>
                          <span className="text-[10.5px] text-amber-300 font-mono">支援圖片 / PDF</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                          完成匯付後，可直接在此上傳銀行水單照片或網銀轉帳成功截圖，並填寫末五碼與發票需求。送出後大會財務組將即時進行對帳核驗。
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentAmount(String(finalPayablePrice));
                            setShowProofModal(true);
                          }}
                          className="w-full py-2.5 px-4 rounded-lg bg-[#DFBA87] hover:bg-[#cf9e5e] text-[#14120E] font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-[#DFBA87]/15 cursor-pointer active:scale-98"
                        >
                          <Upload className="w-4 h-4" />
                          <span>上傳匯款水單／截圖回報 SUBMIT PROOF</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-white/5 pt-4 mt-6 text-[10px] text-neutral-500 italic">
              * 展位費繳清截止日為 2026/10/27，逾期未付清將視同無故退出展位。
            </div>
          </div>
        </div>

        {/* Refund Clauses Text Area */}
        <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 mt-6 flex gap-3 text-xs leading-relaxed text-amber-200/80 font-light">
          <HelpCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p>
            <strong className="text-amber-400 block font-semibold mb-0.5">場地維護保障與保證金退款說明</strong>
            參展保證金主要是為了確保展場設施及古蹟場地於佈撤展期間受到妥善維護。展覽結束並完成撤場後，經大會確認場地及設施完整還原、無損壞情形，即會全額退還保證金，可以放心！若因特殊因素需更動展位或參展規程，大會將依參展手冊及相關規程竭誠協助品牌辦理。
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: UPLOAD REMITTANCE PROOF MODAL
      ───────────────────────────────────────────────────────────── */}
      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative max-w-lg w-full bg-[#161514] border border-[#DFBA87]/50 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl text-white my-8">
            <button
              type="button"
              onClick={() => {
                setShowProofModal(false);
                setProofErrorMsg('');
                setProofSuccessMsg('');
              }}
              className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-mono tracking-[0.2em] text-[#DFBA87] uppercase font-bold">
                REMITTANCE PROOF
              </span>
              <h3 className="text-lg font-serif text-white font-medium mt-0.5">
                提交展位款項（尾款）匯款憑證
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                請上傳轉帳明細截圖、匯款水單或拍照憑證，以利大會財務組查對核帳。
              </p>
            </div>

            {proofErrorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-lg text-xs leading-relaxed">
                {proofErrorMsg}
              </div>
            )}

            {proofSuccessMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-3 rounded-lg text-xs leading-relaxed flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{proofSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleProofSubmit} className="space-y-4">
              
              {/* File Dropzone / Picker */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  匯款水單／轉帳截圖檔案 (Image or PDF)
                </label>
                
                {proofBase64 ? (
                  <div className="relative rounded-xl border border-[#DFBA87]/40 bg-black/50 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {proofBase64.startsWith('data:image') ? (
                        <img 
                          src={proofBase64} 
                          alt="憑證預覽" 
                          className="w-14 h-14 object-cover rounded-lg border border-white/10 flex-shrink-0" 
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-[#DFBA87]">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <div className="text-xs overflow-hidden">
                        <div className="font-medium text-white truncate">{proofFile?.name || 'remittance_slip.png'}</div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">已載入待送出</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProofFile(null);
                        setProofBase64('');
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-white/5 transition text-xs"
                      title="移除檔案重新選擇"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/20 hover:border-[#DFBA87]/60 rounded-xl cursor-pointer bg-black/30 hover:bg-black/50 transition">
                    <Upload className="w-8 h-8 text-[#DFBA87] mb-2" />
                    <span className="text-xs font-medium text-white">點擊選擇檔案 或 拖曳至此</span>
                    <span className="text-[10.5px] text-neutral-400 mt-1">支援 JPG、PNG、WEBP、PDF (最大 12MB)</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleProofFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Form inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">
                    匯款帳號末五碼 <span className="text-[#DFBA87]">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={lastFiveDigits}
                    onChange={(e) => setLastFiveDigits(e.target.value)}
                    placeholder="例如：56789"
                    className="w-full px-3 py-2 bg-black/50 border border-white/15 focus:border-[#DFBA87] rounded-lg text-sm text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">
                    匯款日期 <span className="text-[#DFBA87]">*</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-black/50 border border-white/15 focus:border-[#DFBA87] rounded-lg text-sm text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">
                  匯付金額 (NT$)
                </label>
                <input
                  type="number"
                  value={paymentAmount || String(finalPayablePrice)}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-white/15 focus:border-[#DFBA87] rounded-lg text-sm text-[#DFBA87] font-mono font-semibold focus:outline-none"
                />
                <span className="text-[10.5px] text-neutral-500 mt-0.5 block">預設帶入本展位應繳金額</span>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">
                  發票開立需求／備註說明 (選填)
                </label>
                <textarea
                  rows={2}
                  value={invoiceNote}
                  onChange={(e) => setInvoiceNote(e.target.value)}
                  placeholder="若需開立三聯式發票，請填寫：公司發票抬頭、統一編號（需加計 5% 營業稅）"
                  className="w-full px-3 py-2 bg-black/50 border border-white/15 focus:border-[#DFBA87] rounded-lg text-xs text-white focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowProofModal(false)}
                  className="px-4 py-2 rounded-lg text-xs text-neutral-400 hover:text-white transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={proofSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-[#DFBA87] hover:bg-[#cf9e5e] text-[#14120E] font-bold text-xs transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {proofSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>處理中...</span>
                    </>
                  ) : (
                    <span>確認提交水單憑證</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: FULLSCREEN RECEIPT PREVIEW LIGHTBOX
      ───────────────────────────────────────────────────────────── */}
      {proofPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setProofPreviewUrl(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-[#DFBA87] transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="bg-[#141414] border border-[#DFBA87]/40 rounded-2xl overflow-hidden shadow-2xl p-2 max-h-[85vh] overflow-y-auto w-full flex justify-center">
              {proofPreviewUrl.startsWith('data:application/pdf') ? (
                <iframe src={proofPreviewUrl} className="w-full h-[70vh] rounded" title="PDF 水單" />
              ) : (
                <img 
                  src={proofPreviewUrl} 
                  alt="匯款水單" 
                  className="max-h-[80vh] w-auto object-contain rounded-lg shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
