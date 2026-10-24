'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Send, CheckCircle2, AlertCircle, Loader2, ArrowLeft, 
  ShieldCheck, Eye, HelpCircle, X, ExternalLink, Check
} from 'lucide-react';
import { ANNUAL_SUB_QUESTIONS } from '@/lib/perspectiveTypes';

export default function QuestionPage() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('q1');
  const [displayName, setDisplayName] = useState('');
  const [answer, setAnswer] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedData, setSubmittedData] = useState<{
    displayName: string;
    answer: string;
    questionPrompt: string;
    submittedAt: string;
  } | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en);

  const activeQuestion = ANNUAL_SUB_QUESTIONS.find(q => q.id === selectedQuestionId) || ANNUAL_SUB_QUESTIONS[0];

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
          question_id: activeQuestion.id,
          question_prompt: lang === 'zh' ? activeQuestion.question_zh : activeQuestion.question_en,
          consent_display: true,
          consent_version: '2027-v2',
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
        questionPrompt: lang === 'zh' ? activeQuestion.question_zh : activeQuestion.question_en,
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
    <div className="min-h-screen bg-[#0A0908] text-[#F3EFEA] flex flex-col justify-between selection:bg-[#DFBA87] selection:text-black font-sans relative overflow-x-hidden">
      
      {/* Full-bleed authentic architectural background from VIP Lobby matching reference screenshot */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
        <img
          src="/vip_lobby_bg.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
        />
        {/* Dark moody architectural gradient overlay matching screenshot */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 to-black/90" />
        {/* Subtle warm gold ambient vignette */}
        <div 
          className="absolute inset-0" 
          style={{ background: 'radial-gradient(circle at 50% 25%, rgba(223,186,135,0.14) 0%, transparent 75%)' }} 
        />
      </div>

      {/* Top Bar Navigation */}
      <header className="relative z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl px-4 sm:px-8 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-neutral-300 hover:text-white font-medium transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>{t('返回 VIS 官網首頁', 'Back to VIS Home')}</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/question/display"
              className="text-xs sm:text-[13px] text-[#DFBA87] hover:text-white flex items-center gap-1.5 font-medium px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-[#DFBA87]/40 hover:border-[#DFBA87] shadow-xs backdrop-blur-md transition-all duration-300"
            >
              <Eye className="w-3.5 h-3.5 text-[#DFBA87]" />
              <span>{t('The Question of the Year · 年度文化命題', 'The Question of the Year')} ↗</span>
            </Link>

            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="text-xs font-mono px-2.5 py-1 rounded-full border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 hover:text-white shadow-xs transition-colors cursor-pointer"
            >
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Single-Page Container */}
      <main className="relative z-10 flex-grow max-w-2xl mx-auto w-full px-5 py-10 sm:py-16">
        
        {/* 01. VIS Identity & Project Pillar Title */}
        <div className="text-center space-y-3.5 mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DFBA87]/15 border border-[#DFBA87]/40 text-[#DFBA87] text-[11px] sm:text-xs font-mono tracking-widest uppercase font-semibold shadow-xs backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#DFBA87]" />
            <span>VIS Contemporary Culture 2027</span>
          </div>

          <div className="space-y-2 pt-1">
            <h2 className="text-lg sm:text-xl md:text-2xl font-serif text-[#DFBA87] font-medium tracking-[0.14em] sm:tracking-[0.2em] flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              <span>The Question of the Year</span>
              <span className="hidden sm:inline text-[#DFBA87]/60">·</span>
              <span className="text-white/90 font-normal tracking-[0.16em]">年度文化命題</span>
            </h2>
            <div className="w-10 h-[1px] bg-[#DFBA87] mx-auto mt-2.5 rounded-full opacity-60" />
          </div>
        </div>

        {/* 02. Annual Question (Core Prominent Visual) */}
        <div className="text-center space-y-4 mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif text-white leading-tight font-medium tracking-wide drop-shadow-md">
            {t('美，如何成為我們共同的價值？', 'HOW CAN AESTHETICS BECOME OUR SHARED VALUE?')}
          </h1>
          <p className="text-base sm:text-lg text-[#DFBA87] font-serif font-medium tracking-widest drop-shadow-sm">
            {t('HOW CAN AESTHETICS BECOME OUR SHARED VALUE?', '美，如何成為我們共同的價值？')}
          </p>
        </div>

        {/* Dynamic Display: Form or In-Place Confirmation */}
        <AnimatePresence mode="wait">
          {submittedData ? (
            /* 07. Result: Success State */
            <motion.div
              key="success-box"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-black/60 backdrop-blur-2xl border border-[#DFBA87]/40 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/80 text-center space-y-6 text-white"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-serif text-white tracking-wide font-medium">
                  {t('謝謝你參與這場文化對話', 'Thank You for Contributing to the Conversation')}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed max-w-md mx-auto">
                  {t(
                    '你的回答已收到，大會策展小組正進行審核。經核准後將即時於 VIS 現場 LED 觀點之牆動態展示，並收錄於年度文化典藏庫。',
                    'Your response has been received and will be reviewed by VIS curatorial moderators for live display.'
                  )}
                </p>
              </div>

              {/* Submitted Quote Card */}
              <div className="relative bg-white/[0.05] border border-white/15 rounded-2xl p-6 text-left space-y-3 shadow-md backdrop-blur-md">
                <div className="text-[10px] font-mono text-[#DFBA87] tracking-wider uppercase flex items-center justify-between border-b border-white/10 pb-2 font-medium">
                  <span>● 待策展審核中 (Under Curatorial Review)</span>
                  <span>{submittedData.submittedAt}</span>
                </div>

                <div className="text-xs text-[#DFBA87] font-serif font-medium">
                  題目：{submittedData.questionPrompt}
                </div>

                <blockquote className="text-sm sm:text-base text-white font-serif italic leading-relaxed pt-1">
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
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-neutral-200 hover:text-white border border-white/20 text-xs font-semibold tracking-wider transition-all shadow-xs cursor-pointer"
                >
                  {t('再提供一筆觀點', 'Submit Another Perspective')}
                </button>

                <Link
                  href="/question/display"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#DFBA87] hover:bg-[#cf9e5e] text-[#14120E] text-xs font-bold tracking-wider transition-all shadow-md shadow-[#DFBA87]/25 flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t('觀看 The Question of the Year · 年度文化命題', 'View The Question of the Year')}</span>
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
              className="bg-black/60 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-black/80 space-y-6"
            >
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Step 1: Select One Question to Answer (三選一) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-white font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#DFBA87]" />
                    <span>{t('步驟一：請選擇一個你想回答的題目（三選一）', 'Step 1: Choose One Question to Answer')}</span>
                    <span className="text-[#DFBA87]">*</span>
                  </label>
                  <span className="text-[11px] font-mono text-[#DFBA87] font-medium">
                    {t('點選切換', 'Click to select')}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {ANNUAL_SUB_QUESTIONS.map((q, idx) => {
                    const isSelected = q.id === selectedQuestionId;
                    return (
                      <div
                        key={q.id}
                        onClick={() => setSelectedQuestionId(q.id)}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-start gap-3.5 relative overflow-hidden ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#DFBA87]/20 via-[#DFBA87]/10 to-white/[0.04] border-2 border-[#DFBA87] shadow-lg shadow-[#DFBA87]/15'
                            : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/15 hover:border-[#DFBA87]/40 text-neutral-300 shadow-xs'
                        }`}
                      >
                        {/* Radio Check Circle */}
                        <div className="pt-0.5 shrink-0">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected ? 'border-[#DFBA87] bg-[#DFBA87]' : 'border-white/30 bg-black/40'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                          </div>
                        </div>

                        <div className="space-y-1 flex-grow">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-mono tracking-widest uppercase font-bold ${
                              isSelected ? 'text-[#DFBA87]' : 'text-neutral-400'
                            }`}>
                              {t(`問題 0${idx + 1} · ${q.short_label_zh}`, `QUESTION 0${idx + 1} · ${q.short_label_en}`)}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-mono text-[#DFBA87] flex items-center gap-1 font-bold">
                                ✓ {t('已選擇', 'Selected')}
                              </span>
                            )}
                          </div>

                          <p className={`text-sm sm:text-base font-serif leading-snug transition-colors ${
                            isSelected ? 'text-white font-medium' : 'text-neutral-200 font-normal'
                          }`}>
                            {t(q.question_zh, q.question_en)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Answer Input Details */}
              <div className="pt-4 border-t border-white/10 space-y-5">
                <div className="text-xs text-white font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#DFBA87]" />
                  <span>{t('步驟二：填寫你的姓名與回答觀點', 'Step 2: Enter Your Name and Perspective')}</span>
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="display_name" className="text-white font-medium flex items-center gap-1">
                      <span>{t('姓名或希望顯示的名稱', 'Name or Display Name')}</span>
                      <span className="text-[#DFBA87]">*</span>
                    </label>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {nameCharCount} / 30 {t('字', 'chars')}
                    </span>
                  </div>
                  <input
                    id="display_name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.substring(0, 30))}
                    placeholder={t('您的姓名或稱謂（例如：Amelie、建築愛好者、匿名觀展者）', 'Your name or display name')}
                    className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-black/60 border border-white/20 focus:border-[#DFBA87] focus:ring-1 focus:ring-[#DFBA87]/40 rounded-xl px-4 py-3 text-sm text-white placeholder-white/35 focus:outline-none shadow-inner transition-all font-sans"
                    maxLength={30}
                    required
                  />
                </div>

                {/* Perspective Answer */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="perspective_answer" className="text-white font-medium flex items-center gap-1">
                      <span>{t('你的觀點', 'Your Perspective')}</span>
                      <span className="text-[#DFBA87]">*</span>
                    </label>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {answerCharCount} / 120 {t('字', 'chars')}
                    </span>
                  </div>

                  {/* Active Question Context Banner */}
                  <div className="p-3.5 rounded-xl bg-[#DFBA87]/15 border border-[#DFBA87]/40 text-xs sm:text-[13px] text-[#DFBA87] font-serif flex items-start gap-2.5 backdrop-blur-sm">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-[#DFBA87]" />
                    <span className="font-medium">{t(`正在回答：${activeQuestion.question_zh}`, `Answering: ${activeQuestion.question_en}`)}</span>
                  </div>

                  <textarea
                    id="perspective_answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value.substring(0, 120))}
                    placeholder={t(activeQuestion.placeholder_zh, activeQuestion.placeholder_en)}
                    rows={4}
                    className="w-full bg-white/[0.06] hover:bg-white/[0.09] focus:bg-black/60 border border-white/20 focus:border-[#DFBA87] focus:ring-1 focus:ring-[#DFBA87]/40 rounded-xl p-4 text-sm text-white placeholder-white/35 focus:outline-none shadow-inner transition-all font-sans leading-relaxed resize-none"
                    maxLength={120}
                    required
                  />
                  <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 pt-1">
                    <HelpCircle className="w-3.5 h-3.5 text-[#DFBA87] shrink-0" />
                    <span>
                      {t(
                        '請勿填寫電話、Email、地址或其他個人私密聯絡資料。',
                        'Please do not include phone, email, address, or other personal contact details.'
                      )}
                    </span>
                  </p>
                </div>
              </div>

              {/* Consent Checkbox & Privacy Policy */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-white/30 bg-white/10 text-[#DFBA87] focus:ring-[#DFBA87] focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-xs text-neutral-300 font-light leading-relaxed group-hover:text-white transition-colors">
                    {t(
                      '我同意 VIS 得於現場觀點之牆展示、官方網站、社群媒體、影片、出版品及 VIS Perspective Archive 中，公開展示我提供的顯示名稱、選定題目與回答內容。我已閱讀並同意',
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !displayName.trim() || !answer.trim() || !consent}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#DFBA87] to-[#C9A26A] hover:from-[#E5C799] hover:to-[#D4B07B] text-[#14120E] text-xs sm:text-sm font-bold tracking-widest uppercase transition-all shadow-xl shadow-[#DFBA87]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#14120E]" />
                    <span>{t('觀點傳送中...', 'Submitting Perspective...')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#14120E]" />
                    <span>{t('留下你的觀點 SUBMIT YOUR PERSPECTIVE', 'SUBMIT YOUR PERSPECTIVE')}</span>
                  </>
                )}
              </button>

              <div className="text-center text-[10px] text-neutral-400 font-mono pt-1">
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
      <footer className="relative z-10 border-t border-white/10 py-6 px-4 text-center text-xs text-neutral-400 font-mono flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 bg-black/40 backdrop-blur-md">
        <div>VIS Contemporary Culture · Perspective Archive 2027</div>
        <span className="hidden sm:inline opacity-30">·</span>
        <Link
          href="/question/admin"
          className="text-neutral-400 hover:text-[#DFBA87] transition-colors text-[11px] underline underline-offset-4 decoration-white/20"
        >
          策展審核後台 (Curatorial CMS) ↗
        </Link>
      </footer>

      {/* Privacy Policy & Consent Modal */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#141210] border border-[#DFBA87]/40 rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl text-white"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2 text-[#DFBA87] text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t('公開展示授權與隱私政策', 'Public Display Consent & Privacy Policy')}</span>
                </div>
                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto text-xs text-neutral-300 font-light leading-relaxed space-y-4">
                <section className="space-y-1">
                  <h4 className="font-semibold text-white">{t('一、 資料蒐集與目的', '1. Data Collection & Purpose')}</h4>
                  <p>
                    {t(
                      '本功能為 VIS 2027「The Question of the Year 年度文化命題」觀點共創計畫。我們僅蒐集您主動填寫之「顯示名稱」、所選題目與「回答觀點」。本系統不要求會員登入、亦不強制蒐集您的 Email、電話或真實身分資料。',
                      'This feature is part of the VIS 2027 cultural co-creation program. We only collect the display name, chosen question, and perspective answer you submit.'
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
                  className="px-5 py-2.5 rounded-xl bg-[#DFBA87] text-[#14120E] text-xs font-bold hover:bg-[#cf9e5e] transition-colors shadow-xs cursor-pointer"
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
