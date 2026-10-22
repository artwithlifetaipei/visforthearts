'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { KEY_DATES, DEPOSIT_AMOUNT, ZONE_MAP, formatBoothDisplay, normalizeBoothCode, getBoothPrice } from '@/lib/exhibitorConstants';
import { motion } from 'framer-motion';
import { 
  Calendar, CreditCard, Award, ClipboardCheck, Users, 
  Image as ImageIcon, HelpCircle, Check, Clock, AlertTriangle,
  Building2, Copy 
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
  const [copiedAccount, setCopiedAccount] = useState(false);

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
            .then(res => res.count || 0);

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

          const [app, compliance, vipC, mediaC, qCount] = await Promise.all([
            appPromise,
            compliancePromise,
            vipPromise,
            mediaPromise,
            qaPromise
          ]);

          if (app) {
            setAppData(app);
            safeSetStorage(`vis_portal_app_data_${currentBrand.id}`, JSON.stringify(app));
          }
          setComplianceSigned(!!compliance);
          setVipCount(vipC);
          setMediaCount(mediaC);
          setQaCount(qCount);
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
      if (mediaCount >= 3 && qaCount === 5) completed += 1;
      else if (mediaCount >= 3 || qaCount > 0) completed += 0.5;
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
              <div className={`flex items-center gap-2 p-2.5 rounded border ${(mediaCount >= 3 || qaCount > 0) ? 'bg-white/5 border-white/5 text-neutral-300' : 'bg-transparent border-dashed border-amber-500/20 text-neutral-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${(mediaCount >= 3 && qaCount === 5) ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>模組 D：媒體公關 ({mediaCount}/5張圖・回稿 {qaCount}/5題)</span>
              </div>
            </>
          ) : (
            <div className="col-span-2 flex items-center justify-center p-2.5 border border-dashed border-white/5 rounded text-[10px] text-neutral-600 tracking-wider">
              * 微型曝光品牌 (T區) 不適用模組 C 與 D 之專屬禮遇
            </div>
          )}
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
                <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded uppercase font-semibold">
                  待確認 Verifying
                </span>
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <div className="text-2xl font-bold font-mono text-[#DFBA87]">
                    NT$ {finalPayablePrice.toLocaleString()}
                  </div>
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
                展位規格為 <strong className="text-[#DFBA87]">{formatBoothDisplay(brand.booth_type, brand.zone_id)}</strong>。尾款請於大會指定截止日前完成匯付，並提供水單以開立電子發票。
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

                <div className="border-t border-white/5 pt-2 text-[10.5px] text-neutral-400 leading-relaxed">
                  💡 <strong>匯款後回報</strong>：匯付完成後請提供末五碼、日期及公司發票抬頭與統編，回傳至大會官方 LINE（<span className="text-[#DFBA87] font-mono select-all">@vis_culture</span>），大會核帳後即開立電子發票並更新系統狀態。
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

    </div>
  );
}
