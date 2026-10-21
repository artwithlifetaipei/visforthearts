'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Share2, ArrowLeft, ExternalLink, Sparkles, 
  Check, MapPin, Tag, ShieldCheck, Mail, Loader2, MessageSquare, 
  HelpCircle, ChevronRight, CheckCircle2 
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Ignore storage restriction errors
  }
  return null;
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage restriction errors
  }
}

export default function ArtworkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  
  // Quick Collect Dialog for first-time visitors
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [inputEmail, setInputEmail] = useState('');
  const [inputName, setInputName] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inquiry Drawer state
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryType, setInquiryType] = useState('價格與私洽報價');
  const [inquiryNote, setInquiryNote] = useState('');
  const [inquirySent, setInquirySent] = useState(false);

  useEffect(() => {
    const init = async () => {
      // 1. Check existing authenticated session or stored email
      let currentEmail = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          currentEmail = session.user.email.toLowerCase().trim();
          setUserEmail(currentEmail);
          safeSetStorage('vis_vip_email', currentEmail);
        } else {
          const cached = safeGetStorage('vis_vip_email');
          if (cached) {
            currentEmail = cached;
            setUserEmail(cached);
          }
        }
      } catch {
        // Non-blocking
      }

      // 2. Fetch product details
      if (!productId) return;

      try {
        const { data, error } = await supabase
          .from('exhibitor_products')
          .select('*')
          .eq('id', productId)
          .maybeSingle();

        if (error) {
          console.error('Fetch product error:', error);
        }

        if (data) {
          setProduct(data);

          // Check if already in user's collection
          if (currentEmail) {
            try {
              const { data: col } = await supabase
                .from('vip_collections')
                .select('id')
                .eq('vip_email', currentEmail)
                .eq('product_id', productId)
                .maybeSingle();

              if (col) setIsSaved(true);
            } catch {
              // Non-blocking
            }
          }
        }
      } catch (err) {
        console.error('Fetch artwork exception:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [productId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleToggleSave = async () => {
    if (!product) return;

    // If user has no identified email yet, prompt for quick email capture
    if (!userEmail) {
      setShowEmailModal(true);
      return;
    }

    setSaveLoading(true);

    try {
      if (isSaved) {
        // Remove from collection
        await supabase
          .from('vip_collections')
          .delete()
          .eq('vip_email', userEmail)
          .eq('product_id', product.id);

        setIsSaved(false);
        showToast('已從個人收藏清單中移除。');
      } else {
        // Insert into collection
        await supabase
          .from('vip_collections')
          .insert({
            vip_email: userEmail,
            product_id: product.id,
            brand_id: product.brand_id || null,
          });

        // Increment save count in product
        try {
          await supabase
            .from('exhibitor_products')
            .update({ save_count: (product.save_count || 0) + 1 })
            .eq('id', product.id);
        } catch {
          // Non-blocking
        }

        setIsSaved(true);
        showToast('✦ 已成功收藏至您的 VIS Collection！展後可隨時於個人專區回看。');
      }
    } catch (err: any) {
      console.error('Save toggle error:', err);
      showToast('收藏狀態更新失敗，請稍後再試。');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleConfirmEmailAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedEmail = inputEmail.toLowerCase().trim();
    if (!formattedEmail || !formattedEmail.includes('@')) {
      alert('請填寫有效的電子信箱');
      return;
    }

    setUserEmail(formattedEmail);
    safeSetStorage('vis_vip_email', formattedEmail);
    if (inputName) safeSetStorage('vis_vip_name', inputName.trim());

    setSaveLoading(true);
    setShowEmailModal(false);

    try {
      await supabase
        .from('vip_collections')
        .insert({
          vip_email: formattedEmail,
          product_id: product.id,
          brand_id: product.brand_id || null,
        });

      try {
        await supabase
          .from('exhibitor_products')
          .update({ save_count: (product.save_count || 0) + 1 })
          .eq('id', product.id);
      } catch {
        // Non-blocking
      }

      setIsSaved(true);
      showToast(`✦ 歡迎 ${inputName || '貴賓'}！已成功收藏至您的個人清單。`);
    } catch (err: any) {
      console.error('Email save error:', err);
      showToast('收藏成功（已記錄於您的瀏覽器）。');
      setIsSaved(true);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product?.title_zh} — VIS Contemporary Culture Fair`,
          text: `我在 VIS 2027 發現了 ${product?.brand_name_zh} 的《${product?.title_zh}》`,
          url: window.location.href,
        });
      } catch {
        // Ignored
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('已複製作品專屬分享連結至剪貼簿！');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-[#DFBA87]">
        <div className="text-center space-y-3 font-sans">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#DFBA87]" />
          <p className="text-xs tracking-[0.2em] uppercase text-neutral-600 font-light">
            載入作品典藏資訊 Loading Artwork...
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center text-[#1A1A1A]">
        <h2 className="text-xl font-serif mb-2">查無此展品資料</h2>
        <p className="text-xs text-neutral-500 max-w-sm mb-6 leading-relaxed">
          此展品可能尚未發佈，或展商正在更新資料中。請確認掃描的 QR Code 是否正確。
        </p>
        <Link 
          href="/vip/dashboard" 
          className="text-xs tracking-widest text-[#8C7853] underline uppercase"
        >
          ← 返回 VIS 貴賓首頁
        </Link>
      </div>
    );
  }

  const hasImg = product.images && product.images.length > 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-[#DFBA87]/30 pb-24">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white px-5 py-3 rounded-full text-xs font-light tracking-wide shadow-2xl border border-white/20 flex items-center gap-2 max-w-[90vw]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#DFBA87] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Top Bar */}
      <header className="sticky top-0 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-neutral-200/60 z-30 px-5 py-3.5 flex justify-between items-center max-w-2xl mx-auto">
        <Link 
          href="/vip/dashboard" 
          className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="tracking-widest uppercase text-[10px] font-mono">VIS VIP PASS</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 text-neutral-600 hover:text-black rounded-full hover:bg-neutral-200/50 transition-colors cursor-pointer"
            title="分享作品"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <Link
            href="/vip/dashboard"
            className="text-[10px] tracking-widest font-mono text-[#8C7853] border border-[#C9A96E]/40 px-2.5 py-1 rounded-full hover:bg-[#C9A96E]/10 transition-colors uppercase"
          >
            我的典藏
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-xl mx-auto px-5 pt-4 space-y-6">
        {/* Exhibition Fair Badge */}
        <div className="flex justify-between items-center text-[10.5px] border-b border-neutral-200/60 pb-3">
          <span className="font-mono tracking-widest uppercase text-[#8C7853] font-medium">
            VIS Contemporary Culture 2027
          </span>
          {product.booth_number && (
            <div className="inline-flex items-center gap-1 bg-[#8C7853]/10 text-[#8C7853] px-2 py-0.5 rounded text-[10px] font-mono font-medium">
              <MapPin className="w-3 h-3" />
              <span>展位 {product.booth_number}</span>
            </div>
          )}
        </div>

        {/* Featured Artwork Image */}
        <div className="relative aspect-square w-full bg-neutral-100 rounded-sm overflow-hidden shadow-lg border border-neutral-200/60">
          {hasImg ? (
            <img 
              src={product.images[0]} 
              alt={product.title_zh}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Tag className="w-10 h-10 opacity-30" />
              <span className="text-xs uppercase font-mono tracking-widest">VIS Exhibition Item</span>
            </div>
          )}

          {/* Category Pill */}
          {product.category && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded text-[10px] text-neutral-800 tracking-wider font-medium shadow-sm">
              {product.category}
            </div>
          )}
        </div>

        {/* Artwork & Brand Details */}
        <div className="space-y-4 text-left">
          {/* Brand Name */}
          <div className="space-y-1">
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#8C7853] block font-semibold">
              {product.brand_name_zh} {product.brand_name_en ? `| ${product.brand_name_en}` : ''}
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-normal text-neutral-900 tracking-wide leading-tight">
              {product.title_zh}
            </h1>
            {product.title_en && (
              <p className="text-sm font-serif italic text-neutral-500 font-light">
                {product.title_en}
              </p>
            )}
          </div>

          {/* Price & Specifications Box */}
          <div className="bg-white border border-[#C9A96E]/25 p-4 rounded-sm space-y-2.5 shadow-sm">
            <div className="flex justify-between items-baseline border-b border-neutral-100 pb-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-400">
                Price / 參考價格
              </span>
              <span className="text-base font-serif font-semibold text-[#8C7853] tracking-wide">
                {product.price_display || '私洽 / Inquire'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1 text-neutral-600 font-light">
              {product.materials && (
                <div>
                  <span className="text-[9.5px] font-mono uppercase text-neutral-400 block mb-0.5">Materials 材質</span>
                  <p className="text-neutral-800 text-[11.5px]">{product.materials}</p>
                </div>
              )}
              {product.dimensions && (
                <div>
                  <span className="text-[9.5px] font-mono uppercase text-neutral-400 block mb-0.5">Dimensions 尺寸</span>
                  <p className="text-neutral-800 text-[11.5px]">{product.dimensions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Artwork Description */}
          {product.description && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-mono uppercase tracking-widest text-[#8C7853] font-semibold">
                Artwork Concept / 創作理念
              </h3>
              <p className="text-xs text-neutral-700 leading-relaxed font-light whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}

          {/* Private Luxury Concierge Reassurance */}
          <div className="inline-flex items-center gap-2 text-[11px] text-[#8C7853] pt-2 font-light">
            <Sparkles className="w-3.5 h-3.5 text-[#DFBA87]" />
            <span>VIS 2027 專屬現場私洽作品 ｜ 展後隨時透過貴賓卡回顧規格與品牌直洽通道</span>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="space-y-3 pt-4">
          {/* Main Action: Scan & Save Button */}
          <button
            onClick={handleToggleSave}
            disabled={saveLoading}
            className={`w-full py-4 rounded text-xs font-semibold tracking-[0.25em] uppercase transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl cursor-pointer ${
              isSaved
                ? 'bg-neutral-900 text-[#DFBA87] border border-[#DFBA87]/40 hover:bg-neutral-800'
                : 'bg-[#C9A96E] text-white hover:bg-[#B39359]'
            }`}
          >
            {saveLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>已加入個人 VIS Collection (點擊取消)</span>
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 fill-white" />
                <span>加入個人 VIS Collection 典藏清單</span>
              </>
            )}
          </button>

          {/* Buy Online Button (if buy_url exists) */}
          {product.buy_url && (
            <a
              href={product.buy_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-white border border-neutral-300 hover:border-black text-neutral-900 rounded text-xs font-medium tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>前往品牌官方商城購買 / 預購</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Ask the Brand Button (Phase 2 preview / hook) */}
          <button
            onClick={() => setShowInquiryModal(true)}
            className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded text-xs font-medium tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#8C7853]" />
            <span>向參展品牌一鍵洽詢作品細節 (Ask the Brand)</span>
          </button>
        </div>

        {/* Fair Guarantees Footnote */}
        <div className="border-t border-neutral-200/60 pt-6 pb-8 text-center space-y-1.5 text-[10px] text-neutral-400 font-light">
          <p>✦ VIS 2027 當代文化博覽會 參展品牌官方認證作品 ✦</p>
          <p>展會地點：台北中山堂 光復廳 ｜ 展期：2027/1/6 – 1/9</p>
        </div>
      </main>

      {/* Modal: Quick Email Collection for unauthenticated visitors */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white text-neutral-900 max-w-sm w-full p-6 sm:p-7 rounded shadow-2xl border border-neutral-200 relative space-y-5"
            >
              <div className="text-center space-y-1.5">
                <span className="text-[9px] font-mono tracking-widest text-[#8C7853] uppercase font-semibold">
                  Scan & Save to VIS Collection
                </span>
                <h3 className="text-lg font-serif font-medium">
                  收藏此作品至個人清單
                </h3>
                <p className="text-xs text-neutral-500 font-light leading-relaxed">
                  輸入您的信箱，即可將《{product.title_zh}》加入您的個人典藏清單，離場後隨時回看並獲取最新型錄！
                </p>
              </div>

              <form onSubmit={handleConfirmEmailAndSave} className="space-y-3.5 text-xs">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
                    電子信箱 Email Address *
                  </label>
                  <input
                    type="email"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    placeholder="yourname@example.com"
                    required
                    className="w-full bg-neutral-50 border border-neutral-300 focus:border-[#C9A96E] rounded px-3 py-2.5 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">
                    您的尊姓大名 Full Name (選填)
                  </label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="例：陳先生 / 林小姐"
                    className="w-full bg-neutral-50 border border-neutral-300 focus:border-[#C9A96E] rounded px-3 py-2.5 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saveLoading}
                  className="w-full py-3 bg-[#DFBA87] hover:bg-[#c9a96e] text-black font-semibold rounded text-xs tracking-widest uppercase transition-all shadow-md cursor-pointer mt-2"
                >
                  {saveLoading ? '正在建立典藏庫...' : '確認收藏至個人清單'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="w-full text-center text-xs text-neutral-400 hover:text-neutral-700 py-1 transition-colors cursor-pointer"
                >
                  稍後再說
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Ask the Brand (Phase 2 Preview) */}
      <AnimatePresence>
        {showInquiryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white text-neutral-900 max-w-sm w-full p-6 rounded shadow-2xl border border-neutral-200 relative space-y-4"
            >
              <div className="text-left space-y-1">
                <span className="text-[9px] font-mono tracking-widest text-[#8C7853] uppercase font-semibold">
                  Ask The Brand / 一鍵洽詢
                </span>
                <h3 className="text-base font-serif font-medium">
                  向 {product.brand_name_zh} 提出洽詢
                </h3>
                <p className="text-xs text-neutral-500 font-light">
                  關於作品《{product.title_zh}》
                </p>
              </div>

              {inquirySent ? (
                <div className="py-6 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-xs text-neutral-700 leading-relaxed font-light">
                    洽詢已成功送出！大會系統已將您的意向通知參展商專員，專員將盡快透過電子郵件與您聯繫。
                  </p>
                  <button
                    onClick={() => { setShowInquiryModal(false); setInquirySent(false); }}
                    className="px-5 py-2 bg-neutral-900 text-white rounded text-xs tracking-wider uppercase"
                  >
                    關閉
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] text-neutral-500 font-mono uppercase">洽詢項目</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['價格與私洽報價', '客製與訂製詢問', '運送與物流', '其他需求'].map(item => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setInquiryType(item)}
                          className={`p-2 rounded text-[11px] border text-left transition-colors cursor-pointer ${
                            inquiryType === item 
                              ? 'border-[#8C7853] bg-[#8C7853]/10 text-[#8C7853] font-medium' 
                              : 'border-neutral-200 text-neutral-600'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] text-neutral-500 font-mono uppercase">備註或提問 (選填)</label>
                    <textarea
                      rows={2}
                      value={inquiryNote}
                      onChange={(e) => setInquiryNote(e.target.value)}
                      placeholder="例如：想了解寄送至台中的運費..."
                      className="w-full bg-neutral-50 border border-neutral-300 rounded p-2 text-xs outline-none resize-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowInquiryModal(false)}
                      className="px-3 py-2 text-neutral-500 hover:text-black text-xs cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const email = userEmail || inputEmail || safeGetStorage('vis_vip_email');
                        if (!email) {
                          setShowInquiryModal(false);
                          setShowEmailModal(true);
                          return;
                        }
                        setInquirySent(true);
                        showToast('✓ 洽詢已送出！品牌專員將盡快為您服務。');

                        try {
                          await fetch('/api/exhibitor/concierge', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              brand_id: product.brand_id,
                              brand_name_zh: product.brand_name_zh,
                              booth_number: product.booth_number,
                              vip_email: email,
                              vip_name: inputName || null,
                              intent_level: 'high',
                              follow_up_actions: [inquiryType],
                              interested_product_ids: [product.id],
                              notes: `貴賓於展品頁主動提出洽詢【${inquiryType}】：${inquiryNote || '無特定留言'}`
                            })
                          });
                        } catch (err) {
                          console.warn('Inquiry lead dispatch failed:', err);
                        }
                      }}
                      className="px-4 py-2 bg-[#DFBA87] hover:bg-[#c9a96e] text-black font-semibold rounded text-xs tracking-wider cursor-pointer"
                    >
                      確認送出洽詢
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
