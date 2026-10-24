'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, FileText, Users, Image as ImageIcon, CheckCircle, XCircle, 
  Download, Eye, Mail, Phone, Globe, Calendar, ExternalLink, Loader2, RefreshCw, ChevronDown, ChevronUp,
  Signature, FileCheck, Sparkles, Lock, LogOut, ArrowRight, AlertTriangle, Tag, Edit3, DollarSign,
  Copy
} from 'lucide-react';
import { ZONE_MAP, ALL_ZONES, formatBoothDisplay, normalizeBoothCode, getBoothPrice } from '@/lib/exhibitorConstants';

export const isMakingProjectApp = (app: any) => {
  if (!app) return false;
  const boothType = String(app.booth_type || '').toUpperCase();
  const zoneId = String(app.zone_id || '').toLowerCase();
  const pref1 = String(app.zone_preference_1 || '');
  const pref2 = String(app.zone_preference_2 || '');
  const pref3 = String(app.zone_preference_3 || '');

  return (
    zoneId === 'making-project' ||
    boothType === 'MAKING-PROJECT' ||
    boothType.includes('MAKING') ||
    boothType.includes('造物') ||
    pref1.includes('造物') ||
    pref2.includes('造物') ||
    pref3.includes('造物')
  );
};

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
      booth_type = normalizeBoothCode(codeMatch[1], zone_id);
    } else {
      booth_type = zone_id === 'artsy' ? 'A01' : zone_id === 'premier' ? 'A04' : 'L3';
    }

    return {
      zone_id,
      booth_type,
      price: price || getBoothPrice(booth_type, zone_id),
    };
  } catch (err) {
    console.error('Error parsing preference fallback:', err);
  }

  return null;
};

export const ADMIN_EMAILS = [
  'artwithlifetaipei@gmail.com',
  'ameliecykuo@gmail.com',
  'amelie@theartpressasia.com',
  'visvipteam@gmail.com',
];

