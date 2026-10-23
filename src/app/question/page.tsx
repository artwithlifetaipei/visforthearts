'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, CheckCircle2, AlertCircle, Loader2, ArrowLeft, 
  ShieldCheck, Eye, HelpCircle, X, ExternalLink
} from 'lucide-react';

export default function QuestionPage() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [displayName, setDisplayName] = useState('');
  const [answer, setAnswer] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedData, setSubmittedData] = useState<{
    displayName: string;
    answer: string;
    submittedAt: string;
  } | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);

  const nameCharCount = displayName.trim().length;
  const answerCharCount = answer.trim().length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!displayName.trim()) {
      setErrorMessage(t('請填寫姓名或顯示名稱。', 'Please enter your name or display name.'));
      return;
    }
    if (displayName.trim().length > 30) {
      setErrorMessage(t('姓名或顯示名稱不得超過 30 個字元。', 'Display name cannot exceed 30 characters.'));
      return;
    }
    if (!answer.trim()) {
      setErrorMessage(t('請填寫您的觀點與回答。', 'Please share your perspective.'));
      return;
    }
    if (answer.trim().length > 120) {
      setErrorMessage(t('回答字數不得超過 120 個字元。', 'Answer cannot exceed 120 characters.'));
      return;
    }
    if (!consent) {
      setErrorMessage(t('請勾選同意公開展示與授權條款。', 'Please accept the consent terms to proceed.'));
      return;
    }

    setSubmitting(true);

    try {
      const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const res = await fetch('/api/perspectives/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          answer: answer.trim(),
          consent_display: true,
          consent_version: '2027-v1',
          campaign_slug: 'vis-2027',
          idempotency_key: idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Submission failed');
      }

      setSubmittedData({
        displayName: displayName.trim(),
        answer: answer.trim(),
        submittedAt: new Date().toLocaleTimeString(lang === 'zh' ? 'zh-TW' : 'en-US', { hour12: false }),
      });
      // Reset form fields
      setDisplayName('');
      setAnswer('');
      setConsent(false);
    } catch (err: any) {
      setErrorMessage(err.message || t('提交時發生異常，請重試。', 'An error occurred. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white flex flex-col justify-between selection:bg-[#DFBA87] selection:text-black font-sans">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#DFBA87]/[0.04] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#DFBA87]/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* Top Bar Navigation */}
      <header className="relative z-20 border-b border-white/5 bg-[#070707]/80 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>{t('返回 VIS 官網首頁', 'Back to VIS Home')}</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/question/display"
              className="text-xs text-[#DFBA87] hover:text-white flex items-center gap-1 font-mono tracking-wider transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{t('現場 LED 觀點牆', 'Live LED Wall')} ↗</span>
            </Link>

            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="text-xs font-mono px-2.5 py-1 rounded border border-white/10 hover:border-white/30 text-neutral-300 transition-colors cursor-pointer"
            >
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Single-Page Container */}
      <main className="relative z-10 flex-grow max-w-2xl mx-auto w-full px-5 py-10 sm:py-16">
        
        {/* 01. VIS Identity & Badge */}
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFBA87]/10 border border-[#DFBA87]/30 text-[#DFBA87] text-[11px] font-mono tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>VIS Contemporary Culture 2027</span>
          </div>

          <h2 className="text-xs font-mono tracking-[0.3em] uppercase text-neutral-400 mt-2">
            The Question of the Year · 年度文化命題
          </h2>
        </div>

        {/* 02. Annual Question (Core Prominent Visual) */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-[#F3EAD8] leading-tight font-medium tracking-wide">
            WHAT DO YOU HOPE WILL STILL MATTER IN 100 YEARS?
          </h1>
          <p className="text-xl sm:text-2xl text-neutral-200 font-serif font-light tracking-wider">
            一百年後，你希望什麼仍然重要？
          </p>
          <div className="w-12 h-px bg-[#DFBA87]/40 mx-auto mt-4" />
          <p className="text-xs text-neutral-400 font-light max-w-lg mx-auto leading-relaxed pt-2">
            {t(
              '在講求極致速度與演算法推播的時代，有哪些工藝、價值、心意或生活習慣，值得穿越一個世紀的時間？請留下你的深刻觀點，經大會策展小組審核後，將於 VIS 2027 臺北中山堂現場 LED 觀點之牆動態播放，並永久收錄於 VIS Perspective Archive。',
              'In an era driven by algorithmic speed, what craftsmanship, slow rituals, or humane values deserve to transcend an entire century? Share your perspective here to be displayed on the live architectural LED wall at Taipei Zhongshan Hall.'
            )}
          </p>
        </div>

        {/* Dynamic Display: Form or In-Place Confirmation */}
        <AnimatePresence mode="wait">
          {submittedData ? (
            /* 07. Result: Success State (Section 8.1) */
            <motion.div
              key="success-box"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-gradient-to-b from-[#14120E] to-[#0D0D0D] border border-[#DFBA87]/40 rounded-2xl p-6 sm:p-10 shadow-2xl text-center space-y-6"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-serif text-white tracking-wide font-medium">
                  {t('謝謝你參與這場文化對話', 'Thank You for Contributing to the Conversation')}
                </h3>
                <p className="text-xs text-neutral-400 font-light leading-relaxed max-w-md mx-auto">
                  {t(
                    '你的回答已收到，大會策展與公關小組正進行審核。經核准後將可能於 VIS 現場 LED 觀點之牆、官方專刊及社群中動態展示。',
                    'Your response has been received and will be reviewed by VIS curatorial moderators for live display.'
                  )}
                </p>
              </div>

              {/* Submitted Quote Card */}
              <div className="relative bg-[#080808] border border-white/10 rounded-xl p-6 text-left space-y-3">
                <div className="text-[10px] font-mono text-[#DFBA87] tracking-wider uppercase flex items-center justify-between">
                  <span>● 待策展審核中 (Under Curatorial Review)</span>
                  <span>{submittedData.submittedAt}</span>
                </div>
                <blockquote className="text-sm sm:text-base text-neutral-100 font-serif italic leading-relaxed">
                  “{submittedData.answer}”
                </blockquote>
                <div className="text-xs text-neutral-400 font-medium text-right font-sans pt-1">
                  — {submittedData.displayName}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSubmittedData(null)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-semibold tracking-wider transition-all cursor-pointer"
                >
                  {t('再提供一筆觀點', 'Submit Another Perspective')}
                </button>

                <Link
                  href="/question/display"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#DFBA87] hover:bg-[#c9a370] text-black text-xs font-bold tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t('觀看現場 LED 播放', 'View Live LED Wall')}</span>
                </Link>
              </div>
            </motion.div>
          ) : (
            /* 03-06. Interactive Submission Form */
            <motion.form
              key="submit-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className="bg-[#111111] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6"
            >
              {errorMessage && (
                <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 03. Display Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="display_name" className="text-white font-medium flex items-center gap-1">
                    <span>{t('姓名或希望顯示的名稱', 'Name or Display Name')}</span>
                    <span className="text-[#DFBA87]">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-neutral-500">
                    {nameCharCount} / 30 {t('字', 'chars')}
                  </span>
                </div>
                <input
                  id="display_name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value.substring(0, 30))}
                  placeholder={t('您的姓名或希望顯示的名稱（例如：Amelie、匿名觀展者）', 'Your name or display name')}
                  className="w-full bg-[#080808] border border-white/10 rounded-lg px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-[#DFBA87] focus:ring-1 focus:ring-[#DFBA87]/40 transition-all font-sans"
                  maxLength={30}
                  required
                />
              </div>

              {/* 04. Perspective Answer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="perspective_answer" className="text-white font-medium flex items-center gap-1">
                    <span>{t('你的觀點', 'Your Perspective')}</span>
                    <span className="text-[#DFBA87]">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-neutral-500">
                    {answerCharCount} / 120 {t('字', 'chars')}
                  </span>
                </div>
                <textarea
                  id="perspective_answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value.substring(0, 120))}
                  placeholder={t('用一句話留下你的答案...', 'Share your answer in one sentence...')}
                  rows={4}
                  className="w-full bg-[#080808] border border-white/10 rounded-lg p-4 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-[#DFBA87] focus:ring-1 focus:ring-[#DFBA87]/40 transition-all font-sans leading-relaxed resize-none"
                  maxLength={120}
                  required
                />
                <p className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                  <HelpCircle className="w-3 h-3 text-[#DFBA87] shrink-0" />
                  <span>
                    {t(
                      '請勿填寫電話、Email、地址或其他個人私密資料。',
                      'Please do not include phone, email, address, or other personal contact details.'
                    )}
                  </span>
                </p>
              </div>

              {/* 05. Consent Checkbox & Privacy Policy */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-[#DFBA87] focus:ring-[#DFBA87] focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-xs text-neutral-400 font-light leading-relaxed group-hover:text-neutral-300 transition-colors">
                    {t(
                      '我同意 VIS 得於現場展示、官方網站、社群媒體、影片、出版品及 VIS Perspective Archive 中，使用我提供的顯示名稱與回答內容。我已閱讀並同意',
                      'I agree that VIS may display and use my display name and answer on-site, on official websites, social media, videos, publications, and in the VIS Perspective Archive. I have read the '
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowPrivacyModal(true);
                      }}
                      className="text-[#DFBA87] underline underline-offset-4 hover:text-white font-medium ml-1 cursor-pointer"
                    >
                      {t('隱私權與授權政策', 'Privacy & Consent Policy')}
                    </button>
                    。
                  </span>
                </label>
              </div>

              {/* 06. Submit Button */}
              <button
                type="submit"
                disabled={submitting || !displayName.trim() || !answer.trim() || !consent}
                className="w-full py-3.5 px-6 rounded-xl bg-[#DFBA87] hover:bg-[#c9a370] text-black text-xs sm:text-sm font-bold tracking-widest uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('觀點傳送中...', 'Submitting Perspective...')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('留下你的觀點 SUBMIT YOUR PERSPECTIVE', 'SUBMIT YOUR PERSPECTIVE')}</span>
                  </>
                )}
              </button>

              <div className="text-center text-[10px] text-neutral-600 font-mono">
                {t(
                  '✦ 所有公開展示內容均經大會人工審核 · 臺北中山堂 2027.01.07–01.09 現場即時播映',
                  '✦ All displayed perspectives are curated and moderated · Taipei Zhongshan Hall 2027'
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>

      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 border-t border-white/5 py-6 px-4 text-center text-xs text-neutral-600 font-mono flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
        <div>VIS Contemporary Culture · Perspective Archive 2027</div>
        <span className="hidden sm:inline opacity-30">·</span>
        <Link
          href="/question/admin"
          className="text-neutral-500 hover:text-[#DFBA87] transition-colors text-[11px] underline underline-offset-4 decoration-neutral-700"
        >
          策展審核後台 (Curatorial CMS) ↗
        </Link>
      </footer>

      {/* Privacy Policy & Consent Modal (Section 9.1 & 17) */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111111] border border-white/10 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#DFBA87] text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t('公開展示授權與隱私政策', 'Public Display Consent & Privacy Policy')}</span>
                </div>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto text-xs text-neutral-300 font-light leading-relaxed space-y-4">
                <section className="space-y-1">
                  <h4 className="font-semibold text-white">{t('一、 資料蒐集與目的', '1. Data Collection & Purpose')}</h4>
                  <p>
                    {t(
                      '本功能為 VIS 2027「The Question of the Year 年度文化命題」觀點共創計畫。我們僅蒐集您主動填寫之「顯示名稱」與「回答觀點」。本系統不要求會員登入、亦不強制蒐集您的 Email、電話或真實身分資料。',
                      'This feature is part of the VIS 2027 cultural co-creation program. We only collect the display name and perspective answer you submit.'
                    )}
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-semibold text-white">{t('二、 展示與使用範圍', '2. Scope of Display & Usage')}</h4>
                  <p>
                    {t(
                      '您所提交之內容經大會人工審核通過後，將授權 VIS 於臺北中山堂展覽現場之大型 LED 觀點牆輪播展示、VIS 官方網站、社群媒體、紀錄影片、實體出版品，以及跨年度保存之 VIS Perspective Archive 文化典藏庫中公開展示。',
                      'Your approved perspective will be exhibited on the physical LED wall at Taipei Zhongshan Hall, official channels, publications, and the VIS Perspective Archive.'
                    )}
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-semibold text-white">{t('三、 審核與修訂規範', '3. Moderation & Editorial Edits')}</h4>
                  <p>
                    {t(
                      '為維護展場視覺品質，大會僅得對錯字、標點符號或版面換行進行微幅潤飾，絕不變更您的原始觀點原意。原始提交內容將完整封存於系統記錄中。',
                      'VIS moderators may adjust minor typos, punctuation, or line-breaks to fit architectural display screens, without altering your core meaning.'
                    )}
                  </p>
                </section>

                <section className="space-y-1">
                  <h4 className="font-semibold text-white">{t('四、 當事人撤回權利', '4. Withdrawal of Consent')}</h4>
                  <p>
                    {t(
                      '若您日後希望撤回展示，可隨時透過大會官方聯絡管道（Email: artwithlifetaipei@gmail.com 或 官方 LINE）聯繫我們並提供您的顯示名稱與回答內容，大會將立即將該筆資料自現場播放清單與公開 API 中移除。',
                      'You may withdraw your consent anytime by emailing artwithlifetaipei@gmail.com. We will immediately remove your entry from live broadcasts and public APIs.'
                    )}
                  </p>
                </section>
              </div>

              <div className="p-4 border-t border-white/10 text-right bg-black/40">
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(false)}
                  className="px-5 py-2 rounded-lg bg-[#DFBA87] text-black text-xs font-bold hover:bg-[#c9a370] transition-colors"
                >
                  {t('我已充分理解', 'I Understand')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
