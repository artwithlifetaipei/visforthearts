'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Camera, Plus, Download, Search, CheckCircle2, 
  AlertCircle, Loader2, X, RefreshCw, Star, Mail, Phone, 
  Calendar, Eye, ArrowRight, Tag, Heart, Info, Check, Copy
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
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIntentFilter, setSelectedIntentFilter] = useState<'all' | 'high' | 'medium' | 'discovery'>('all');

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

  // Concierge Form State
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
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.email) {
          const userEmail = session.user.email.toLowerCase().trim();
          setStaffEmail(userEmail);

          if (!currentBrand) {
            const { data } = await supabase
              .from('exhibitor_brands')
              .select('*')
              .eq('portal_email', userEmail)
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
            // Fallback to fetch all published if brand hasn't uploaded yet so they can test immediately
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

        // Fetch Leads
        await fetchLeads(currentBrand?.id);

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
      handleOpenModal();
    }
  }, [autoScanParam, loading]);

  const fetchLeads = async (brandId?: string) => {
    try {
      const { data, error } = await supabase
        .from('exhibitor_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('not find')) {
          // Fall back seamlessly to local storage cache without any technical warnings
          const cached = safeGetStorage('vis_local_leads_backup');
          if (cached) {
            try { setLeads(JSON.parse(cached)); } catch {}
          }
        }
      } else if (data) {
        // Filter by brand_id if specified, or show all for admin/demo
        if (brandId && brandId !== '00000000-0000-0000-0000-000000000000') {
          setLeads(data.filter(l => l.brand_id === brandId));
        } else {
          setLeads(data);
        }
      }
    } catch (e) {
      console.warn('fetchLeads failed:', e);
    }
  };

  // 2. Open / Close Concierge Modal
  const handleOpenModal = () => {
    setModalStep('guest');
    setIdentifiedGuest(null);
    setGuestSearchInput('');
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

    // Guaranteed 6s safety timeout so the spinner can NEVER hang indefinitely
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 6000)
    );

    const lookupWork = (async () => {
      const term = searchTerm.toLowerCase().trim();
      let resolved: any = null;

      // --- 1. UUID Match (36 chars with dashes) ---
      if (term.length === 36 && term.includes('-')) {
        // A. Check tickets table first (matches electronic tickets & guest invitations)
        try {
          const { data: ticket } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', term)
            .maybeSingle();

          if (ticket) {
            resolved = {
              id: ticket.id,
              email: ticket.email,
              name: ticket.name || null,
              phone: null,
              tier: 'VIP',
              role: ticket.brand_name ? `特邀貴賓 (${ticket.brand_name})` : 'VIS 貴賓',
              company: ticket.brand_name || null,
              isVerified: true
            };
          }
        } catch (e) {
          console.warn('Ticket lookup error:', e);
        }

        // B. Check vip_allowlist by ID
        if (!resolved) {
          try {
            const { data: alById } = await supabase
              .from('vip_allowlist')
              .select('*')
              .eq('id', term)
              .maybeSingle();

            if (alById) {
              resolved = {
                id: alById.id,
                email: alById.email,
                name: alById.name || null,
                phone: null,
                tier: (alById.tier as 'VIP' | 'SVIP') || 'VIP',
                role: alById.role || 'VIP 貴賓',
                company: alById.company || null,
                isVerified: true
              };
            }
          } catch (e) {
            console.warn('Allowlist by ID error:', e);
          }
        }

        // C. Check users table by ID
        if (!resolved) {
          try {
            const { data: uData } = await supabase
              .from('users')
              .select('*')
              .eq('id', term)
              .maybeSingle();

            if (uData) {
              const { data: alData } = await supabase
                .from('vip_allowlist')
                .select('*')
                .ilike('email', uData.email)
                .maybeSingle();

              resolved = {
                id: uData.id,
                email: uData.email,
                name: alData?.name || null,
                phone: null,
                tier: (alData?.tier as 'VIP' | 'SVIP') || 'VIP',
                role: alData?.role || 'VIP 貴賓',
                company: alData?.company || null,
                isVerified: true
              };
            }
          } catch (e) {
            console.warn('Users by ID error:', e);
          }
        }
      }

      // --- 2. Search by Email ---
      if (!resolved && term.includes('@')) {
        // Check vip_allowlist
        try {
          const { data: alData } = await supabase
            .from('vip_allowlist')
            .select('*')
            .ilike('email', term)
            .maybeSingle();

          if (alData) {
            resolved = {
              id: alData.id,
              email: alData.email,
              name: alData.name || null,
              phone: null,
              tier: (alData.tier as 'VIP' | 'SVIP') || 'VIP',
              role: alData.role || 'VIP 貴賓',
              company: alData.company || null,
              isVerified: true
            };
          }
        } catch (e) {
          console.warn('Allowlist by email error:', e);
        }

        // Check tickets table
        if (!resolved) {
          try {
            const { data: tData } = await supabase
              .from('tickets')
              .select('*')
              .ilike('email', term)
              .maybeSingle();

            if (tData) {
              resolved = {
                id: tData.id,
                email: tData.email,
                name: tData.name || null,
                phone: null,
                tier: 'VIP',
                role: tData.brand_name ? `特邀貴賓 (${tData.brand_name})` : 'VIS 貴賓',
                company: tData.brand_name || null,
                isVerified: true
              };
            }
          } catch (e) {
            console.warn('Tickets by email error:', e);
          }
        }

        // Check users table
        if (!resolved) {
          try {
            const { data: uData } = await supabase
              .from('users')
              .select('*')
              .ilike('email', term)
              .maybeSingle();

            if (uData) {
              resolved = {
                id: uData.id,
                email: uData.email,
                name: null,
                phone: null,
                tier: 'VIP',
                role: 'VIP 貴賓',
                company: null,
                isVerified: true
              };
            }
          } catch (e) {
            console.warn('Users by email error:', e);
          }
        }
      }

      // --- 3. Search by Name ---
      if (!resolved && term.length >= 2) {
        // Check vip_allowlist by name
        try {
          const { data: alList } = await supabase
            .from('vip_allowlist')
            .select('*')
            .or(`name.ilike.%${term}%,email.ilike.%${term}%`)
            .limit(1);

          if (alList && alList.length > 0) {
            const al = alList[0];
            resolved = {
              id: al.id,
              email: al.email,
              name: al.name || null,
              phone: null,
              tier: (al.tier as 'VIP' | 'SVIP') || 'VIP',
              role: al.role || 'VIP 貴賓',
              company: al.company || null,
              isVerified: true
            };
          }
        } catch (e) {
          console.warn('Allowlist by name error:', e);
        }

        // Check tickets by name
        if (!resolved) {
          try {
            const { data: tList } = await supabase
              .from('tickets')
              .select('*')
              .ilike('name', `%${term}%`)
              .limit(1);

            if (tList && tList.length > 0) {
              const t = tList[0];
              resolved = {
                id: t.id,
                email: t.email,
                name: t.name || null,
                phone: null,
                tier: 'VIP',
                role: t.brand_name ? `特邀貴賓 (${t.brand_name})` : 'VIS 貴賓',
                company: t.brand_name || null,
                isVerified: true
              };
            }
          } catch (e) {
            console.warn('Tickets by name error:', e);
          }
        }
      }

      // --- 4. Fallback Handling ---
      if (!resolved) {
        if (term.includes('@')) {
          resolved = {
            email: term,
            name: null,
            tier: 'VIP',
            role: '現場登記貴賓',
            isVerified: false
          };
        } else {
          setScannerError('系統查無此條碼紀錄。請確認為 VIS 貴賓卡或門票，或切換至「手動輸入查詢」直接輸入 Email 登記。');
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

  // 7. Complete Concierge Lead & Dual-Sync
  const handleSubmitLead = async () => {
    if (!identifiedGuest?.email) return;

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
        intent_level: intentLevel,
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

      // Update local storage backup
      const localLead = {
        id: result.lead?.id || `local-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString()
      };
      const existing = leads;
      const updated = [localLead, ...existing];
      setLeads(updated);
      safeSetStorage('vis_local_leads_backup', JSON.stringify(updated));

      setModalStep('success');
      setMessage({
        text: `✓ 成功完成接待！心儀作品已同步加入 ${identifiedGuest.name || identifiedGuest.email} 的貴賓典藏。`,
        type: 'success'
      });

      // Refetch from database
      fetchLeads(brand?.id);

    } catch (err: any) {
      console.error('handleSubmitLead error:', err);
      setMessage({
        text: `接待紀錄儲存失敗: ${err.message}`,
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 8. Copy Lead Info
  const handleCopyLead = (lead: any) => {
    const text = `【VIS 貴賓接待名單】\n姓名: ${lead.vip_name || '無'}\n身分: ${lead.vip_tier}\nEmail: ${lead.vip_email}\n電話: ${lead.vip_phone || '無'}\n意向程度: ${
      lead.intent_level === 'high' ? '🔥 高度意向' : lead.intent_level === 'medium' ? '✨ 中度興趣' : '🌿 初步認識'
    }\n後續事項: ${lead.follow_up_actions?.join(', ') || '無'}\n備註: ${lead.notes || '無'}`;

    navigator.clipboard.writeText(text);
    setCopiedId(lead.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // 8.5 Copy Tailored Luxury Sales Follow-Up Script (LINE / WeChat / SMS)
  const handleCopySalesScript = (lead: any) => {
    const brandName = lead.brand_name_zh || brand?.brand_name_zh || '本品牌';
    const guestName = lead.vip_name ? `${lead.vip_name} 貴賓` : '貴賓';
    const matched = products.filter(p => lead.interested_product_ids?.includes(p.id));
    const productTitles = matched.map(p => `《${p.title_zh}》`).join('、') || '現場鑑賞作品';
    const actions = (lead.follow_up_actions || []).join('、');

    const text = `您好 ${guestName}！\n感謝您今日蒞臨 VIS 2027 博覽會【${brandName}】展位鑑賞交流。\n\n現場專員已為您將剛才討論的 ${productTitles} 收錄至您的專屬貴賓卡中。\n\n${actions ? `針對您現場提及的【${actions}】` : '關於作品的客製細節與正式報價'}，我們已為您備妥高解析細節型錄與方案。如需安排展後工作室鑑賞或確認規格，隨時歡迎直接以此訊息與我們私洽！\n\n✦ 您的專屬典藏回看：https://www.visforthearts.com/vip/dashboard\n\n期待展後能再次為您服務！\n— ${brandName} 敬上`;

    navigator.clipboard.writeText(text);
    setCopiedScriptId(lead.id);
    setTimeout(() => setCopiedScriptId(null), 3500);
  };

  // 8.6 Update Lead Sales Pipeline Stage
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    try {
      await supabase.from('exhibitor_leads').update({ status: newStatus }).eq('id', leadId);
    } catch {
      // Non-blocking
    }
  };

  // 9. Export CSV
  const handleExportCSV = () => {
    if (leads.length === 0) return;

    const headers = ['接待時間', '貴賓姓名', '身分等級', 'Email', '聯絡電話', '意向程度', '後續聯繫事項', '感興趣作品數', '管家備註', '接待人員'];
    
    const rows = leads.map(l => [
      new Date(l.created_at).toLocaleString('zh-TW'),
      `"${(l.vip_name || '').replace(/"/g, '""')}"`,
      l.vip_tier || 'VIP',
      l.vip_email,
      `"${(l.vip_phone || '').replace(/"/g, '""')}"`,
      l.intent_level === 'high' ? '高度購買意向' : l.intent_level === 'medium' ? '中度鑑賞興趣' : '初步認識交流',
      `"${(l.follow_up_actions || []).join('; ').replace(/"/g, '""')}"`,
      l.interested_product_ids?.length || 0,
      `"${(l.notes || '').replace(/"/g, '""')}"`,
      l.staff_email || ''
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `VIS_2027_貴賓接待商機名單_${brand?.brand_name_zh || 'Brand'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Leads
  const filteredLeads = leads.filter(lead => {
    if (selectedIntentFilter !== 'all' && lead.intent_level !== selectedIntentFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = lead.vip_name?.toLowerCase().includes(q);
      const matchEmail = lead.vip_email?.toLowerCase().includes(q);
      const matchNotes = lead.notes?.toLowerCase().includes(q);
      const matchActions = lead.follow_up_actions?.some((a: string) => a.toLowerCase().includes(q));
      return matchName || matchEmail || matchNotes || matchActions;
    }
    return true;
  });

  // Calculate Stats
  const totalLeadsCount = leads.length;
  const highIntentCount = leads.filter(l => l.intent_level === 'high').length;
  const totalSavedArtworksCount = leads.reduce((acc, curr) => acc + (curr.interested_product_ids?.length || 0), 0);
  const pendingActionsCount = leads.filter(l => (l.follow_up_actions?.length || 0) > 0).length;

  return (
    <div className="space-y-8 font-sans-outfit">
      
      {/* 1. Header Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#DFBA87] bg-[#DFBA87]/10 px-2 py-0.5 rounded border border-[#DFBA87]/20">
              MODULE F ｜ VIP SALES ENABLEMENT & LEADS
            </span>
            <span className="text-xs text-neutral-400">品牌專屬銷售賦能系統</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif-garamond text-white font-normal tracking-wide">
            現場貴賓接待與私洽成交系統
          </h1>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            【助參展商促成實質銷售】現場迅速記錄試戴與心儀款式，將短暫參觀轉化為展後可持續成交的名單；本名單為貴品牌獨立私享管理，保障大額交易隱私。
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleExportCSV}
            disabled={leads.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-white/5 hover:bg-white/10 text-neutral-300 rounded border border-white/10 transition-colors disabled:opacity-40 cursor-pointer"
            title="匯出 Excel / CSV 檔案"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出商機名單</span>
          </button>

          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#DFBA87] hover:bg-[#c9a370] text-black rounded transition-all shadow-lg shadow-[#DFBA87]/20 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>現場掃描貴賓卡</span>
          </button>
        </div>
      </div>

      {/* Privacy & Discretion Guarantee Banner */}
      <div className="flex items-center gap-2.5 text-xs text-[#DFBA87] bg-[#DFBA87]/5 border border-[#DFBA87]/25 px-4 py-2.5 rounded-lg">
        <Sparkles className="w-4 h-4 text-[#DFBA87] shrink-0" />
        <span className="leading-relaxed">
          <strong>🔒 品牌專屬私密資料庫</strong>：本系統為貴品牌之獨立私享成交工具，所有接待紀錄、客戶聯絡資訊與對話僅貴品牌後台可見，不對外公開或展示於公共前端。
        </span>
      </div>

      {/* 2. Staff Pitch Golden Banner (接待禮儀話術引導) */}
      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-[#DFBA87]/15 via-[#DFBA87]/5 to-transparent border border-[#DFBA87]/30 p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#DFBA87]/20 border border-[#DFBA87]/40 flex items-center justify-center text-[#DFBA87] shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#DFBA87] font-semibold">
                現場品牌管家服務引導話術
              </h3>
              <span className="text-[10px] text-neutral-400 bg-white/5 px-2 py-0.2 rounded border border-white/10">
                延伸服務・非推銷
              </span>
            </div>
            <p className="text-sm md:text-[15px] font-serif text-white/90 italic leading-relaxed">
              「您可以出示 VIS 貴賓卡，我們幫您把剛才喜歡的款式加入收藏，之後可以直接查看，也方便我們提供尺寸與訂製資訊。」
            </p>
            <p className="text-[11px] text-neutral-400 leading-normal">
              ✦ 掃碼後系統將自動將作品送達貴賓的個人手機典藏頁面，同時為品牌記錄意向程度與下次聯繫事項，實現展後精準跟進。
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

      {/* 3. Sales Pipeline Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-[#141414] border border-white/5 p-4 rounded-lg relative overflow-hidden group hover:border-[#DFBA87]/30 transition-all">
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase">現場接待貴賓</span>
          <div className="text-2xl md:text-3xl font-serif text-white mt-1">
            {totalLeadsCount} <span className="text-xs font-sans text-neutral-500">位</span>
          </div>
          <div className="mt-2 text-[10px] text-neutral-500">
            已直接對接貴賓手機
          </div>
        </div>

        <div className="bg-[#141414] border border-white/5 p-4 rounded-lg relative overflow-hidden group hover:border-[#DFBA87]/30 transition-all">
          <span className="text-[10px] font-mono tracking-wider text-[#DFBA87] uppercase">🔥 高度購買意向</span>
          <div className="text-2xl md:text-3xl font-serif text-[#DFBA87] mt-1">
            {highIntentCount} <span className="text-xs font-sans text-neutral-500">位</span>
          </div>
          <div className="mt-2 text-[10px] text-neutral-500">
            偏好明確・展後預備下單
          </div>
        </div>

        <div className="bg-[#141414] border border-white/5 p-4 rounded-lg relative overflow-hidden group hover:border-[#DFBA87]/30 transition-all">
          <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase">⏳ 待跟進聯繫事項</span>
          <div className="text-2xl md:text-3xl font-serif text-white mt-1">
            {pendingActionsCount} <span className="text-xs font-sans text-neutral-500">項</span>
          </div>
          <div className="mt-2 text-[10px] text-neutral-500">
            報價單／戒圍確認／預約鑑賞
          </div>
        </div>

        <div className="bg-[#141414] border border-white/5 p-4 rounded-lg relative overflow-hidden group hover:border-[#DFBA87]/30 transition-all">
          <span className="text-[10px] font-mono tracking-wider text-emerald-400 uppercase">🎉 成功成交 / 推進中</span>
          <div className="text-2xl md:text-3xl font-serif text-emerald-400 mt-1">
            {leads.filter(l => l.status === 'closed' || l.status === 'contacted').length} <span className="text-xs font-sans text-neutral-500">筆</span>
          </div>
          <div className="mt-2 text-[10px] text-neutral-500">
            展後高單價實質訂單
          </div>
        </div>
      </div>

      {/* 4. Leads Filter Bar & Search */}
      <div className="bg-[#141414] border border-white/5 rounded-lg p-3 md:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Intent Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedIntentFilter('all')}
            className={`px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap cursor-pointer ${
              selectedIntentFilter === 'all'
                ? 'bg-white/15 text-white font-medium'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
            }`}
          >
            已掃碼貴賓 ({leads.length})
          </button>
          <button
            onClick={() => setSelectedIntentFilter('high')}
            className={`px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              selectedIntentFilter === 'high'
                ? 'bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30'
                : 'text-neutral-400 hover:text-amber-200 hover:bg-white/5'
            }`}
          >
            <span>🔥 高意向</span>
            <span>({leads.filter(l => l.intent_level === 'high').length})</span>
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
            <span>({leads.filter(l => l.intent_level === 'medium').length})</span>
          </button>
          <button
            onClick={() => setSelectedIntentFilter('discovery')}
            className={`px-3 py-1.5 rounded text-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1 ${
              selectedIntentFilter === 'discovery'
                ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30'
                : 'text-neutral-400 hover:text-emerald-200 hover:bg-white/5'
            }`}
          >
            <span>🌿 初步認識</span>
            <span>({leads.filter(l => l.intent_level === 'discovery').length})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋貴賓姓名、Email、備註..."
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

      {/* 5. Leads List Table / Cards */}
      {loading ? (
        <div className="p-12 text-center space-y-3 bg-[#111111] rounded-lg border border-white/5">
          <Loader2 className="w-6 h-6 animate-spin text-[#DFBA87] mx-auto" />
          <p className="text-xs text-neutral-500 font-mono tracking-widest uppercase">載入接待紀錄中 Loading...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="p-12 text-center space-y-4 bg-[#111111] rounded-lg border border-dashed border-white/10">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#DFBA87] mx-auto">
            <Camera className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-sm font-serif text-white font-medium">尚無貴賓接待紀錄</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              展會現場當貴賓於展位試戴或欣賞作品時，點擊下方「現場掃描貴賓卡」，即可為貴賓收錄喜愛款式並建立商機紀錄。
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#DFBA87] hover:bg-[#c9a370] text-black rounded transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>立即體驗掃描貴賓卡</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map((lead) => {
            const isHigh = lead.intent_level === 'high';
            const isMedium = lead.intent_level === 'medium';
            const intentBadge = isHigh ? (
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

            // Find matching product objects
            const matchedProducts = products.filter(p => lead.interested_product_ids?.includes(p.id));

            return (
              <div
                key={lead.id}
                className="bg-[#141414] border border-white/5 hover:border-[#DFBA87]/40 rounded-lg p-4 md:p-5 transition-all space-y-3.5 group"
              >
                {/* Header: Guest Info & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base font-serif text-white font-medium">
                      {lead.vip_name || 'VIP 貴賓'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase font-semibold ${
                      lead.vip_tier === 'SVIP' ? 'bg-[#DFBA87] text-black' : 'bg-white/10 text-neutral-300'
                    }`}>
                      {lead.vip_tier || 'VIP'}
                    </span>
                    {intentBadge}
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
                      title="複製接待資料"
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
                      接待人員: {lead.staff_email.split('@')[0]}
                    </div>
                  )}
                </div>

                {/* Interested Artworks Section */}
                {matchedProducts.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                      感興趣作品款式 ({matchedProducts.length}) ✦ 已同步至貴賓手機
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
                    <span className="text-[10px] text-neutral-400 font-mono uppercase mr-1">成交推進:</span>
                    {[
                      { key: 'new', label: '現場已接待', color: 'bg-white/10 text-neutral-300' },
                      { key: 'contacted', label: '已發送報價/聯繫', color: 'bg-sky-500/20 text-sky-300 border border-sky-500/40' },
                      { key: 'closed', label: '展後成功成交 🎉', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' },
                    ].map(st => {
                      const isCurrent = (lead.status || 'new') === st.key;
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
                      title="一鍵生成專屬尊榮話術，可直接貼入 LINE / 微信私洽"
                    >
                      {copiedScriptId === lead.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">✓ 已複製私洽話術 (直接貼上即可)</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-[#DFBA87]" />
                          <span>一鍵複製私洽話術 (LINE/微信)</span>
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
      {/* 6. CONCIERGE MODAL: Real-time Camera Scanner & Recording      */}
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
                      VIP Concierge Desk
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Step {modalStep === 'guest' ? '1/2' : modalStep === 'details' ? '2/2' : '完成'}
                    </span>
                  </div>
                  <h3 className="text-base md:text-lg font-serif text-white font-medium">
                    {modalStep === 'guest' && '掃描貴賓卡・確認接待對象'}
                    {modalStep === 'details' && '收錄心儀款式與客製事項'}
                    {modalStep === 'success' && '接待完成・已同步至貴賓典藏'}
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
                      <span>鏡頭掃描條碼</span>
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
                      <span>手動輸入查詢</span>
                    </button>
                  </div>

                  {/* Camera Viewfinder */}
                  {inputMode === 'camera' && (
                    <div className="space-y-3">
                      <div className="relative mx-auto aspect-square max-w-[280px] w-full bg-black rounded-lg overflow-hidden border border-white/15 flex items-center justify-center shadow-inner">
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
                          手機鏡頭對準顧客出示的 <span className="text-[#DFBA87]">VIS 數位貴賓卡 QR Code</span>
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
                        <label className="text-xs text-neutral-300 font-medium">貴賓電子信箱、姓名或手機號碼</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={guestSearchInput}
                            onChange={(e) => setGuestSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && resolveGuestIdentity(guestSearchInput)}
                            placeholder="例如：pipi727813@gmail.com 或 0912..."
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
                        ✦ 若貴賓手機未隨身或電量不足，可請貴賓口頭提供報名時的 Email，直接建立尊榮收錄紀錄。
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
              {/* STEP 2: CONCIERGE DETAILS & PRODUCT SELECTION                */}
              {/* ------------------------------------------------------------ */}
              {modalStep === 'details' && identifiedGuest && (
                <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                  
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
                      className="text-[11px] text-[#DFBA87] hover:underline cursor-pointer"
                    >
                      重新掃描
                    </button>
                  </div>

                  {/* 1. Product Checklist */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#DFBA87]" />
                        <span>勾選貴賓心儀的作品款式 (可複選)</span>
                      </label>
                      <span className="text-[10px] font-mono text-[#DFBA87]">
                        已選 {selectedProductIds.length} 件
                      </span>
                    </div>

                    {products.length === 0 ? (
                      <div className="p-3 rounded bg-white/5 border border-white/10 text-center text-xs text-neutral-400 space-y-1">
                        <p>目前尚無已上架的展品資料。</p>
                        <Link href="/exhibitor/portal/products" className="text-[#DFBA87] underline">
                          前往「模組 E 展品管理」新增作品 →
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-black/30 rounded border border-white/5">
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
                                <img src={p.images[0]} alt={p.title_zh} className="w-9 h-9 object-cover rounded shrink-0 border border-white/10" />
                              ) : (
                                <div className="w-9 h-9 bg-neutral-800 rounded shrink-0 flex items-center justify-center text-[8px]">VIS</div>
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

                  {/* 2. Intent Level (意向程度) */}
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

                  {/* 3. Follow-up Actions (下次聯繫事項) */}
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

                    {/* Add Custom Follow-up */}
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

                  {/* 4. Staff Notes (接待筆記) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-semibold">
                      管家接待筆記／尺寸偏好／溝通要點
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="例如：試戴玫瑰金黑珍珠胸針，偏好暖金色系；預計下週出國前需確認手圍 #11 與送禮報價..."
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
                      ← 返回身分確認
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitLead}
                      disabled={submitting}
                      className="px-5 py-2.5 bg-[#DFBA87] hover:bg-[#c9a370] text-black font-medium text-xs rounded transition-all shadow-lg shadow-[#DFBA87]/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>同步收錄中...</span>
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
                <div className="text-center space-y-4 py-6">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-lg font-serif text-white font-medium">接待紀錄與典藏同步成功！</h4>
                    <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed">
                      已為 <strong className="text-white">{identifiedGuest.name || identifiedGuest.email}</strong> 同步將 {selectedProductIds.length} 款作品收錄至其 VIS 貴賓卡，並發送專屬收錄確認信。
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-4">
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 bg-white/10 hover:bg-white/15 text-neutral-300 text-xs rounded transition-colors cursor-pointer"
                    >
                      關閉視窗
                    </button>
                    <button
                      onClick={handleOpenModal}
                      className="px-5 py-2 bg-[#DFBA87] hover:bg-[#c9a370] text-black font-medium text-xs rounded transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>繼續接待下一位貴賓</span>
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
