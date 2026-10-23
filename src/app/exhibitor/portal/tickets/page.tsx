'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, Copy, Check, MessageSquare, Share2, ExternalLink, 
  QrCode, AlertCircle, Info, Sparkles, Download, ArrowRight,
  ShieldCheck, Users, HelpCircle, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useExhibitorLanguage } from '@/lib/ExhibitorLanguageContext';
import { extractIgHandle } from '@/lib/brandUtils';

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

export default function ExhibitorPublicTicketsPage({ brand: parentBrand }: { brand?: any }) {
  const { lang, t } = useExhibitorLanguage();

  const [brand, setBrand] = useState<any>(() => {
    if (parentBrand) return parentBrand;
    const saved = safeGetStorage('vis_portal_brand_data');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => !brand);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    const loadBrand = async () => {
      try {
        let currentBrand = brand;
        if (!currentBrand) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            const email = session.user.email.toLowerCase().trim();
            const { data } = await supabase
              .from('exhibitor_brands')
              .select('*')
              .eq('portal_email', email)
              .maybeSingle();
            currentBrand = data;

            if (!currentBrand) {
              const { data: appData } = await supabase
                .from('exhibitor_applications')
                .select('*')
                .eq('contact_email', email)
                .eq('status', 'approved')
                .maybeSingle();

              if (appData) {
                currentBrand = {
                  id: appData.id,
                  application_id: appData.id,
                  brand_name_zh: appData.brand_name_zh,
                  brand_name_en: appData.brand_name_en,
                  instagram_handle: extractIgHandle(appData.instagram_url, appData.brand_name_en || appData.brand_name_zh),
                  booth_type: appData.booth_type,
                  zone_id: appData.zone_id,
                  portal_email: email,
                };
              }
            }
          }
        }

        if (currentBrand) {
          setBrand(currentBrand);
          safeSetStorage('vis_portal_brand_data', JSON.stringify(currentBrand));
        }
      } catch (err) {
        console.error('Error fetching brand data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBrand();
  }, [parentBrand]);

  const brandNameZh = brand?.brand_name_zh || brand?.name_zh || 'VIS 參展品牌';
  const brandNameEn = brand?.brand_name_en || brand?.name_en || '';
  const igHandle = extractIgHandle(brand?.instagram_handle || brand?.instagram_url, brandNameEn || brandNameZh);
  const igFollowTextZh = igHandle && igHandle !== '@visforthearts' ? `${igHandle} 及 @visforthearts` : '@visforthearts';
  const igFollowTextEn = igHandle && igHandle !== '@visforthearts' ? `${igHandle} and @visforthearts` : '@visforthearts';

  // Construct dedicated public ticket link
  const brandParam = (brand?.brand_name_en || brand?.name_en || brand?.brand_name_zh || brand?.name_zh || brand?.id || '').trim();
  const dedicatedTicketLink = `https://www.visforthearts.com/ticket?brand=${encodeURIComponent(brandParam)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(dedicatedTicketLink)}`;

  // Copy handler
  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(dedicatedTicketLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Copy template text handler
  const handleCopyTemplate = (templateId: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedTemplateId(templateId);
      setTimeout(() => setCopiedTemplateId(null), 3000);
    }
  };

  // Direct LINE share handler
  const handleShareToLine = (text: string) => {
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
    window.open(lineUrl, '_blank', 'noopener,noreferrer');
  };

  // Promo copy templates
  const promoTemplates = [
    {
      id: 'ig_story',
      title: lang === 'en' ? 'Template 1: Instagram Stories / Post (Concise)' : '模板一：Instagram 限時動態 / 貼文（極簡精煉版）',
      subtitle: lang === 'en' ? 'Ideal for Link in Bio or Story link sticker' : '最適合放置於個人簡介連結 (Link in Bio) 或限動連結貼紙',
      text: lang === 'en'
        ? `【VIS 2027 × ${brandNameEn || brandNameZh}】\n\nWe are pleased to invite you to 2027  VIS Contemporary Culture !\nClaim your complimentary admission pass via our exclusive brand link:\n${dedicatedTicketLink}\n\n✦ Dates: Jan 7 (Thu) – Jan 9 (Sat), 2027\n✦ Venue: Taipei Zhongshan Hall (Guangfu Hall)\n* Please follow ${igFollowTextEn} on Instagram for onsite entry verification.`
        : `【VIS 2027 × ${brandNameZh} 專屬觀展邀請】\n\n誠摯邀請您蒞臨 2027  VIS Contemporary Culture ！\n點擊下方專屬連結即可免費預約領取數位觀展門票：\n${dedicatedTicketLink}\n\n✦ 展期：2027. 01. 07 (四) – 01. 09 (六)\n✦ 地點：台北中山堂 光復廳（台北市中正區延平南路 98 號）\n* 入場時請出示此憑證與已追蹤 ${igFollowTextZh} 畫面。現場見！`,
    },
    {
      id: 'global_en',
      title: lang === 'en' ? 'Template 2: Global English Edition' : '模板二：國際社群英文發布版 (Global Audience)',
      subtitle: lang === 'en' ? 'Designed for overseas collectors, foreign guests, and English posts' : '適合跨國藏家、海外品牌粉絲與國際社群分享',
      text: `[Exclusive Visitor Invitation] Join ${brandNameEn || brandNameZh} at 2027  VIS Contemporary Culture in Taipei!\n\nWe are thrilled to present our curation at the historic Guangfu Hall, Taipei Zhongshan Hall from Jan 7–9, 2027.\n\nUnlock your complimentary Digital Entry Pass via our dedicated brand link:\n${dedicatedTicketLink}\n\n• Exhibition: 2027  VIS Contemporary Culture\n• Venue: Guangfu Hall, Taipei Zhongshan Hall\n• Dates: January 7–9, 2027\n* Onsite entry requirement: Please show your pass and follow screen for ${igFollowTextEn}.`,
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#DFBA87]">
        <div className="w-6 h-6 border-2 border-[#DFBA87] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans-outfit">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#DFBA87] animate-pulse" />
            <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-[#DFBA87] font-semibold">
              {t('MODULE G // 大眾觀展導客專用', 'MODULE G // PUBLIC ADMISSION CHANNEL')}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif-garamond text-white tracking-wider flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-[#DFBA87]" />
            {t('模組 G — 參展品牌專屬觀展預約連結', 'Module G — Dedicated Public Registration Link')}
          </h1>
          <p className="text-xs text-neutral-400 font-light mt-1.5 leading-relaxed max-w-2xl">
            {t(
              '大會全面採用「品牌專屬連結方案」。本模組提供貴品牌專用的公眾免費觀展預約連結，專供一般民眾、社群粉絲與顧客預約領票。',
              'All public visitors must register through brand-dedicated links. This module provides your brand unique link for the general public, community fans, and customers.'
            )}
          </p>
        </div>

        {/* Brand identity badge */}
        <div className="bg-[#141414] border border-[#DFBA87]/30 px-4 py-2.5 rounded-lg text-xs flex flex-col items-start md:items-end gap-0.5 shrink-0 shadow-md">
          <span className="text-[10px] text-neutral-400 uppercase tracking-widest">{t('專屬邀請發布品牌', 'Dedicated Inviting Brand')}</span>
          <span className="font-serif-garamond text-base text-white font-medium">{brandNameZh}</span>
          {brandNameEn && <span className="font-mono text-[10px] text-[#DFBA87]">{brandNameEn}</span>}
        </div>
      </div>

      {/* Critical Access Level Distinction Banner (進場優先級差異對比卡) */}
      <div className="bg-gradient-to-br from-[#1A1713] via-[#141414] to-[#111111] border-2 border-[#DFBA87]/40 rounded-xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#DFBA87]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start gap-3.5 relative z-10">
          <div className="w-9 h-9 rounded-full bg-[#DFBA87]/15 border border-[#DFBA87]/40 flex items-center justify-center text-[#DFBA87] shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-semibold text-white tracking-wide">
              {t('【重要權益與進場優先級說明】模組 G (公眾) 與 模組 C (VIP) 之重大差異', '[Important Notice: Access Level Distinction] Module G (Public) vs Module C (VIP)')}
            </h2>
            <p className="text-xs text-neutral-300 font-light mt-1 leading-relaxed">
              {t(
                '請參展品牌特別留意：本「模組 G」所產生的專屬連結是提供給「一般民眾、公眾、廣大社群粉絲」使用，進場權益與貴賓完全不同，請勿與「模組 C VIP 貴賓」混淆。',
                'Please note: Module G is strictly intended for the general public, social followers, and everyday customers. Access privileges are completely different from Module C VIP passes.'
              )}
            </p>
          </div>
        </div>

        {/* High-Contrast Comparison Matrix Table */}
        <div className="grid md:grid-cols-2 gap-4 relative z-10 pt-1">
          {/* Module C Card (VIP) */}
          <div className="bg-black/50 border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#DFBA87]" />
                {t('模組 C：VIP / SVIP 專屬貴賓禮遇', 'Module C: VIP / SVIP Guest Passes')}
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {t('尊榮最高優先級', 'Highest Priority')}
              </span>
            </div>
            <ul className="text-xs text-neutral-300 space-y-2 font-light">
              <li className="flex items-start gap-2">
                <span className="text-[#DFBA87] font-bold">✦</span>
                <span><strong>{t('適用對象', 'Target')}:</strong> {t('核心藏家、大客戶、藝文媒體巨擘、重要親友。', 'High-net-worth collectors, top VIPs, press giants.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#DFBA87] font-bold">✦</span>
                <span><strong>{t('進場特權', 'Access Privilege')}:</strong> <span className="text-amber-300 font-medium">{t('享全展期免排隊尊榮快速通行 (Fast-Track)', 'Full fair fast-track priority entry without queuing')}</span>；SVIP 享 1/6 (三) 尊榮預展暨開幕晚會通行。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#DFBA87] font-bold">✦</span>
                <span><strong>{t('名額限制', 'Quota Limit')}:</strong> {t('嚴格依合約方案限量發放 (10 / 30 / 50 位)，額滿為止。', 'Strictly limited by booth contract (10 / 30 / 50 seats).')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#DFBA87] font-bold">✦</span>
                <span><strong>{t('發放方式', 'Issuance')}:</strong> {t('由品牌於模組 C 手動登錄貴賓姓名與 Email，系統直發專屬憑證。', 'Brand manually nominates surname & email; system dispatches VIP pass.')}</span>
              </li>
            </ul>
          </div>

          {/* Module G Card (Public Admission) */}
          <div className="bg-[#DFBA87]/[0.06] border border-[#DFBA87]/40 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#DFBA87]/20 pb-2">
              <span className="text-xs font-semibold text-[#DFBA87] flex items-center gap-1.5">
                <Ticket className="w-3.5 h-3.5 text-[#DFBA87]" />
                {t('模組 G：公眾觀展預約門票（本模組）', 'Module G: Public Registration (This Module)')}
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {t('大眾免費門票', 'General Admission')}
              </span>
            </div>
            <ul className="text-xs text-neutral-300 space-y-2 font-light">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>{t('適用對象', 'Target')}:</strong> {t('社群粉絲、一般大眾、品牌新客、親友同事。', 'Social media followers, general public, potential new clients.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>{t('進場機制', 'Access Privilege')}:</strong> <span className="text-neutral-200">{t('時段預約制（1/7–1/9 指定場次）。若現場達場館容留上限需依序排隊等候進場（一進一出動線管制），無 VIP 免排隊特權。', 'Time-slot reservation for Jan 7-9. Capacity control applies with queue. No fast-track VIP privilege.')}</span></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>{t('名額限制', 'Quota Limit')}:</strong> <strong className="text-emerald-300">{t('品牌端無發送額度上限！', 'NO LIMIT ON BRAND DISTRIBUTION!')}</strong> {t('可廣泛發布宣傳。', 'Share openly to maximize traffic.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span><strong>{t('發放方式', 'Issuance')}:</strong> {t('民眾點擊品牌專屬連結自行預約，並於入場出示已追蹤 IG 畫面。', 'Visitors claim online via your link and verify IG following onsite.')}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Dedicated Link & QR Suite */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Link Box & Quick Actions */}
        <div className="lg:col-span-2 bg-[#111111] border border-white/5 rounded-xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-sm font-semibold tracking-widest text-[#DFBA87] uppercase flex items-center gap-2">
              <Share2 className="w-4 h-4" /> {t('貴品牌專屬觀展預約連結', 'Your Exclusive Registration URL')}
            </h2>
            <span className="text-[10px] text-neutral-400 font-mono">
              {t('點擊右側按鈕一鍵複製', 'Click to copy')}
            </span>
          </div>

          {/* URL Display Bar */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-mono tracking-widest text-neutral-400 block">
              {t('DEDICATED BRAND URL (永久專屬連結)', 'DEDICATED BRAND URL (PERMANENT)')}
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="bg-black/70 border border-[#DFBA87]/30 rounded-lg px-4 py-3 text-xs font-mono text-[#DFBA87] select-all flex-1 truncate shadow-inner">
                {dedicatedTicketLink}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-3 rounded-lg text-xs font-semibold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0 ${
                  copiedLink
                    ? 'bg-emerald-500 text-black border border-emerald-400 font-bold'
                    : 'bg-[#DFBA87] hover:bg-[#c9a370] text-black border border-[#DFBA87]'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    <span>{t('已複製連結！', 'Copied!')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-black" />
                    <span>{t('一鍵複製連結', 'Copy Link')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Direct Line Share Button */}
            <button
              type="button"
              onClick={() => handleShareToLine(promoTemplates[0].text)}
              className="px-4 py-3 bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/30 hover:border-[#06C755] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <MessageSquare className="w-4 h-4 fill-[#06C755]/20" />
              <span>{t('直接分享宣傳文案至 LINE', 'Share via LINE Direct')}</span>
            </button>

            {/* Preview Link in New Tab */}
            <a
              href={dedicatedTicketLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white border border-white/10 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-[#DFBA87]" />
              <span>{t('預覽專屬預約頁面效果', 'Preview Dedicated Page')}</span>
            </a>
          </div>

          {/* 3 Core Benefits Explanatory Box */}
          <div className="border-t border-white/5 pt-6 space-y-4">
            <h3 className="text-xs font-semibold tracking-widest text-neutral-300 uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#DFBA87]" />
              {t('模組 G 為品牌帶來的 3 大核心導客效益', '3 Key Strategic Marketing Benefits for Your Brand')}
            </h3>

            <div className="grid sm:grid-cols-3 gap-3.5">
              <div className="bg-black/40 border border-white/5 rounded-lg p-3.5 space-y-1.5">
                <div className="text-[10px] font-mono font-semibold text-[#DFBA87]">01. 品牌專屬銘刻</div>
                <div className="text-xs font-medium text-white">{t('票券永久標註邀請品牌', 'Passes Branded With Your Name')}</div>
                <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                  {t('訪客點擊進入後，全程展示【貴品牌名稱】。領取成功之電子票券與憑證確認信上，永久標註「邀請來源：【貴品牌】」，極具尊榮感。', 'Your brand name is permanently displayed on the registration page, pass UI, and confirmation emails.')}
                </p>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-lg p-3.5 space-y-1.5">
                <div className="text-[10px] font-mono font-semibold text-emerald-400">02. 強制現場 IG 增粉</div>
                <div className="text-xs font-medium text-white">{t('現場核銷必查追蹤畫面', 'Mandatory Instagram Follow Onsite')}</div>
                <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                  {t('大會現場接待人員將嚴格核對觀眾是否已追蹤【貴品牌 Instagram】與 @visforthearts。未出示追蹤畫面者不得入場，實體流量直接轉化為真實粉絲！', 'Staff will check if visitors have followed your official IG upon entry. Every visitor translates to a genuine follower!')}
                </p>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-lg p-3.5 space-y-1.5">
                <div className="text-[10px] font-mono font-semibold text-amber-300">03. 無發放上限約束</div>
                <div className="text-xs font-medium text-white">{t('無限廣泛社群發布', 'Uncapped Community Reach')}</div>
                <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                  {t('無個人或品牌發送配額限制！適合直接放置於 Instagram 個人簡介 (Link in Bio)、限動連結貼紙或 LINE 官方推播，吸引越多潛在買家越好。', 'No quota caps on how many links you share. Broadcast via Stories, LINE, or newsletters openly.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live QR Code Card & Download */}
        <div className="bg-[#111111] border border-white/5 rounded-xl p-6 md:p-8 flex flex-col items-center text-center space-y-5 shadow-xl h-fit">
          <div className="space-y-1">
            <h2 className="text-xs font-semibold tracking-widest text-[#DFBA87] uppercase flex items-center justify-center gap-1.5">
              <QrCode className="w-4 h-4" /> {t('專屬連結 QR CODE', 'Dedicated QR Code')}
            </h2>
            <p className="text-[11px] text-neutral-400 font-light">
              {t('手機掃描即刻前往專屬預約頁', 'Scan with smartphone to open registration')}
            </p>
          </div>

          {/* QR Container */}
          <div className="p-3 bg-white rounded-xl border-2 border-[#DFBA87]/40 shadow-xl inline-block">
            <img 
              src={qrCodeUrl} 
              alt="Brand Dedicated Ticket QR" 
              className="w-44 h-44 object-contain rounded"
            />
          </div>

          <div className="space-y-2 w-full pt-1">
            <a
              href={qrCodeUrl}
              download={`${brandNameZh}-VIS-Ticket-QR.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white px-4 py-2.5 rounded-lg text-xs font-medium transition-all"
            >
              <Download className="w-4 h-4 text-[#DFBA87]" />
              <span>{t('下載 QR Code 圖檔', 'Download QR Code')}</span>
            </a>
            <p className="text-[10px] text-neutral-500 font-light leading-relaxed">
              {t('可將此 QR Code 印刷置於實體展位立牌或行銷傳單供現場訪客掃描。', 'Suitable for printing on table tents or promotional postcards.')}
            </p>
          </div>
        </div>

      </div>

      {/* Copyable Marketing Templates Section */}
      <div className="bg-[#111111] border border-white/5 rounded-xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-sm font-semibold tracking-widest text-[#DFBA87] uppercase flex items-center gap-2">
              <Share2 className="w-4 h-4" /> {t('品牌宣傳推廣文案庫（一鍵複製發布）', 'Pre-Formatted Marketing Templates (One-Click Copy)')}
            </h2>
            <p className="text-xs text-neutral-400 font-light mt-1">
              {t('已為您填妥品牌名稱、專屬連結與展期資訊，點擊右上方「複製」即可直接發布於各社群平台。', 'Pre-populated with your brand name, URL, dates, and venue. Click "Copy" to broadcast immediately.')}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {promoTemplates.map((template) => {
            const isCopied = copiedTemplateId === template.id;
            return (
              <div 
                key={template.id} 
                className="bg-black/50 border border-white/10 rounded-xl p-5 flex flex-col justify-between space-y-4 hover:border-[#DFBA87]/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white tracking-wide">{template.title}</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-light leading-relaxed">{template.subtitle}</p>
                  
                  {/* Preformatted text block */}
                  <div className="bg-[#161616] border border-white/5 rounded-lg p-3 text-[11px] font-mono text-neutral-300 leading-relaxed whitespace-pre-line max-h-56 overflow-y-auto select-all">
                    {template.text}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyTemplate(template.id, template.text)}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-[#DFBA87]/15 hover:bg-[#DFBA87]/25 text-[#DFBA87] border border-[#DFBA87]/40'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t('已複製文案！', 'Copied!')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t('複製此文案', 'Copy Template')}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareToLine(template.text)}
                    className="p-2.5 text-[#06C755] hover:bg-[#06C755]/15 border border-[#06C755]/30 rounded-lg transition-all cursor-pointer"
                    title={t('分享此文案至 LINE', 'Share via LINE')}
                  >
                    <MessageSquare className="w-4 h-4 fill-[#06C755]/20" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comprehensive Operational FAQ / Guide */}
      <div className="bg-[#111111] border border-white/5 rounded-xl p-6 md:p-8 space-y-5 shadow-xl text-neutral-300">
        <h2 className="text-xs font-semibold tracking-widest text-[#DFBA87] uppercase flex items-center gap-2 border-b border-white/5 pb-3">
          <HelpCircle className="w-4 h-4" /> {t('模組 G 使用規範與常見問題 (FAQ)', 'Module G FAQ & Operational Guidelines')}
        </h2>

        <div className="grid md:grid-cols-2 gap-6 text-xs font-light leading-relaxed">
          <div className="space-y-2">
            <h3 className="font-medium text-white flex items-center gap-1.5">
              <span className="text-[#DFBA87]">Q:</span>
              {t('此專屬連結有預約人數上限嗎？', 'Is there any quota limit for this dedicated link?')}
            </h3>
            <p className="text-neutral-400">
              {t(
                '品牌端無預約名額上限。大會僅針對各觀展時段進行全場安全容留總量管制。只要該時段尚有名額，民眾皆可透過您的連結順利預約。建議提早邀請粉絲預約熱門時段。',
                'No quota limit per brand. Organizer only enforces venue safety capacity per slot. As long as slots are available, visitors can book.'
              )}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-white flex items-center gap-1.5">
              <span className="text-[#DFBA87]">Q:</span>
              {t('如果想邀請核心藏家或重要大客戶，該使用哪一個？', 'Which channel should I use for VIP collectors and key buyers?')}
            </h3>
            <p className="text-neutral-400">
              {t(
                '重要貴賓請務必使用【模組 C — VIP 專屬貴賓邀請】！VIP 享有全展期「免排隊尊榮快速通行 (Fast-track)」，且 SVIP 能參加 1/6 (三) 尊榮預展暨開幕晚會。本模組 G 為一般大眾門票，無免排隊特權。',
                'For top collectors, always use Module C VIP Invitations. VIP passes grant fast-track priority entry and gala access. Module G general passes do not have fast-track privileges.'
              )}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-white flex items-center gap-1.5">
              <span className="text-[#DFBA87]">Q:</span>
              {t('現場如果人潮眾多，持公眾門票之觀眾如何入場？', 'What happens during peak hours for general pass holders?')}
            </h3>
            <p className="text-neutral-400">
              {t(
                '因台北中山堂為國定古蹟且受消防安全容留人數法規規範，若場內人數達上限時，公眾門票將啟動「一進一出」依序排隊進場管制。請提醒民眾依預約時段準時抵達。',
                'Due to historical monument preservation and fire safety limits, when hall reaches full capacity, "one-in, one-out" queuing will be enforced for general pass holders.'
              )}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-white flex items-center gap-1.5">
              <span className="text-[#DFBA87]">Q:</span>
              {t('觀眾未追蹤 IG 真的不能入場嗎？', 'Is Instagram follow verification strictly required?')}
            </h3>
            <p className="text-neutral-400">
              {t(
                '是的。大會入口接待處將嚴格落實查核，觀眾出示 QR Code 同時須出示手機已追蹤貴品牌 IG 與 @visforthearts 畫面。此規範能保障參展品牌每次推廣皆能收穫實質且忠實的社群關注者。',
                'Yes. Onsite reception will strictly verify Instagram following for both your brand and @visforthearts to ensure marketing conversion for our exhibitors.'
              )}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
