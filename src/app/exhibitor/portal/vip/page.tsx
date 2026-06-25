'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Trash2, Mail, ShieldAlert, Lock, Info, Loader2 } from 'lucide-react';

export default function ExhibitorVipPage({ brand: parentBrand }: { brand?: any }) {
  const [brand, setBrand] = useState<any>(parentBrand || null);
  const [loading, setLoading] = useState(true);
  const [vips, setVips] = useState<any[]>([]);
  
  // Form input states
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const loadBrandAndVips = async () => {
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
          
          // Fetch VIP submissions for this brand
          const { data: list } = await supabase
            .from('exhibitor_vip_submissions')
            .select('*')
            .eq('brand_id', currentBrand.id)
            .order('created_at', { ascending: false });
          
          setVips(list || []);
        }
      } catch (err) {
        console.error('Error fetching VIP list:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBrandAndVips();
  }, [parentBrand]);

  const handleAddVip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || adding) return;

    // Validate email
    const trimmedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('請輸入格式正確的電子信箱。');
      return;
    }

    if (surname.trim() === '') {
      setFormError('請輸入貴賓姓氏。');
      return;
    }

    setAdding(true);
    setFormError('');

    try {
      const { data, error } = await supabase
        .from('exhibitor_vip_submissions')
        .insert({
          brand_id: brand.id,
          brand_name_zh: brand.brand_name_zh,
          vip_email: trimmedEmail,
          vip_surname: surname.trim(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // unique constraint violation
          setFormError('該電子信箱已在貴品牌的提報名單中。');
        } else {
          setFormError(`提報失敗: ${error.message}`);
        }
      } else {
        setVips(prev => [data, ...prev]);
        setSurname('');
        setEmail('');
      }
    } catch (err: any) {
      setFormError('網路異常，請稍後再試。');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteVip = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);

    try {
      const { error } = await supabase
        .from('exhibitor_vip_submissions')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`刪除失敗: ${error.message}`);
      } else {
        setVips(prev => prev.filter(v => v.id !== id));
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

  // Check if T-zone (micro-exposure)
  const isMicro = brand.is_micro_exposure || brand.booth_type === 'T';

  if (isMicro) {
    return (
      <div className="max-w-2xl mx-auto bg-[#111111] border border-white/5 rounded-xl p-8 text-center space-y-6 font-sans-outfit">
        <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-serif-garamond text-white tracking-wider">模組 C — VIP 貴賓提報 (已豁免)</h2>
          <p className="text-xs text-neutral-400 font-light leading-relaxed mt-2.5 max-w-md mx-auto">
            貴品牌所選之 <strong className="text-[#DFBA87]">T區 (微型曝光方案) </strong> 
            參展規格，依大會合約規範不包含 VIP 貴賓提報與發卡禮遇。大會秘書處已為您豁免本模組的提交義務。
          </p>
        </div>
        <div className="text-[10px] text-neutral-500 border-t border-white/5 pt-4 max-w-xs mx-auto">
          如有任何發卡需求，歡迎洽詢大會秘書處增購參展權益。
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
            <Users className="w-6 h-6 text-[#DFBA87]" />
            模組 C — VIP 貴賓名單提報中心
          </h1>
          <p className="text-xs text-neutral-400 font-light mt-1">
            一般參展品牌可免費提報 <strong className="text-[#DFBA87]">最多 30 位</strong> 貴賓，享有大會優先入場、專屬 VIP Lounge 2F 貴賓商談區及茶點禮遇。
          </p>
        </div>
        <div className="bg-white/5 border border-white/5 px-4 py-2 rounded text-xs font-mono text-[#DFBA87]">
          已提報 VIP 總數: {vips.length} / 30
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Submit Form Card */}
        <div className="bg-[#111111] border border-white/5 rounded-xl p-6 h-fit space-y-4">
          <h2 className="text-xs font-semibold tracking-widest text-[#DFBA87] uppercase flex items-center gap-1.5 border-b border-white/5 pb-3">
            <UserPlus className="w-4 h-4" /> 提報單筆 VIP
          </h2>

          <form onSubmit={handleAddVip} className="space-y-4">
            {formError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded font-mono">{formError}</p>
            )}

            <div>
              <label className="block text-[10px] font-semibold tracking-widest text-neutral-400 uppercase mb-2">貴賓姓氏 LAST NAME *</label>
              <input 
                type="text" 
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="例如：林 / Chen (僅限姓氏)"
                className="w-full text-xs border border-white/10 focus:border-[#C9A96E] bg-white/5 rounded px-3.5 py-2.5 outline-none text-white transition-colors"
                required
                disabled={vips.length >= 30}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold tracking-widest text-neutral-400 uppercase mb-2">電子信箱 EMAIL ADDRESS *</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vip.contact@email.com"
                className="w-full text-xs border border-white/10 focus:border-[#C9A96E] bg-white/5 rounded px-3.5 py-2.5 outline-none text-white transition-colors"
                required
                disabled={vips.length >= 30}
              />
            </div>

            <button
              type="submit"
              disabled={adding || vips.length >= 30}
              className="w-full bg-[#C9A96E] hover:bg-[#B39359] disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-2.5 rounded text-xs font-semibold tracking-wider transition-colors flex items-center justify-center gap-1.5"
            >
              {adding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  提報中...
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" /> 提交提報 VIP
                </>
              )}
            </button>
          </form>

          <div className="flex gap-2 text-[10px] text-neutral-500 font-light pt-2">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#DFBA87]" />
            <p>
              大會將直接向獲准的 VIP 寄送專屬 QR code 電子邀請卡，無需品牌方重複寄送。
            </p>
          </div>
        </div>

        {/* Real-time VIP list */}
        <div className="lg:col-span-2 bg-[#111111] border border-white/5 rounded-xl p-6 flex flex-col min-h-[300px]">
          <h2 className="text-xs font-semibold tracking-widest text-[#DFBA87] uppercase border-b border-white/5 pb-3 mb-4">
            已提交貴賓名單 Current VIP List
          </h2>

          {vips.length === 0 ? (
            <div className="flex-grow flex flex-col justify-center items-center text-center p-8 text-neutral-500 space-y-2">
              <Mail className="w-8 h-8 text-neutral-600" />
              <p className="text-xs font-light">目前尚未提報任何 VIP 貴賓名單</p>
            </div>
          ) : (
            <div className="flex-grow overflow-y-auto max-h-[400px] space-y-2.5 pr-2">
              <AnimatePresence initial={false}>
                {vips.map((vip) => (
                  <motion.div
                    key={vip.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white/[0.02] border border-white/5 rounded p-3 flex justify-between items-center text-xs"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-[#C9A96E]/10 flex items-center justify-center font-bold text-[#DFBA87] font-serif-garamond text-base">
                        {vip.vip_surname.substring(0, 1)}
                      </div>
                      <div>
                        <div className="font-medium text-white">{vip.vip_surname} 氏</div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{vip.vip_email}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-[9px] text-neutral-500 font-mono">
                        {new Date(vip.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDeleteVip(vip.id)}
                        disabled={deletingId === vip.id}
                        className="text-neutral-500 hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors"
                        title="撤銷提報"
                      >
                        {deletingId === vip.id ? (
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

          {/* Bottom privacy info */}
          <div className="border-t border-white/5 pt-4 mt-6 flex gap-2 text-[10px] text-neutral-500 font-light">
            <Lock className="w-3.5 h-3.5 flex-shrink-0 text-[#DFBA87]" />
            <p>
              大會承諾：您所提交的貴賓資訊將進行加密安全保護，僅供大會公關團隊用於本屆藝術節貴賓引導與後續客戶服務聯繫，絕不用於其他商業推廣。
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
