'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, FileText, Users, Image as ImageIcon, CheckCircle, XCircle, 
  Download, Eye, Mail, Phone, Globe, Calendar, ExternalLink, Loader2, RefreshCw, ChevronDown, ChevronUp,
  Signature, FileCheck
} from 'lucide-react';
import { ZONE_MAP, ALL_ZONES } from '@/lib/exhibitorConstants';

const parsePreference = (prefStr: string) => {
  if (!prefStr) return null;
  // 1. Try exact match against current constants
  for (const zone of ALL_ZONES) {
    for (const booth of zone.booths) {
      const val = `${zone.nameZh} - ${booth.code} ${booth.label} (NT$${booth.price.toLocaleString()})`;
      if (val === prefStr) {
        return {
          zone_id: zone.id,
          booth_type: booth.code,
          price: booth.price,
        };
      }
    }
  }

  // 2. Fallback: Parse using heuristics (useful for old database records)
  try {
    let zone_id: 'artsy' | 'premier' | 'atelier' = 'artsy';
    if (prefStr.includes('精鑑')) {
      zone_id = 'premier';
    } else if (prefStr.includes('匠心') || prefStr.includes('藝藏') || prefStr.includes('獨立')) {
      zone_id = 'atelier';
    }

    // Extract price inside (NT$...)
    let price = 0;
    const priceMatch = prefStr.match(/\(NT\$([0-9,]+)\)/);
    if (priceMatch && priceMatch[1]) {
      price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    }

    // Extract booth code using regex
    let booth_type = '';
    const codeMatch = prefStr.match(/-\s*([A-Za-z0-9\-]+)/);
    if (codeMatch && codeMatch[1]) {
      booth_type = codeMatch[1];
    } else {
      booth_type = zone_id === 'artsy' ? 'S01-03,S06-08' : zone_id === 'premier' ? 'M9-M15' : 'A-ENTRANCE';
    }

    return {
      zone_id,
      booth_type,
      price: price || (zone_id === 'artsy' ? 42000 : zone_id === 'premier' ? 42000 : 108000),
    };
  } catch (err) {
    console.error('Error parsing preference fallback:', err);
  }

  return null;
};

const ADMIN_EMAILS = [
  'artwithlifetaipei@gmail.com',
  'ameliecykuo@gmail.com',
];

