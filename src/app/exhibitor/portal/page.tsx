'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { KEY_DATES, DEPOSIT_AMOUNT, ZONE_MAP } from '@/lib/exhibitorConstants';
import { motion } from 'framer-motion';
import { 
  Calendar, CreditCard, Award, ClipboardCheck, Users, 
  Image as ImageIcon, HelpCircle, Check, Clock, AlertTriangle 
} from 'lucide-react';

export default function ExhibitorDashboardPage({ brand: parentBrand }: { brand?: any }) {
  const [brand, setBrand] = useState<any>(() => {
    if (parentBrand) return parentBrand;
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('vis_portal_brand_data');
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    }
    return null;
  });

  const [appData, setAppData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(`vis_portal_app_data_${brand?.id}`);
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
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

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        let currentBrand = brand;

        // If brand not passed down, get it from current session
        if (!currentBrand) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            const { data } = await supabase
              .from('exhibitor_brands')
              .select('*')
              .eq('portal_email', session.user.email.toLowerCase().trim())
              .maybeSingle();
            currentBrand = data;
          }
        }

        if (currentBrand) {
          setBrand(currentBrand);
          sessionStorage.setItem('vis_portal_brand_data', JSON.stringify(currentBrand));

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
            .then(res => res.count || 0);

          const [app, compliance, vipC, mediaC] = await Promise.all([
            appPromise,
            compliancePromise,
            vipPromise,
            mediaPromise
          ]);

          if (app) {
            setAppData(app);
            sessionStorage.setItem(`vis_portal_app_data_${currentBrand.id}`, JSON.stringify(app));
          }
          setComplianceSigned(!!compliance);
          setVipCount(vipC);
          setMediaCount(mediaC);
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
  const zone = ZONE_MAP[brand.zone_id as 'artsy' | 'premier' | 'atelier'];
  const boothInfo = zone?.booths.find(b => b.code === brand.booth_type);
  const boothPrice = boothInfo?.price || 0;

  // Determine current active timeline phase
  const getTimelineStatus = (dateStr: string) => {
    const today = new Date();
    const targetDate = new Date(dateStr.replace(/\//g, '-'));
    
    // Reset hours for comparison
    today.setHours(0,0,0,0);
    targetDate.setHours(0,0,0,0);

    if (today > targetDate) {
      return { label: '已完成 Completed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    }
    
    // If it's the next upcoming deadline in the sequence
    const isUpcoming = KEY_DATES.find(d => new Date(d.dateStr.replace(/\//g, '-')).getTime() >= today.getTime())?.dateStr === dateStr;
    if (isUpcoming) {
      const diffTime = Math.abs(targetDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { 
        label: `進行中 Active (${diffDays}天後)`, 
        color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
        active: true
      };
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
      if (mediaCount >= 3) completed += 1; // standard requires 3-5 images
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
            大會數位白手套服務已為您開啟。此處是您在 2027 VIS 策展與行政事務的中樞。
          </p>
        </div>
        <div className="text-xs bg-white/5 border border-white/10 px-4 py-2.5 rounded font-mono flex items-center gap-2 text-[#DFBA87]">
          <Award className="w-4 h-4" />
          <span>展位: {brand.booth_type} ({zone?.nameZh})</span>
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
                <span>模組 C：VIP 名單 ({vipCount}位)</span>
              </div>
              <div className={`flex items-center gap-2 p-2.5 rounded border ${mediaCount >= 3 ? 'bg-white/5 border-white/5 text-neutral-300' : 'bg-transparent border-dashed border-amber-500/20 text-neutral-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${mediaCount >= 3 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>模組 D：媒體公關 ({mediaCount}/5張)</span>
              </div>
            </>
          ) : (
            <div className="col-span-2 flex items-center justify-center p-2.5 border border-dashed border-white/5 rounded text-[10px] text-neutral-600 tracking-wider">
              * 微型曝光品牌 (T區) 豁免模組 C 與 D 的提交義務
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
            const status = getTimelineStatus(date.dateStr);
            return (
              <div 
                key={idx}
                className="bg-[#111111] border border-white/5 rounded-xl p-5 hover:border-[#C9A96E]/20 transition-all"
              >
                <div className="text-[10px] font-mono font-semibold text-neutral-500 uppercase">大會日程 STAGE {idx + 1}</div>
                <div className="text-base font-bold text-white font-mono mt-1">{date.dateStr}</div>
                <div className="text-xs text-neutral-300 font-light mt-1.5">{date.labelZh}</div>
                <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-light mt-0.5">{date.labelEn}</div>
                
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
                  已確認 Recieved
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#DFBA87] mb-2">
                NT$ {DEPOSIT_AMOUNT.toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                您的保證金匯款憑證已被大會秘書處核對確認。該保證金將作為您履行參展規範的擔保。
              </p>
            </div>
            <div className="border-t border-white/5 pt-4 mt-6 text-[10px] text-neutral-500 italic">
              * 大會經核對後，將於展覽圓滿結束後 14 個工作天內原帳戶全額退還。
            </div>
          </div>

          {/* Booth Fee Card */}
          <div className="bg-[#111111] border border-white/5 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase">項目 ITEM</span>
                  <h3 className="text-base text-white font-medium mt-0.5">展位租賃費 (尾款)</h3>
                </div>
                <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded uppercase font-semibold">
                  待確認 Verifying
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-white mb-2">
                NT$ {boothPrice.toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                展位規格為 <strong className="text-[#DFBA87]">{brand.booth_type} ({boothInfo?.label})</strong>。尾款請於大會指定截止日前完成匯付，並提供水單以開立電子發票。
              </p>
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
            <strong className="text-amber-400 block font-semibold mb-0.5">展位費透明條款 & 退款須知</strong>
            參展品牌因故於評選通過後退出展位，大會將全額沒收保證金 NT$20,000；如履約參展並恪守大會行為守則，保證金將於展後全額退還。退款所產生之銀行跨行手續費將由品牌自行承擔。
          </p>
        </div>
      </div>

    </div>
  );
}
