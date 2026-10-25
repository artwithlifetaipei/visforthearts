'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { formatBoothDisplay } from '@/lib/exhibitorConstants';
import { 
  Package, Plus, Printer, ExternalLink, Trash2, Edit3, 
  Sparkles, Image as ImageIcon, CheckCircle2, AlertCircle, 
  Loader2, ArrowRight, X, Eye, Heart, QrCode, Tag,
  Camera, ChevronDown, ChevronUp, UploadCloud
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

const CATEGORIES = [
  '當代藝術 (Contemporary Art)',
  '工藝設計 (Craft & Design)',
  '陶藝茶道具 (Ceramics & Tea Utensils)',
  '珠寶首飾 (Jewelry & Accessories)',
  '生活家飾 (Living & Homeware)',
  '限量周邊 (Limited Edition & Merch)',
  '其他文化創作 (Other)'
];

export default function ExhibitorProductsPage({ brand: parentBrand }: { brand?: any }) {
  const [brand, setBrand] = useState<any>(() => {
    if (parentBrand) return parentBrand;
    const saved = safeGetStorage('vis_portal_brand_data');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [tableMissingWarning, setTableMissingWarning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    title_zh: '',
    title_en: '',
    category: CATEGORIES[0],
    price_type: 'fixed',
    price_display: '',
    materials: '',
    dimensions: '',
    description: '',
    buy_url: '',
    image_url: '',
  });

  useEffect(() => {
    const loadBrandAndProducts = async () => {
      try {
        let currentBrand = brand;
        if (!currentBrand) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            const userEmail = session.user.email.toLowerCase().trim();
            const { data } = await supabase
              .from('exhibitor_brands')
              .select('*')
              .eq('portal_email', userEmail)
              .maybeSingle();
            currentBrand = data;

            if (!currentBrand) {
              const { data: app } = await supabase
                .from('exhibitor_applications')
                .select('*')
                .eq('contact_email', userEmail)
                .eq('status', 'approved')
                .maybeSingle();
              if (app) {
                currentBrand = {
                  id: app.id,
                  application_id: app.id,
                  brand_name_zh: app.brand_name_zh,
                  brand_name_en: app.brand_name_en || app.brand_name_zh,
                  zone_id: app.zone_id,
                  booth_type: app.booth_type,
                  is_micro_exposure: app.booth_type === 'T',
                  portal_email: userEmail,
                  created_at: app.created_at,
                  custom_fee: app.custom_fee ?? null,
                  discount_note: app.discount_note ?? null,
                  _fallback: true,
                };
              }
            }
          }
        }

        if (currentBrand) {
          setBrand(currentBrand);
          safeSetStorage('vis_portal_brand_data', JSON.stringify(currentBrand));
          await fetchProducts(currentBrand);
        }
      } catch (err) {
        console.error('Error loading brand and products:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBrandAndProducts();
  }, [parentBrand]);

  const fetchProducts = async (currentBrand: any) => {
    try {
      const { data, error } = await supabase
        .from('exhibitor_products')
        .select('*')
        .or(`brand_id.eq.${currentBrand.id},brand_name_zh.eq.${currentBrand.brand_name_zh}`)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist') || error.code === '42P01') {
          setTableMissingWarning(true);
        } else {
          console.error('Error fetching exhibitor_products:', error);
        }
        return;
      }

      setProducts(data || []);
    } catch (err: any) {
      console.warn('Fetch products exception:', err);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      id: '',
      title_zh: '',
      title_en: '',
      category: CATEGORIES[0],
      price_type: 'fixed',
      price_display: '',
      materials: '',
      dimensions: '',
      description: '',
      buy_url: '',
      image_url: '',
    });
    setShowAdvanced(false);
    setMessage({ text: '', type: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: any) => {
    const hasExtraDetails = Boolean(
      p.price_display || p.materials || p.dimensions || p.description || p.buy_url || p.title_en
    );
    setFormData({
      id: p.id,
      title_zh: p.title_zh || '',
      title_en: p.title_en || '',
      category: p.category || CATEGORIES[0],
      price_type: p.price_type || 'fixed',
      price_display: p.price_display || '',
      materials: p.materials || '',
      dimensions: p.dimensions || '',
      description: p.description || '',
      buy_url: p.buy_url || '',
      image_url: (p.images && p.images[0]) || '',
    });
    setShowAdvanced(hasExtraDetails);
    setMessage({ text: '', type: '' });
    setIsModalOpen(true);
  };

  const handleOpenPrintModal = (p: any) => {
    setSelectedProduct(p);
    setIsPrintModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !brand) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('請上傳圖片檔案 (PNG, JPEG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('單張圖片檔案不能超過 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        let fileUrl = base64Data;

        try {
          const fileExt = file.name.split('.').pop() || 'png';
          const fileName = `products/${brand.id}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const base64Clean = base64Data.split(',')[1];
          const buffer = Buffer.from(base64Clean, 'base64');

          const { error: uploadError } = await supabase.storage
            .from('exhibitor-media')
            .upload(fileName, buffer, { contentType: file.type, upsert: true });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('exhibitor-media')
              .getPublicUrl(fileName);
            if (publicUrlData?.publicUrl) {
              fileUrl = publicUrlData.publicUrl;
            }
          }
        } catch {
          // fallback to base64
        }

        setFormData(prev => ({ ...prev, image_url: fileUrl }));
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title_zh.trim()) {
      setMessage({ text: '請填寫作品 / 商品中文名稱。', type: 'error' });
      return;
    }

    setFormSubmitting(true);
    setMessage({ text: '', type: '' });

    const boothDisplay = formatBoothDisplay(brand?.booth_type, brand?.zone_id);

    const payload: any = {
      brand_id: brand.id,
      brand_name_zh: brand.brand_name_zh,
      brand_name_en: brand.brand_name_en || null,
      booth_number: boothDisplay,
      title_zh: formData.title_zh.trim(),
      title_en: formData.title_en.trim() || null,
      category: formData.category,
      price_type: formData.price_type,
      price_display: formData.price_display.trim() || (formData.price_type === 'inquire' ? '私洽 / Inquire' : null),
      materials: formData.materials.trim() || null,
      dimensions: formData.dimensions.trim() || null,
      description: formData.description.trim() || null,
      buy_url: formData.buy_url.trim() || null,
      images: formData.image_url ? [formData.image_url] : [],
      is_published: true,
      updated_at: new Date().toISOString(),
    };

    try {
      if (formData.id) {
        // Update
        const { error } = await supabase
          .from('exhibitor_products')
          .update(payload)
          .eq('id', formData.id);

        if (error) throw error;
        setMessage({ text: '✓ 展品資訊更新成功！', type: 'success' });
      } else {
        // Insert
        const { error } = await supabase
          .from('exhibitor_products')
          .insert(payload);

        if (error) throw error;
        setMessage({ text: '✓ 新展品上架成功！已為您生成專屬 QR Code 立牌', type: 'success' });
      }

      await fetchProducts(brand);
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1000);
    } catch (err: any) {
      console.error('Save product error:', err);
      setMessage({ text: `儲存失敗: ${err.message || '請確認資料庫表格是否已建立'}`, type: 'error' });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, title: string) => {
    if (!confirm(`確定要刪除展品「${title}」嗎？刪除後對應的立牌 QR Code 將失效。`)) return;

    try {
      const { error } = await supabase
        .from('exhibitor_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(`刪除失敗: ${err.message}`);
    }
  };

  const totalSaves = products.reduce((acc, curr) => acc + (curr.save_count || 0), 0);
  const boothDisplay = formatBoothDisplay(brand?.booth_type, brand?.zone_id);

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#DFBA87]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans-outfit">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <span className="text-[10px] tracking-[0.3em] uppercase text-[#DFBA87] font-semibold block mb-1">
            Module E — Sales Enablement & QR Table Tents
          </span>
          <h1 className="text-2xl md:text-3xl font-serif-garamond text-white tracking-wide font-normal">
            展品典藏與專屬立牌管理
          </h1>
          <p className="text-xs text-neutral-400 mt-2 max-w-2xl font-light leading-relaxed">
            上架您的參展精選作品，系統將自動為每件展品生成專屬 QR Code 立牌。現場觀眾掃碼即可立即加入個人 VIS Collection，助您在展後持續完成交易。
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 bg-[#C9A96E] hover:bg-[#B39359] text-white px-5 py-3 rounded text-xs font-semibold tracking-wider uppercase transition-all shadow-lg hover:shadow-[#C9A96E]/20 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> 新增參展展品 (+ Add Artwork)
        </button>
      </div>


      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/[0.02] border border-white/5 p-5 rounded space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono">Published Artworks</span>
          <div className="text-2xl font-serif-garamond text-white font-medium">
            {products.length} <span className="text-xs font-sans text-neutral-500 font-normal">件作品</span>
          </div>
          <p className="text-[10px] text-neutral-500 font-light">建議每展位上架 3～10 件精選代表作</p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-5 rounded space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-[#DFBA87] font-mono">Sales Channel Status</span>
          <div className="text-xl font-serif-garamond text-[#DFBA87] font-medium">
            雙軌銷售就緒
          </div>
          <p className="text-[10px] text-neutral-400 font-light">現場桌立牌掃碼 ＋ 品牌商城官網直購</p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 p-5 rounded space-y-1">
          <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-mono">Exhibition Booth</span>
          <div className="text-lg font-serif-garamond text-white font-medium truncate">
            {boothDisplay}
          </div>
          <p className="text-[10px] text-neutral-500 font-light">大會已分配專屬展位展出</p>
        </div>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="border border-dashed border-white/10 p-12 text-center rounded-lg space-y-4 bg-white/[0.01]">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-[#DFBA87]">
            <Package className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-serif-garamond text-white font-normal">尚未上架任何參展展品</h3>
            <p className="text-xs text-neutral-400 font-light max-w-md mx-auto">
              點擊上方「新增參展展品」，填寫作品名稱與照片，系統將為您生成高解析度 QR Code 桌立牌，供展位現場擺放！
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 bg-[#C9A96E]/20 hover:bg-[#C9A96E]/30 text-[#DFBA87] border border-[#C9A96E]/40 px-4 py-2.5 rounded text-xs tracking-wider transition-all cursor-pointer font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> 立即新增第一件展品
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => {
            const hasImg = p.images && p.images.length > 0;
            const productPublicUrl = typeof window !== 'undefined' 
              ? `${window.location.origin}/vip/product/${p.id}` 
              : `https://www.visforthearts.com/vip/product/${p.id}`;

            return (
              <div 
                key={p.id}
                className="bg-[#111111] border border-white/10 rounded overflow-hidden flex flex-col justify-between group hover:border-[#C9A96E]/50 transition-all duration-300 shadow-xl"
              >
                <div>
                  {/* Image container */}
                  <div className="relative aspect-square w-full bg-neutral-900 overflow-hidden">
                    {hasImg ? (
                      <img 
                        src={p.images[0]} 
                        alt={p.title_zh}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 gap-2">
                        <ImageIcon className="w-8 h-8 opacity-40" />
                        <span className="text-[10px] tracking-widest uppercase">No Image Uploaded</span>
                      </div>
                    )}

                    {/* Category pill */}
                    <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded text-[9px] text-[#DFBA87] tracking-wider font-medium border border-white/10">
                      {p.category}
                    </div>

                    {/* Sales Ready Badge */}
                    <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded text-[9.5px] text-[#DFBA87] tracking-wide font-light flex items-center gap-1.5 border border-white/10">
                      <QrCode className="w-3 h-3 text-[#DFBA87]" />
                      <span>{p.buy_url ? '✦ 現場立牌＋官網直購已就緒' : '✦ 現場立牌私洽通道已啟用'}</span>
                    </div>
                  </div>

                  {/* Info block */}
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-base font-serif-garamond text-white font-medium tracking-wide">
                        {p.title_zh}
                      </h3>
                      {p.title_en && (
                        <p className="text-[11px] text-neutral-400 font-light italic truncate">
                          {p.title_en}
                        </p>
                      )}
                    </div>

                    {(p.price_display || p.materials || p.dimensions) ? (
                      <div className="text-xs space-y-1 border-t border-white/5 pt-2 text-neutral-300">
                        {p.price_display && (
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] font-mono text-neutral-500 uppercase">Price</span>
                            <span className="font-medium text-[#DFBA87]">{p.price_display}</span>
                          </div>
                        )}
                        {p.materials && (
                          <div className="flex justify-between items-baseline text-[11px] text-neutral-400">
                            <span className="text-[10px] font-mono text-neutral-500 uppercase">Materials</span>
                            <span className="truncate max-w-[160px]">{p.materials}</span>
                          </div>
                        )}
                        {p.dimensions && (
                          <div className="flex justify-between items-baseline text-[11px] text-neutral-400">
                            <span className="text-[10px] font-mono text-neutral-500 uppercase">Dimensions</span>
                            <span className="truncate max-w-[160px]">{p.dimensions}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10.5px] border-t border-white/5 pt-2 text-neutral-500 font-light flex items-center justify-between">
                        <span>專屬 QR Code 立牌已就緒</span>
                        <span className="font-mono text-[9px] text-[#DFBA87]">READY TO PRINT</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenPrintModal(p)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#C9A96E]/15 hover:bg-[#C9A96E]/25 text-[#DFBA87] border border-[#C9A96E]/30 py-2 rounded text-[11px] font-medium tracking-wider transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> 列印專屬立牌
                  </button>

                  <a
                    href={`/vip/product/${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                    title="預覽觀眾端掃描頁面"
                  >
                    <Eye className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleOpenEditModal(p)}
                    className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
                    title="編輯展品"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(p.id, p.title_zh)}
                    className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                    title="刪除展品"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Add/Edit Product (Lightweight & Rapid for Busy Exhibitors) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#141414] border border-white/10 rounded-lg max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl relative my-8"
            >
              <div className="flex justify-between items-start border-b border-white/5 pb-3">
                <div>
                  <span className="text-[9px] tracking-[0.25em] text-[#DFBA87] uppercase font-mono">Quick Artwork Setup</span>
                  <h2 className="text-xl font-serif-garamond text-white font-medium">
                    {formData.id ? '編輯參展作品' : '新增參展作品'}
                  </h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Light touch reassurance banner */}
              <div className="bg-[#DFBA87]/10 border border-[#DFBA87]/20 rounded-md p-3 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#DFBA87] shrink-0 mt-0.5" />
                <div className="text-[11.5px] text-neutral-300 leading-relaxed font-light">
                  <span className="font-medium text-white block mb-0.5">極速上架 ｜ 專為展會現場設計</span>
                  只需上傳「作品相片」並填寫「品項名稱」，即可在 5 秒內生成專屬立牌 QR Code！售價、規格等細節皆為選填，展後亦可隨時補充。
                </div>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                {/* 1. Image Upload (Hero Placement) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <label className="text-neutral-200 font-medium">1. 作品相片 (Featured Photo)</label>
                    <span className="text-[10px] text-neutral-400 font-mono">方便現場對照辨識</span>
                  </div>

                  {formData.image_url ? (
                    <div className="relative aspect-video sm:aspect-[21/9] w-full rounded-md overflow-hidden border border-white/15 bg-neutral-900 group">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="w-full h-full object-contain bg-black/40" 
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <label className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded text-xs cursor-pointer transition-colors flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5" />
                          <span>更換相片</span>
                          <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                        </label>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                          className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>移除</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-white/15 hover:border-[#DFBA87]/50 bg-white/[0.02] hover:bg-white/[0.04] transition-all rounded-md p-5 flex flex-col items-center justify-center gap-2 cursor-pointer group text-center">
                      {uploadingImage ? (
                        <Loader2 className="w-6 h-6 animate-spin text-[#DFBA87]" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 group-hover:text-[#DFBA87] group-hover:bg-[#DFBA87]/10 transition-colors">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-white group-hover:text-[#DFBA87] transition-colors">
                          {uploadingImage ? '相片上傳處理中...' : '點擊拍攝或上傳作品相片'}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-light">
                          支援手機即時拍照、相簿選取 (JPG, PNG)
                        </p>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handleImageUpload} 
                        className="hidden" 
                        disabled={uploadingImage} 
                      />
                    </label>
                  )}

                  {/* Fallback image URL input */}
                  <div className="pt-0.5">
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="或直接貼上圖片網址 https://..."
                      className="w-full bg-white/5 border border-white/10 focus:border-[#C9A96E] rounded px-3 py-1.5 text-neutral-300 text-[11px] outline-none"
                    />
                  </div>
                </div>

                {/* 2. Product Title (Hero Placement) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <label className="text-neutral-200 font-medium">2. 作品 / 品項名稱 (Artwork Title) *</label>
                    <span className="text-[10px] text-[#DFBA87] font-mono">必填 ｜ 印製於立牌</span>
                  </div>
                  <input
                    type="text"
                    value={formData.title_zh}
                    onChange={(e) => setFormData(prev => ({ ...prev, title_zh: e.target.value }))}
                    placeholder="例：粉引灰釉圓融茶席提梁壺、純銀天然珍珠手鍊..."
                    required
                    className="w-full bg-white/5 border border-white/15 focus:border-[#C9A96E] rounded px-3.5 py-2.5 text-white text-sm outline-none transition-colors font-serif placeholder:font-sans placeholder:text-neutral-500"
                  />
                </div>

                {/* 3. Collapsible Advanced Details */}
                <div className="pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full py-2 px-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded text-xs text-neutral-300 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-[#DFBA87]" />
                      <span>{showAdvanced ? '收合進階選填資訊' : '＋ 展開進階選填（參考售價、材質尺寸、理念介紹、購買連結）'}</span>
                    </span>
                    {showAdvanced ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3.5 pt-3 overflow-hidden"
                      >
                        {/* Price & English Title */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-neutral-300 text-[11px]">參考售價 (Price Display)</label>
                            <input
                              type="text"
                              value={formData.price_display}
                              onChange={(e) => setFormData(prev => ({ ...prev, price_display: e.target.value }))}
                              placeholder="例：NT$ 48,000 或 私洽"
                              className="w-full bg-white/5 border border-white/10 focus:border-[#C9A96E] rounded px-3 py-1.5 text-white outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-neutral-400 text-[11px]">英文名稱 (Title EN)</label>
                            <input
                              type="text"
                              value={formData.title_en}
                              onChange={(e) => setFormData(prev => ({ ...prev, title_en: e.target.value }))}
                              placeholder="e.g. Teapot No. 1"
                              className="w-full bg-white/5 border border-white/10 focus:border-[#C9A96E] rounded px-3 py-1.5 text-white outline-none italic"
                            />
                          </div>
                        </div>

                        {/* Category & Materials */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-neutral-300 text-[11px]">作品類別 (Category)</label>
                            <select
                              value={formData.category}
                              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                              className="w-full bg-neutral-900 border border-white/10 focus:border-[#C9A96E] rounded px-3 py-1.5 text-white outline-none"
                            >
                              {CATEGORIES.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-neutral-300 text-[11px]">材質規格 (Materials)</label>
                            <input
                              type="text"
                              value={formData.materials}
                              onChange={(e) => setFormData(prev => ({ ...prev, materials: e.target.value }))}
                              placeholder="例：白瓷灰釉、純銀"
                              className="w-full bg-white/5 border border-white/10 focus:border-[#C9A96E] rounded px-3 py-1.5 text-white outline-none"
                            />
                          </div>
                        </div>

                        {/* Dimensions */}
                        <div className="space-y-1">
                          <label className="text-neutral-300 text-[11px]">尺寸規格 (Dimensions)</label>
                          <input
                            type="text"
                            value={formData.dimensions}
                            onChange={(e) => setFormData(prev => ({ ...prev, dimensions: e.target.value }))}
                            placeholder="例：20 x 14 x 18 cm"
                            className="w-full bg-white/5 border border-white/10 focus:border-[#C9A96E] rounded px-3 py-1.5 text-white outline-none"
                          />
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                          <label className="text-neutral-300 text-[11px]">創作理念與介紹 (Description)</label>
                          <textarea
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="簡要描述作品創作理念（觀眾掃碼後可於手機查看）..."
                            className="w-full bg-white/5 border border-white/10 focus:border-[#C9A96E] rounded px-3 py-1.5 text-white outline-none resize-none leading-relaxed"
                          />
                        </div>

                        {/* Buy URL */}
                        <div className="space-y-1">
                          <label className="text-neutral-300 text-[11px]">官方商城購買連結 (Online Buy Link)</label>
                          <input
                            type="url"
                            value={formData.buy_url}
                            onChange={(e) => setFormData(prev => ({ ...prev, buy_url: e.target.value }))}
                            placeholder="https://yourbrand.com/products/item-1"
                            className="w-full bg-white/5 border border-white/10 focus:border-[#C9A96E] rounded px-3 py-1.5 text-white outline-none font-mono"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {message.text && (
                  <p className={`p-3 rounded text-[11px] leading-relaxed border ${
                    message.type === 'success' 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {message.text}
                  </p>
                )}

                <div className="pt-3 flex justify-end gap-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded text-neutral-400 hover:text-white text-xs transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting || uploadingImage}
                    className="inline-flex items-center gap-2 bg-[#DFBA87] hover:bg-[#c9a96e] text-neutral-900 px-6 py-2.5 rounded text-xs font-semibold tracking-wider uppercase transition-all shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {formSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>{formData.id ? '儲存修改' : '一鍵生成專屬立牌 (SAVE)'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Printable Table Tent Modal (Gallery-grade Minimalism, No Booth Number) */}
      <AnimatePresence>
        {isPrintModalOpen && selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#171717] border border-white/15 rounded-lg max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative my-8"
            >
              <div className="flex justify-between items-start border-b border-white/5 pb-3.5 print:hidden">
                <div>
                  <span className="text-[9px] tracking-[0.25em] text-[#DFBA87] uppercase font-mono">Print Table Tent</span>
                  <h2 className="text-xl font-serif-garamond text-white font-medium">
                    專屬展位立牌預覽與列印
                  </h2>
                </div>
                <button 
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* The Actual Printable Table Tent Card */}
              <div 
                id="printable-table-tent"
                className="bg-[#FAF9F6] text-[#1A1A1A] p-6 sm:p-7 border border-[#C9A96E]/40 rounded-sm shadow-xl relative overflow-hidden select-none"
              >
                {/* Museum Gold corner ornaments */}
                <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t border-l border-[#C9A96E]" />
                <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t border-r border-[#C9A96E]" />
                <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b border-l border-[#C9A96E]" />
                <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b border-r border-[#C9A96E]" />

                {/* Fair Branding Header (Booth Number Removed as Requested) */}
                <div className="flex justify-between items-center border-b border-[#C9A96E]/20 pb-2.5 mb-4">
                  <span className="text-[8.5px] tracking-[0.35em] uppercase text-[#8C7853] font-mono font-medium">
                    VIS CONTEMPORARY CULTURE 2027
                  </span>
                  <span className="text-[8px] uppercase tracking-widest text-neutral-400 font-mono">
                    EXHIBITION ARTWORK
                  </span>
                </div>

                {/* Content Body: Left Details & Artwork Image, Right QR Code */}
                <div className="grid grid-cols-[1fr_auto] gap-5 items-center">
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#8C7853] font-semibold block truncate">
                      {brand?.brand_name_zh} {brand?.brand_name_en ? `| ${brand.brand_name_en}` : ''}
                    </span>

                    <h3 className="text-xl sm:text-2xl font-serif text-neutral-900 leading-snug font-normal tracking-wide break-words">
                      {selectedProduct.title_zh}
                    </h3>

                    {selectedProduct.title_en && (
                      <p className="text-xs text-neutral-500 font-serif italic">
                        {selectedProduct.title_en}
                      </p>
                    )}

                    {/* Artwork Photo for visual confirmation on table */}
                    {selectedProduct.images && selectedProduct.images[0] && (
                      <div className="flex items-center gap-2.5 pt-1.5">
                        <div className="w-14 h-14 rounded-sm bg-neutral-100 border border-neutral-300/80 overflow-hidden shrink-0 shadow-xs">
                          <img 
                            src={selectedProduct.images[0]} 
                            alt={selectedProduct.title_zh} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[8.5px] text-neutral-400 font-light font-mono leading-tight">
                          現場展品對照<br />
                          Item Reference
                        </span>
                      </div>
                    )}

                    {/* Optional Price only if entered */}
                    {selectedProduct.price_display && (
                      <p className="text-xs font-mono font-medium text-[#8C7853] pt-0.5">
                        {selectedProduct.price_display}
                      </p>
                    )}
                  </div>

                  {/* Elevated QR Code Pedestal */}
                  <div className="flex flex-col items-center justify-center p-2.5 bg-white border border-[#C9A96E]/30 shadow-sm rounded-sm shrink-0">
                    <QRCodeSVG
                      value={`https://www.visforthearts.com/vip/product/${selectedProduct.id}`}
                      size={105}
                      level="H"
                      includeMargin={false}
                    />
                    <span className="text-[7.5px] tracking-[0.2em] text-neutral-600 font-mono mt-1.5 uppercase font-medium">
                      Scan to Save
                    </span>
                    <span className="text-[7px] text-[#8C7853] font-light">
                      現場一鍵典藏
                    </span>
                  </div>
                </div>

                {/* Bottom Call to action bar */}
                <div className="border-t border-dashed border-[#C9A96E]/30 pt-2.5 mt-4 flex justify-between items-center text-[8.5px] text-neutral-500 font-light tracking-wider">
                  <span>✦ 現場手機掃碼即可加入個人 VIS Collection 典藏清單，離場後隨時回看</span>
                  <span className="font-mono text-[8px] text-[#8C7853]">visforthearts.com</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1.5 print:hidden">
                <span className="text-xs text-neutral-400 font-light">
                  建議使用 A6 或 A7 厚磅西卡紙（250-300g）列印，折疊或夾於金屬/壓克力立牌中展示。
                </span>

                <div className="flex gap-3 shrink-0">
                  <button
                    onClick={() => setIsPrintModalOpen(false)}
                    className="px-4 py-2 rounded text-neutral-400 hover:text-white text-xs transition-colors cursor-pointer"
                  >
                    關閉
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 bg-[#DFBA87] hover:bg-[#c9a96e] text-black px-5 py-2.5 rounded text-xs font-semibold tracking-wider uppercase transition-all shadow-lg cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> 一鍵列印立牌 (Print)
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Specific CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-table-tent, #printable-table-tent * {
            visibility: visible;
          }
          #printable-table-tent {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 148mm;
            max-width: 100%;
            border: 1px solid #C9A96E !important;
            box-shadow: none !important;
            background: #FAF9F6 !important;
            color: #1A1A1A !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />
    </div>
  );
}
