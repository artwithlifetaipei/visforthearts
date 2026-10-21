'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Trash2, Mail, ShieldAlert, Lock, Info, 
  Loader2, Sparkles, CheckCircle2 
} from 'lucide-react';
import { useExhibitorLanguage } from '@/lib/ExhibitorLanguageContext';

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

export default function ExhibitorVipPage({ brand: parentBrand }: { brand?: any }) {
  const { lang, t } = useExhibitorLanguage();

  // Stale-While-Revalidate caching pattern for instant tab load (<3s)
  const [brand, setBrand] = useState<any>(() => {
    if (parentBrand) return parentBrand;
    const saved = safeGetStorage('vis_portal_brand_data');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    return !brand;
  });

  const [vips, setVips] = useState<any[]>(() => {
    const saved = brand?.id ? safeGetStorage(`vis_portal_vip_list_${brand.id}`) : null;
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  });
  
  // Form input states
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [selectedTier, setSelectedTier] = useState<'VIP' | 'SVIP'>('VIP');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // Helper to extract tier cleanly
  const getVipTier = (vip: any): 'VIP' | 'SVIP' => {
    if (vip.tier === 'SVIP' || vip.tier === 'VIP') return vip.tier;
    if (typeof vip.vip_surname === 'string' && vip.vip_surname.includes('SVIP')) return 'SVIP';
    return 'VIP';
  };

  const cleanSurname = (rawSurname: string): string => {
    return (rawSurname || '')
      .replace(/\s*\((S?VIP)\)/gi, '')
      .replace(/\s*\[(S?VIP)\]/gi, '')
      .trim();
  };

  const svipCount = vips.filter(v => getVipTier(v) === 'SVIP').length;
  const vipCount = vips.filter(v => getVipTier(v) === 'VIP').length;

  // Check if brand belongs to Making Project (特展席位: 10位貴賓名單)
  const isMakingProject = 
    brand?.booth_type === 'MAKING-PROJECT' || 
    brand?.booth_type?.includes('造物') || 
    brand?.zone_id === 'making-project';

  // 10 for Making Project, 50 for Atelier, 30 for others
  const vipLimit = isMakingProject ? 10 : (brand?.zone_id === 'atelier' ? 50 : 30);

  useEffect(() => {
    const loadBrandAndVips = async () => {
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
          
          // Fetch VIP submissions for this brand
          const { data: list } = await supabase
            .from('exhibitor_vip_submissions')
            .select('*')
            .eq('brand_id', currentBrand.id)
            .order('created_at', { ascending: false });
          
          const vipList = list || [];
          setVips(vipList);
          safeSetStorage(`vis_portal_vip_list_${currentBrand.id}`, JSON.stringify(vipList));
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

    if (vips.length >= vipLimit) {
      setFormError(t(`已達專屬貴賓邀請席次上限 (${vipLimit} 位)。`, `Reached invitation limit (${vipLimit} guests).`));
      return;
    }

    // Validate email
    const trimmedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError(t('請輸入格式正確的電子信箱。', 'Please enter a valid email address.'));
      return;
    }

    if (surname.trim() === '') {
      setFormError(t('請輸入貴賓姓氏。', 'Please enter guest surname.'));
      return;
    }

    setAdding(true);
    setFormError('');

    try {
      // 1. Attempt insert with tier column
      let insertPayload: any = {
        brand_id: brand.id,
        brand_name_zh: brand.brand_name_zh,
        vip_email: trimmedEmail,
        vip_surname: surname.trim(),
        tier: selectedTier,
      };

      let { data, error } = await supabase
        .from('exhibitor_vip_submissions')
        .insert(insertPayload)
        .select()
        .single();

      // 2. If 'tier' column does not exist yet in database table, fallback gracefully by embedding tier
      if (error && error.message && error.message.includes('column "tier"')) {
        const fallbackSurname = selectedTier === 'SVIP' ? `${surname.trim()} (SVIP)` : surname.trim();
        const retryResult = await supabase
          .from('exhibitor_vip_submissions')
          .insert({
            brand_id: brand.id,
            brand_name_zh: brand.brand_name_zh,
            vip_email: trimmedEmail,
            vip_surname: fallbackSurname,
          })
          .select()
          .single();

        data = retryResult.data ? { ...retryResult.data, tier: selectedTier } : null;
        error = retryResult.error;
      }

      if (error) {
        if (error.code === '23505') { // unique constraint violation
          setFormError(t('該電子信箱已在貴品牌的專屬邀請名單中。', 'This email is already in your invited list.'));
        } else {
          setFormError(t(`邀請設定失敗: ${error.message}`, `Failed to add VIP: ${error.message}`));
        }
      } else if (data) {
        const finalItem = { ...data, tier: selectedTier };
        const updated = [finalItem, ...vips];
        setVips(updated);
        safeSetStorage(`vis_portal_vip_list_${brand.id}`, JSON.stringify(updated));
        setSurname('');
        setEmail('');
        setSelectedTier('VIP');
      }
    } catch (err: any) {
      setFormError(t('網路異常，請稍後再試。', 'Network error. Please try again.'));
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
        alert(t(`刪除失敗: ${error.message}`, `Failed to remove: ${error.message}`));
      } else {
        const updated = vips.filter(v => v.id !== id);
        setVips(updated);
        safeSetStorage(`vis_portal_vip_list_${brand.id}`, JSON.stringify(updated));
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
        {t('無法讀取品牌資料。', 'Unable to load brand information.')}
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
          <h2 className="text-lg font-serif-garamond text-white tracking-wider">
            {t('模組 C — VIP 專屬貴賓邀請 (已豁免)', 'Module C — VIP Invitations (Exempt)')}
          </h2>
          <p className="text-xs text-neutral-400 font-light leading-relaxed mt-2.5 max-w-md mx-auto">
            {t(
              '貴品牌所選之 T區 (微型曝光方案) 參展規格，依大會合約規範未包含貴賓邀請額度。大會秘書處已為您標記完成本模組。',
              'Your selected booth tier (T-Zone Micro-Exposure) does not include VIP guest pass quota. The organizer has marked this module complete.'
            )}
          </p>
        </div>
        <div className="text-[10px] text-neutral-500 border-t border-white/5 pt-4 max-w-xs mx-auto">
          {t('如有任何發卡需求，歡迎洽詢大會秘書處增購參展權益。', 'For additional passes, please contact the VIS Organizer Office.')}
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
            {t('模組 C — 專屬 VIP 貴賓邀請禮遇中心', 'Module C — VIP Guest Invitations & Passes')}
          </h1>
          <p className="text-xs text-neutral-400 font-light mt-1 leading-relaxed">
            {isMakingProject ? (
              <>
                {t(
                  '大會特別致贈「造物計畫」特展創作者 10 張專屬貴賓票。可自由指定分配為【VIP 展期通行】或【SVIP 開幕晚會】專屬禮遇。',
                  'Organizer complimentary 10 VIP passes for Making Project creators. You may freely allocate between Public Days VIP and Vernissage SVIP.'
                )}
              </>
            ) : (
              <>
                {t(
                  `大會特別致贈參展品牌專屬 ${vipLimit} 張貴賓票。受邀貴賓享優先入場禮遇，可依需求指定為【VIP 展期通行】或【SVIP 開幕晚會】席位。`,
                  `Organizer complimentary ${vipLimit} guest passes for your brand. You can allocate between Public Days VIP and Opening Gala SVIP.`
                )}
              </>
            )}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-lg text-xs font-mono text-[#DFBA87] flex flex-col items-end gap-1">
          <div className="font-semibold tracking-wider">
            {t('已指定邀請席次', 'Allocated')}: <span className="text-white font-bold">{vips.length}</span> / {vipLimit}
          </div>
          <div className="text-[10px] text-neutral-400 font-normal flex items-center gap-2">
            <span className="text-amber-300">SVIP 開幕: {svipCount}</span>
            <span>•</span>
            <span className="text-neutral-300">VIP 展期: {vipCount}</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Submit Form Card */}
        <div className="bg-[#111111] border border-white/5 rounded-xl p-6 h-fit space-y-4 shadow-xl">
          <h2 className="text-xs font-semibold tracking-widest text-[#DFBA87] uppercase flex items-center gap-1.5 border-b border-white/5 pb-3">
            <UserPlus className="w-4 h-4" /> {t('新增專屬貴賓邀請', 'Invite New VIP Guest')}
          </h2>

          <form onSubmit={handleAddVip} className="space-y-4">
            {formError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded font-mono leading-relaxed">{formError}</p>
            )}

            {/* VIP vs SVIP Option Selection */}
            <div>
              <label className="block text-[10px] font-semibold tracking-widest text-[#DFBA87] uppercase mb-2">
                {t('邀請禮遇規格 TICKET TIER *', 'INVITATION TICKET TIER *')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* VIP Pass Option */}
                <button
                  type="button"
                  onClick={() => setSelectedTier('VIP')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
                    selectedTier === 'VIP'
                      ? 'bg-[#C9A96E]/15 border-[#DFBA87] text-white shadow-sm ring-1 ring-[#DFBA87]/40'
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#DFBA87]">
                      {t('VIP 展期貴賓', 'VIP Fair Pass')}
                    </span>
                    {selectedTier === 'VIP' && <CheckCircle2 className="w-3.5 h-3.5 text-[#DFBA87]" />}
                  </div>
                  <p className="text-[10px] text-neutral-300 font-light leading-snug">
                    {t('1/7 - 1/9 公眾展期全時段免排隊優先通行', 'Jan 7-9 Public Days Priority Fast-Track')}
                  </p>
                </button>

                {/* SVIP Gala Option */}
                <button
                  type="button"
                  onClick={() => setSelectedTier('SVIP')}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
                    selectedTier === 'SVIP'
                      ? 'bg-[#DFBA87]/20 border-[#DFBA87] text-white shadow-md shadow-[#DFBA87]/15 ring-1 ring-[#DFBA87]/50'
                      : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#DFBA87]" />
                      <span className="font-bold text-xs text-[#DFBA87]">
                        {t('SVIP 開幕晚會', 'SVIP Gala Pass')}
                      </span>
                    </div>
                    {selectedTier === 'SVIP' && <CheckCircle2 className="w-3.5 h-3.5 text-[#DFBA87]" />}
                  </div>
                  <p className="text-[10px] text-neutral-300 font-light leading-snug">
                    {t('1/6 尊榮預展暨開幕晚會席位 + 全展期通行', 'Jan 6 Opening Gala Vernissage + Full Fair')}
                  </p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold tracking-widest text-neutral-400 uppercase mb-2">
                {t('貴賓姓氏 LAST NAME *', 'GUEST SURNAME (LAST NAME) *')}
              </label>
              <input 
                type="text" 
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder={t('例如：林 / Chen (僅限姓氏)', 'e.g. Chen / Smith (Surname only)')}
                className="w-full text-xs border border-white/10 focus:border-[#C9A96E] bg-white/5 rounded px-3.5 py-2.5 outline-none text-white transition-colors"
                required
                disabled={vips.length >= vipLimit}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold tracking-widest text-neutral-400 uppercase mb-2">
                {t('電子信箱 EMAIL ADDRESS *', 'EMAIL ADDRESS *')}
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vip.contact@email.com"
                className="w-full text-xs border border-white/10 focus:border-[#C9A96E] bg-white/5 rounded px-3.5 py-2.5 outline-none text-white transition-colors"
                required
                disabled={vips.length >= vipLimit}
              />
            </div>

            <button
              type="submit"
              disabled={adding || vips.length >= vipLimit}
              className="w-full bg-[#C9A96E] hover:bg-[#B39359] disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-2.5 rounded text-xs font-semibold tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#C9A96E]/20"
            >
              {adding ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('儲存邀請名單中...', 'Saving Invitation...')}
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" /> 
                  {selectedTier === 'SVIP' ? t('發送 SVIP 開幕晚會邀請', 'Invite as SVIP Gala Guest') : t('發送 VIP 展期貴賓邀請', 'Invite as VIP Fair Guest')}
                </>
              )}
            </button>
          </form>

          <div className="flex gap-2 text-[10px] text-neutral-500 font-light pt-2 leading-relaxed">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#DFBA87]" />
            <p>
              {t(
                '大會將依您指定的等級（VIP / SVIP）向獲准的貴賓寄送專屬 QR code 電子邀請卡，無需品牌方重複寄送。',
                'The organizer will dispatch exclusive QR code digital passes based on the tier (VIP / SVIP) you selected.'
              )}
            </p>
          </div>
        </div>

        {/* Real-time VIP list */}
        <div className="lg:col-span-2 bg-[#111111] border border-white/5 rounded-xl p-6 flex flex-col min-h-[300px] shadow-xl">
          <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
            <h2 className="text-xs font-semibold tracking-widest text-[#DFBA87] uppercase">
              {t('已指定專屬貴賓名單 Current VIP Guest List', 'Current VIP Guest List')}
            </h2>
            <span className="text-[10px] font-mono text-neutral-400">
              {vips.length} {t('位貴賓', 'guests')}
            </span>
          </div>

          {vips.length === 0 ? (
            <div className="flex-grow flex flex-col justify-center items-center text-center p-8 text-neutral-500 space-y-2">
              <Mail className="w-8 h-8 text-neutral-600" />
              <p className="text-xs font-light">{t('目前尚未指定任何專屬貴賓邀請', 'No VIP guests invited yet')}</p>
            </div>
          ) : (
            <div className="flex-grow overflow-y-auto max-h-[460px] space-y-2.5 pr-2">
              <AnimatePresence initial={false}>
                {vips.map((vip) => {
                  const tier = getVipTier(vip);
                  const isSvip = tier === 'SVIP';

                  return (
                    <motion.div
                      key={vip.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`border rounded p-3 flex justify-between items-center text-xs transition-colors ${
                        isSvip 
                          ? 'bg-amber-500/[0.04] border-amber-500/25 hover:border-amber-500/40' 
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-serif-garamond text-base ${
                          isSvip 
                            ? 'bg-[#DFBA87]/20 text-[#DFBA87] ring-1 ring-[#DFBA87]/40' 
                            : 'bg-[#C9A96E]/10 text-[#DFBA87]'
                        }`}>
                          {cleanSurname(vip.vip_surname).substring(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{cleanSurname(vip.vip_surname)} 氏</span>
                            {isSvip ? (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-amber-500/40 bg-amber-500/15 text-[#DFBA87] font-semibold flex items-center gap-1 shadow-sm">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>SVIP 開幕晚會</span>
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-white/10 bg-white/5 text-neutral-400">
                                VIP 展期通行
                              </span>
                            )}
                          </div>
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
                          className="text-neutral-500 hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={t('移除邀請', 'Remove invitation')}
                        >
                          {deletingId === vip.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Bottom privacy info */}
          <div className="border-t border-white/5 pt-4 mt-6 flex gap-2 text-[10px] text-neutral-500 font-light leading-relaxed">
            <Lock className="w-3.5 h-3.5 flex-shrink-0 text-[#DFBA87]" />
            <div className="space-y-1">
              <p>
                <strong className="text-neutral-400">{t('VIP / SVIP 貴賓權益說明：', 'VIP / SVIP Pass Privileges: ')}</strong>
                {t(
                  '本屆展會現場不另售一般門票。【VIP 展期貴賓票】享 1/7 - 1/9 公眾展期全時段免排隊優先入場；【SVIP 開幕晚會票】享有 1/6 (三) 尊榮預展暨開幕晚會專屬席位與全展期快速通行。',
                  'Fair admission is invitation-only. VIP Pass grants priority fast-track for Jan 7-9. SVIP Pass includes Jan 6 Vernissage & Gala seat plus full fair priority.'
                )}
              </p>
              <p>
                {t(
                  '大會承諾：您所提交的貴賓資訊將進行加密安全保護，僅供大會公關團隊用於本屆展會發送電子貴賓憑證與現場接待服務，絕不用於其他商業推廣。',
                  'Organizer Guarantee: Guest data is encrypted and strictly used for digital passes and reception services.'
                )}
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
