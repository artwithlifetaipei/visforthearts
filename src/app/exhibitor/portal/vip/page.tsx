'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Trash2, Mail, ShieldAlert, Lock, Info, 
  Loader2, Sparkles, CheckCircle2, Copy, Check, MessageSquare, Share2, ExternalLink
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
  const [successNotice, setSuccessNotice] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTicketLink, setCopiedTicketLink] = useState(false);
  const [copiedPromoText, setCopiedPromoText] = useState(false);

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

  // Generates polished, personalized LINE invitation message
  const getLineInviteText = (vip: any) => {
    const tier = getVipTier(vip);
    const cleanName = cleanSurname(vip.vip_surname);
    const brandName = brand?.brand_name_zh || '參展品牌';
    const passUrl = `https://www.visforthearts.com/vip?email=${encodeURIComponent(vip.vip_email)}`;
    const isSvip = tier === 'SVIP';

    if (lang === 'en') {
      return `[${brand?.brand_name_en || brandName} Exclusive Invitation]\nDear ${cleanName},\n\nWe have reserved a "${isSvip ? 'SVIP Vernissage & Opening Gala Pass (with Full Fair Fast-Track)' : 'VIP Priority Fast-Track Pass'}" for you at VIS Contemporary Culture.\n\nClaim and view your digital VIP pass here:\n${passUrl}\n\n✦ Dates: Jan 6 (Wed) – Jan 9 (Sat), 2027\n✦ Venue: Guangfu Hall, Taipei Zhongshan Hall (98 Yanping S. Rd.)\n\nWe warmly look forward to welcoming you in person!`;
    }

    return `【${brandName} 敬邀】\n親愛的 ${cleanName} 氏 貴賓您好：\n\n我們已為您預留 VIS Contemporary Culture「${isSvip ? 'SVIP 尊榮預展暨開幕晚會專屬通行資格（含全展期優先快速通行）' : 'VIP 展期尊榮通行證（全時段免排隊優先快速通行）'}」。\n\n誠摯邀請您蒞臨鑑賞！點擊下方專屬連結即可直接於手機領取您的數位貴賓憑證：\n${passUrl}\n\n✦ 展期：2027 年 1 月 6 日 (三) – 1 月 9 日 (六)\n✦ 地點：台北中山堂 光復廳（台北市中正區延平南路 98 號）\n\n期待於展會現場親自接待您！`;
  };

  const handleCopyLineInvite = (vip: any) => {
    const text = getLineInviteText(vip);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(vip.id);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  const handleShareToLine = (vip: any) => {
    const text = getLineInviteText(vip);
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(lineUrl, '_blank', 'noopener,noreferrer');
  };

  // Dedicated Brand Ticket Registration Link & Promo Copy
  const getDedicatedTicketLink = () => {
    if (!brand) return 'https://www.visforthearts.com/ticket';
    const brandParam = (brand.brand_name_en || brand.name_en || brand.brand_name_zh || brand.name_zh || brand.id).trim();
    return `https://www.visforthearts.com/ticket?brand=${encodeURIComponent(brandParam)}`;
  };

  const getPromoMessage = () => {
    const brandName = brand?.brand_name_zh || brand?.name_zh || 'VIS 參展品牌';
    const link = getDedicatedTicketLink();
    if (lang === 'en') {
      return `[${brand?.brand_name_en || brandName} Exclusive Admission]\nWarmly inviting you to VIS Contemporary Culture 2027!\nClaim your complimentary digital entrance pass via our dedicated brand link:\n${link}\n\n✦ Dates: Jan 6–9, 2027\n✦ Venue: Taipei Zhongshan Hall (Guangfu Hall)\n* Please follow @visforthearts and @${brand?.instagram_handle || brandName} on IG before arrival. Looking forward to welcoming you!`;
    }
    return `【${brandName} 專屬觀展邀請】\n誠摯邀請您蒞臨 VIS Contemporary Culture 2027 當代生活文化大展！\n點擊下方品牌專屬連結，即可免費預約領取數位觀展憑證：\n${link}\n\n✦ 展期：2027 年 1 月 6 日 – 1 月 9 日\n✦ 地點：台北中山堂 光復廳（台北市中正區延平南路 98 號）\n* 入場時請出示此憑證與已追蹤 IG 畫面。期待在現場與您相見！`;
  };

  const handleCopyTicketLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(getDedicatedTicketLink());
      setCopiedTicketLink(true);
      setTimeout(() => setCopiedTicketLink(false), 3000);
    }
  };

  const handleCopyPromoMessage = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(getPromoMessage());
      setCopiedPromoText(true);
      setTimeout(() => setCopiedPromoText(false), 3000);
    }
  };

  const handleShareDedicatedTicketToLine = () => {
    const text = getPromoMessage();
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(lineUrl, '_blank', 'noopener,noreferrer');
  };

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

    if (trimmedEmail.endsWith('@visforthearts.com')) {
      setFormError(t('visforthearts.com 為展會官網網域，無法作為收信信箱，請填寫貴賓個人的有效電子信箱。', 'visforthearts.com is the event website domain. Please provide the guest\'s personal email.'));
      return;
    }

    if (surname.trim() === '') {
      setFormError(t('請輸入貴賓姓氏。', 'Please enter guest surname.'));
      return;
    }

    setAdding(true);
    setFormError('');
    setSuccessNotice('');

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      // Call dedicated backend invite API for instant auto-activation & branded email dispatch
      let result: any = null;
      let emailSent = false;
      try {
        const res = await fetch('/api/exhibitor/vip/invite', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            brand_id: brand.id,
            brand_name_zh: brand.brand_name_zh,
            vip_email: trimmedEmail,
            vip_surname: surname.trim(),
            tier: selectedTier,
          }),
        });
        result = await res.json();
        emailSent = !!result.emailSent;
      } catch (apiErr) {
        console.warn('API invite fetch warning, using client fallback:', apiErr);
      }

      if (result?.error) {
        setFormError(result.error);
        setAdding(false);
        return;
      }

      let newRecord: any = null;
      if (result && result.submission) {
        newRecord = result.submission;
      } else {
        // Direct Client Fallback via authenticated Supabase client
        const fallbackSurname = selectedTier === 'SVIP' ? `${surname.trim()} (SVIP)` : surname.trim();
        const { data: directData, error: directErr } = await supabase
          .from('exhibitor_vip_submissions')
          .insert({
            brand_id: brand.id,
            brand_name_zh: brand.brand_name_zh,
            vip_email: trimmedEmail,
            vip_surname: fallbackSurname,
          })
          .select()
          .maybeSingle();

        if (directErr) {
          if (directErr.code === '23505') {
            setFormError(t('該電子信箱已在貴品牌的專屬邀請名單中。', 'This email is already in your guest list.'));
          } else {
            setFormError(result?.error || directErr.message || t('名單登記失敗，請稍後再試。', 'Failed to add guest. Please try again.'));
          }
          setAdding(false);
          return;
        }

        // Also ensure vip_allowlist auto-activation in client fallback
        try {
          await supabase
            .from('vip_allowlist')
            .upsert(
              {
                email: trimmedEmail,
                name: `${surname.trim()} 氏`,
                tier: selectedTier,
                status: 'Approved',
                role: 'VIP',
                rsvp_status: 'Pending',
              },
              { onConflict: 'email' }
            );
        } catch {}

        newRecord = directData ? { ...directData, tier: selectedTier } : {
          id: `temp-${Date.now()}`,
          brand_id: brand.id,
          brand_name_zh: brand.brand_name_zh,
          vip_email: trimmedEmail,
          vip_surname: fallbackSurname,
          tier: selectedTier,
          created_at: new Date().toISOString(),
        };
      }

      const updated = [newRecord, ...vips];
      setVips(updated);
      safeSetStorage(`vis_portal_vip_list_${brand.id}`, JSON.stringify(updated));
      setSurname('');
      setEmail('');
      setSelectedTier('VIP');
      
      const emailNotice = result.emailSent 
        ? t('官方邀請函已即時發送至貴賓信箱！', 'Official invitation email sent immediately!')
        : t('已成功開通貴賓通行證！', 'VIP Pass successfully activated!');
      
      setSuccessNotice(`✓ ${emailNotice} ${t('您可點擊右側「複製 LINE 文案」直接傳送給貴賓。', 'You can also click "Copy LINE Invite" to share via LINE directly.')}`);

      // Auto dismiss success notice after 8 seconds
      setTimeout(() => setSuccessNotice(''), 8000);

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
                  '大會特別致贈「造物計畫」特展創作者 10 張專屬貴賓票。系統支援即時自動開通與發信，並提供一鍵 LINE 分享專屬領卡連結。',
                  'Organizer complimentary 10 VIP passes for Making Project creators. Instant activation, branded email dispatch, and one-click LINE sharing are supported.'
                )}
              </>
            ) : (
              <>
                {t(
                  `大會特別致贈參展品牌專屬 ${vipLimit} 張貴賓票。輸入後即時自動開通權益，並支援一鍵複製專屬 LINE 邀請文案私訊貴賓！`,
                  `Organizer complimentary ${vipLimit} passes for your brand. Instant activation and one-click LINE personalized invitation sharing included!`
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

      {/* Success Banner */}
      {successNotice && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button 
            onClick={() => setSuccessNotice('')}
            className="text-emerald-400 hover:text-white text-xs underline ml-4 cursor-pointer"
          >
            關閉
          </button>
        </motion.div>
      )}

      {/* Brand Exclusive Public Ticket Registration Link Card */}
      <div className="bg-gradient-to-r from-[#171512] via-[#121212] to-[#171512] border border-[#DFBA87]/30 rounded-xl p-5 md:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#DFBA87]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#DFBA87] animate-pulse" />
              <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-[#DFBA87] font-semibold">
                {t('公眾預約門票・品牌專屬方案', 'Public Registration • Dedicated Brand Scheme')}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-serif-garamond text-white tracking-wide">
              {brand.brand_name_zh || brand.name_zh || '貴品牌'} {t('專屬觀展預約連結', 'Exclusive Registration Link')}
            </h3>
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              {t(
                '大會全面採用「品牌專屬連結方案」。透過此連結登記之觀眾，其電子觀展憑證將永久銘刻【貴品牌名稱】，並要求入場時出示已追蹤貴品牌 Instagram！建議將此連結放置於品牌官方 IG 個人簡介、限時動態或 LINE 官方帳號進行宣傳。',
                'All public visitors must register via brand-dedicated links. Passes minted via your link will permanently showcase your brand name and require visitors to follow your Instagram upon entry.'
              )}
            </p>
            <div className="pt-1">
              <div className="inline-flex items-center gap-2 bg-black/60 border border-white/10 rounded-md px-3 py-1.5 text-xs font-mono text-neutral-300 max-w-full">
                <span className="truncate select-all text-[#DFBA87]">{getDedicatedTicketLink()}</span>
                <a
                  href={getDedicatedTicketLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-white transition-colors ml-1 shrink-0"
                  title={t('開啟專屬預約頁面', 'Open dedicated registration page')}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            {/* Copy Link Button */}
            <button
              type="button"
              onClick={handleCopyTicketLink}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                copiedTicketLink
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-[#DFBA87]/15 hover:bg-[#DFBA87]/25 text-[#DFBA87] border border-[#DFBA87]/40'
              }`}
            >
              {copiedTicketLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t('已複製連結！', 'Link Copied!')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{t('一鍵複製專屬連結', 'Copy Link')}</span>
                </>
              )}
            </button>

            {/* Copy Promo Message */}
            <button
              type="button"
              onClick={handleCopyPromoMessage}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                copiedPromoText
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10'
              }`}
              title={t('複製包含展會時間與地點的社群/LINE宣傳文案', 'Copy promotional message for social media / LINE')}
            >
              {copiedPromoText ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t('已複製宣傳文案！', 'Text Copied!')}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>{t('複製宣傳文案', 'Copy Promo Text')}</span>
                </>
              )}
            </button>

            {/* Direct Share to LINE */}
            <button
              type="button"
              onClick={handleShareDedicatedTicketToLine}
              className="px-3 py-2 text-[#06C755] hover:bg-[#06C755]/15 border border-[#06C755]/30 hover:border-[#06C755] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title={t('直接開啟 LINE 分享專屬預約邀請', 'Share dedicated invitation to LINE')}
            >
              <MessageSquare className="w-4 h-4 fill-[#06C755]/20" />
              <span>LINE</span>
            </button>
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
                    {t('1/6 尊榮預展暨開幕晚會專屬資格 + 全展期通行', 'Jan 6 Opening Gala Vernissage + Full Fair')}
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
                  {t('開通並發送專屬邀請函...', 'Activating & Sending Invite...')}
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" /> 
                  {selectedTier === 'SVIP' ? t('開通並發送 SVIP 開幕晚會邀請', 'Activate & Send SVIP Gala Pass') : t('開通並發送 VIP 展期邀請', 'Activate & Send VIP Pass')}
                </>
              )}
            </button>
          </form>

          <div className="flex gap-2 text-[10px] text-neutral-500 font-light pt-2 leading-relaxed">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#DFBA87]" />
            <p>
              {t(
                '送出後系統將自動為該貴賓開通權益，並以【貴品牌名稱】敬邀名義寄送官方專屬電子邀請卡；送出後亦可於右側一鍵複製 LINE 私訊文案。',
                'Upon submission, the pass will be activated immediately and an invitation email will be dispatched in your brand name.'
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
                  const isCopied = copiedId === vip.id;

                  return (
                    <motion.div
                      key={vip.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={`border rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                        isSvip 
                          ? 'bg-amber-500/[0.04] border-amber-500/25 hover:border-amber-500/40' 
                          : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                      }`}
                    >
                      {/* Left: Guest info & tier badge */}
                      <div className="flex items-center gap-3.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-serif-garamond text-base shrink-0 ${
                          isSvip 
                            ? 'bg-[#DFBA87]/20 text-[#DFBA87] ring-1 ring-[#DFBA87]/40' 
                            : 'bg-[#C9A96E]/10 text-[#DFBA87]'
                        }`}>
                          {cleanSurname(vip.vip_surname).substring(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
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
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">{vip.vip_email}</div>
                        </div>
                      </div>
                      
                      {/* Right: Actions (Copy LINE text, direct LINE share, delete) */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        {/* One-Click Copy LINE Invitation Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyLineInvite(vip)}
                          className={`px-2.5 py-1.5 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                            isCopied
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                              : 'bg-white/5 hover:bg-[#DFBA87]/20 text-[#DFBA87] border border-[#DFBA87]/35 hover:border-[#DFBA87]'
                          }`}
                          title={t('一鍵複製專屬 LINE 私訊邀請文案', 'Copy personalized LINE invite message')}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{t('已複製！', 'Copied!')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{t('複製 LINE 文案', 'Copy LINE Text')}</span>
                            </>
                          )}
                        </button>

                        {/* Direct Share to LINE Button */}
                        <button
                          type="button"
                          onClick={() => handleShareToLine(vip)}
                          className="px-2 py-1.5 text-[#06C755] hover:bg-[#06C755]/15 border border-[#06C755]/30 hover:border-[#06C755] rounded transition-all cursor-pointer flex items-center gap-1"
                          title={t('直接開啟 LINE 分享', 'Open LINE to share')}
                        >
                          <MessageSquare className="w-3.5 h-3.5 fill-[#06C755]/20" />
                          <span className="text-[10px] font-bold">LINE</span>
                        </button>

                        {/* Remove VIP Button */}
                        <button
                          onClick={() => handleDeleteVip(vip.id)}
                          disabled={deletingId === vip.id}
                          className="text-neutral-500 hover:text-rose-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors cursor-pointer ml-1"
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
                  '本屆展會現場不另售一般門票。【VIP 展期貴賓票】享 1/7 - 1/9 公眾展期全時段免排隊優先入場；【SVIP 開幕晚會票】享有 1/6 (三) 尊榮預展暨開幕晚會專屬通行資格與全展期快速通行。',
                  'Fair admission is invitation-only. VIP Pass grants priority fast-track for Jan 7-9. SVIP Pass includes Jan 6 Vernissage & Gala access plus full fair priority.'
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