export default function ExhibitorAdminPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'applications' | 'making-project' | 'vip' | 'compliance' | 'media'>('applications');

  // Admin Login States
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Database States
  const [applications, setApplications] = useState<any[]>([]);
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
  const [lightboxApp, setLightboxApp] = useState<any | null>(null);
  const [mediaLightboxUrl, setMediaLightboxUrl] = useState<string | null>(null);
  const [selectedPrefs, setSelectedPrefs] = useState<Record<string, number>>({});
  const [expandedQaId, setExpandedQaId] = useState<string | null>(null);
  const [copiedQaId, setCopiedQaId] = useState<string | null>(null);

  // Fee Adjustment Modal state
  const [feeModalApp, setFeeModalApp] = useState<any | null>(null);
  const [feeModalMode, setFeeModalMode] = useState<'approve' | 'edit'>('edit');
  const [feeModalInput, setFeeModalInput] = useState<string>('');
  const [feeModalNote, setFeeModalNote] = useState<string>('');
  const [isSavingFee, setIsSavingFee] = useState(false);

  const openFeeModal = (app: any, mode: 'approve' | 'edit') => {
    setFeeModalApp(app);
    setFeeModalMode(mode);
    setFeeModalInput(app.custom_fee !== null && app.custom_fee !== undefined ? String(app.custom_fee) : '');
    setFeeModalNote(app.discount_note || '');
  };

  // Authenticate Admin
  useEffect(() => {
    let isMounted = true;

    const checkAdmin = async () => {
      try {
        setIsLoading(true);

        // Safety timeout of 2000ms so the UI never hangs indefinitely on the loading spinner
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
          setTimeout(() => resolve({ data: { session: null } }), 2000)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        
        const userEmail = (session?.user?.email || '').toLowerCase().trim();
        const isAdmin = ADMIN_EMAILS.map(e => e.toLowerCase().trim()).includes(userEmail);

        if (!isMounted) return;

        if (!session || !isAdmin) {
          setIsAuthorized(false);
          setCurrentUserEmail(userEmail);
          setIsLoading(false);
          return;
        }

        setIsAuthorized(true);
        setCurrentUserEmail(userEmail);
        setIsLoading(false);
        // Load data in background (non-blocking on revisit)
        loadAllAdminData();
      } catch (err) {
        console.error('Admin auth check error:', err);
        if (isMounted) {
          setIsAuthorized(false);
          setIsLoading(false);
        }
      }
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      const userEmail = (session?.user?.email || '').toLowerCase().trim();
      const isAdmin = ADMIN_EMAILS.map(e => e.toLowerCase().trim()).includes(userEmail);

      if (session && isAdmin) {
        setIsAuthorized(true);
        setCurrentUserEmail(userEmail);
        setIsLoading(false);
        loadAllAdminData();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthorized(false);
        setCurrentUserEmail('');
        setIsLoading(false);
      } else {
        setIsAuthorized(false);
        setCurrentUserEmail(userEmail);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdminPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginFeedback(null);

    const email = adminEmail.toLowerCase().trim();
    if (!ADMIN_EMAILS.map(e => e.toLowerCase().trim()).includes(email)) {
      setLoginFeedback({ type: 'error', text: '權限不足：此信箱非 2027 VIS 授權之大會管理員帳號。' });
      setIsLoggingIn(false);
      return;
    }

    try {
      // 1. Direct Server-Side Auth API (immune to browser multi-tab lock contention)
      const res = await fetch('/api/exhibitor/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: adminPassword }),
      });

      const result = await res.json();

      if (!res.ok) {
        setLoginFeedback({ type: 'error', text: result.error || '登入失敗' });
        return;
      }

      if (result.session) {
        // Sync session into client Supabase
        try {
          await supabase.auth.setSession(result.session);
        } catch (syncErr) {
          console.warn('Session client sync warning:', syncErr);
        }

        if (typeof window !== 'undefined' && result.session.access_token) {
          sessionStorage.setItem('vis_admin_token', result.session.access_token);
        }

        setIsAuthorized(true);
        setCurrentUserEmail(email);
        loadAllAdminData();
        return;
      }

      setLoginFeedback({ type: 'error', text: '登入未取得有效授權，請重試' });
    } catch (apiErr: any) {
      console.warn('Server login API fallback to client auth:', apiErr);
      // 2. Direct client auth fallback if server fetch fails
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: adminPassword,
        });

        if (error) {
          setLoginFeedback({ 
            type: 'error', 
            text: error.message === 'Invalid login credentials' 
              ? '管理員密碼錯誤，請確認密碼或使用下方 Magic Link 一次性登入連結。' 
              : `登入失敗: ${error.message}` 
          });
        } else if (data.session) {
          if (typeof window !== 'undefined' && data.session.access_token) {
            sessionStorage.setItem('vis_admin_token', data.session.access_token);
          }
          setIsAuthorized(true);
          setCurrentUserEmail(email);
          loadAllAdminData();
        }
      } catch (clientErr: any) {
        setLoginFeedback({ type: 'error', text: `系統連線異常: ${clientErr.message || clientErr}` });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminMagicLink = async () => {
    const email = adminEmail.toLowerCase().trim();
    if (!email) {
      setLoginFeedback({ type: 'error', text: '請先輸入大會管理員 Email 信箱。' });
      return;
    }

    if (!ADMIN_EMAILS.map(e => e.toLowerCase().trim()).includes(email)) {
      setLoginFeedback({ type: 'error', text: '權限不足：此信箱非 2027 VIS 授權之大會管理員帳號。' });
      return;
    }

    setIsSendingMagicLink(true);
    setLoginFeedback(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/exhibitor/admin` : undefined,
          shouldCreateUser: false,
        },
      });

      if (error) {
        setLoginFeedback({ type: 'error', text: `發送失敗: ${error.message}` });
      } else {
        setLoginFeedback({ 
          type: 'success', 
          text: '✓ 大會管理員一次性免密登入連結已寄至您的信箱！請收信點擊連結即可直接進入管理後台。' 
        });
      }
    } catch (err: any) {
      setLoginFeedback({ type: 'error', text: `發送異常: ${err.message || err}` });
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setIsAuthorized(false);
    setCurrentUserEmail('');
    setLoginFeedback(null);
  };

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

      // Cache non-application states in sessionStorage
      try {
        sessionStorage.setItem('vis_admin_viplist', JSON.stringify(vipData));
        sessionStorage.setItem('vis_admin_compliance', JSON.stringify(complianceData));
        sessionStorage.setItem('vis_admin_media', JSON.stringify(mediaData));
      } catch { /* quota exceeded — ignore */ }

    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    }
  };

  const handleUploadProofForApp = async (appId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案 (JPG / PNG / WEBP)');
      return;
    }

    // Client-side compression to avoid giant base64 payloads
    const compressImage = (f: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
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
            resolve(canvas.toDataURL('image/jpeg', 0.88));
          };
          img.onerror = () => resolve(event.target?.result as string);
          img.src = event.target?.result as string;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(f);
      });
    };

    try {
      const base64Url = await compressImage(file);
      const { error } = await supabase
        .from('exhibitor_applications')
        .update({ deposit_proof_url: base64Url })
        .eq('id', appId);

      if (error) {
        alert(`更換憑證失敗: ${error.message}`);
      } else {
        alert('✅ 憑證圖片已成功更新！');
        // Instantly update local table and modal state
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, deposit_proof_url: base64Url } : a));
        setLightboxApp((prev: any) => prev && prev.id === appId ? { ...prev, deposit_proof_url: base64Url } : prev);
      }
    } catch (err: any) {
      alert(`更換憑證異常: ${err.message}`);
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
      let chosenBoothType = normalizeBoothCode(app.booth_type, app.zone_id);

      const prefStr = selectedPrefNum === 1 ? app.zone_preference_1 :
                      selectedPrefNum === 2 ? app.zone_preference_2 :
                      app.zone_preference_3;
      
      if (prefStr) {
        const parsed = parsePreference(prefStr);
        if (parsed) {
          chosenZoneId = parsed.zone_id;
          chosenBoothType = normalizeBoothCode(parsed.booth_type, chosenZoneId);
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

  const getActiveBoothInfo = (app: any) => {
    if (!app) return { zoneId: 'artsy' as const, boothType: 'A01', price: 40000, zoneName: '明日經典展區' };
    if (isMakingProjectApp(app)) {
      return { zoneId: 'artsy' as const, boothType: 'MAKING-PROJECT', price: 12000, zoneName: '造物計畫特展專區' };
    }
    const selectedPrefNum = selectedPrefs[app.id] || getCurrentPreferenceNum(app);
    const prefStr = selectedPrefNum === 1 ? app.zone_preference_1 :
                    selectedPrefNum === 2 ? app.zone_preference_2 :
                    app.zone_preference_3;
    if (prefStr) {
      const parsed = parsePreference(prefStr);
      if (parsed) {
        const zoneName = parsed.zone_id === 'atelier' ? '匠心藝藏展區' : parsed.zone_id === 'premier' ? '文化實體展區' : '明日經典展區';
        return {
          zoneId: parsed.zone_id,
          boothType: parsed.booth_type,
          price: parsed.price,
          zoneName,
        };
      }
    }
    const zoneName = app.zone_id === 'atelier' ? '匠心藝藏展區' : app.zone_id === 'premier' ? '文化實體展區' : '明日經典展區';
    return {
      zoneId: (app.zone_id as any) || 'artsy',
      boothType: app.booth_type || 'A01',
      price: getBoothPrice(app.booth_type, app.zone_id),
      zoneName,
    };
  };

  const getStandardBoothPrice = (app: any) => {
    return getActiveBoothInfo(app).price;
  };

  // Action: Approve Application with optional custom fee & discount note
  const handleApproveApplication = async (app: any, customFeeVal?: number | null, discountNoteVal?: string | null) => {
    if (actionLoadingId) return;
    setActionLoadingId(app.id);

    try {
      const isMaking = isMakingProjectApp(app);
      let chosenZoneId = isMaking ? 'artsy' : app.zone_id;
      let chosenBoothType = isMaking ? 'MAKING-PROJECT' : normalizeBoothCode(app.booth_type, app.zone_id);

      if (!isMaking) {
        const selectedPrefNum = selectedPrefs[app.id] || 1;
        const prefStr = selectedPrefNum === 1 ? app.zone_preference_1 :
                        selectedPrefNum === 2 ? app.zone_preference_2 :
                        app.zone_preference_3;
        
        if (prefStr) {
          const parsed = parsePreference(prefStr);
          if (parsed) {
            chosenZoneId = parsed.zone_id;
            chosenBoothType = normalizeBoothCode(parsed.booth_type, chosenZoneId);
          }
        }
      } else {
        chosenZoneId = 'artsy';
        chosenBoothType = 'MAKING-PROJECT';
      }

      // 1. Get current admin session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || (typeof window !== 'undefined' ? sessionStorage.getItem('vis_admin_token') : undefined);

      // 2. Call backend approval API to update DB, activate brand, and dispatch admission email
      const res = await fetch('/api/exhibitor/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          applicationId: app.id,
          zoneId: chosenZoneId,
          boothType: chosenBoothType,
          customFee: customFeeVal !== undefined ? customFeeVal : (app.custom_fee ?? null),
          discountNote: discountNoteVal !== undefined ? discountNoteVal : (app.discount_note ?? null),
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || '核准處理失敗');
      }

      // Optimistically update local application state
      setApplications(prev => prev.map(a => 
        a.id === app.id 
          ? { 
              ...a, 
              status: 'approved',
              zone_id: chosenZoneId,
              booth_type: chosenBoothType,
              custom_fee: customFeeVal !== undefined ? customFeeVal : (app.custom_fee ?? null),
              discount_note: discountNoteVal !== undefined ? discountNoteVal : (app.discount_note ?? null)
            } 
          : a
      ));

      await loadAllAdminData();
      setFeeModalApp(null);

      const feeNotice = (customFeeVal !== undefined && customFeeVal !== null)
        ? `\n💰 審定專案參展費: NT$ ${Number(customFeeVal).toLocaleString()}`
        : '';

      const emailNote = result.emailSent 
        ? `\n\n✉️ 已成功寄送【正式入選核准通知電郵】至申請人信箱：\n${app.contact_email}`
        : (result.emailError ? `\n\n⚠️ 電郵發送異常: ${result.emailError}` : '');

      if (isMaking) {
        alert(`🎉「${app.brand_name_zh}」造物計畫特展申請已審查通過！\n\n✅ 已核准特展席位${feeNotice}\n✅ 已自動開通參展商協作平台權限${emailNote}`);
      } else {
        alert(`🎉「${app.brand_name_zh}」申請已審查通過！\n\n✅ 已分配展位順位 (${chosenBoothType})${feeNotice}\n✅ 已自動開通參展商協作平台權限${emailNote}`);
      }

    } catch (err: any) {
      alert(`審核操作失敗: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Resend Admission Notification Email directly
  const handleResendAdmissionEmail = async (app: any) => {
    const brandName = (!app.brand_name_zh || app.brand_name_zh === '無' || app.brand_name_zh.trim() === '')
      ? (app.brand_name_en || '參展品牌')
      : app.brand_name_zh;

    const confirmResend = window.confirm(`確定要重新寄送【正式入選核准通知信】給「${brandName}」嗎？\n\n收件信箱：${app.contact_email}`);
    if (!confirmResend) return;

    if (actionLoadingId) return;
    setActionLoadingId(app.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || (typeof window !== 'undefined' ? sessionStorage.getItem('vis_admin_token') : undefined);

      const isMaking = isMakingProjectApp(app);
      const chosenZoneId = isMaking ? 'artsy' : (app.zone_id || 'artsy');
      const chosenBoothType = isMaking ? 'MAKING-PROJECT' : (app.booth_type || 'A01');

      const res = await fetch('/api/exhibitor/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          applicationId: app.id,
          zoneId: chosenZoneId,
          boothType: chosenBoothType,
          customFee: app.custom_fee ?? null,
          discountNote: app.discount_note ?? null,
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || '重寄信件失敗');
      }

      if (result.emailSent) {
        alert(`✉️ 已成功重新寄送【正式入選核准通知電郵】至申請人信箱：\n${app.contact_email}`);
      } else {
        alert(`⚠️ 系統已處理，但寄信出現異常：${result.emailError || '未知錯誤'}`);
      }
    } catch (err: any) {
      alert(`重寄失敗: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Adjust Booth Fee / Special Discount directly
  const handleSaveFeeAdjustment = async (app: any, customFeeVal: number | null, discountNoteVal: string | null) => {
    setIsSavingFee(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || (typeof window !== 'undefined' ? sessionStorage.getItem('vis_admin_token') : undefined);

      const activeBooth = getActiveBoothInfo(app);

      // Optimistic state update so the table immediately updates in UI!
      setApplications(prev => prev.map(a => 
        a.id === app.id 
          ? { 
              ...a, 
              custom_fee: customFeeVal, 
              discount_note: discountNoteVal,
              zone_id: activeBooth.zoneId,
              booth_type: activeBooth.boothType
            } 
          : a
      ));

      const res = await fetch('/api/exhibitor/update-fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          applicationId: app.id,
          customFee: customFeeVal,
          discountNote: discountNoteVal,
          zoneId: activeBooth.zoneId,
          boothType: activeBooth.boothType,
        })
      });

      const result = await res.json();
      if (!res.ok) {
        if (result.needsMigration) {
          alert(`⚠️ ${result.error}\n\nSQL 指令請見專案根目錄下的 supabase_custom_fee_update.sql`);
          return;
        }
        throw new Error(result.error || '更新參展費失敗');
      }

      setFeeModalApp(null);
      await loadAllAdminData();
      alert(`✅「${app.brand_name_zh}」參展費用調整成功！\n${result.message}`);
    } catch (err: any) {
      alert(`費用調整失敗: ${err.message}`);
      await loadAllAdminData();
    } finally {
      setIsSavingFee(false);
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
    const headers = ['參展品牌 (Brand Name)', '禮遇等級 (Tier)', '貴賓信箱 (VIP Email)', '貴賓姓氏 (VIP Surname)', '提報時間 (Timestamp)'];
    
    // Rows mapping
    const rows = vipList.map(v => [
      v.brand_name_zh,
      (v.tier === 'SVIP' || v.vip_surname?.includes('SVIP')) ? 'SVIP 開幕晚會' : 'VIP 展期通行',
      v.vip_email,
      (v.vip_surname || '').replace(/\s*\((S?VIP)\)/gi, '').replace(/\s*\[(S?VIP)\]/gi, '').trim(),
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

  // Split regular applications vs Making Project
  const regularApplications = applications.filter(a => !isMakingProjectApp(a));
  const makingProjectApplications = applications.filter(a => isMakingProjectApp(a));

  const filteredRegularApps = appFilter === 'all' 
    ? regularApplications 
    : regularApplications.filter(a => a.status === appFilter);

  const filteredMakingProjectApps = appFilter === 'all' 
    ? makingProjectApplications 
    : makingProjectApplications.filter(a => a.status === appFilter);

  // Export Regular Applications to CSV
  const handleExportRegularAppsCsv = () => {
    if (filteredRegularApps.length === 0) {
      alert('目前無符合條件的正規展位申請案可匯出。');
      return;
    }

    const headers = [
      '申請案號 (ID)',
      '品牌中文名稱 (Brand Zh)',
      '品牌英文名稱 (Brand En)',
      '公司抬頭 (Company Name)',
      '統一編號 (Tax ID)',
      '聯絡人 (Contact Person)',
      '聯絡人職稱 (Title)',
      '聯絡電話 (Phone)',
      '電子信箱 (Email)',
      '通訊地址 (Address)',
      '官網 / 品牌連結 (Website)',
      'Instagram (IG)',
      '申請展位規格 (Booth Type)',
      '首選展區志願1 (Preference 1)',
      '次選展區志願2 (Preference 2)',
      '備選展區志願3 (Preference 3)',
      '核定展區 (Assigned Zone)',
      '審核狀態 (Status)',
      '保證金匯款末五碼 (Bank Last 5)',
      '繳費憑證連結 (Payment Proof URL)',
      '申請提交時間 (Created At)'
    ];

    const rows = filteredRegularApps.map(app => [
      String(app.id || ''),
      String(app.brand_name_zh || ''),
      String(app.brand_name_en || ''),
      String(app.company_name_zh || ''),
      String(app.company_tax_id || ''),
      String(app.contact_name || ''),
      String(app.contact_title || ''),
      String(app.contact_phone || ''),
      String(app.contact_email || ''),
      String(app.contact_address || ''),
      String(app.website_url || ''),
      String(app.instagram_url || ''),
      String(app.booth_type || ''),
      String(app.zone_preference_1 || ''),
      String(app.zone_preference_2 || ''),
      String(app.zone_preference_3 || ''),
      String(app.zone_id || ''),
      app.status === 'approved' ? '已核准' : app.status === 'rejected' ? '已駁回' : '審查中',
      String(app.deposit_bank_last5 || ''),
      String(app.deposit_proof_url ? (app.deposit_proof_url.startsWith('data:') ? '[Base64 圖片已上傳]' : app.deposit_proof_url) : '無'),
      new Date(app.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
    ]);

    const csvContent = 
      '\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `2027_VIS_Regular_Exhibitors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Making Project Applications to CSV
  const handleExportMakingProjectCsv = () => {
    if (filteredMakingProjectApps.length === 0) {
      alert('目前無符合條件的造物計畫申請案可匯出。');
      return;
    }

    const headers = [
      '專案案號 (ID)',
      '創作者/品牌名稱 (Brand Zh)',
      '英文標記 (Brand En)',
      '單位/公司抬頭 (Company Name)',
      '統一編號/立案號 (Tax ID)',
      '申請代表 (Contact Person)',
      '職稱 (Title)',
      '聯絡電話 (Phone)',
      '電子信箱 (Email)',
      '工作室通訊地址 (Address)',
      '作品網站 / 社群 (Website)',
      'Instagram (IG)',
      '媒材分類 (Craft Category)',
      '專案席位 (Booth Type)',
      '參展費用 (Fee NTD)',
      '創作簡述與核心理念 (Artwork Concept / Brief)',
      '審核狀態 (Status)',
      '費用匯款末五碼 (Bank Last 5)',
      '繳費憑證連結 (Payment Proof URL)',
      '申請提交時間 (Created At)'
    ];

    const rows = filteredMakingProjectApps.map(app => [
      String(app.id || ''),
      String(app.brand_name_zh || ''),
      String(app.brand_name_en || ''),
      String(app.company_name_zh || '個人創作'),
      String(app.company_tax_id || ''),
      String(app.contact_name || ''),
      String(app.contact_title || ''),
      String(app.contact_phone || ''),
      String(app.contact_email || ''),
      String(app.contact_address || ''),
      String(app.website_url || ''),
      String(app.instagram_url || ''),
      String(app.zone_preference_1 || '原創造物類別'),
      '造物計畫專案席位 (MAKING-PROJECT)',
      'NT$ 12,000',
      String(app.concept_brief || ''),
      app.status === 'approved' ? '已核准' : app.status === 'rejected' ? '已駁回' : '審查中',
      String(app.deposit_bank_last5 || ''),
      String(app.deposit_proof_url ? (app.deposit_proof_url.startsWith('data:') ? '[Base64 圖片已上傳]' : app.deposit_proof_url) : '無'),
      new Date(app.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
    ]);

    const csvContent = 
      '\uFEFF' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `2027_VIS_Making_Project_Applicants_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex flex-col p-6 font-sans-outfit text-white relative overflow-hidden justify-center items-center">
        {/* Ambient background glow */}
        <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,#C9A96E_1px,transparent_1px)] bg-[size:32px_32px] z-0" />
        
        <div className="w-full max-w-md bg-[#111111] border border-[#C9A96E]/20 p-8 rounded-xl relative z-10 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full border border-[#DFBA87] flex items-center justify-center bg-white/5 mx-auto text-[#DFBA87]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl md:text-2xl font-serif-garamond text-[#DFBA87] tracking-wider pt-2">
              2027 VIS 參展審核管理後台
            </h1>
            <p className="text-[10px] text-neutral-400 font-light tracking-[0.2em] uppercase">
              Exhibitor Administration & Curation
            </p>
          </div>

          {currentUserEmail && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 space-y-2 text-xs text-amber-200">
              <div className="flex items-center gap-1.5 font-medium text-amber-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>偵測到瀏覽器登入其他帳號</span>
              </div>
              <p className="font-light text-[11px] text-neutral-300">
                目前登入之帳號為 <strong className="text-white font-mono">{currentUserEmail}</strong>（非管理員）。請於下方輸入大會管理員帳號密碼登入：
              </p>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="text-[11px] text-amber-300 hover:text-white underline cursor-pointer inline-flex items-center gap-1"
              >
                <LogOut className="w-3 h-3" /> 清除此帳號並重新整理
              </button>
            </div>
          )}

          <form onSubmit={handleAdminPasswordLogin} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[10px] font-semibold tracking-widest text-[#DFBA87] uppercase">
                  大會管理員信箱 ADMIN EMAIL
                </label>
              </div>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="artwithlifetaipei@gmail.com"
                className="w-full text-xs tracking-wider border border-white/10 focus:border-[#C9A96E] bg-white/5 rounded px-3.5 py-2.5 outline-none text-white transition-all font-mono"
                required
                disabled={isLoggingIn || isSendingMagicLink}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-neutral-500 py-0.5">授權信箱：</span>
                {ADMIN_EMAILS.map((email) => (
                  <button
                    key={email}
                    type="button"
                    onClick={() => {
                      setAdminEmail(email);
                      setAdminPassword('Kuo76443173');
                    }}
                    className="text-[10px] bg-white/5 hover:bg-[#DFBA87]/15 hover:text-[#DFBA87] border border-white/10 px-2 py-0.5 rounded text-neutral-300 transition-colors font-mono cursor-pointer"
                    title="點擊帶入此信箱與密碼"
                  >
                    {email.split('@')[0]}
                  </button>
                ))}
              </div>
            </div>

              <div>
                <label className="block text-[10px] font-semibold tracking-widest text-[#DFBA87] uppercase mb-1.5">
                  管理員密碼 PASSWORD
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="請輸入密碼"
                  className="w-full text-xs tracking-wider border border-white/10 focus:border-[#C9A96E] bg-white/5 rounded px-3.5 py-2.5 outline-none text-white transition-all"
                  disabled={isLoggingIn || isSendingMagicLink}
                />
              </div>

              {loginFeedback && (
                <div className={`text-xs p-3 rounded border font-light leading-relaxed ${
                  loginFeedback.type === 'error'
                    ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                }`}>
                  {loginFeedback.text}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoggingIn || isSendingMagicLink}
                className="w-full bg-[#C9A96E] hover:bg-[#B39359] text-white py-2.5 rounded text-xs font-semibold tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : '密碼登入 LOGIN WITH PASSWORD'}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-3 text-[9px] text-neutral-500 font-semibold tracking-widest uppercase">或者 OR</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <button
                type="button"
                onClick={handleAdminMagicLink}
                disabled={isLoggingIn || isSendingMagicLink}
                className="w-full border border-dashed border-[#DFBA87]/40 hover:border-[#DFBA87] hover:bg-[#DFBA87]/5 text-[#DFBA87] py-2.5 rounded text-xs font-semibold tracking-[0.15em] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSendingMagicLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                發送 MAGIC LINK 免密安全登入信
              </button>

              <div className="pt-2 flex justify-between items-center text-[10px] text-neutral-500">
                <Link
                  href={`/exhibitor/reset-password${adminEmail ? `?email=${encodeURIComponent(adminEmail)}` : ''}`}
                  className="hover:text-[#DFBA87] transition-colors"
                >
                  重設密碼 Reset Password →
                </Link>
                <Link
                  href="/exhibitor/portal"
                  className="hover:text-[#DFBA87] transition-colors"
                >
                  前往參展商協作平台 →
                </Link>
              </div>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans-outfit p-6 md:p-12 relative">
      
      {/* Background glow overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(circle_at_center,#C9A96E_1px,transparent_1px)] bg-[size:24px_24px] z-0" />

      {/* Main Admin Container */}
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">

        {/* Top Admin Status & Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-4 border-b border-white/5 text-xs">
          <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>管理員在線：<strong className="text-white">{currentUserEmail}</strong></span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/exhibitor/portal"
              className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 text-[11px]"
            >
              <ExternalLink className="w-3 h-3 text-[#DFBA87]" /> 參展品牌入口
            </Link>
            <Link
              href="/vip/admin"
              className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 text-[11px]"
            >
              <Users className="w-3 h-3 text-[#DFBA87]" /> VIP 貴賓後台
            </Link>
            <Link
              href="/vip/scanner"
              className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 text-[11px]"
            >
              <ShieldCheck className="w-3 h-3 text-[#DFBA87]" /> 現場核銷端
            </Link>
            <button
              onClick={handleAdminLogout}
              className="px-3 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <LogOut className="w-3 h-3" /> 登出
            </button>
          </div>
        </div>
        
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
            { id: 'applications' as const, label: '正規展位申請', icon: FileText, count: regularApplications.length },
            { id: 'making-project' as const, label: '造物計畫專區', icon: Sparkles, count: makingProjectApplications.length },
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
          <Link
            href="/question/admin"
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs tracking-wider font-medium text-[#DFBA87] hover:text-white hover:bg-[#DFBA87]/10 rounded-lg ml-auto whitespace-nowrap transition-colors self-center border border-[#DFBA87]/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>年度文化命題審核 (LED 觀點牆) ↗</span>
          </Link>
        </div>

        {/* Tab Content Panels */}
        <div className="bg-[#111111] border border-white/5 rounded-xl p-6 min-h-[400px]">
          
          {/* TAB 1: APPLICATIONS MANAGER */}
          {activeTab === 'applications' && (
            <div className="space-y-6">
              {/* Making Project Notice Banner */}
              {makingProjectApplications.length > 0 && (
                <div className="bg-gradient-to-r from-[#DFBA87]/15 to-[#DFBA87]/5 border border-[#DFBA87]/30 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-[#DFBA87]">
                    <Sparkles className="w-4 h-4 text-[#DFBA87] shrink-0" />
                    <span>
                      提醒：大會系統現有 <strong>{makingProjectApplications.length} 件「造物計畫」</strong> 申請案（位於獨立專區管理）。
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('making-project')}
                    className="text-xs font-semibold bg-[#DFBA87] hover:bg-[#DFBA87]/90 text-black px-3.5 py-1.5 rounded transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-sm"
                  >
                    <span>切換至造物計畫專區</span>
                    <span>→</span>
                  </button>
                </div>
              )}

              {/* App Status Filters & CSV Export */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex gap-2 text-xs overflow-x-auto pb-1 sm:pb-0">
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
                        px-4 py-2 rounded transition-all whitespace-nowrap
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

                <button
                  onClick={handleExportRegularAppsCsv}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-white/5 hover:bg-[#C9A96E]/20 text-[#DFBA87] hover:text-[#C9A96E] border border-[#C9A96E]/30 text-xs transition-colors self-start sm:self-auto shrink-0"
                  title="匯出正規展位申請名單 CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>匯出正規申請 CSV ({filteredRegularApps.length})</span>
                </button>
              </div>

              {/* Applications Table */}
              {filteredRegularApps.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs font-light">
                  無符合篩選條件的正規展位參展申請案。
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
                      {filteredRegularApps.map((app) => {
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
                                <span className="font-semibold block text-[#DFBA87]">{formatBoothDisplay(app.booth_type, app.zone_id)}</span>
                                <span className="text-[10px] text-neutral-400">{zone?.nameZh}</span>
                                {app.custom_fee !== null && app.custom_fee !== undefined ? (
                                  <div className="mt-1">
                                    <span className="text-[11px] font-mono text-emerald-400 font-semibold block">
                                      特惠 NT$ {Number(app.custom_fee).toLocaleString()}
                                    </span>
                                    {app.discount_note && (
                                      <span className="text-[10px] text-neutral-400 block truncate max-w-[140px]" title={app.discount_note}>
                                        ({app.discount_note})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
                                    NT$ {getStandardBoothPrice(app).toLocaleString()}
                                  </span>
                                )}
                              </td>
                              <td className="p-4 font-light">
                                <div className="flex items-center gap-2">
                                  {app.deposit_proof_url ? (
                                    <button
                                      onClick={() => setLightboxApp(app)}
                                      className="text-[#DFBA87] hover:underline flex items-center gap-1 font-medium"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> 檢視憑證
                                    </button>
                                  ) : (
                                    <span className="text-amber-400/80 text-[10px]">無憑證</span>
                                  )}
                                  <label className="text-[10px] text-[#DFBA87] bg-[#DFBA87]/10 hover:bg-[#DFBA87]/20 border border-[#DFBA87]/30 px-2 py-0.5 rounded cursor-pointer transition-colors inline-flex items-center gap-1">
                                    📷 上傳/更換
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => handleUploadProofForApp(app.id, e)} 
                                    />
                                  </label>
                                </div>
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

                                        {/* Fee & Discount Setting Card */}
                                        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-3.5 space-y-2 mt-4 max-w-2xl">
                                          <div className="flex items-center justify-between">
                                            <h5 className="text-[11px] font-semibold text-[#DFBA87] uppercase tracking-wider flex items-center gap-1.5">
                                              <Tag className="w-3.5 h-3.5" /> 參展費款項 (尾款) 核定設定
                                            </h5>
                                            <button
                                              type="button"
                                              onClick={() => openFeeModal(app, 'edit')}
                                              className="text-[11px] text-[#DFBA87] bg-[#DFBA87]/10 hover:bg-[#DFBA87]/20 border border-[#DFBA87]/30 px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 font-medium"
                                            >
                                              <Edit3 className="w-3 h-3" /> 調整參展費 / 設定折扣
                                            </button>
                                          </div>
                                          <div className="flex items-baseline gap-3 text-xs font-mono flex-wrap">
                                            <span className="text-neutral-400">目前平台應繳：</span>
                                            <span className="text-base font-bold text-white">
                                              NT$ {(app.custom_fee !== null && app.custom_fee !== undefined ? Number(app.custom_fee) : getStandardBoothPrice(app)).toLocaleString()}
                                            </span>
                                            {app.custom_fee !== null && app.custom_fee !== undefined ? (
                                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-sans">
                                                已設定專案特惠 (原牌價 NT$ {getStandardBoothPrice(app).toLocaleString()})
                                              </span>
                                            ) : (
                                              <span className="text-[10px] text-neutral-500 font-sans">
                                                (依官方標準公定牌價)
                                              </span>
                                            )}
                                          </div>
                                          {app.discount_note && (
                                            <div className="text-[11px] text-[#DFBA87] bg-black/40 border border-[#DFBA87]/15 rounded p-2">
                                              優惠備註說明：{app.discount_note}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="text-[#DFBA87] font-semibold uppercase tracking-wider mb-1">參展核心概念 Concept Brief</h4>
                                        <p className="bg-[#0A0A0A] border border-white/5 p-3 rounded text-neutral-400 leading-relaxed font-sans">{app.concept_brief || '未填寫'}</p>
                                      </div>

                                      {/* Remittance Proof Card */}
                                      <div>
                                        <h4 className="text-[#DFBA87] font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
                                          <span>保證金匯款憑證 (Remittance Proof)</span>
                                          <span className="text-[10px] text-emerald-400 font-mono">履約保證金 NT$ 20,000</span>
                                        </h4>
                                        {app.deposit_proof_url ? (
                                          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-3 flex items-center gap-4">
                                            <img 
                                              src={app.deposit_proof_url} 
                                              alt={`【${app.brand_name_zh}】匯款憑證`} 
                                              className="w-24 h-32 object-contain bg-white/5 rounded border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                                              onClick={() => setLightboxApp(app)}
                                            />
                                            <div className="space-y-2">
                                              <div className="text-xs text-neutral-300 font-medium">
                                                參展商已上傳正式保證金匯款證明
                                              </div>
                                              <div className="text-[11px] text-neutral-400 font-mono">
                                                申請品牌：{app.brand_name_zh} ({app.brand_name_en})
                                              </div>
                                              <div className="flex gap-2 pt-1">
                                                <button
                                                  onClick={() => setLightboxApp(app)}
                                                  className="text-[11px] bg-[#DFBA87]/10 hover:bg-[#DFBA87]/20 text-[#DFBA87] border border-[#DFBA87]/30 px-3 py-1 rounded transition-colors flex items-center gap-1.5 font-medium"
                                                >
                                                  <Eye className="w-3 h-3" /> 檢視高清大圖
                                                </button>
                                                <a
                                                  href={`/api/exhibitor/proof?id=${app.id}`}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-[11px] bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                                                >
                                                  <ExternalLink className="w-3 h-3" /> 新分頁開啟
                                                </a>
                                                <label className="text-[11px] text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1">
                                                  📷 更換
                                                  <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    onChange={(e) => handleUploadProofForApp(app.id, e)} 
                                                  />
                                                </label>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-4 text-center">
                                            <p className="text-neutral-500 text-xs mb-2">尚未上傳匯款憑證</p>
                                            <label className="text-xs text-[#DFBA87] bg-[#DFBA87]/10 hover:bg-[#DFBA87]/20 border border-[#DFBA87]/30 px-3 py-1 rounded cursor-pointer transition-colors inline-flex items-center gap-1">
                                              📷 補登/上傳匯款憑證
                                              <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={(e) => handleUploadProofForApp(app.id, e)} 
                                              />
                                            </label>
                                          </div>
                                        )}
                                      </div>

                                      {/* Action Triggers */}
                                      <div className="pt-2">
                                        {app.status === 'pending' && (
                                          <div className="flex gap-3">
                                            <button
                                              onClick={() => openFeeModal(app, 'approve')}
                                              disabled={actionLoadingId !== null}
                                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold tracking-wider px-4 py-2 rounded flex items-center gap-1 text-xs"
                                            >
                                              {actionLoadingId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '核准參展 (Approve)'}
                                            </button>
                                            <button
                                              onClick={() => handleRejectApplication(app.id)}
                                              disabled={actionLoadingId !== null}
                                              className="border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-semibold tracking-wider px-4 py-2 rounded text-xs"
                                            >
                                              駁回 (Reject)
                                            </button>
                                          </div>
                                        )}
                                        {app.status === 'approved' && (
                                          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3 rounded">
                                            <span className="text-emerald-400 text-xs font-medium">✓ 已正式核准參展，協作平台帳號已開通就緒</span>
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() => handleResendAdmissionEmail(app)}
                                                disabled={actionLoadingId === app.id}
                                                className="text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1 font-medium"
                                                title="重新發送官方入選通知信與平台啟用指引至申請人信箱"
                                              >
                                                {actionLoadingId === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                                                重發入選通知信
                                              </button>
                                              <button
                                                onClick={() => openFeeModal(app, 'edit')}
                                                className="text-xs bg-[#DFBA87]/15 hover:bg-[#DFBA87]/25 text-[#DFBA87] border border-[#DFBA87]/30 px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1 font-medium"
                                              >
                                                <Tag className="w-3 h-3" /> 修改參展費 / 折扣
                                              </button>
                                              <button
                                                onClick={() => handleRejectApplication(app.id)}
                                                disabled={actionLoadingId !== null}
                                                className="text-[11px] text-rose-400 hover:underline px-1"
                                              >
                                                撤回/駁回
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        {app.status === 'rejected' && (
                                          <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/20 p-3 rounded">
                                            <span className="text-rose-400 text-xs">✕ 已駁回此申請案</span>
                                            <button
                                              onClick={() => openFeeModal(app, 'approve')}
                                              disabled={actionLoadingId !== null}
                                              className="text-[11px] text-emerald-400 hover:underline font-medium"
                                            >
                                              重新核准
                                            </button>
                                          </div>
                                        )}
                                      </div>
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

          {/* TAB 2: THE MAKING PROJECT MANAGER */}
          {activeTab === 'making-project' && (
            <div className="space-y-6">
              {/* Header Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/[0.02] border border-white/5 p-4 rounded-lg">
                <div>
                  <span className="text-[10px] text-neutral-400 font-mono tracking-widest uppercase block">總申請件數 Total</span>
                  <p className="text-xl font-mono font-bold text-white mt-0.5">{makingProjectApplications.length}</p>
                </div>
                <div>
                  <span className="text-[10px] text-amber-400 font-mono tracking-widest uppercase block">待審核件數 Pending</span>
                  <p className="text-xl font-mono font-bold text-amber-400 mt-0.5">
                    {makingProjectApplications.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase block">已核准錄取 Approved</span>
                  <p className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
                    {makingProjectApplications.filter(a => a.status === 'approved').length}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#DFBA87] font-mono tracking-widest uppercase block">專案費用標準 Fee</span>
                  <p className="text-sm font-semibold text-[#DFBA87] mt-1">NT$ 12,000 / 四天</p>
                </div>
              </div>

              {/* Status Filters & CSV Export */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex gap-2 text-xs overflow-x-auto pb-1 sm:pb-0">
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
                        px-4 py-2 rounded transition-all whitespace-nowrap
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

                <button
                  onClick={handleExportMakingProjectCsv}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded bg-white/5 hover:bg-[#C9A96E]/20 text-[#DFBA87] hover:text-[#C9A96E] border border-[#C9A96E]/30 text-xs transition-colors self-start sm:self-auto shrink-0"
                  title="匯出造物計畫申請名單 CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>匯出造物計畫 CSV ({filteredMakingProjectApps.length})</span>
                </button>
              </div>

              {/* Applications Table */}
              {filteredMakingProjectApps.length === 0 ? (
                <div className="text-center py-12 text-neutral-400 text-xs font-light space-y-3 bg-white/[0.01] rounded-lg border border-dashed border-white/5 p-6">
                  <p>目前在「{appFilter === 'pending' ? '待審核' : appFilter === 'approved' ? '已通過' : appFilter === 'rejected' ? '已拒絕' : '全部'}」篩選下無符合條件的「造物計畫」申請案。</p>
                  {makingProjectApplications.length > 0 && appFilter !== 'all' && (
                    <button
                      onClick={() => setAppFilter('all')}
                      className="px-4 py-2 rounded bg-[#C9A96E]/20 hover:bg-[#C9A96E]/30 text-[#DFBA87] text-xs font-medium transition-colors border border-[#C9A96E]/30"
                    >
                      點擊切換為「全部」以檢視現有 {makingProjectApplications.length} 件申請案
                    </button>
                  )}
                </div>
              ) : (
                <div className="border border-white/5 rounded overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/[0.02] border-b border-white/5 text-neutral-400">
                        <th className="p-4 font-semibold tracking-wide">品牌 / 創作者 (Brand & Maker)</th>
                        <th className="p-4 font-semibold tracking-wide">媒材分類 / 席位</th>
                        <th className="p-4 font-semibold tracking-wide">參展費用憑證</th>
                        <th className="p-4 font-semibold tracking-wide">審核狀態</th>
                        <th className="p-4 font-semibold tracking-wide">提交時間</th>
                        <th className="p-4 font-semibold tracking-wide text-right">管理操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMakingProjectApps.map((app) => {
                        const isExpanded = expandedAppId === app.id;
                        
                        return (
                          <>
                            <tr 
                              key={app.id} 
                              className={`border-b border-white/5 hover:bg-white/[0.01] transition-colors ${isExpanded ? 'bg-white/[0.01]' : ''}`}
                            >
                              <td className="p-4 font-medium">
                                <div className="text-white font-medium">{app.brand_name_zh}</div>
                                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{app.brand_name_en}</div>
                              </td>
                              <td className="p-4 font-light">
                                <span className="font-semibold block text-[#DFBA87]">造物計畫特展席位</span>
                                <span className="text-[10px] text-neutral-400">
                                  {app.zone_preference_1 || '原創造物類別'}
                                </span>
                                {app.custom_fee !== null && app.custom_fee !== undefined ? (
                                  <div className="mt-1">
                                    <span className="text-[11px] font-mono text-emerald-400 font-semibold block">
                                      特惠 NT$ {Number(app.custom_fee).toLocaleString()}
                                    </span>
                                    {app.discount_note && (
                                      <span className="text-[10px] text-neutral-400 block truncate max-w-[140px]" title={app.discount_note}>
                                        ({app.discount_note})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-neutral-500 font-mono block mt-0.5">
                                    NT$ 12,000
                                  </span>
                                )}
                              </td>
                              <td className="p-4 font-light">
                                <div className="flex items-center gap-2">
                                  {app.deposit_proof_url ? (
                                    <button
                                      onClick={() => setLightboxApp(app)}
                                      className="text-[#DFBA87] hover:underline flex items-center gap-1 font-medium"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> 檢視憑證 (NT$ 12,000)
                                    </button>
                                  ) : (
                                    <span className="text-amber-400/80 text-[10px]">無憑證</span>
                                  )}
                                  <label className="text-[10px] text-[#DFBA87] bg-[#DFBA87]/10 hover:bg-[#DFBA87]/20 border border-[#DFBA87]/30 px-2 py-0.5 rounded cursor-pointer transition-colors inline-flex items-center gap-1">
                                    📷 上傳/更換
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => handleUploadProofForApp(app.id, e)} 
                                    />
                                  </label>
                                </div>
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

                            {/* Expanded Detail view */}
                            {isExpanded && (
                              <tr className="bg-white/[0.005]">
                                <td colSpan={6} className="p-6 border-b border-white/5">
                                  <div className="grid md:grid-cols-2 gap-6 text-xs text-neutral-300 font-light">
                                    {/* Left Column: Creator Information & Concept */}
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="text-[#DFBA87] font-semibold uppercase tracking-wider mb-2">
                                          01. 創作者與聯絡人資訊
                                        </h4>
                                        <div className="space-y-1.5 bg-white/[0.02] p-4 rounded-lg border border-white/5">
                                          <div><strong className="text-neutral-400">品牌/創作者：</strong> {app.brand_name_zh} / {app.brand_name_en}</div>
                                          <div><strong className="text-neutral-400">主要聯絡人：</strong> {app.contact_name}</div>
                                          <div><strong className="text-neutral-400">電子信箱：</strong> <a href={`mailto:${app.contact_email}`} className="text-[#DFBA87] underline">{app.contact_email}</a></div>
                                          <div><strong className="text-neutral-400">聯絡電話：</strong> {app.contact_phone}</div>
                                          <div><strong className="text-neutral-400">通訊地址：</strong> {app.contact_address || '未提供'}</div>
                                          <div><strong className="text-neutral-400">公司抬頭/統編：</strong> {app.company_name_zh || '個人創作'} {app.company_tax_id ? `(${app.company_tax_id})` : ''}</div>
                                          {(app.website_url || app.instagram_url) && (
                                            <div className="pt-1 flex gap-3 text-neutral-400">
                                              {app.website_url && (
                                                <a href={app.website_url} target="_blank" rel="noreferrer" className="text-[#DFBA87] hover:underline flex items-center gap-1">
                                                  <Globe className="w-3 h-3" /> 官方網站
                                                </a>
                                              )}
                                              {app.instagram_url && (
                                                <a href={app.instagram_url} target="_blank" rel="noreferrer" className="text-[#DFBA87] hover:underline flex items-center gap-1">
                                                  <ExternalLink className="w-3 h-3" /> Instagram
                                                </a>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Concept Brief */}
                                      <div>
                                        <h4 className="text-[#DFBA87] font-semibold uppercase tracking-wider mb-2">
                                          02. 核心造物理念 (Brief)
                                        </h4>
                                        <div className="bg-white/[0.02] p-4 rounded-lg border border-white/5 leading-relaxed text-neutral-200 whitespace-pre-wrap">
                                          {app.concept_brief || '未填寫造物理念簡述。'}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right Column: Fee Proof & Actions */}
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="text-[#DFBA87] font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
                                          <span>03. 參展費用匯款憑證 (Remittance Proof)</span>
                                          <span className="text-[10px] text-emerald-400 font-mono">專案參展費 NT$ 12,000</span>
                                        </h4>
                                        {app.deposit_proof_url ? (
                                          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-3 flex items-center gap-4">
                                            <img 
                                              src={app.deposit_proof_url} 
                                              alt={`【${app.brand_name_zh}】參展費憑證`} 
                                              className="w-24 h-32 object-contain bg-white/5 rounded border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                                              onClick={() => setLightboxApp(app)}
                                            />
                                            <div className="space-y-2">
                                              <div className="text-xs text-neutral-300 font-medium">
                                                創作者已上傳 NT$ 12,000 參展費用匯款證明
                                              </div>
                                              <div className="text-[11px] text-neutral-400 font-mono">
                                                申請品牌：{app.brand_name_zh} ({app.brand_name_en})
                                              </div>
                                              <div className="flex gap-2 pt-1">
                                                <button
                                                  onClick={() => setLightboxApp(app)}
                                                  className="text-[11px] bg-[#DFBA87]/10 hover:bg-[#DFBA87]/20 text-[#DFBA87] border border-[#DFBA87]/30 px-3 py-1 rounded transition-colors flex items-center gap-1.5 font-medium"
                                                >
                                                  <Eye className="w-3 h-3" /> 檢視高清大圖
                                                </button>
                                                <a
                                                  href={`/api/exhibitor/proof?id=${app.id}`}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-[11px] bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 px-2.5 py-1 rounded transition-colors flex items-center gap-1"
                                                >
                                                  <ExternalLink className="w-3 h-3" /> 新分頁開啟
                                                </a>
                                                <label className="text-[11px] text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1">
                                                  📷 更換
                                                  <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    onChange={(e) => handleUploadProofForApp(app.id, e)} 
                                                  />
                                                </label>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-4 text-center">
                                            <p className="text-neutral-500 text-xs mb-2">尚未上傳匯款憑證</p>
                                            <label className="text-xs text-[#DFBA87] bg-[#DFBA87]/10 hover:bg-[#DFBA87]/20 border border-[#DFBA87]/30 px-3 py-1 rounded cursor-pointer transition-colors inline-flex items-center gap-1">
                                              📷 補登上傳匯款憑證
                                              <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={(e) => handleUploadProofForApp(app.id, e)} 
                                              />
                                            </label>
                                          </div>
                                        )}
                                      </div>

                                      {/* Action Triggers */}
                                      <div className="pt-2">
                                        {app.status === 'pending' && (
                                          <div className="flex gap-3">
                                            <button
                                              onClick={() => openFeeModal(app, 'approve')}
                                              disabled={actionLoadingId !== null}
                                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold tracking-wider px-4 py-2 rounded flex items-center gap-1 text-xs"
                                            >
                                              {actionLoadingId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '核准錄取 (Approve)'}
                                            </button>
                                            <button
                                              onClick={() => handleRejectApplication(app.id)}
                                              disabled={actionLoadingId !== null}
                                              className="border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-semibold tracking-wider px-4 py-2 rounded text-xs"
                                            >
                                              婉拒 (Reject)
                                            </button>
                                          </div>
                                        )}
                                        {app.status === 'approved' && (
                                          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3 rounded">
                                            <div className="flex items-center gap-3">
                                              <span className="text-emerald-400 text-xs font-medium">✓ 已核准「造物計畫特展席位」，協作帳號已就緒</span>
                                              {app.custom_fee !== null && app.custom_fee !== undefined && (
                                                <span className="text-[11px] font-mono text-[#DFBA87] bg-black/40 px-2 py-0.5 rounded border border-[#DFBA87]/20">
                                                  專案價 NT$ {Number(app.custom_fee).toLocaleString()}
                                                </span>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() => openFeeModal(app, 'edit')}
                                                className="text-xs bg-[#DFBA87]/15 hover:bg-[#DFBA87]/25 text-[#DFBA87] border border-[#DFBA87]/30 px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1 font-medium"
                                              >
                                                <Tag className="w-3 h-3" /> 調整費用 / 折扣
                                              </button>
                                              <button
                                                onClick={() => handleRejectApplication(app.id)}
                                                disabled={actionLoadingId !== null}
                                                className="text-[11px] text-rose-400 hover:underline px-1"
                                              >
                                                撤回/駁回
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                        {app.status === 'rejected' && (
                                          <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/20 p-3 rounded">
                                            <span className="text-rose-400 text-xs">✕ 已駁回此申請案</span>
                                            <button
                                              onClick={() => openFeeModal(app, 'approve')}
                                              disabled={actionLoadingId !== null}
                                              className="text-[11px] text-emerald-400 hover:underline font-medium"
                                            >
                                              重新核准
                                            </button>
                                          </div>
                                        )}
                                      </div>
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

          {/* TAB 3: VIP LIST MANAGER */}
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
                        <th className="p-4 font-semibold tracking-wide">禮遇等級 (Tier)</th>
                        <th className="p-4 font-semibold tracking-wide">貴賓姓氏 (Surname)</th>
                        <th className="p-4 font-semibold tracking-wide">貴賓信箱 (Email)</th>
                        <th className="p-4 font-semibold tracking-wide">提報時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vipList.map((vip) => {
                        const isSvip = vip.tier === 'SVIP' || (vip.vip_surname && vip.vip_surname.includes('SVIP'));
                        const cleanName = (vip.vip_surname || '').replace(/\s*\((S?VIP)\)/gi, '').replace(/\s*\[(S?VIP)\]/gi, '').trim();

                        return (
                          <tr key={vip.id} className="border-b border-white/5 hover:bg-white/[0.005]">
                            <td className="p-4 font-medium text-[#DFBA87]">{vip.brand_name_zh}</td>
                            <td className="p-4">
                              {isSvip ? (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/15 text-[#DFBA87] font-semibold inline-flex items-center gap-1 shadow-sm">
                                  <Sparkles className="w-2.5 h-2.5" /> SVIP 開幕晚會
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 bg-white/5 text-neutral-400">
                                  VIP 展期通行
                                </span>
                              )}
                            </td>
                            <td className="p-4 font-medium">{cleanName} 氏</td>
                            <td className="p-4 font-mono text-neutral-300">{vip.vip_email}</td>
                            <td className="p-4 text-neutral-400 font-mono">
                              {new Date(vip.created_at).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
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
                                {['基本守則', '場地保證金', '古蹟賠償', '退費取消'].map((k, i) => {
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

          {/* TAB 4: MEDIA ASSETS & PR Q&A */}
          {activeTab === 'media' && (() => {
            const imageAssets = mediaAssets.filter((a) => a.file_type !== 'pr_qa_submission' && a.file_type !== 'brand_logo_transparent');
            const logoAssets = mediaAssets.filter((a) => a.file_type === 'brand_logo_transparent');

            // Parse and strictly validate PR Q&A submissions
            const allQaSubmissions = mediaAssets
              .filter((a) => a.file_type === 'pr_qa_submission')
              .map((sub) => {
                let parsed: any = {};
                try {
                  parsed = typeof sub.file_url === 'string' ? JSON.parse(sub.file_url) : (sub.file_url || {});
                } catch {}
                const brandName = sub.exhibitor_brands?.brand_name_zh || sub.exhibitor_brands?.brand_name_en || '參展品牌';
                let filledCount = 0;
                (['q1', 'q2', 'q3', 'q4', 'q5'] as const).forEach(k => {
                  if ((parsed[k] || '').trim().length > 0) filledCount += 1;
                });
                return {
                  ...sub,
                  parsed,
                  brandName,
                  filledCount,
                };
              });

            // STRICT FILTER: Only brands that actually answered at least 1 question count as "已回稿"
            const qaSubmissions = allQaSubmissions.filter((sub) => sub.filledCount > 0);
            const emptyDraftSubmissions = allQaSubmissions.filter((sub) => sub.filledCount === 0);

            const handleCopyQaText = (brandName: string, parsed: any, id: string) => {
              const text = `【VIS 2027 參展品牌深度專訪回稿 — ${brandName}】\n\n` +
                `Q1. 透過這個品牌，你最想讓大家重新重視哪一件事？為什麼它在今天容易被忽略？\n${parsed.q1 || '（未填寫）'}\n\n` +
                `Q2. 如果希望下一代生活在更有美感的台灣，你認為大人現在可以先改變哪一個習慣？\n${parsed.q2 || '（未填寫）'}\n\n` +
                `Q3. 透過這個品牌，你最想讓大家重新重視、重新思考哪一件被現代社會忽略的事？以及你認為為什麼它在今天容易被忽略？\n${parsed.q3 || '（未填寫）'}\n\n` +
                `Q4. 現在消費者經常問：「網路上也有很像的，為什麼要買你的？」面對這個問題，你最希望他們理解什麼？\n${parsed.q4 || '（未填寫）'}\n\n` +
                `Q5. 如果未來我們每天看到的圖片、商品，都是依照喜好被推薦的，你擔心大家會越來越少接觸不同的美感嗎？你的品牌希望讓人看見什麼不同的選擇？\n${parsed.q5 || '（未填寫）'}\n`;

              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(text);
                setCopiedQaId(id);
                setTimeout(() => setCopiedQaId(null), 3000);
              }
            };

            return (
              <div className="space-y-10">
                {/* 1. PR Q&A Editorial Submissions */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#DFBA87]" />
                        品牌深度專題回稿審閱 ({qaSubmissions.length} 家品牌已回稿)
                      </h3>
                      <span className="text-xs text-neutral-400 font-light mt-0.5 block">
                        參展品牌針對大會 5 大核心專題提問之文字回覆，可一鍵複製作為社群發文、媒體專訪推薦與大會專刊編輯素材。
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#DFBA87] bg-[#DFBA87]/10 px-3 py-1 rounded-full border border-[#DFBA87]/20 self-start">
                      回稿期限: 11/15
                    </span>
                  </div>

                  {qaSubmissions.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 text-xs font-light border border-dashed border-white/5 rounded-xl">
                      目前尚無品牌提交專題提問回稿。
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {qaSubmissions.map((sub) => {
                        const { parsed, brandName, filledCount } = sub;
                        const isExpanded = expandedQaId === sub.id;

                        return (
                          <div 
                            key={sub.id} 
                            className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden hover:border-[#DFBA87]/30 transition-all"
                          >
                            <div 
                              onClick={() => setExpandedQaId(isExpanded ? null : sub.id)}
                              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-white/[0.01] hover:bg-white/[0.03]"
                            >
                              <div className="flex items-center gap-3">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center justify-center border ${
                                  filledCount === 5 
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                                    : 'bg-[#DFBA87]/15 border-[#DFBA87]/30 text-[#DFBA87]'
                                }`}>
                                  {filledCount}/5 {filledCount === 5 ? '全數填畢' : '已回稿'}
                                </span>
                                <div>
                                  <div className="text-sm font-semibold text-white tracking-wide">
                                    {brandName}
                                  </div>
                                  <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                    更新時間：{parsed.lastSavedAt ? new Date(parsed.lastSavedAt).toLocaleString('zh-TW', { hour12: false }) : new Date(sub.created_at).toLocaleString('zh-TW', { hour12: false })}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyQaText(brandName, parsed, sub.id);
                                  }}
                                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-[#DFBA87] hover:text-black text-neutral-300 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                                  title="複製全數題目與回答文案"
                                >
                                  {copiedQaId === sub.id ? (
                                    <>
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                      <span className="text-emerald-400">已複製！</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>複製專題文案</span>
                                    </>
                                  )}
                                </button>
                                <span className="text-xs text-neutral-400 font-mono">
                                  {isExpanded ? '收合 ▲' : '展開詳情 ▼'}
                                </span>
                              </div>
                            </div>

                            {/* Expanded Q&A content */}
                            {isExpanded && (
                              <div className="border-t border-white/5 p-5 bg-black/40 space-y-4 text-xs font-light">
                                <div className="space-y-1.5 border-l-2 border-[#DFBA87]/40 pl-3">
                                  <div className="font-semibold text-[#DFBA87] text-[11px]">Q1. 透過這個品牌，你最想讓大家重新重視哪一件事？為什麼它在今天容易被忽略？</div>
                                  <div className="text-neutral-200 whitespace-pre-wrap leading-relaxed">{parsed.q1 || '（尚未填寫）'}</div>
                                </div>

                                <div className="space-y-1.5 border-l-2 border-[#DFBA87]/40 pl-3">
                                  <div className="font-semibold text-[#DFBA87] text-[11px]">Q2. 如果希望下一代生活在更有美感的台灣，你認為大人現在可以先改變哪一個習慣？</div>
                                  <div className="text-neutral-200 whitespace-pre-wrap leading-relaxed">{parsed.q2 || '（尚未填寫）'}</div>
                                </div>

                                <div className="space-y-1.5 border-l-2 border-[#DFBA87]/40 pl-3">
                                  <div className="font-semibold text-[#DFBA87] text-[11px]">Q3. 透過這個品牌，你最想讓大家重新重視、重新思考哪一件被現代社會忽略的事？以及你認為為什麼它在今天容易被忽略？</div>
                                  <div className="text-neutral-200 whitespace-pre-wrap leading-relaxed">{parsed.q3 || '（尚未填寫）'}</div>
                                </div>

                                <div className="space-y-1.5 border-l-2 border-[#DFBA87]/40 pl-3">
                                  <div className="font-semibold text-[#DFBA87] text-[11px]">Q4. 現在消費者經常問：「網路上也有很像的，為什麼要買你的？」面對這個問題，你最希望他們理解什麼？</div>
                                  <div className="text-neutral-200 whitespace-pre-wrap leading-relaxed">{parsed.q4 || '（尚未填寫）'}</div>
                                </div>

                                <div className="space-y-1.5 border-l-2 border-[#DFBA87]/40 pl-3">
                                  <div className="font-semibold text-[#DFBA87] text-[11px]">Q5. 如果未來我們每天看到的圖片、商品，都是依照喜好被推薦的，你擔心大家會越來越少接觸不同的美感嗎？你的品牌希望讓人看見什麼不同的選擇？</div>
                                  <div className="text-neutral-200 whitespace-pre-wrap leading-relaxed">{parsed.q5 || '（尚未填寫）'}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {emptyDraftSubmissions.length > 0 && (
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-neutral-500 text-xs flex items-center justify-between">
                      <span>💡 另有 {emptyDraftSubmissions.length} 家品牌曾開啟專題提問但尚未填寫答題內容，不列入已回稿統計中。</span>
                    </div>
                  )}
                </div>

                {/* 2. Brand Transparent Logos */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#DFBA87]" />
                        品牌專屬透明無底色 Logo 匯總 ({logoAssets.length} 家品牌已提報)
                      </h3>
                      <span className="text-xs text-neutral-400 font-light mt-0.5 block">
                        參展品牌提交之去背透明 Logo（PNG / SVG / WebP），大會社群聯名視覺、專刊印刷與現場導覽排版專用。
                      </span>
                    </div>
                    <span className="text-xs font-mono text-[#DFBA87] bg-[#DFBA87]/10 px-3 py-1 rounded-full border border-[#DFBA87]/20 self-start">
                      透明去背
                    </span>
                  </div>

                  {logoAssets.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 text-xs font-light border border-dashed border-white/5 rounded-xl">
                      目前尚無品牌提交透明 Logo。
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {logoAssets.map((logo) => {
                        const brandName = logo.exhibitor_brands?.brand_name_zh || '參展品牌';
                        const brandNameEn = logo.exhibitor_brands?.brand_name_en;
                        return (
                          <div 
                            key={logo.id} 
                            className="bg-[#111111] border border-white/10 rounded-xl overflow-hidden hover:border-[#DFBA87]/40 transition-all flex flex-col justify-between"
                          >
                            <div 
                              className="p-4 flex items-center justify-center min-h-[110px] relative"
                              style={{
                                backgroundColor: '#0c0c0c',
                                backgroundImage: 'repeating-conic-gradient(rgba(255, 255, 255, 0.08) 0% 25%, transparent 0% 50%)',
                                backgroundSize: '16px 16px',
                              }}
                            >
                              <img 
                                src={logo.file_url} 
                                alt={brandName} 
                                className="max-h-16 max-w-full object-contain filter drop-shadow-md"
                              />
                            </div>
                            <div className="p-3 bg-black/40 border-t border-white/5 space-y-1">
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="text-xs font-semibold text-white truncate" title={brandName}>
                                  {brandName}
                                </div>
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                                  Logo✓
                                </span>
                              </div>
                              {brandNameEn && (
                                <div className="text-[10px] text-neutral-400 font-mono truncate">{brandNameEn}</div>
                              )}
                              <div className="flex items-center justify-between pt-1 text-[10px]">
                                <span className="text-[9px] text-neutral-500 font-mono truncate max-w-[100px]">
                                  {logo.file_name}
                                </span>
                                <a
                                  href={logo.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#DFBA87] hover:text-white flex items-center gap-0.5 font-mono transition-colors"
                                >
                                  檢視原圖 ↗
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Visual Image Assets Grid */}
                <div className="space-y-4">
                  <div className="border-b border-white/5 pb-3">
                    <h3 className="text-sm font-semibold text-white tracking-wider flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-[#DFBA87]" />
                      品牌高解析視覺圖檔素材 ({imageAssets.length} 張)
                    </h3>
                    <span className="text-xs text-neutral-400 font-light mt-0.5 block">
                      瀏覽所有品牌提交的高解析宣傳素材，大會公關小組下載編輯用。點擊圖片可放大檢視。
                    </span>
                  </div>

                  {imageAssets.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500 text-xs font-light border border-dashed border-white/5 rounded-xl">
                      目前尚無任何品牌上傳視覺素材圖檔。
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
                      {imageAssets.map((asset) => (
                        <div 
                          key={asset.id} 
                          className="border border-white/5 bg-white/[0.01] rounded-lg overflow-hidden group hover:border-[#C9A96E]/30 transition-all cursor-pointer"
                          onClick={() => setMediaLightboxUrl(asset.file_url)}
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
              </div>
            );
          })()}

        </div>

      </div>

      {/* Lightbox / Modal for Deposit Proof image review */}
      <AnimatePresence>
        {lightboxApp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 md:p-6"
            onClick={() => setLightboxApp(null)}
          >
            <div 
              className="bg-[#121212] border border-white/10 rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/[0.02]">
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white tracking-wide truncate">
                      【{lightboxApp.brand_name_zh}】保證金匯款憑證審查
                    </span>
                    <span className="text-[10px] font-mono text-[#DFBA87] bg-[#DFBA87]/10 border border-[#DFBA87]/30 px-2 py-0.5 rounded">
                      NT$ 20,000
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 font-mono mt-0.5 truncate">
                    {lightboxApp.brand_name_en} • 聯繫人：{lightboxApp.contact_name} ({lightboxApp.contact_email}) • 展位：{formatBoothDisplay(lightboxApp.booth_type, lightboxApp.zone_id)}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {lightboxApp.deposit_proof_url && (
                    <>
                      <a
                        href={`/api/exhibitor/proof?id=${lightboxApp.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs bg-white/5 hover:bg-white/15 text-neutral-300 px-3 py-1.5 rounded transition-all flex items-center gap-1.5 border border-white/10"
                        title="在新分頁檢視原始大圖"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> 開啟原圖
                      </a>
                      <a
                        href={`/api/exhibitor/proof?id=${lightboxApp.id}`}
                        download={`匯款憑證_${lightboxApp.brand_name_zh}_2027.png`}
                        className="text-xs bg-white/5 hover:bg-white/15 text-neutral-300 px-3 py-1.5 rounded transition-all flex items-center gap-1.5 border border-white/10"
                        title="下載原始圖檔"
                      >
                        <Download className="w-3.5 h-3.5" /> 下載
                      </a>
                    </>
                  )}
                  <label className="text-xs text-[#DFBA87] bg-[#DFBA87]/10 hover:bg-[#DFBA87]/20 border border-[#DFBA87]/30 px-3 py-1.5 rounded cursor-pointer transition-colors flex items-center gap-1.5">
                    📷 更換圖檔
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleUploadProofForApp(lightboxApp.id, e)} 
                    />
                  </label>
                  <button 
                    className="text-neutral-400 hover:text-white rounded-full p-1.5 transition-colors ml-1"
                    onClick={() => setLightboxApp(null)}
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Image Body */}
              <div className="flex-1 overflow-auto p-4 md:p-6 flex items-center justify-center bg-[#090909] min-h-[360px]">
                {lightboxApp.deposit_proof_url ? (
                  <img 
                    src={lightboxApp.deposit_proof_url} 
                    alt={`【${lightboxApp.brand_name_zh}】保證金匯款憑證`}
                    className="max-w-full max-h-[72vh] object-contain rounded-lg shadow-2xl border border-white/10 cursor-default"
                  />
                ) : (
                  <div className="text-center p-8 text-neutral-400">
                    <p className="text-sm mb-3">此申請尚未上傳匯款憑證</p>
                    <label className="text-xs text-[#DFBA87] bg-[#DFBA87]/10 hover:bg-[#DFBA87]/20 border border-[#DFBA87]/30 px-3 py-1.5 rounded cursor-pointer transition-colors inline-flex items-center gap-1.5">
                      📷 立即上傳憑證
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleUploadProofForApp(lightboxApp.id, e)} 
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Assets Lightbox */}
      <AnimatePresence>
        {mediaLightboxUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 cursor-zoom-out"
            onClick={() => setMediaLightboxUrl(null)}
          >
            <button 
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
              onClick={() => setMediaLightboxUrl(null)}
            >
              <XCircle className="w-6 h-6" />
            </button>
            <img 
              src={mediaLightboxUrl} 
              alt="Media Asset" 
              className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booth Fee & Special Discount Modal */}
      <AnimatePresence>
        {feeModalApp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setFeeModalApp(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#141414] border border-[#DFBA87]/40 rounded-xl p-6 max-w-lg w-full text-white shadow-2xl relative my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setFeeModalApp(null)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 text-sm rounded transition-colors"
                title="關閉"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 mb-4 text-[#DFBA87]">
                <Tag className="w-5 h-5 flex-shrink-0" />
                <h3 className="text-base font-semibold tracking-wide">
                  {feeModalMode === 'approve' ? '核准參展 & 核定參展費用' : '調整參展費 / 設定專案優惠'}
                </h3>
              </div>

              {/* Brand and Booth Specs Summary */}
              {(() => {
                const activeBooth = getActiveBoothInfo(feeModalApp);
                const currentFeeToPay = feeModalApp.custom_fee !== null && feeModalApp.custom_fee !== undefined 
                  ? Number(feeModalApp.custom_fee) 
                  : activeBooth.price;
                return (
                  <div className="bg-[#0A0A0A] border border-white/10 rounded-lg p-4 mb-5 space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">品牌名稱：</span>
                      <span className="font-semibold text-white">{feeModalApp.brand_name_zh} ({feeModalApp.brand_name_en})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-400">核定展區與規格：</span>
                      <div className="text-right">
                        <span className="font-semibold text-amber-200/90 mr-1.5">{activeBooth.zoneName}</span>
                        <span className="font-mono text-[#DFBA87] font-medium">
                          {formatBoothDisplay(activeBooth.boothType, activeBooth.zoneId)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center border-t border-white/5 pt-2">
                      <span className="text-neutral-400">官方標準公定牌價：</span>
                      <span className="font-mono text-neutral-300 font-semibold">
                        NT$ {activeBooth.price.toLocaleString()}
                      </span>
                    </div>
                    {feeModalApp.status === 'approved' && (
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">目前平台應繳金額：</span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          NT$ {currentFeeToPay.toLocaleString()}
                          {feeModalApp.custom_fee !== null && feeModalApp.custom_fee !== undefined && (
                            <span className="ml-1 text-[10px] text-amber-400">(特惠)</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Fee Inputs */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-medium text-neutral-300">
                      實收參展費用 (尾款 NT$)
                    </label>
                    <button
                      type="button"
                      onClick={() => setFeeModalInput('')}
                      className="text-[11px] text-[#DFBA87] hover:underline"
                    >
                      設為標準牌價 (留空)
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-xs">NT$</span>
                    <input
                      type="number"
                      placeholder={`留空即依標準牌價 NT$ ${getStandardBoothPrice(feeModalApp).toLocaleString()}`}
                      value={feeModalInput}
                      onChange={(e) => setFeeModalInput(e.target.value)}
                      className="w-full bg-[#0D0D0D] border border-white/15 focus:border-[#DFBA87] rounded-lg pl-12 pr-4 py-2.5 text-white font-mono text-sm outline-none transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                    💡 若有品牌享有折扣或贊助價，請在此輸入最終實付金額。協作平台將優先以特惠金額顯示。若留空則自動帶入官方標準牌價。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    專案折扣 / 優惠備註說明（選填，將呈現在參展商後台）
                  </label>
                  <input
                    type="text"
                    placeholder="例如：策略夥伴專案特惠、早鳥評審特惠價"
                    value={feeModalNote}
                    onChange={(e) => setFeeModalNote(e.target.value)}
                    className="w-full bg-[#0D0D0D] border border-white/15 focus:border-[#DFBA87] rounded-lg px-3 py-2 text-white text-xs outline-none transition-colors"
                  />
                </div>

                {/* Submit Actions */}
                <div className="pt-3 flex gap-3 border-t border-white/10">
                  {feeModalMode === 'approve' ? (
                    <>
                      <button
                        type="button"
                        disabled={actionLoadingId !== null}
                        onClick={() => {
                          const customVal = feeModalInput.trim() === '' ? null : Number(feeModalInput);
                          handleApproveApplication(feeModalApp, customVal, feeModalNote.trim() || null);
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs tracking-wider py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {actionLoadingId === feeModalApp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓ 確認核准並寄送入選電郵'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeeModalApp(null)}
                        className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-neutral-400 text-xs transition-colors"
                      >
                        取消
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={isSavingFee}
                        onClick={() => {
                          const customVal = feeModalInput.trim() === '' ? null : Number(feeModalInput);
                          handleSaveFeeAdjustment(feeModalApp, customVal, feeModalNote.trim() || null);
                        }}
                        className="flex-1 bg-[#DFBA87] hover:bg-[#DFBA87]/90 text-black font-semibold text-xs tracking-wider py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {isSavingFee ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓ 儲存費用變更 (即時生效)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeeModalApp(null)}
                        className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-neutral-400 text-xs transition-colors"
                      >
                        取消
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
