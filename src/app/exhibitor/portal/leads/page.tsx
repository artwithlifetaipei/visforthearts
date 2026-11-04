'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Camera, Download, Search, CheckCircle2, 
  AlertCircle, Loader2, X, RefreshCw, Star, Mail, Phone, 
  Calendar, Tag, Check, Copy, ShieldCheck, Package, ShoppingBag, DollarSign
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

// Amount brackets confirmed by organizer
export const AMOUNT_BRACKETS = [
  'NT$ 5,000 以下',
  'NT$ 5,000 – 15,000',
  'NT$ 15,000 – 50,000',
  'NT$ 50,000 – 150,000',
  'NT$ 150,000 – 500,000',
  'NT$ 500,000 以上',
];

// Preset Follow-up Actions for luxury / art exhibition sales
const PRESET_FOLLOW_UP_ACTIONS = [
  '💍 戒圍／尺寸確認與試戴建議',
  '📄 寄送作品型錄與正式報價單',
  '🏛️ 預約展後工作室／私享空間鑑賞',
  '🎨 討論客製化規格 (材質／釉色／刻字)',
  '📦 詢問海外／大型作品專屬運送保險',
  '💬 特殊交期／展後禮品包裝需求',
];

export default function ExhibitorLeadsPage() {
  const searchParams = useSearchParams();
  const autoScanParam = searchParams.get('scan') === 'true';

  // Current Brand State
  const [brand, setBrand] = useState<any>(() => {
    const saved = safeGetStorage('vis_portal_brand_data');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [staffEmail, setStaffEmail] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIntentFilter, setSelectedIntentFilter] = useState<'all' | 'purchase' | 'high' | 'medium' | 'discovery'>('all');

  // Concierge Recording Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'guest' | 'details' | 'success'>('guest');
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef(false);

  // Guest Identification State
  const [guestSearchInput, setGuestSearchInput] = useState('');
  const [isSearchingGuest, setIsSearchingGuest] = useState(false);
  const [identifiedGuest, setIdentifiedGuest] = useState<{
    id?: string;
    email: string;
    name?: string;
    phone?: string;
    tier: 'VIP' | 'SVIP';
    role?: string;
    company?: string;
    isVerified: boolean;
  } | null>(null);

  // Concierge & Purchase Form State
  const [recordType, setRecordType] = useState<'purchase' | 'inquiry'>('purchase');
  const [deliveryMethod, setDeliveryMethod] = useState<'hand_carry' | 'post_fair_delivery'>('hand_carry');
  const [amountBracket, setAmountBracket] = useState<string>('NT$ 15,000 – 50,000');
  const [customItemTitle, setCustomItemTitle] = useState('');
  const [lastCreatedLead, setLastCreatedLead] = useState<any>(null);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedFollowUps, setSelectedFollowUps] = useState<string[]>([]);
  const [customFollowUp, setCustomFollowUp] = useState('');
  const [intentLevel, setIntentLevel] = useState<'high' | 'medium' | 'discovery'>('high');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  // Audio synthesizer for feedback
  const playChime = (type: 'success' | 'beep') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'success' ? 880 : 587.33, ctx.currentTime);
      if (type === 'success') {
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      }
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay restrictions
    }
  };

  // 1. Load Initial Data (Brand, Products, Leads)
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        let currentBrand = brand;
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise<any>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 600)
        );
        const { data: sessionData } = await Promise.race([sessionPromise, sessionTimeout]);
        const session = sessionData?.session;
        let currentEmail = '';

        if (session?.user?.email) {
          currentEmail = session.user.email.toLowerCase().trim();
          setStaffEmail(currentEmail);

          if (!currentBrand) {
            const { data } = await supabase
              .from('exhibitor_brands')
              .select('*')
              .eq('portal_email', currentEmail)
              .maybeSingle();

            if (data) {
              currentBrand = data;
              setBrand(data);
              safeSetStorage('vis_portal_brand_data', JSON.stringify(data));
            }
          }
        }

        // Fetch published artworks of this brand (or fair sample products)
        try {
          let pQuery = supabase
            .from('exhibitor_products')
            .select('*')
            .eq('is_published', true);

          if (currentBrand?.id && currentBrand.id !== '00000000-0000-0000-0000-000000000000') {
            pQuery = pQuery.eq('brand_id', currentBrand.id);
          }

          const { data: prods } = await pQuery.order('created_at', { ascending: false });
          
          if (prods && prods.length > 0) {
            setProducts(prods);
          } else {
            const { data: allProds } = await supabase
              .from('exhibitor_products')
              .select('*')
              .eq('is_published', true)
              .limit(10);
            if (allProds) setProducts(allProds);
          }
        } catch (e) {
          console.warn('Error fetching products for concierge:', e);
        }

        // Fetch Leads via unified API
        await fetchLeads(currentBrand?.id, currentEmail);

      } catch (err) {
        console.error('Concierge initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Auto trigger scan modal if query parameter present
  useEffect(() => {
    if (autoScanParam && !loading) {
      handleOpenModal('purchase');
    }
  }, [autoScanParam, loading]);

  const fetchLeads = async (brandId?: string, staffMail?: string) => {
    setIsRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (brandId && brandId !== '00000000-0000-0000-0000-000000000000') {
        params.set('brand_id', brandId);
      } else if (staffMail || staffEmail) {
        params.set('staff_email', staffMail || staffEmail);
      } else {
        params.set('all', 'true');
      }

      const res = await fetch(`/api/exhibitor/concierge?${params.toString()}`);
      const json = await res.json();

      if (res.ok && Array.isArray(json.leads)) {
        setLeads(json.leads);
        safeSetStorage('vis_local_leads_backup', JSON.stringify(json.leads));
      } else {
        const cached = safeGetStorage('vis_local_leads_backup');
        if (cached) {
          try { setLeads(JSON.parse(cached)); } catch {}
        }
      }
    } catch (e) {
      console.warn('fetchLeads failed:', e);
      const cached = safeGetStorage('vis_local_leads_backup');
      if (cached) {
        try { setLeads(JSON.parse(cached)); } catch {}
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // 2. Open / Close Concierge Modal
  const handleOpenModal = (defaultType: 'purchase' | 'inquiry' = 'purchase') => {
    setModalStep('guest');
    setIdentifiedGuest(null);
    setGuestSearchInput('');
    setRecordType(defaultType);
    setDeliveryMethod('hand_carry');
    setAmountBracket('NT$ 15,000 – 50,000');
    setCustomItemTitle('');
    setLastCreatedLead(null);
    setSelectedProductIds([]);
    setSelectedFollowUps([]);
    setIntentLevel('high');
    setNotes('');
    setInputMode('camera');
    setIsModalOpen(true);
    setScannerError(null);
  };

  const handleCloseModal = () => {
    stopScanner();
    setIsModalOpen(false);
    setModalStep('guest');
  };

  // 3. Camera QR Scanner Lifecycle
  useEffect(() => {
    if (isModalOpen && modalStep === 'guest' && inputMode === 'camera') {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isModalOpen, modalStep, inputMode]);

  const startScanner = () => {
    setScannerError(null);
    setIsScanning(true);

    setTimeout(() => {
      import('html5-qrcode').then((module) => {
        try {
          const Html5Qrcode = module.Html5Qrcode;
          const scanner = new Html5Qrcode('concierge-qr-reader');
          scannerRef.current = scanner;

          scanner.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: (w: number, h: number) => {
                const size = Math.min(w, h) * 0.72;
                return { width: size, height: size };
              }
            },
            (decodedText: string) => {
              handleQRScanned(decodedText);
            },
            () => {}
          ).catch((err: any) => {
            console.warn('Camera failed to start:', err);
            setScannerError('無法啟動相機。請確認瀏覽器相機權限已開啟，或切換至手動搜尋輸入。');
            setIsScanning(false);
          });
        } catch (e: any) {
          setScannerError(e?.message || '掃描模組載入異常');
          setIsScanning(false);
        }
      }).catch((e) => {
        setScannerError('無法載入 QR Code 辨識元件: ' + e.message);
        setIsScanning(false);
      });
    }, 200);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (err) {
        console.warn('stopScanner warning:', err);
      }
    }
    setIsScanning(false);
  };

  // 3b. Mobile File / Native Camera Photo QR Scan Handler
  const handleFileUploadScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      setIsSearchingGuest(true);
      setScannerError(null);
      const { Html5Qrcode } = await import('html5-qrcode');
      let tempEl = document.getElementById('concierge-qr-file-temp');
      if (!tempEl) {
        tempEl = document.createElement('div');
        tempEl.id = 'concierge-qr-file-temp';
        tempEl.style.display = 'none';
        document.body.appendChild(tempEl);
      }
      const fileScanner = new Html5Qrcode('concierge-qr-file-temp');
      const decodedText = await fileScanner.scanFile(file, true);
      try { fileScanner.clear(); } catch {}
      isProcessingRef.current = false;
      await handleQRScanned(decodedText);
    } catch (err: any) {
      console.warn('File QR decode failed:', err);
      setScannerError('未能在此相片中辨識出 QR Code，請確認條碼清晰度，或點擊下方切換為手動查詢。');
      setIsSearchingGuest(false);
      isProcessingRef.current = false;
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 4. Resolve Guest from QR Scan or Manual Input
  const handleQRScanned = async (decodedText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    await stopScanner();
    playChime('beep');

    let cleanTerm = (decodedText || '').trim();

    // 1. JSON parse fallback
    if (cleanTerm.startsWith('{') && cleanTerm.endsWith('}')) {
      try {
        const obj = JSON.parse(cleanTerm);
        cleanTerm = obj.id || obj.userId || obj.email || cleanTerm;
      } catch {}
    }

    // 2. URL parse (e.g. customer shows a dashboard, ticket or registration URL)
    if (cleanTerm.startsWith('http://') || cleanTerm.startsWith('https://')) {
      try {
        const parsed = new URL(cleanTerm);
        cleanTerm = parsed.searchParams.get('id') || 
                    parsed.searchParams.get('u') || 
                    parsed.searchParams.get('email') || 
                    parsed.searchParams.get('ticket') || 
                    parsed.pathname.split('/').filter(Boolean).pop() || 
                    cleanTerm;
      } catch {}
    }

    // 3. Decode standard VIS QR format: [userId]:[timestamp]
    if (cleanTerm.includes(':')) {
      const parts = cleanTerm.split(':');
      cleanTerm = parts[0]?.trim() || cleanTerm;
    }

    if (!cleanTerm) {
      isProcessingRef.current = false;
      return;
    }

    await resolveGuestIdentity(cleanTerm);
  };

  const resolveGuestIdentity = async (searchTerm: string) => {
    setIsSearchingGuest(true);
    setScannerError(null);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 7000)
    );

    const lookupWork = (async () => {
      const term = searchTerm.trim();
      let resolved: any = null;

      // Primary: Server-side admin lookup (supports UUID, 6-char VIS-XXXXXX code, Email, Name without RLS limits)
      try {
        const res = await fetch(`/api/exhibitor/concierge?lookup=${encodeURIComponent(term)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.guest) {
            resolved = data.guest;
          }
        }
      } catch (apiErr) {
        console.warn('Server lookup fallback to client:', apiErr);
      }

      // Fallback Handling if not in database yet
      if (!resolved) {
        if (term.includes('@')) {
          resolved = {
            email: term.toLowerCase(),
            name: null,
            tier: 'VIP',
            role: '現場登記貴賓',
            isVerified: false
          };
        } else {
          setScannerError('系統查無此條碼或編號紀錄。請確認為 VIS 貴賓卡或門票，或切換至「手動輸入查詢」直接輸入貴賓 Email 或貴賓編號登記。');
          return;
        }
      }

      playChime('success');
      setIdentifiedGuest(resolved);
      setModalStep('details');
    })();

    try {
      await Promise.race([lookupWork, timeoutPromise]);
    } catch (err: any) {
      console.error('resolveGuestIdentity error:', err);
      if (err?.message === 'TIMEOUT') {
        setScannerError('網路連線逾時。請確認網路訊號，或切換至「手動輸入查詢」直接輸入 Email / 姓名登記。');
      } else {
        setScannerError('身分比對異常: ' + (err.message || '請改用手動搜尋'));
      }
    } finally {
      setIsSearchingGuest(false);
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
    }
  };

  // 5. Toggle Product Selection
  const toggleProductSelect = (prodId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(prodId) ? prev.filter(id => id !== prodId) : [...prev, prodId]
    );
  };

  // 6. Toggle Follow-up Tag
  const toggleFollowUpTag = (action: string) => {
    setSelectedFollowUps(prev => 
      prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]
    );
  };

  const handleAddCustomFollowUp = () => {
    if (!customFollowUp.trim()) return;
    if (!selectedFollowUps.includes(customFollowUp.trim())) {
      setSelectedFollowUps(prev => [...prev, customFollowUp.trim()]);
    }
    setCustomFollowUp('');
  };

  // 7. Complete Concierge Lead / Purchase & Dual-Sync
  const handleSubmitLead = async () => {
    if (!identifiedGuest?.email) return;

    if (recordType === 'purchase' && !amountBracket) {
      setMessage({ text: '請選擇「成交金額區間」以完成典藏憑證登錄', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        brand_id: brand?.id || null,
        brand_name_zh: brand?.brand_name_zh || '參展品牌',
        brand_name_en: brand?.brand_name_en || '',
        booth_number: brand?.booth_type ? `${brand.zone_id || ''} ${brand.booth_type}` : '',
        vip_user_id: identifiedGuest.id || null,
        vip_email: identifiedGuest.email,
        vip_name: identifiedGuest.name || '',
        vip_phone: identifiedGuest.phone || '',
        vip_tier: identifiedGuest.tier || 'VIP',
        record_type: recordType,
        delivery_method: recordType === 'purchase' ? deliveryMethod : null,
        amount_bracket: recordType === 'purchase' ? amountBracket : null,
        custom_item_title: customItemTitle.trim(),
        intent_level: recordType === 'purchase' ? 'high' : intentLevel,
        follow_up_actions: selectedFollowUps,
        interested_product_ids: selectedProductIds,
        notes: notes,
        staff_email: staffEmail
      };

      const res = await fetch('/api/exhibitor/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || '儲存失敗');
      }

      playChime('success');

      const createdRecord = result.lead || {
        id: `local-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString()
      };
      setLastCreatedLead(createdRecord);

      const updated = [createdRecord, ...leads];
      setLeads(updated);
      safeSetStorage('vis_local_leads_backup', JSON.stringify(updated));

      setModalStep('success');
      setMessage({
        text: recordType === 'purchase'
          ? `✓ 成功開立《VIS 官方典藏暨${deliveryMethod === 'hand_carry' ? '離場放行' : '展後交付'}憑證》(${createdRecord.certificate_no || ''})！已同步至 ${identifiedGuest.name || identifiedGuest.email} 的貴賓卡。`
          : `✓ 成功完成接待！心儀作品已同步加入 ${identifiedGuest.name || identifiedGuest.email} 的貴賓典藏。`,
        type: 'success'
      });

      fetchLeads(brand?.id, staffEmail);

    } catch (err: any) {
      console.error('handleSubmitLead error:', err);
      setMessage({
        text: `紀錄儲存失敗: ${err.message}`,
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 8. Copy Lead Info
  const handleCopyLead = (lead: any) => {
    const isPurchase = lead.record_type === 'purchase' || lead.status === 'closed';
    const text = `【VIS 2027 ${isPurchase ? '現場成交典藏紀錄' : '貴賓接待名單'}】\n姓名: ${lead.vip_name || '無'}\n身分: ${lead.vip_tier}\nEmail: ${lead.vip_email}\n${
      isPurchase
        ? `憑證編號: ${lead.certificate_no || '已核發'}\n交付方式: ${lead.delivery_method === 'hand_carry' ? '現場提貨 (已核發出場放行證)' : '展後交付／訂購 (已核發官方預訂憑證)'}\n金額區間: ${lead.amount_bracket || '未指定'}\n成交品項: ${lead.custom_item_title || '見勾選作品'}`
        : `意向程度: ${lead.intent_level === 'high' ? '🔥 高度意向' : lead.intent_level === 'medium' ? '✨ 中度興趣' : '🌿 初步認識'}\n後續事項: ${lead.follow_up_actions?.join(', ') || '無'}`
    }\n備註: ${lead.notes || '無'}`;

    navigator.clipboard.writeText(text);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // 8.5 Copy Tailored Luxury Sales Follow-Up Script (LINE / WeChat / SMS)
  const handleCopySalesScript = (lead: any) => {
    const brandName = lead.brand_name_zh || brand?.brand_name_zh || '本品牌';
    const guestName = lead.vip_name ? `${lead.vip_name} 貴賓` : '貴賓';
    const matched = products.filter(p => lead.interested_product_ids?.includes(p.id));
    const productTitles = [
      ...(lead.custom_item_title ? [`《${lead.custom_item_title}》`] : []),
      ...matched.map(p => `《${p.title_zh}》`)
    ].join('、') || '現場典藏作品';

    const isPurchase = lead.record_type === 'purchase';
    const text = isPurchase
      ? `您好 ${guestName}！\n誠摯感謝您今日於 VIS Contemporary Culture 2027【${brandName}】展位典藏 ${productTitles}。\n\n我們已為您完成大會官方典藏登錄（憑證編號：${lead.certificate_no || '已同步'}），${
          lead.delivery_method === 'hand_carry'
            ? '您的《離場放行憑證》已同步至您的 VIS 數位貴賓卡中，離場時出示即可順暢通行。'
            : '您的《展後交付／專屬訂製官方憑證》已同步至您的貴賓卡與信箱，後續出貨進度我們將專人為您追蹤。'
        }\n此外，本筆紀錄已為您累積大會活躍藏家資格，助您明年優先續領 VIS 貴賓卡！\n\n✦ 查看您的數位憑證：https://www.visforthearts.com/vip/dashboard\n\n— ${brandName} 敬上`
      : `您好 ${guestName}！\n感謝您今日蒞臨 VIS Contemporary Culture 2027【${brandName}】展位鑑賞交流。\n\n現場專員已為您將剛才討論的 ${productTitles} 收錄至您的專屬貴賓卡中。\n\n針對您現場提及的客製細節與正式報價，我們已為您備妥高解析細節型錄與方案。如需安排展後工作室鑑賞或確認規格，隨時歡迎直接以此訊息與我們私洽！\n\n✦ 您的專屬典藏回看：https://www.visforthearts.com/vip/dashboard\n\n期待展後能再次為您服務！\n— ${brandName} 敬上`;

    navigator.clipboard.writeText(text);
    setCopiedScriptId(lead.id);
    setTimeout(() => setCopiedScriptId(null), 3500);
  };

  // 8.6 Update Lead Sales Pipeline Stage
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    try {
      await fetch('/api/exhibitor/concierge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: newStatus })
      });
    } catch {
      // Non-blocking
    }
  };

  // 9. Export CSV
  const handleExportCSV = () => {
    if (leads.length === 0) return;

    const headers = [
      '登錄時間', '紀錄類型', '憑證編號', '交付/放行方式', '成交金額區間',
      '貴賓姓名', '身分等級', 'Email', '聯絡電話', '成交/感興趣品項',
      '意向程度', '後續聯繫事項', '管家備註', '接待人員'
    ];
    
    const rows = leads.map(l => {
      const isPurchase = l.record_type === 'purchase';
      const matched = products.filter(p => l.interested_product_ids?.includes(p.id));
      const itemNames = [
        ...(l.custom_item_title ? [l.custom_item_title] : []),
        ...matched.map(p => p.title_zh)
      ].join('; ');

      return [
        new Date(l.created_at).toLocaleString('zh-TW'),
        isPurchase ? '現場成交典藏' : '鑑賞意向接待',
        l.certificate_no || '',
        isPurchase ? (l.delivery_method === 'hand_carry' ? '現場提貨(離場放行證)' : '展後交付/訂購(官方預訂證)') : '-',
        l.amount_bracket || '-',
        `"${(l.vip_name || '').replace(/"/g, '""')}"`,
        l.vip_tier || 'VIP',
        l.vip_email,
        `"${(l.vip_phone || '').replace(/"/g, '""')}"`,
        `"${itemNames.replace(/"/g, '""')}"`,
        isPurchase ? '已成交' : (l.intent_level === 'high' ? '高度購買意向' : l.intent_level === 'medium' ? '中度鑑賞興趣' : '初步認識交流'),
        `"${(l.follow_up_actions || []).join('; ').replace(/"/g, '""')}"`,
        `"${(l.notes || '').replace(/"/g, '""')}"`,
        l.staff_email || ''
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `VIS_2027_現場成交與貴賓典藏名單_${brand?.brand_name_zh || 'Brand'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Leads
  const filteredLeads = leads.filter(lead => {
    if (selectedIntentFilter === 'purchase') {
      if (lead.record_type !== 'purchase' && lead.status !== 'closed') return false;
    } else if (selectedIntentFilter !== 'all') {
      if (lead.record_type === 'purchase' || lead.intent_level !== selectedIntentFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = lead.vip_name?.toLowerCase().includes(q);
      const matchEmail = lead.vip_email?.toLowerCase().includes(q);
      const matchNotes = lead.notes?.toLowerCase().includes(q);
      const matchCert = lead.certificate_no?.toLowerCase().includes(q);
      const matchCustomItem = lead.custom_item_title?.toLowerCase().includes(q);
      const matchActions = lead.follow_up_actions?.some((a: string) => a.toLowerCase().includes(q));
      return matchName || matchEmail || matchNotes || matchCert || matchCustomItem || matchActions;
    }
    return true;
  });

  // Calculate Stats
  const totalLeadsCount = leads.length;
  const purchaseCount = leads.filter(l => l.record_type === 'purchase' || l.status === 'closed').length;
  const handCarryCount = leads.filter(l => l.record_type === 'purchase' && l.delivery_method === 'hand_carry').length;
  const postFairOrderCount = leads.filter(l => l.record_type === 'purchase' && l.delivery_method === 'post_fair_delivery').length;
  const highIntentCount = leads.filter(l => l.record_type !== 'purchase' && l.intent_level === 'high').length;

  return (
    <div className="space-y-8 font-sans-outfit">
      
      {/* 1. Header Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#DFBA87] bg-[#DFBA87]/10 px-2 py-0.5 rounded border border-[#DFBA87]/20">
              MODULE F ｜ COLLECTOR CHECKOUT, EXIT PASS & CONCIERGE
            </span>
            <span className="text-xs text-neutral-400">現場消費登錄・出場放行・藏家管家系統</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif-garamond text-white font-normal tracking-wide">
            現場貴賓消費登錄、出場放行與私洽管家
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            【一碼通雙軌機制】貴賓消費結帳時，由品牌人員掃描貴賓入場 QR Code（5 秒完成），即刻為客人核發《離場放行憑證 Exit Pass》或《展後交付官方預訂證明》，同時為貴賓累積明年 VIS 貴賓卡優先續發資格。
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => fetchLeads(brand?.id, staffEmail)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-white/5 hover:bg-white/10 text-neutral-300 rounded border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
            title="同步多位同仁最新掃碼成交與接待紀錄"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#DFBA87]' : ''}`} />
            <span>{isRefreshing ? '同步中...' : '同步紀錄'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={leads.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-white/5 hover:bg-white/10 text-neutral-300 rounded border border-white/10 transition-colors disabled:opacity-40 cursor-pointer"
            title="匯出 Excel / CSV 檔案"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出成交與接待名冊</span>
          </button>

          <button
            onClick={() => handleOpenModal('purchase')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-[#DFBA87] hover:bg-[#c9a370] text-black rounded transition-all shadow-lg shadow-[#DFBA87]/25 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>掃描貴賓卡｜消費登錄＆出場放行</span>
          </button>
        </div>
      </div>

      {/* 2. Staff Checkout & Communication Guide (教品牌如何跟客人溝通掃碼 ＋ 出場放行教學) */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1c1710] via-[#14120f] to-[#0f0e0c] border border-[#DFBA87]/40 p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#DFBA87]/20 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#DFBA87]/20 border border-[#DFBA87]/40 flex items-center justify-center text-[#DFBA87] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-serif text-white font-medium tracking-wide">
                💡 現場結帳必讀：如何引導貴賓出示條碼掃描？（貴賓零額外操作）
              </h3>
              <p className="text-[11px] text-[#DFBA87]">
                不論是 VIP 貴賓或持電子票民眾，皆直接掃描其「入場同一個 QR Code」，貴賓無需另外輸入任何資料！
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#DFBA87] bg-[#DFBA87]/10 px-2.5 py-1 rounded border border-[#DFBA87]/30 self-start md:self-auto">
            Exhibitor SOP · 現場溝通教學
          </span>
        </div>

        {/* Golden Verbatim Pitch Box */}
        <div className="bg-black/50 border-l-4 border-[#DFBA87] rounded-r-lg p-4 space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#DFBA87] font-semibold">
            💬 結帳時對客標準溝通話術（建議品牌人員直接這樣說）：
          </div>
          <p className="text-sm md:text-base font-serif text-white leading-relaxed">
            「<strong className="text-[#DFBA87]">請問您有 VIS 貴賓卡嗎？</strong> 麻煩借我掃一下您的入場條碼做官方典藏登錄。
            <strong className="text-emerald-300">掃碼能幫助大會紀錄您的活躍藏家身分，明年會繼續優先發送 VIP 貴賓卡給您！</strong>
            同時系統也會在您的貴賓卡上產生<strong className="text-white underline decoration-[#DFBA87] underline-offset-4">出場放行憑證（或展後交付官方證明）</strong>，讓您離場或後續收貨更有保障。」
          </p>
        </div>

        {/* Dual Scenario Explanation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-lg bg-emerald-950/25 border border-emerald-500/30 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>情境一：作品【現場提貨帶走】➔ 核發「出場放行憑證 (Exit Pass)」</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              貴賓付款後要直接提走作品時，請掃描貴賓卡並點選<strong className="text-white">「🟢 現場提貨・核發離場放行憑證」</strong>。貴賓的手機貴賓卡頁面與信箱會立即浮現綠燈放行憑證，離場經過中山堂出口時出示手機畫面即可直接放行。
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#DFBA87]/10 border border-[#DFBA87]/30 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#DFBA87]">
              <Package className="w-4 h-4 shrink-0" />
              <span>情境二：作品【無法現場帶走／需訂購或展後寄送】➔ 核發「官方典藏預訂憑證」</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              針對需展至閉幕才撤下寄送之展品、大型家具、或現場付訂金客製訂購，請掃描貴賓卡並點選<strong className="text-white">「📦 展後交付／訂製・核發官方典藏預訂憑證」</strong>。系統將即刻寄發大會官方認證之數位購買證明予貴賓留存，免除手寫單據遺失風險。
            </p>
          </div>
        </div>
      </div>

      {/* Toast Feedback */}
      {message.text && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3.5 rounded text-xs flex items-center justify-between gap-3 ${
            message.type === 'success' 
              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200' 
              : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage({ text: '', type: '' })} className="text-neutral-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* 3. Sales & Exit Pass Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-[#141414] border border-emerald-500/25 p-4 rounded-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <span className="text-[10px] font-mono tracking-wider text-emerald-400 uppercase font-semibold">🎉 現場已成交典藏總數</span>
          <div className="text-2xl md:text-3xl font-serif text-emerald-400 mt-1">
            {purchaseCount} <span className="text-xs font-sans text-neutral-500">筆</span>
          </div>
          <div className="mt-2 text-[10px] text-neutral-400">
            已核發官方憑證・保送下屆 VIP
          </div>
        </div>

        <div className="bg-[#141414] border border-white/5 p-4 rounded-lg relative overflow-hidden group hover:border-[#DFBA87]/30 transition-all">
          <span className="text-[10px] font-mono tracking-wider text-neutral-300 uppercase">🟢 現場提貨・出場放行證</span>
          <div className="text-2xl md:text-3xl font-serif text-white mt-1">
            {handCarryCount} <span className="text-xs font-sans text-neutral-500">張</span>
          </div>
          <div className="mt-2 text-[10px] text-neutral-500">
            當場提走・出口憑證核驗
          </div>
        </div>

        <div className="bg-[#141414] border border-white/5 p-4 rounded-lg relative overflow-hidden group hover:border-[#DFBA87]/30 transition-all">
          <span className="text-[10px] font-mono tracking-wider text-[#DFBA87] uppercase">📦 展後交付／專屬訂購單</span>
          <div className="text-2xl md:text-3xl font-serif text-[#DFBA87] mt-1">
            {postFairOrderCount} <span className="text-xs font-sans text-neutral-500">張</span>
          </div>
          <div className="mt-2 text-[10px] text-neutral-500">
            閉幕寄送／客製訂購官方證明
          </div>
        </div>

        <div className="bg-[#141414] border border-white/5 p-4 rounded-lg relative overflow-hidden group hover:border-[#DFBA87]/30 transition-all">
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase">🔥 尚未結帳・高意向貴賓</span>
          <div className="text-2xl md:text-3xl font-serif text-white mt-1">
            {highIntentCount} <span className="text-xs font-sans text-neutral-500">位 (總接待 {totalLeadsCount})</span>
          </div>
          <div className="mt-2 text-[10px] text-neutral-500">
            展中／展後私洽追蹤名單
          </div>
        </div>
      </div>

      {/* 4. Leads Filter Bar & Search */}
      <div className="bg-[#141414] border border-white/5 rounded-lg p-3 md:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedIntentFilter('all')}
            className={`px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap cursor-pointer ${
              selectedIntentFilter === 'all'
                ? 'bg-white/15 text-white font-medium'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            全部紀錄 ({leads.length})
          </button>
          <button
            onClick={() => setSelectedIntentFilter('purchase')}
            className={`px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              selectedIntentFilter === 'purchase'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                : 'text-neutral-400 hover:text-emerald-200 hover:bg-white/5'
            }`}
          >
            <span>🎉 已成交・放行/預訂憑證</span>
            <span>({purchaseCount})</span>
          </button>
          <button
            onClick={() => setSelectedIntentFilter('high')}
            className={`px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              selectedIntentFilter === 'high'
                ? 'bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30'
                : 'text-neutral-400 hover:text-amber-200 hover:bg-white/5'
            }`}
          >
            <span>🔥 高意向洽談</span>
            <span>({leads.filter(l => l.record_type !== 'purchase' && l.intent_level === 'high').length})</span>
          </button>
          <button
            onClick={() => setSelectedIntentFilter('medium')}
            className={`px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              selectedIntentFilter === 'medium'
                ? 'bg-sky-500/20 text-sky-300 font-medium border border-sky-500/30'
                : 'text-neutral-400 hover:text-sky-200 hover:bg-white/5'
            }`}
          >
            <span>✨ 中度興趣</span>
            <span>({leads.filter(l => l.record_type !== 'purchase' && l.intent_level === 'medium').length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋貴賓姓名、憑證號、Email、品項..."
            className="w-full bg-black/40 border border-white/10 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#DFBA87]/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 5. Leads & Transactions List */}
      {loading ? (
        <div className="p-12 text-center space-y-3 bg-[#111111] rounded-lg border border-white/5">
          <Loader2 className="w-6 h-6 animate-spin text-[#DFBA87] mx-auto" />
          <p className="text-xs text-neutral-500 font-mono tracking-widest uppercase">載入成交與接待紀錄中 Loading...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="p-12 text-center space-y-4 bg-[#111111] rounded-lg border border-dashed border-white/10">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#DFBA87] mx-auto">
            <Camera className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-sm font-serif text-white font-medium">尚無現場消費或接待紀錄</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              當貴賓於展位消費結帳或鑑賞作品時，請詢問「請問有貴賓卡嗎？」並點擊下方按鈕掃描貴賓入場碼，即可核發出場放行／展後交付憑證並為客人累積明年貴賓卡資格。
            </p>
          </div>
          <button
            onClick={() => handleOpenModal('purchase')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-[#DFBA87] hover:bg-[#c9a370] text-black rounded transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>立即開啟掃碼｜消費登錄＆出場放行</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            const isPurchase = lead.record_type === 'purchase' || lead.status === 'closed';
            const isHandCarry = lead.delivery_method === 'hand_carry';
            const isHigh = lead.intent_level === 'high';
            const isMedium = lead.intent_level === 'medium';

            const statusBadge = isPurchase ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  🎉 現場已成交
                </span>
                {lead.delivery_method === 'hand_carry' && (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-emerald-950/80 text-emerald-200 border border-emerald-500/30">
                    🟢 現場提貨｜已發出場放行證
                  </span>
                )}
                {lead.delivery_method === 'post_fair_delivery' && (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-[#DFBA87]/20 text-[#DFBA87] border border-[#DFBA87]/40">
                    📦 展後交付／訂購｜已發預訂憑證
                  </span>
                )}
                {lead.amount_bracket && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white border border-white/15">
                    💰 {lead.amount_bracket}
                  </span>
                )}
                {lead.certificate_no && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#DFBA87] bg-black/50 border border-[#DFBA87]/30">
                    #{lead.certificate_no}
                  </span>
                )}
              </div>
            ) : isHigh ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                🔥 高度意向
              </span>
            ) : isMedium ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30">
                ✨ 中度興趣
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                🌿 初步認識
              </span>
            );

            const matchedProducts = products.filter(p => lead.interested_product_ids?.includes(p.id));

            return (
              <div
                key={lead.id}
                className={`bg-[#141414] border rounded-lg p-4 md:p-5 transition-all space-y-3.5 group ${
                  isPurchase ? 'border-emerald-500/30 hover:border-emerald-500/50' : 'border-white/5 hover:border-[#DFBA87]/40'
                }`}
              >
                {/* Header: Guest Info & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base font-serif text-white font-medium">
                      {lead.vip_name || 'VIS 貴賓'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase font-semibold ${
                      lead.vip_tier === 'SVIP' ? 'bg-[#DFBA87] text-black' : 'bg-white/10 text-neutral-300'
                    }`}>
                      {lead.vip_tier || 'VIP'}
                    </span>
                    {statusBadge}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                    <span className="font-mono">
                      {new Date(lead.created_at).toLocaleString('zh-TW', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <button
                      onClick={() => handleCopyLead(lead)}
                      className="p-1 hover:text-[#DFBA87] transition-colors cursor-pointer"
                      title="複製紀錄資料"
                    >
                      {copiedId === lead.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Contact Row */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-300">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="font-mono">{lead.vip_email}</span>
                  </div>
                  {lead.vip_phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="font-mono">{lead.vip_phone}</span>
                    </div>
                  )}
                  {lead.staff_email && (
                    <div className="text-[11px] text-neutral-500 ml-auto">
                      經手人員: {lead.staff_email.split('@')[0]}
                    </div>
                  )}
                </div>

                {/* Custom Item Title */}
                {lead.custom_item_title && (
                  <div className="px-3 py-2 rounded bg-white/[0.04] border border-white/10 text-xs text-white flex items-center gap-2">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#DFBA87] shrink-0" />
                    <span>典藏／訂購品項：<strong>{lead.custom_item_title}</strong></span>
                  </div>
                )}

                {/* Interested / Purchased Artworks Section */}
                {matchedProducts.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                      {isPurchase ? '成交典藏作品' : '感興趣作品款式'} ({matchedProducts.length}) ✦ 已同步至貴賓手機
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {matchedProducts.map(p => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-xs"
                        >
                          {p.images && p.images[0] ? (
                            <img src={p.images[0]} alt={p.title_zh} className="w-6 h-6 object-cover rounded shrink-0" />
                          ) : (
                            <div className="w-6 h-6 bg-neutral-800 rounded flex items-center justify-center text-[8px]">VIS</div>
                          )}
                          <div className="truncate max-w-[200px]">
                            <span className="text-white block font-medium truncate">{p.title_zh}</span>
                            <span className="text-[10px] font-mono text-[#DFBA87]">{p.price_display || '私洽'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up Actions Tags */}
                {lead.follow_up_actions && lead.follow_up_actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {lead.follow_up_actions.map((act: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[11px] bg-white/5 text-neutral-300 border border-white/10"
                      >
                        {act}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes Block */}
                {lead.notes && (
                  <div className="bg-black/40 border-l-2 border-[#DFBA87] p-2.5 rounded-r text-xs text-neutral-300 leading-relaxed italic">
                    備註：{lead.notes}
                  </div>
                )}

                {/* Sales Follow-up & Closing Toolbar */}
                <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Pipeline Stage Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-neutral-400 font-mono uppercase mr-1">狀態:</span>
                    {[
                      { key: 'new', label: '現場已接待', color: 'bg-white/10 text-neutral-300' },
                      { key: 'contacted', label: '已發送報價/聯繫', color: 'bg-sky-500/20 text-sky-300 border border-sky-500/40' },
                      { key: 'closed', label: '已成交典藏 🎉', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' },
                    ].map(st => {
                      const isCurrent = (lead.status || (isPurchase ? 'closed' : 'new')) === st.key;
                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => handleUpdateStatus(lead.id, st.key)}
                          className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
                            isCurrent
                              ? `${st.color} font-semibold ring-1 ring-white/20`
                              : 'bg-black/30 text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                          }`}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* One-Click Sales Script Copy */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopySalesScript(lead)}
                      className="px-3 py-1.5 bg-[#DFBA87]/15 hover:bg-[#DFBA87]/25 text-[#DFBA87] border border-[#DFBA87]/30 rounded text-xs transition-all flex items-center gap-1.5 cursor-pointer font-medium"
                      title="一鍵生成專屬尊榮感謝或私洽話術，可直接貼入 LINE / 微信"
                    >
                      {copiedScriptId === lead.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">✓ 已複製訊息 (直接貼上即可)</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-[#DFBA87]" />
                          <span>{isPurchase ? '複製典藏感謝與憑證訊息 (LINE/微信)' : '一鍵複製私洽話術 (LINE/微信)'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. CONCIERGE & CHECKOUT MODAL: Camera Scanner & Recording     */}
      {/* ============================================================ */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141414] border border-[#DFBA87]/40 rounded-xl max-w-xl w-full p-4 sm:p-6 text-left space-y-4 sm:space-y-5 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono tracking-widest text-[#DFBA87] uppercase">
                      VIS Official Collector Checkout & Concierge
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Step {modalStep === 'guest' ? '1/2' : modalStep === 'details' ? '2/2' : '完成'}
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-serif text-white font-medium">
                    {modalStep === 'guest' && 'Step 1：掃描貴賓入場碼・辨識藏家身分'}
                    {modalStep === 'details' && 'Step 2：選擇「現場成交放行／預訂」或「鑑賞意向」'}
                    {modalStep === 'success' && '登錄完成・憑證已同步至貴賓手機與信箱'}
                  </h3>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ------------------------------------------------------------ */}
              {/* STEP 1: GUEST SCAN / IDENTIFICATION                          */}
              {/* ------------------------------------------------------------ */}
              {modalStep === 'guest' && (
                <div className="space-y-4">
                  {/* Staff Pitch Reminder inside Scanner Modal */}
                  <div className="p-3 rounded-lg bg-[#DFBA87]/10 border border-[#DFBA87]/30 text-xs space-y-1">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[#DFBA87] font-semibold">
                      💬 對客引導話術（請向客人這樣說明）：
                    </div>
                    <p className="text-white/95 leading-relaxed">
                      「<strong className="text-[#DFBA87]">請問有貴賓卡嗎？</strong>幫您掃一下入場條碼做典藏登錄，這能<strong className="text-emerald-300">幫助大會明年繼續發貴賓卡給您</strong>，同時為您核發<strong className="text-white">出場放行憑證／展後交付官方證明</strong>！」
                    </p>
                  </div>

                  {/* Mode Tabs */}
                  <div className="flex items-center justify-center gap-2 border-b border-white/10 pb-3">
                    <button
                      type="button"
                      onClick={() => setInputMode('camera')}
                      className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                        inputMode === 'camera'
                          ? 'bg-[#DFBA87] text-black font-medium'
                          : 'text-neutral-400 hover:text-white bg-white/5'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>鏡頭掃描入場 QR Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('manual')}
                      className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                        inputMode === 'manual'
                          ? 'bg-[#DFBA87] text-black font-medium'
                          : 'text-neutral-400 hover:text-white bg-white/5'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>手動輸入編號 / Email</span>
                    </button>
                  </div>

                  {/* Camera Viewfinder */}
                  {inputMode === 'camera' && (
                    <div className="space-y-3">
                      <div className="relative mx-auto aspect-square max-w-[270px] w-full bg-black rounded-lg overflow-hidden border border-white/15 flex items-center justify-center shadow-inner">
                        <div id="concierge-qr-reader" className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&_video]:rounded-lg" />
                        
                        {/* Target Overlay */}
                        <div className="pointer-events-none absolute inset-0 border-2 border-[#DFBA87]/40 rounded-lg flex items-center justify-center">
                          <div className="w-48 h-48 border-2 border-[#DFBA87] rounded-sm relative">
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#DFBA87] -translate-x-1 -translate-y-1" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#DFBA87] translate-x-1 -translate-y-1" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#DFBA87] -translate-x-1 translate-y-1" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#DFBA87] translate-x-1 translate-y-1" />
                          </div>
                        </div>

                        {isSearchingGuest && (
                          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center space-y-2 z-10 backdrop-blur-xs">
                            <Loader2 className="w-6 h-6 animate-spin text-[#DFBA87]" />
                            <span className="text-xs text-neutral-300 font-mono">驗證貴賓身分中...</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 text-center">
                        <p className="text-[11px] text-neutral-400">
                          請對準顧客出示的 <span className="text-[#DFBA87]">VIS 數位貴賓卡或電子門票 QR Code</span>（與入場同一個條碼）
                        </p>

                        {/* File Upload / Native Camera Capture Fallback for Mobile */}
                        <div className="flex items-center justify-center gap-2 pt-0.5">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUploadScan}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#DFBA87]" />
                            <span>手機相簿／拍照辨識</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Input Mode */}
                  {inputMode === 'manual' && (
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs text-neutral-300 font-medium">
                          輸入貴賓卡 6 碼編號 (VIS-XXXXXX)、電子信箱或姓名
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={guestSearchInput}
                            onChange={(e) => setGuestSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && resolveGuestIdentity(guestSearchInput)}
                            placeholder="例如：VIS-8F3A2B 或 電子信箱 / 姓名..."
                            className="flex-1 bg-black/50 border border-white/15 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#DFBA87]"
                          />
                          <button
                            type="button"
                            onClick={() => resolveGuestIdentity(guestSearchInput)}
                            disabled={!guestSearchInput.trim() || isSearchingGuest}
                            className="px-4 py-2 bg-[#DFBA87] hover:bg-[#c9a370] text-black rounded text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
                          >
                            {isSearchingGuest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            <span>查詢</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-neutral-400 leading-relaxed">
                        ✦ 若貴賓不便開啟相機掃描，可直接輸入貴賓卡上的 6 碼編號（Member No.）或報名 Email 快速完成登錄。
                      </p>
                    </div>
                  )}

                  {/* Scanner Error Display */}
                  {scannerError && (
                    <div className="p-3 rounded bg-rose-950/60 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>{scannerError}</div>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------ */}
              {/* STEP 2: PURCHASE / EXIT PASS OR INQUIRY DETAILS              */}
              {/* ------------------------------------------------------------ */}
              {modalStep === 'details' && identifiedGuest && (
                <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
                  
                  {/* Verified Guest Card */}
                  <div className="p-3.5 rounded-lg bg-[#DFBA87]/10 border border-[#DFBA87]/30 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-serif text-white font-medium">
                          {identifiedGuest.name || 'VIS 貴賓'}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono tracking-wider font-semibold ${
                          identifiedGuest.tier === 'SVIP' ? 'bg-[#DFBA87] text-black' : 'bg-white/20 text-white'
                        }`}>
                          {identifiedGuest.tier}
                        </span>
                        {identifiedGuest.isVerified && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> 身分已驗證
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-300 font-mono">
                        {identifiedGuest.email} {identifiedGuest.phone ? `｜ ${identifiedGuest.phone}` : ''}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setModalStep('guest')}
                      className="text-[11px] text-[#DFBA87] hover:underline cursor-pointer shrink-0"
                    >
                      重新掃描
                    </button>
                  </div>

                  {/* Mode Switcher: Purchase vs. Inquiry */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-black/60 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setRecordType('purchase')}
                      className={`py-2.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        recordType === 'purchase'
                          ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>🎉 現場消費成交 (核發憑證)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecordType('inquiry')}
                      className={`py-2.5 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        recordType === 'inquiry'
                          ? 'bg-[#DFBA87] text-black shadow-lg shadow-[#DFBA87]/20'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>✨ 鑑賞意向收錄 (尚未結帳)</span>
                    </button>
                  </div>

                  {/* ======================================================== */}
                  {/* PURCHASE MODE: Delivery/Exit Pass + Amount Bracket       */}
                  {/* ======================================================== */}
                  {recordType === 'purchase' && (
                    <div className="space-y-4 p-4 rounded-xl bg-emerald-950/15 border border-emerald-500/30">
                      
                      {/* 1. Delivery / Exit Pass Mode */}
                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-wider text-emerald-300 font-semibold flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" />
                          <span>1. 選擇交付與出場放行方式 (必選)</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setDeliveryMethod('hand_carry')}
                            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                              deliveryMethod === 'hand_carry'
                                ? 'bg-emerald-500/20 border-emerald-400 text-white ring-1 ring-emerald-400/50'
                                : 'bg-black/40 border-white/10 text-neutral-400 hover:border-white/25'
                            }`}
                          >
                            <div className="text-xs font-semibold text-emerald-300 flex items-center justify-between">
                              <span>🟢 現場提貨帶走</span>
                              {deliveryMethod === 'hand_carry' && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                            </div>
                            <div className="text-[11px] text-white/90 font-medium mt-1">
                              核發《離場放行憑證 Exit Pass》
                            </div>
                            <span className="text-[10px] text-neutral-400 block mt-0.5 leading-tight">
                              客人當場提走作品，手機貴賓卡即刻顯示綠燈放行證供出口核驗
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeliveryMethod('post_fair_delivery')}
                            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                              deliveryMethod === 'post_fair_delivery'
                                ? 'bg-[#DFBA87]/20 border-[#DFBA87] text-white ring-1 ring-[#DFBA87]/50'
                                : 'bg-black/40 border-white/10 text-neutral-400 hover:border-white/25'
                            }`}
                          >
                            <div className="text-xs font-semibold text-[#DFBA87] flex items-center justify-between">
                              <span>📦 無法現場帶走／需訂購</span>
                              {deliveryMethod === 'post_fair_delivery' && <Check className="w-3.5 h-3.5 text-[#DFBA87]" />}
                            </div>
                            <div className="text-[11px] text-white/90 font-medium mt-1">
                              核發《官方典藏預訂暨交付憑證》
                            </div>
                            <span className="text-[10px] text-neutral-400 block mt-0.5 leading-tight">
                              適用閉幕後寄送、大型家具或客製預訂，系統即刻發送官方憑證予貴賓留存
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Amount Bracket */}
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-mono uppercase tracking-wider text-[#DFBA87] font-semibold flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>2. 點選本筆成交金額區間 (由品牌填寫)</span>
                          </label>
                          <span className="text-[10px] text-neutral-400">
                            🔒 不顯示於貴賓憑證
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {AMOUNT_BRACKETS.map((bracket) => {
                            const active = amountBracket === bracket;
                            return (
                              <button
                                key={bracket}
                                type="button"
                                onClick={() => setAmountBracket(bracket)}
                                className={`py-2 px-2.5 rounded border text-xs font-mono transition-all cursor-pointer text-center ${
                                  active
                                    ? 'bg-[#DFBA87] text-black font-bold border-[#DFBA87] shadow-sm'
                                    : 'bg-black/50 text-neutral-300 border-white/10 hover:border-white/30'
                                }`}
                              >
                                {bracket}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Custom Item Quick Input */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs text-neutral-300 font-medium block">
                          3. 成交／訂購品項名稱或件數（選填，或於下方勾選已上架作品）
                        </label>
                        <input
                          type="text"
                          value={customItemTitle}
                          onChange={(e) => setCustomItemTitle(e.target.value)}
                          placeholder="例如：白金釉茶碗 1 件、訂製胡桃木單椅（預計 2 月交貨）..."
                          className="w-full bg-black/50 border border-white/15 rounded px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#DFBA87]"
                        />
                      </div>
                    </div>
                  )}

                  {/* 1b. Product Checklist (Shared by Purchase & Inquiry) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#DFBA87]" />
                        <span>{recordType === 'purchase' ? '勾選成交之已上架展品 (選填，可複選)' : '勾選貴賓心儀的作品款式 (可複選)'}</span>
                      </label>
                      <span className="text-[10px] font-mono text-[#DFBA87]">
                        已選 {selectedProductIds.length} 件
                      </span>
                    </div>

                    {products.length === 0 ? (
                      <div className="p-3 rounded bg-white/5 border border-white/10 text-center text-xs text-neutral-400 space-y-1">
                        <p>目前尚無已上架的展品資料（可直接使用上方品項欄位輸入）。</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-black/30 rounded border border-white/5">
                        {products.map((p) => {
                          const isSelected = selectedProductIds.includes(p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => toggleProductSelect(p.id)}
                              className={`p-2 rounded border cursor-pointer transition-all flex items-center gap-2.5 ${
                                isSelected
                                  ? 'bg-[#DFBA87]/15 border-[#DFBA87] text-white shadow-sm'
                                  : 'bg-white/5 border-white/10 text-neutral-300 hover:border-white/30'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-[#DFBA87] border-[#DFBA87] text-black' : 'border-neutral-500'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>

                              {p.images && p.images[0] ? (
                                <img src={p.images[0]} alt={p.title_zh} className="w-8 h-8 object-cover rounded shrink-0 border border-white/10" />
                              ) : (
                                <div className="w-8 h-8 bg-neutral-800 rounded shrink-0 flex items-center justify-center text-[8px]">VIS</div>
                              )}

                              <div className="min-w-0 flex-1 text-left">
                                <h5 className="text-xs font-serif font-medium truncate">{p.title_zh}</h5>
                                <span className="text-[10px] font-mono text-[#DFBA87] block">{p.price_display || '私洽'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* INQUIRY MODE ONLY: Intent Level & Follow-up Actions */}
                  {recordType === 'inquiry' && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-[#DFBA87]" />
                          <span>購買意向程度 (Intent Level)</span>
                        </label>

                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setIntentLevel('high')}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              intentLevel === 'high'
                                ? 'bg-amber-500/20 border-amber-500 text-white shadow-md'
                                : 'bg-white/5 border-white/10 text-neutral-400 hover:border-white/20'
                            }`}
                          >
                            <div className="text-xs font-medium text-amber-300 flex items-center gap-1">
                              <span>🔥 高度購買意向</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 block mt-1 leading-tight">
                              展期/展後預備下單，款式偏好明確
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIntentLevel('medium')}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              intentLevel === 'medium'
                                ? 'bg-sky-500/20 border-sky-500 text-white shadow-md'
                                : 'bg-white/5 border-white/10 text-neutral-400 hover:border-white/20'
                            }`}
                          >
                            <div className="text-xs font-medium text-sky-300 flex items-center gap-1">
                              <span>✨ 中度鑑賞興趣</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 block mt-1 leading-tight">
                              喜愛風格，考慮空間搭配或禮品
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setIntentLevel('discovery')}
                            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              intentLevel === 'discovery'
                                ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-md'
                                : 'bg-white/5 border-white/10 text-neutral-400 hover:border-white/20'
                            }`}
                          >
                            <div className="text-xs font-medium text-emerald-300 flex items-center gap-1">
                              <span>🌿 初步認識交流</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 block mt-1 leading-tight">
                              欣賞品牌美學，願意接收新作資訊
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#DFBA87]" />
                          <span>下次聯繫與服務事項 (Follow-up Actions)</span>
                        </label>

                        <div className="flex flex-wrap gap-1.5">
                          {PRESET_FOLLOW_UP_ACTIONS.map((action, idx) => {
                            const isSelected = selectedFollowUps.includes(action);
                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => toggleFollowUpTag(action)}
                                className={`px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#DFBA87] text-black font-medium border border-[#DFBA87]'
                                    : 'bg-white/5 text-neutral-300 border border-white/10 hover:border-white/30'
                                }`}
                              >
                                {action}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            value={customFollowUp}
                            onChange={(e) => setCustomFollowUp(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomFollowUp())}
                            placeholder="自訂其他備註事項 (按 Enter 加入)..."
                            className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#DFBA87]"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomFollowUp}
                            disabled={!customFollowUp.trim()}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-neutral-200 rounded text-xs transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            ＋ 加入
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Staff Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold">
                      {recordType === 'purchase' ? '交付／預計寄送日期或訂製規格備註 (會顯示於貴賓憑證)' : '管家接待筆記／尺寸偏好／溝通要點'}
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={
                        recordType === 'purchase'
                          ? '例如：1/10 閉幕撤展後順豐寄出；或：已付訂金，預計 2027 年 3 月中旬交付...'
                          : '例如：試戴玫瑰金黑珍珠胸針，偏好暖金色系；預計下週出國前需確認手圍 #11 與送禮報價...'
                      }
                      className="w-full bg-black/50 border border-white/15 rounded p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#DFBA87]"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setModalStep('guest')}
                      className="px-4 py-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      ← 返回重新掃描
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitLead}
                      disabled={submitting}
                      className={`px-5 py-2.5 font-semibold text-xs rounded transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                        recordType === 'purchase'
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-emerald-500/20'
                          : 'bg-[#DFBA87] hover:bg-[#c9a370] text-black shadow-[#DFBA87]/20'
                      }`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>核發憑證與同步中...</span>
                        </>
                      ) : recordType === 'purchase' ? (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>
                            確認成交｜核發{deliveryMethod === 'hand_carry' ? '「出場放行憑證」' : '「官方預訂憑證」'}＆登錄藏家
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>完成接待・同步加入貴賓收藏並建立名單</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}

              {/* ------------------------------------------------------------ */}
              {/* STEP 3: SUCCESS CONFIRMATION                                 */}
              {/* ------------------------------------------------------------ */}
              {modalStep === 'success' && identifiedGuest && (
                <div className="text-center space-y-4 py-5">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  {recordType === 'purchase' ? (
                    <div className="space-y-3">
                      <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                        憑證編號：{lastCreatedLead?.certificate_no || '已核發'}
                      </div>
                      <h4 className="text-lg font-serif text-white font-medium">
                        {deliveryMethod === 'hand_carry'
                          ? '🟢《離場放行憑證 Exit Pass》已核發！'
                          : '📦《官方典藏預訂暨交付憑證》已核發！'}
                      </h4>
                      <p className="text-xs text-neutral-300 max-w-md mx-auto leading-relaxed">
                        已同步發送至 <strong className="text-white">{identifiedGuest.name || identifiedGuest.email}</strong> 的 VIS 數位貴賓卡與電子信箱，並正式為其登錄<strong className="text-[#DFBA87]">下屆 VIS 貴賓卡優先續發資格</strong>。
                      </p>
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10 max-w-md mx-auto text-[11px] text-neutral-300">
                        {deliveryMethod === 'hand_carry'
                          ? '💡 請提醒貴賓：離場經過中山堂出口時，打開原本的貴賓卡頁面出示此綠燈放行憑證即可順暢通行。'
                          : '💡 請提醒貴賓：官方預訂證明已寄達其信箱與貴賓卡頁面，貴賓可隨時查閱。'}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <h4 className="text-lg font-serif text-white font-medium">接待紀錄與典藏同步成功！</h4>
                      <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed">
                        已為 <strong className="text-white">{identifiedGuest.name || identifiedGuest.email}</strong> 同步將心儀作品收錄至其 VIS 貴賓卡，並發送專屬收錄確認信。
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 pt-4">
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-white/10 hover:bg-white/15 text-neutral-300 text-xs rounded transition-colors cursor-pointer"
                    >
                      關閉視窗
                    </button>
                    <button
                      onClick={() => handleOpenModal('purchase')}
                      className="px-5 py-2 bg-[#DFBA87] hover:bg-[#c9a370] text-black font-semibold text-xs rounded transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>繼續掃描下一位貴賓</span>
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
