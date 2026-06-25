'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, Upload, Trash2, FileImage, Lock, Info, Loader2, Image as ImageIcon2 } from 'lucide-react';

export default function ExhibitorMediaPage({ brand: parentBrand }: { brand?: any }) {
  const [brand, setBrand] = useState<any>(parentBrand || null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadBrandAndAssets = async () => {
      setLoading(true);
      try {
        let currentBrand = parentBrand;
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

          // Fetch media assets for this brand
          const { data: list } = await supabase
            .from('exhibitor_media_assets')
            .select('*')
            .eq('brand_id', currentBrand.id)
            .order('created_at', { ascending: false });
          
          setAssets(list || []);
        }
      } catch (err) {
        console.error('Error fetching assets:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBrandAndAssets();
  }, [parentBrand]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !brand) return;

    if (assets.length >= 5) {
      setErrorMessage('最多僅能上傳 5 張媒體素材。');
      return;
    }

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setErrorMessage('請上傳圖片檔案 (PNG, JPEG, WebP)。');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('單張圖片檔案不能超過 10MB。');
      return;
    }

    setUploading(true);
    setErrorMessage('');

    try {
      // 1. Read to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;

        // Try uploading to Supabase Storage
        let fileUrl = '';
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `${brand.id}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        
        try {
          // Extract base64 clean data
          const base64Clean = base64Data.split(',')[1];
          const buffer = Buffer.from(base64Clean, 'base64');

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('exhibitor-media')
            .upload(fileName, buffer, {
              contentType: file.type,
              upsert: true
            });

          if (uploadError) {
            console.error('Storage bucket media upload error:', uploadError);
            // Fallback mock url if storage bucket is not public/configured yet
            fileUrl = base64Data; // store base64 direct in DB as fallback
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('exhibitor-media')
              .getPublicUrl(fileName);
            fileUrl = publicUrlData?.publicUrl || base64Data;
          }
        } catch (storageEx) {
          console.error(storageEx);
          fileUrl = base64Data; // fallback
        }

        // 2. Save in database
        const { data, error } = await supabase
          .from('exhibitor_media_assets')
          .insert({
            brand_id: brand.id,
            file_url: fileUrl,
            file_name: file.name,
            file_type: file.type,
          })
          .select()
          .single();

        if (error) {
          setErrorMessage(`儲存失敗: ${error.message}`);
        } else {
          setAssets(prev => [data, ...prev]);
        }
        setUploading(false);
      };
      
      reader.readAsDataURL(file);

    } catch (err: any) {
      setErrorMessage('上傳過程中發生異常。');
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (id: string, fileUrl: string) => {
    if (deletingId || !brand) return;
    setDeletingId(id);
    setErrorMessage('');

    try {
      // 1. Delete from storage if it is a real supabase storage URL
      if (fileUrl.includes('exhibitor-media')) {
        try {
          // Extract filename from URL
          const parts = fileUrl.split('exhibitor-media/');
          if (parts.length === 2) {
            const filePath = parts[1];
            await supabase.storage.from('exhibitor-media').remove([filePath]);
          }
        } catch (ex) {
          console.error('Error deleting from storage:', ex);
        }
      }

      // 2. Delete from Database
      const { error } = await supabase
        .from('exhibitor_media_assets')
        .delete()
        .eq('id', id);

      if (error) {
        setErrorMessage(`刪除記錄失敗: ${error.message}`);
      } else {
        setAssets(prev => prev.filter(a => a.id !== id));
      }
    } catch (ex) {
      console.error(ex);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#DFBA87]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="text-center max-w-md mx-auto py-12 text-neutral-400">
        無法讀取品牌資料。
      </div>
    );
  }

  const isMicro = brand.is_micro_exposure || brand.booth_type === 'T';

  if (isMicro) {
    return (
      <div className="max-w-2xl mx-auto bg-[#111111] border border-white/5 rounded-xl p-8 text-center space-y-6 font-sans-outfit">
        <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-serif-garamond text-white tracking-wider">模組 D — 媒體公關素材 (已豁免)</h2>
          <p className="text-xs text-neutral-400 font-light leading-relaxed mt-2.5 max-w-md mx-auto">
            貴品牌所選之 <strong className="text-[#DFBA87]">T區 (微型曝光方案) </strong> 
            參展規格，依大會手冊僅包含產品現場實體展示。無大會主流公關媒體專題推薦或導流項目。大會秘書處已為您豁免本模組之素材提交義務。
          </p>
        </div>
        <div className="text-[10px] text-neutral-500 border-t border-white/5 pt-4 max-w-xs mx-auto">
          如有任何公關素材上傳需求，歡迎洽詢大會秘書處確認增購參展權利。
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans-outfit">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-2xl font-serif-garamond text-white tracking-wider flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-[#DFBA87]" />
            模組 D — 媒體公關素材上傳
          </h1>
          <p className="text-xs text-neutral-400 font-light mt-1">
            大會公關宣傳小組將使用您上傳的視覺素材，進行 VIS 2027 社群導流、媒體公關專訪推廣及大會導覽手冊編輯。
          </p>
        </div>
        <div className="bg-white/5 border border-white/5 px-4 py-2 rounded text-xs font-mono text-[#DFBA87]">
          已上傳素材: {assets.length} / 5
        </div>
      </div>

      {errorMessage && (
        <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded font-mono max-w-lg">{errorMessage}</p>
      )}

      {/* Grid Layout: Uploader and Previews */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Upload Button Card */}
        <div className="bg-[#111111] border border-white/5 rounded-xl p-6 h-fit space-y-4">
          <h2 className="text-xs font-semibold tracking-widest text-[#DFBA87] uppercase flex items-center gap-1.5 border-b border-white/5 pb-3">
            <Upload className="w-4 h-4" /> 素材上傳
          </h2>
          
          <div className="text-xs text-neutral-400 font-light leading-relaxed space-y-2">
            <p>請提報 <strong className="text-white">3 至 5 張</strong> 能充分體現品牌調性與精緻工藝的高解析度商品/意境圖。</p>
            <p className="text-[10px] text-neutral-500">* 規格要求：比例 3:2 或 1:1，解析度建議 2000px 以上，無浮水印。</p>
          </div>

          <div className="border border-dashed border-white/10 hover:border-[#C9A96E]/50 rounded-lg p-6 text-center cursor-pointer transition-colors relative group">
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading || assets.length >= 5}
            />
            {uploading ? (
              <div className="py-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#DFBA87] mx-auto mb-2" />
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest">檔案上傳中...</p>
              </div>
            ) : (
              <div className="py-4 flex flex-col items-center">
                <FileImage className="w-8 h-8 text-neutral-500 group-hover:scale-105 transition-transform mb-2" />
                <span className="text-[10px] font-semibold text-[#DFBA87] tracking-wider uppercase block">
                  {assets.length >= 5 ? '已達數量上限' : '選取圖片檔案'}
                </span>
                <span className="text-[9px] text-neutral-600 block mt-1">MAX 10MB (JPG / PNG)</span>
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Materials Preview Grid */}
        <div className="lg:col-span-2 bg-[#111111] border border-white/5 rounded-xl p-6 flex flex-col min-h-[300px]">
          <h2 className="text-xs font-semibold tracking-widest text-[#DFBA87] uppercase border-b border-white/5 pb-3 mb-6">
            已提報素材 Previews
          </h2>

          {assets.length === 0 ? (
            <div className="flex-grow flex flex-col justify-center items-center text-center p-8 text-neutral-500 space-y-2">
              <ImageIcon2 className="w-8 h-8 text-neutral-600" />
              <p className="text-xs font-light">目前尚未上傳任何素材圖檔</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <AnimatePresence initial={false}>
                {assets.map((asset) => (
                  <motion.div
                    key={asset.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative group border border-white/5 rounded overflow-hidden aspect-[4/3] bg-neutral-900"
                  >
                    <img 
                      src={asset.file_url} 
                      alt={asset.file_name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    
                    {/* Hover delete trigger overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3.5 text-left">
                      <span className="text-[9px] font-mono text-neutral-300 truncate w-full">{asset.file_name}</span>
                      <button
                        onClick={() => handleDeleteAsset(asset.id, asset.file_url)}
                        disabled={deletingId === asset.id}
                        className="bg-rose-600 hover:bg-rose-700 text-white rounded p-2 self-end transition-colors flex items-center justify-center"
                        title="刪除素材"
                      >
                        {deletingId === asset.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          <div className="border-t border-white/5 pt-4 mt-8 flex gap-2 text-[10px] text-neutral-500 font-light">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#DFBA87]" />
            <p>
              大會將對您的素材進行專業剪裁與微調，以符合 VIS 藝術節官方推廣美學。若有重大修改將主動諮詢品牌聯絡窗口。
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