export default function ExhibitorAdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'applications' | 'vip' | 'compliance' | 'media'>('applications');

  // Database States — initialized from sessionStorage cache for instant re-load
  const [applications, setApplications] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try { const c = sessionStorage.getItem('vis_admin_applications'); return c ? JSON.parse(c) : []; } catch { return []; }
    }
    return [];
  });
  const [vipList, setVipList] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try { const c = sessionStorage.getItem('vis_admin_viplist'); return c ? JSON.parse(c) : []; } catch { return []; }
    }
    return [];
  });
  const [complianceList, setComplianceList] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try { const c = sessionStorage.getItem('vis_admin_compliance'); return c ? JSON.parse(c) : []; } catch { return []; }
    }
    return [];
  });
  const [mediaAssets, setMediaAssets] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try { const c = sessionStorage.getItem('vis_admin_media'); return c ? JSON.parse(c) : []; } catch { return []; }
    }
    return [];
  });
  
  // UI helper states
  const [appFilter, setAppFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [selectedPrefs, setSelectedPrefs] = useState<Record<string, number>>({});

  // Authenticate Admin
  useEffect(() => {
    const checkAdmin = async () => {
      // If we already have cached data, show UI immediately (isLoading=true only on cold start)
      const hasCachedData = typeof window !== 'undefined' && !!sessionStorage.getItem('vis_admin_applications');
      if (!hasCachedData) setIsLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !ADMIN_EMAILS.includes(session.user?.email || '')) {
        setIsAuthorized(false);
        router.push('/exhibitor/portal');
        setIsLoading(false);
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
      // Load data in background (non-blocking on revisit)
      loadAllAdminData();
    };

    checkAdmin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadAllAdminData = async () => {
    try {
      // Parallel fetch all 4 data sources simultaneously
      const [
        { data: apps },
        { data: vips },
        { data: compliances },
        { data: media },
      ] = await Promise.all([
        supabase
          .from('exhibitor_applications')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('exhibitor_vip_submissions')
          .select('*')
          .order('brand_name_zh', { ascending: true }),
        supabase
          .from('exhibitor_compliance')
          .select('*, exhibitor_brands(brand_name_zh, brand_name_en)')
          .order('signed_at', { ascending: false }),
        supabase
          .from('exhibitor_media_assets')
          .select('*, exhibitor_brands(brand_name_zh, brand_name_en)')
          .order('created_at', { ascending: false }),
      ]);

      const appData = apps || [];
      const vipData = vips || [];
      const complianceData = compliances || [];
      const mediaData = media || [];

      setApplications(appData);
      setVipList(vipData);
      setComplianceList(complianceData);
      setMediaAssets(mediaData);

      // Cache results in sessionStorage for instant next-visit load
      try {
        sessionStorage.setItem('vis_admin_applications', JSON.stringify(appData));
        sessionStorage.setItem('vis_admin_viplist', JSON.stringify(vipData));
        sessionStorage.setItem('vis_admin_compliance', JSON.stringify(complianceData));
        sessionStorage.setItem('vis_admin_media', JSON.stringify(mediaData));
      } catch { /* quota exceeded — ignore */ }

    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    }
  };

  const getCurrentPreferenceNum = (app: any) => {
    for (const num of [1, 2, 3]) {
      const prefStr = num === 1 ? app.zone_preference_1 :
                      num === 2 ? app.zone_preference_2 :
                      app.zone_preference_3;
      if (prefStr) {
        const parsed = parsePreference(prefStr);
        if (parsed && parsed.zone_id === app.zone_id && parsed.booth_type === app.booth_type) {
          return num;
        }
      }
    }
    return 1; // Default fallback
  };

  const handleUpdateBoothAllocation = async (app: any, selectedPrefNum: number) => {
    if (actionLoadingId) return;
    setActionLoadingId(app.id);

    try {
      let chosenZoneId = app.zone_id;
      let chosenBoothType = app.booth_type;

      const prefStr = selectedPrefNum === 1 ? app.zone_preference_1 :
                      selectedPrefNum === 2 ? app.zone_preference_2 :
                      app.zone_preference_3;
      
      if (prefStr) {
        const parsed = parsePreference(prefStr);
        if (parsed) {
          chosenZoneId = parsed.zone_id;
          chosenBoothType = parsed.booth_type;
        }
      }

      // 1. Update zone_id and booth_type in exhibitor_applications
      const { error: appErr } = await supabase
        .from('exhibitor_applications')
        .update({ 
          zone_id: chosenZoneId,
          booth_type: chosenBoothType
        })
        .eq('id', app.id);

      if (appErr) throw appErr;

      // 2. Update zone_id and booth_type in exhibitor_brands
      const isMicro = chosenBoothType === 'T';
      const { error: brandErr } = await supabase
        .from('exhibitor_brands')
        .update({
          zone_id: chosenZoneId,
          booth_type: chosenBoothType,
          is_micro_exposure: isMicro
        })
        .eq('application_id', app.id);

      if (brandErr) throw brandErr;

      // Clear local overrides to re-evaluate from DB data
      setSelectedPrefs(prev => {
        const updated = { ...prev };
        delete updated[app.id];
        return updated;
      });

      await loadAllAdminData();
      alert(`「${app.brand_name_zh}」的展位已成功更新分配為第 ${selectedPrefNum} 志願 (${prefStr})！`);

    } catch (err: any) {
      alert(`更新展位分配失敗: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Approve Application
  const handleApproveApplication = async (app: any) => {
    if (actionLoadingId) return;
    setActionLoadingId(app.id);

    try {
      const selectedPrefNum = selectedPrefs[app.id] || 1;
      let chosenZoneId = app.zone_id;
      let chosenBoothType = app.booth_type;

      const prefStr = selectedPrefNum === 1 ? app.zone_preference_1 :
                      selectedPrefNum === 2 ? app.zone_preference_2 :
                      app.zone_preference_3;
      
      if (prefStr) {
        const parsed = parsePreference(prefStr);
        if (parsed) {
          chosenZoneId = parsed.zone_id;
          chosenBoothType = parsed.booth_type;
        }
      }

      // 1. Update status in exhibitor_applications
      const { error: appErr } = await supabase
        .from('exhibitor_applications')
        .update({ 
          status: 'approved', 
          deposit_paid: true,
          zone_id: chosenZoneId,
          booth_type: chosenBoothType
        })
        .eq('id', app.id);

      if (appErr) throw appErr;

      // 2. Create the brand portal record in exhibitor_brands
      // Check if it already exists first
      const { data: existingBrand } = await supabase
        .from('exhibitor_brands')
        .select('id')
        .eq('application_id', app.id)
        .maybeSingle();

      if (!existingBrand) {
        const isMicro = chosenBoothType === 'T';
        const { error: brandErr } = await supabase
          .from('exhibitor_brands')
          .insert({
            application_id: app.id,
            brand_name_zh: app.brand_name_zh,
            brand_name_en: app.brand_name_en,
            zone_id: chosenZoneId,
            booth_type: chosenBoothType,
            is_micro_exposure: isMicro,
            portal_email: app.contact_email.toLowerCase().trim(),
          });
        
        if (brandErr) throw brandErr;
      } else {
        const isMicro = chosenBoothType === 'T';
        const { error: brandErr } = await supabase
          .from('exhibitor_brands')
          .update({
            zone_id: chosenZoneId,
            booth_type: chosenBoothType,
            is_micro_exposure: isMicro
          })
          .eq('application_id', app.id);

        if (brandErr) throw brandErr;
      }

      await loadAllAdminData();
      alert(`「${app.brand_name_zh}」申請已審查通過，已分配為您所選取的展位順位，並已自動建立/同步參展商協作帳號！`);

    } catch (err: any) {
      alert(`審核操作失敗: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Reject Application
  const handleRejectApplication = async (id: string) => {
    if (actionLoadingId) return;
    setActionLoadingId(id);

    try {
      const { error } = await supabase
        .from('exhibitor_applications')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;

      // Remove from brands if it existed
      await supabase.from('exhibitor_brands').delete().eq('application_id', id);

      await loadAllAdminData();
    } catch (err: any) {
      alert(`審核操作失敗: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Export VIP to CSV (BOM-enabled UTF-8 for Excel)
  const handleExportVipCsv = () => {
    if (vipList.length === 0) return;

    // Header row
    const headers = ['參展品牌 (Brand Name)', '貴賓信箱 (VIP Email)', '貴賓姓氏 (VIP Surname)', '提報時間 (Timestamp)'];
    
    // Rows mapping
    const rows = vipList.map(v => [
      v.brand_name_zh,
      v.vip_email,
      v.vip_surname,
      new Date(v.created_at).toLocaleString()
    ]);

    // CSV format assembly
    const csvContent = 
      '\uFEFF' + // UTF-8 BOM
      [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `2027_VIS_Exhibitor_VIP_List_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Applications helper
  const getFilteredApps = () => {
    if (appFilter === 'all') return applications;
    return applications.filter(a => a.status === appFilter);
  };

  const filteredApps = getFilteredApps();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-[#DFBA87]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-xs tracking-widest uppercase opacity-70">進入管理後台...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans-outfit p-6 md:p-12 relative">
      
      {/* Background glow overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(circle_at_center,#C9A96E_1px,transparent_1px)] bg-[size:24px_24px] z-0" />

      {/* Main Admin Container */}
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-serif-garamond text-white tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#DFBA87]" />
              2027 VIS 參展協作平台管理後台
            </h1>
            <p className="text-xs text-neutral-400 font-light mt-1">
              審核參展商申請案、查閱履約保證金轉帳證明、整合匯出 VIP 名單與彙整媒體視覺素材。
            </p>
          </div>
          <button 
            onClick={loadAllAdminData}
            className="self-start text-xs border border-white/5 hover:border-white/20 bg-white/5 text-neutral-400 hover:text-white px-4 py-2 rounded transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 重新整理
          </button>
        </div>

        {/* Tab Menu */}
        <div className="flex border-b border-white/5 space-x-1 overflow-x-auto pb-px">
          {[
            { id: 'applications' as const, label: '申請管理', icon: FileText, count: applications.length },
            { id: 'vip' as const, label: 'VIP 名單匯總', icon: Users, count: vipList.length },
            { id: 'compliance' as const, label: '守則簽署狀態', icon: CheckCircle, count: complianceList.length },
            { id: 'media' as const, label: '媒體素材匯總', icon: ImageIcon, count: mediaAssets.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-5 py-3 text-xs tracking-wider font-medium border-b-2 whitespace-nowrap transition-all duration-300
                  ${isActive 
                    ? 'border-[#C9A96E] text-[#DFBA87] bg-white/[0.02]' 
                    : 'border-transparent text-neutral-400 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="text-[10px] bg-white/5 border border-white/5 px-1.5 py-0.5 rounded-full text-neutral-400 font-mono font-bold">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="bg-[#111111] border border-white/5 rounded-xl p-6 min-h-[400px]">
          
          {/* TAB 1: APPLICATIONS MANAGER */}
          {activeTab === 'applications' && (
            <div className="space-y-6">
              {/* App Status Filters */}
              <div className="flex gap-2 text-xs">
                {[
                  { id: 'all' as const, label: '全部' },
                  { id: 'pending' as const, label: '待審核' },
                  { id: 'approved' as const, label: '已通過' },
                  { id: 'rejected' as const, label: '已拒絕' },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setAppFilter(filter.id)}
                    className={`
                      px-4 py-2 rounded transition-all
                      ${appFilter === filter.id 
                        ? 'bg-[#C9A96E] text-white' 
                        : 'bg-white/5 text-neutral-400 hover:text-white'
                      }
                    `}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Applications Table */}
              {filteredApps.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs font-light">
                  無符合篩選條件的參展申請案。
                </div>
              ) : (
                <div className="border border-white/5 rounded overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5 text-neutral-400">
                        <th className="p-4 font-semibold tracking-wide">品牌 (Brand Name)</th>
                        <th className="p-4 font-semibold tracking-wide">首選展區 / 規格</th>
                        <th className="p-4 font-semibold tracking-wide">保證金憑證</th>
                        <th className="p-4 font-semibold tracking-wide">申請狀態</th>
                        <th className="p-4 font-semibold tracking-wide">提交時間</th>
                        <th className="p-4 font-semibold tracking-wide text-right">管理操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map((app) => {
                        const isExpanded = expandedAppId === app.id;
                        const zone = ZONE_MAP[app.zone_id as 'artsy' | 'premier' | 'atelier'];
                        
                        return (
                          <>
                            <tr 
                              key={app.id} 
                              className={`border-b border-white/5 hover:bg-white/[0.01] transition-colors ${isExpanded ? 'bg-white/[0.01]' : ''}`}
                            >
                              <td className="p-4 font-medium">
                                <div>{app.brand_name_zh}</div>
                                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{app.brand_name_en}</div>
                              </td>
                              <td className="p-4 font-light">
                                <span className="font-semibold block text-[#DFBA87]">{app.booth_type}</span>
                                <span className="text-[10px] text-neutral-400">{zone?.nameZh}</span>
                              </td>
                              <td className="p-4 font-light">
                                {app.deposit_proof_url ? (
                                  <button
                                    onClick={() => setLightboxUrl(app.deposit_proof_url)}
                                    className="text-[#DFBA87] hover:underline flex items-center gap-1"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> 檢視憑證 Image
                                  </button>
                                ) : (
                                  <span className="text-rose-400">未上傳</span>
                                )}
                              </td>
                              <td className="p-4">
                                <span className={`
                                  text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded border uppercase
                                  ${app.status === 'approved' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                                    app.status === 'rejected' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 
                                    'text-amber-400 bg-amber-500/10 border-amber-500/20'}
                                `}>
                                  {app.status === 'approved' ? '已核准' : app.status === 'rejected' ? '已駁回' : '審查中'}
                                </span>
                              </td>
                              <td className="p-4 text-neutral-400 font-mono">
                                {new Date(app.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-right space-x-2">
                                <button
                                  onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                                  className="text-neutral-400 hover:text-white p-1 rounded transition-colors inline-flex items-center"
                                  title="展開詳情"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Application Detail view */}
                            {isExpanded && (
                              <tr className="bg-white/[0.005]">
                                <td colSpan={6} className="p-6 border-b border-white/5">
                                  <div className="grid md:grid-cols-2 gap-6 text-xs text-neutral-300 font-light">
                                    <div className="space-y-3">
                                      <h4 className="text-[#DFBA87] font-semibold uppercase tracking-wider">聯絡人基本資訊</h4>
                                      <div className="space-y-1.5 font-mono">
                                        <div className="flex gap-2"><Mail className="w-3.5 h-3.5 text-neutral-500" /> <span>信箱 Email: {app.contact_email}</span></div>
                                        {app.contact_phone && <div className="flex gap-2"><Phone className="w-3.5 h-3.5 text-neutral-500" /> <span>電話 Tel: {app.contact_phone}</span></div>}
                                        {app.website_url && <div className="flex gap-2"><Globe className="w-3.5 h-3.5 text-neutral-500" /> <span>網站 Web: <a href={app.website_url} target="_blank" className="hover:underline text-[#DFBA87] inline-flex items-center gap-1">{app.website_url} <ExternalLink className="w-3 h-3" /></a></span></div>}
                                        {app.instagram_url && <div className="flex gap-2"><ImageIcon className="w-3.5 h-3.5 text-neutral-500" /> <span>Instagram: {app.instagram_url}</span></div>}
                                      </div>

                                      <div className="pt-2">
                                        <h4 className="text-[#DFBA87] font-semibold uppercase tracking-wider mb-2">參展志願順序分配 (請勾選一個作為最終分配展位)</h4>
                                        <div className="grid gap-2 max-w-2xl">
                                          {[
                                            { num: 1, pref: app.zone_preference_1, label: '志願 1' },
                                            { num: 2, pref: app.zone_preference_2, label: '志願 2' },
                                            { num: 3, pref: app.zone_preference_3, label: '志願 3' }
                                          ].map(({ num, pref, label }) => {
                                            if (!pref) return null;
                                            const parsed = parsePreference(pref);
                                            
                                            const currentPrefNum = getCurrentPreferenceNum(app);
                                            const isSelected = (selectedPrefs[app.id] !== undefined)
                                              ? selectedPrefs[app.id] === num
                                              : (app.status === 'approved' ? currentPrefNum === num : num === 1);

                                            return (
                                              <div 
                                                key={num}
                                                onClick={async () => {
                                                  if (app.status === 'pending') {
                                                    setSelectedPrefs(prev => ({ ...prev, [app.id]: num }));
                                                  } else if (app.status === 'approved' && !isSelected) {
                                                    const confirmChange = window.confirm(
                                                      `是否確定要將「${app.brand_name_zh}」的分配展位變更為：\n` +
                                                      `志願 ${num}: ${pref}？\n\n` +
                                                      `這將即時更新參展商在前台/後台所看到的展位費（尾款）金額。`
                                                    );
                                                    if (confirmChange) {
                                                      await handleUpdateBoothAllocation(app, num);
                                                    }
                                                  }
                                                }}
                                                className={`flex items-center justify-between p-2.5 border transition-all cursor-pointer ${
                                                  isSelected 
                                                    ? 'bg-[#C9A96E]/10 border-[#C9A96E] text-white font-medium' 
                                                    : 'bg-black/25 border-white/5 text-neutral-400 hover:border-white/10'
                                                }`}
                                              >
                                                <div className="flex items-center gap-3 pr-4">
                                                  <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                                    isSelected ? 'border-[#C9A96E]' : 'border-neutral-700'
                                                  }`}>
                                                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#C9A96E]" />}
                                                  </div>
                                                  <div className="text-xs">
                                                    <span className="font-semibold text-white/90 mr-1.5">{label}:</span>
                                                    <span>{pref}</span>
                                                  </div>
                                                </div>
                                                {parsed && (
                                                  <span className="text-[11px] font-mono text-[#DFBA87] font-semibold whitespace-nowrap pl-2">
                                                    NT$ {parsed.price.toLocaleString()}
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="text-[#DFBA87] font-semibold uppercase tracking-wider mb-1">參展核心概念 Concept Brief</h4>
                                        <p className="bg-[#0A0A0A] border border-white/5 p-3 rounded text-neutral-400 leading-relaxed font-sans">{app.concept_brief || '未填寫'}</p>
                                      </div>

                                      {/* Action Triggers */}
                                      {app.status === 'pending' && (
                                        <div className="flex gap-3 pt-2">
                                          <button
                                            onClick={() => handleApproveApplication(app)}
                                            disabled={actionLoadingId !== null}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold tracking-wider px-4 py-2 rounded flex items-center gap-1"
                                          >
                                            {actionLoadingId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '核准參展 (Approve)'}
                                          </button>
                                          <button
                                            onClick={() => handleRejectApplication(app.id)}
                                            disabled={actionLoadingId !== null}
                                            className="border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-semibold tracking-wider px-4 py-2 rounded"
                                          >
                                            駁回 (Reject)
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VIP LIST MANAGER */}
          {activeTab === 'vip' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-400 font-light">大會全展商提報的 VIP 名單統計，可直接匯出。</span>
                <button
                  onClick={handleExportVipCsv}
                  disabled={vipList.length === 0}
                  className="bg-[#C9A96E] hover:bg-[#B39359] disabled:bg-neutral-800 disabled:text-neutral-500 text-white px-4 py-2.5 rounded text-xs font-semibold tracking-wider transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> 匯出 VIP 名單 Excel (CSV)
                </button>
              </div>

              {vipList.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs font-light">
                  目前無展商提報任何 VIP 貴賓。
                </div>
              ) : (
                <div className="border border-white/5 rounded overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5 text-neutral-400">
                        <th className="p-4 font-semibold tracking-wide">參展品牌 (Brand)</th>
                        <th className="p-4 font-semibold tracking-wide">貴賓姓氏 (Surname)</th>
                        <th className="p-4 font-semibold tracking-wide">貴賓信箱 (Email)</th>
                        <th className="p-4 font-semibold tracking-wide">提報時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vipList.map((vip) => (
                        <tr key={vip.id} className="border-b border-white/5 hover:bg-white/[0.005]">
                          <td className="p-4 font-medium text-[#DFBA87]">{vip.brand_name_zh}</td>
                          <td className="p-4 font-medium">{vip.vip_surname} 氏</td>
                          <td className="p-4 font-mono text-neutral-300">{vip.vip_email}</td>
                          <td className="p-4 text-neutral-400 font-mono">
                            {new Date(vip.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMPLIANCE STATUS */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <span className="text-xs text-neutral-400 font-light block">查閱品牌大會守則與拆裝規範的線上電子簽署情形。</span>

              {complianceList.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs font-light">
                  目前尚無任何品牌完成線上簽章同意。
                </div>
              ) : (
                <div className="border border-white/5 rounded overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5 text-neutral-400">
                        <th className="p-4 font-semibold tracking-wide">參展品牌 (Brand)</th>
                        <th className="p-4 font-semibold tracking-wide">簽署類型 / 代表姓名</th>
                        <th className="p-4 font-semibold tracking-wide">身分證字號 / 授權聲明</th>
                        <th className="p-4 font-semibold tracking-wide">簽署時間</th>
                        <th className="p-4 font-semibold tracking-wide">特別條款與合約同意狀態</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complianceList.map((comp) => (
                        <tr key={comp.id} className="border-b border-white/5 hover:bg-white/[0.005]">
                          <td className="p-4 font-medium text-[#DFBA87]">{comp.exhibitor_brands?.brand_name_zh || comp.brand_id}</td>
                          <td className="p-4">
                            {comp.physical_contract_url ? (
                              <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded text-[10px] font-medium border border-amber-500/20">
                                實體用印合約
                              </span>
                            ) : (
                              <div className="font-medium text-white flex items-center gap-1.5">
                                <Signature className="w-3.5 h-3.5 text-[#DFBA87]" /> {comp.signed_name || '無姓名'}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {comp.physical_contract_url ? (
                              <span className="text-neutral-500 font-light">（實體用印合約免填）</span>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="font-mono text-neutral-300">{comp.signer_id_number || '未提供'}</div>
                                <div className="text-[10px] text-neutral-500">
                                  {comp.is_legal_representative ? '✓ 法代/授權代表' : '✕ 未勾選法代'}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-neutral-400 font-mono">
                            {comp.signed_at ? new Date(comp.signed_at).toLocaleString() : '無時間'}
                          </td>
                          <td className="p-4">
                            {comp.physical_contract_url ? (
                              <a 
                                href={comp.physical_contract_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 text-[#DFBA87] hover:underline font-mono text-[11px]"
                              >
                                <FileText className="w-3.5 h-3.5" /> 下載用印掃描檔
                              </a>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 max-w-xs">
                                {['基本守則', '保證金沒收', '古蹟賠償', '退費取消'].map((k, i) => {
                                  let checked = false;
                                  if (i === 0) checked = comp.rule_booth && comp.rule_conduct && comp.rule_liability && comp.rule_exit && comp.rule_ip && comp.rule_return_inspection;
                                  if (i === 1) checked = comp.rule_deposit_forfeiture;
                                  if (i === 2) checked = comp.rule_damage_compensation;
                                  if (i === 3) checked = comp.rule_refund_policy;
                                  
                                  return (
                                    <span key={i} className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                                      checked 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                    }`}>
                                      {checked ? '✓' : '✕'} {k}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MEDIA ASSETS GRID */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              <span className="text-xs text-neutral-400 font-light block">瀏覽所有品牌提交的高解析宣傳素材，大會公關小組下載編輯用。</span>

              {mediaAssets.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs font-light">
                  目前尚無任何品牌上傳宣傳素材。
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
                  {mediaAssets.map((asset) => (
                    <div 
                      key={asset.id} 
                      className="border border-white/5 bg-white/[0.01] rounded-lg overflow-hidden group hover:border-[#C9A96E]/30 transition-all cursor-pointer"
                      onClick={() => setLightboxUrl(asset.file_url)}
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-neutral-900">
                        <img 
                          src={asset.file_url} 
                          alt={asset.file_name} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                        />
                      </div>
                      <div className="p-3 text-[10px]">
                        <div className="font-semibold text-white truncate">{asset.exhibitor_brands?.brand_name_zh || '測試品牌'}</div>
                        <div className="text-neutral-500 truncate mt-0.5 font-mono">{asset.file_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Lightbox / Modal for Deposit Proof image review */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 cursor-zoom-out"
            onClick={() => setLightboxUrl(null)}
          >
            <button 
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
              onClick={() => setLightboxUrl(null)}
            >
              <XCircle className="w-6 h-6" />
            </button>
            <img 
              src={lightboxUrl} 
              alt="Deposit proof document" 
              className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl border border-white/10 cursor-default"
              onClick={(e) => e.stopPropagation()} // keep open if click inside image
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
