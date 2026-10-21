'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShieldCheck, Mail, ArrowLeft, KeyRound, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = (searchParams.get('email') || '').toLowerCase().trim();

  // Mode:
  // 'checking': initial auth detection
  // 'direct_setup': first-time setup or direct password entry
  // 'otp_verify': 6-digit OTP verification for password reset
  // 'set_password': active session / recovery token detected
  const [mode, setMode] = useState<'checking' | 'direct_setup' | 'otp_verify' | 'set_password'>('checking');
  
  // Form states
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isOtpSent, setIsOtpSent] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkInitialSession = async () => {
      try {
        let code = searchParams.get('code');
        if (!code && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          code = params.get('code');
        }

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (data?.session && isMounted) {
            setMode('set_password');
            return;
          }
        }

        const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
        const hasRecoveryIntent = hash.includes('type=recovery') || hash.includes('access_token=') || !!code;

        const { data: { session } } = await supabase.auth.getSession();
        if ((session || hasRecoveryIntent) && isMounted) {
          setMode('set_password');
        } else if (isMounted) {
          setMode('direct_setup');
        }
      } catch (err) {
        console.error('Session check error:', err);
        if (isMounted) setMode('direct_setup');
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        if (isMounted) setMode('set_password');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  // Handler 1: Direct First-time Password Setup / Account Activation
  const handleDirectSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    const formattedEmail = email.toLowerCase().trim();

    if (!formattedEmail || !formattedEmail.includes('@')) {
      setMessage({ text: '請輸入有效的參展商電子信箱。', type: 'error' });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({ text: '密碼長度至少需為 6 碼。', type: 'error' });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ text: '兩次輸入的密碼不相符，請重新確認。', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      // 1. Verify eligibility: check if this email is an approved exhibitor
      const { data: approvedApp } = await supabase
        .from('exhibitor_applications')
        .select('id, brand_name_zh, brand_name_en, zone_id, booth_type, status')
        .eq('contact_email', formattedEmail)
        .eq('status', 'approved')
        .maybeSingle();

      const { data: existingBrand } = await supabase
        .from('exhibitor_brands')
        .select('id, portal_email')
        .eq('portal_email', formattedEmail)
        .maybeSingle();

      const ADMIN_EMAILS = [
        'artwithlifetaipei@gmail.com',
        'ameliecykuo@gmail.com',
        'amelie@theartpressasia.com',
        'visvipteam@gmail.com',
      ];

      if (!approvedApp && !existingBrand && !ADMIN_EMAILS.includes(formattedEmail)) {
        setMessage({
          text: '查無此信箱的入選核准記錄。請確認此信箱是否為申請參展時填寫的「聯絡人電子信箱」；若有疑問請洽大會 LINE: vis_culture。',
          type: 'error',
        });
        setLoading(false);
        return;
      }

      // 2. Attempt signUp: creates user and auto-confirms session
      const signUpRes = await supabase.auth.signUp({
        email: formattedEmail,
        password: password,
      });

      if (signUpRes.data?.session) {
        // Success: New user registered and authenticated!
        setMessage({
          text: '✓ 參展商帳號啟用成功！正在為您安全導向參展商協作平台...',
          type: 'success',
        });

        // Auto-heal exhibitor_brands if needed
        if (approvedApp && !existingBrand) {
          try {
            await supabase.from('exhibitor_brands').insert({
              application_id: approvedApp.id,
              brand_name_zh: approvedApp.brand_name_zh,
              brand_name_en: approvedApp.brand_name_en || approvedApp.brand_name_zh,
              zone_id: approvedApp.zone_id,
              booth_type: approvedApp.booth_type,
              is_micro_exposure: approvedApp.booth_type === 'T',
              portal_email: formattedEmail,
            });
          } catch (e) {
            console.warn('Auto-heal brand insert failed:', e);
          }
        }

        setTimeout(() => {
          router.push('/exhibitor/portal');
        }, 1200);
        return;
      }

      // If user is already registered in Auth:
      if (signUpRes.error?.message?.toLowerCase().includes('already registered')) {
        // Try sign in with entered password
        const signInRes = await supabase.auth.signInWithPassword({
          email: formattedEmail,
          password: password,
        });

        if (signInRes.data?.session) {
          setMessage({
            text: '✓ 驗證成功！正在為您安全導向參展商協作平台...',
            type: 'success',
          });
          setTimeout(() => {
            router.push('/exhibitor/portal');
          }, 1000);
          return;
        }

        // Auto-send password recovery email directly to mailbox
        try {
          const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.visforthearts.com';
          await supabase.auth.resetPasswordForEmail(formattedEmail, {
            redirectTo: `${origin}/exhibitor/reset-password`,
          });
        } catch (resetErr) {
          console.warn('Auto reset trigger error:', resetErr);
        }

        // Also trigger backup Gmail notification to ensure 100% inbox delivery
        try {
          fetch('/api/exhibitor/auth/send-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formattedEmail }),
          }).catch(() => {});
        } catch {
          // Non-blocking
        }

        const brandName = approvedApp?.brand_name_zh || existingBrand?.brand_name_zh || '參展品牌';
        setMessage({
          text: `✦ 帳號已建立提示：\n親愛的 ${brandName} 您好，此信箱先前已建立過帳號。\n\n大會系統已自動發送「重設密碼專屬連結」至您的電子信箱：${formattedEmail}。\n\n👉 請前往您的信箱查收【Reset Password】官方安全驗證信，點擊信中的專屬連結即可直接自訂新密碼並直接登入後台！（若未看到請檢查垃圾郵件匣）`,
          type: 'info',
        });
        setLoading(false);
        return;
      }

      if (signUpRes.error) {
        setMessage({
          text: `設定失敗: ${signUpRes.error.message}`,
          type: 'error',
        });
      }
    } catch (err: any) {
      setMessage({
        text: `處理異常: ${err.message || String(err)}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler 2: Send password reset link to email
  const handleSendResetLink = async () => {
    const formattedEmail = email.toLowerCase().trim();
    if (!formattedEmail || !formattedEmail.includes('@')) {
      setMessage({ text: '請先輸入有效的參展商電子信箱。', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.visforthearts.com';
      const { error } = await supabase.auth.resetPasswordForEmail(formattedEmail, {
        redirectTo: `${origin}/exhibitor/reset-password`,
      });

      // Also trigger backup Gmail notification
      try {
        fetch('/api/exhibitor/auth/send-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formattedEmail }),
        }).catch(() => {});
      } catch {
        // Non-blocking
      }

      if (error) {
        if (error.message.includes('rate limit') || (error as any).status === 429) {
          setMessage({
            text: '驗證信發送過於頻繁，請於 60 秒後再試，或先檢查您的信箱是否已收到稍早的重設信件。',
            type: 'error',
          });
        } else {
          setMessage({
            text: `發送失敗: ${error.message}`,
            type: 'error',
          });
        }
      } else {
        setMessage({
          text: `✓ 重設密碼安全信件已發送至 ${formattedEmail}！\n\n請至您的電子信箱查收【Reset Password】官方驗證信，點擊信中的專屬連結即可直接設定新密碼並進入平台。（若未收到請確認垃圾郵件匣）`,
          type: 'success',
        });
      }
    } catch (err: any) {
      setMessage({ text: `發送異常: ${err.message || String(err)}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handler 3: Verify OTP code and set new password
  const handleVerifyOtpAndSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    const formattedEmail = email.toLowerCase().trim();
    const cleanOtp = otpCode.trim();

    if (!cleanOtp) {
      setMessage({ text: '請輸入信箱收到的 6 位數安全驗證碼。', type: 'error' });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage({ text: '新密碼長度至少需為 6 碼。', type: 'error' });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ text: '兩次輸入的密碼不相符，請重新確認。', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      // 1. Verify OTP token
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: formattedEmail,
        token: cleanOtp,
        type: 'email',
      });

      if (verifyError || !verifyData?.session) {
        setMessage({
          text: `驗證碼不正確或已過期: ${verifyError?.message || '請重新獲取驗證碼'}`,
          type: 'error',
        });
        setLoading(false);
        return;
      }

      // 2. Update password for authenticated user
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setMessage({ text: `密碼更新失敗: ${updateError.message}`, type: 'error' });
      } else {
        setMessage({
          text: '✓ 密碼設定成功！正在為您安全導向參展商協作平台...',
          type: 'success',
        });
        setTimeout(() => {
          router.push('/exhibitor/portal');
        }, 1200);
      }
    } catch (err: any) {
      setMessage({ text: `驗證異常: ${err.message || String(err)}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Handler 4: Update password for active recovery session
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    if (password.length < 6) {
      setMessage({ text: '密碼長度至少需為 6 碼。', type: 'error' });
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ text: '兩次輸入的密碼不相符，請重新確認。', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage({
          text: error.message.includes('Auth session missing')
            ? '驗證憑證已過期或無效，請點選下方返回重新輸入信箱發送重設信件。'
            : `密碼更新失敗: ${error.message}`,
          type: 'error',
        });
      } else {
        // Auto-heal exhibitor_brands if email is available
        const targetEmail = data?.user?.email || email;
        if (targetEmail) {
          try {
            const formatted = targetEmail.toLowerCase().trim();
            const { data: approvedApp } = await supabase
              .from('exhibitor_applications')
              .select('id, brand_name_zh, brand_name_en, zone_id, booth_type, status, custom_fee, discount_note')
              .eq('contact_email', formatted)
              .eq('status', 'approved')
              .maybeSingle();

            if (approvedApp) {
              await supabase.from('exhibitor_brands').insert({
                application_id: approvedApp.id,
                brand_name_zh: approvedApp.brand_name_zh,
                brand_name_en: approvedApp.brand_name_en || approvedApp.brand_name_zh,
                zone_id: approvedApp.zone_id,
                booth_type: approvedApp.booth_type,
                is_micro_exposure: approvedApp.booth_type === 'T',
                portal_email: formatted,
                custom_fee: approvedApp.custom_fee ?? null,
                discount_note: approvedApp.discount_note ?? null,
              });
            }
          } catch (healErr) {
            console.warn('Auto heal failed:', healErr);
          }
        }

        setMessage({
          text: '✓ 密碼設定成功！正在為您安全導向參展商協作平台...',
          type: 'success',
        });
        setTimeout(() => {
          router.push('/exhibitor/portal');
        }, 1200);
      }
    } catch (err: any) {
      setMessage({ text: `發生非預期錯誤: ${err.message || String(err)}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'checking') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-[#C9A96E]">
        <div className="text-center font-sans">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-xs font-light tracking-[0.2em] uppercase text-[#1A1A1A]">安全載入中 Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md border border-neutral-200/80 bg-white/95 p-8 py-10 relative backdrop-blur-xl shadow-2xl flex flex-col gap-6 rounded-none"
      >
        {/* Top Header */}
        <div className="text-center">
          <div className="w-11 h-11 rounded-full border border-[#C9A96E]/30 flex items-center justify-center bg-[#C9A96E]/5 mx-auto text-[#C9A96E] mb-4">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-[17px] font-light tracking-[0.25em] uppercase text-[#1a1a1a] mb-1">
            {mode === 'otp_verify' ? '輸入驗證碼並設定密碼' : mode === 'set_password' ? '設定您的新登入密碼' : '參展商帳號啟用與密碼設定'}
          </h2>
          <p className="text-[10px] tracking-[0.25em] text-[#C9A96E] uppercase font-mono">
            Brand Portal Password Setup
          </p>
        </div>

        {/* ── MODE 1: Direct First-Time Setup ── */}
        {mode === 'direct_setup' && (
          <div className="space-y-6">
            <p className="text-xs text-neutral-600 font-light leading-relaxed text-center">
              歡迎入選 2027 VIS！請輸入您的<strong>參展商電子信箱</strong>並自訂登入密碼（至少 6 碼），確認後將立即為您開通專屬協作後台。
            </p>

            <form onSubmit={handleDirectSetup} className="space-y-5">
              <div className="flex flex-col border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                <label className="text-[9px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">
                  參展商電子信箱 Registered Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="brand@example.com"
                  disabled={loading}
                  className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                />
              </div>

              <div className="flex flex-col border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                <label className="text-[9px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">
                  設定登入密碼 Set Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="請輸入新密碼 (至少 6 碼)"
                  minLength={6}
                  disabled={loading}
                  className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                />
              </div>

              <div className="flex flex-col border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                <label className="text-[9px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">
                  再次確認密碼 Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="請再次輸入新密碼"
                  minLength={6}
                  disabled={loading}
                  className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0D0D0D] hover:bg-[#C9A96E] text-white py-3.5 rounded-none text-xs font-semibold tracking-[0.25em] uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer active:scale-[0.99] shadow-md border-0"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    啟用處理中 ACTIVATING...
                  </span>
                ) : (
                  '確認設定並進入平台 CONFIRM & LOGIN'
                )}
              </button>

              {message.text && (
                <div
                  className={`text-[11.5px] font-light leading-relaxed p-4 border whitespace-pre-wrap ${
                    message.type === 'error'
                      ? 'text-rose-600 bg-rose-50 border-rose-200 text-center'
                      : message.type === 'info'
                      ? 'text-[#8C7853] bg-amber-50/90 border-[#C9A96E]/40 text-left'
                      : 'text-[#8C7853] bg-[#C9A96E]/10 border-[#C9A96E]/30 text-center'
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Forgot Password Alternative */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleSendResetLink}
                  disabled={loading}
                  className="text-[11px] text-[#8C7853] hover:text-[#0D0D0D] underline underline-offset-4 cursor-pointer bg-transparent border-0 tracking-wide transition-colors"
                >
                  已有帳號或忘記舊密碼？點此發送專屬重設密碼連結至信箱 →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── MODE 2: 6-Digit OTP Verification Form ── */}
        {mode === 'otp_verify' && (
          <div className="space-y-6">
            <p className="text-xs text-neutral-600 font-light leading-relaxed text-center">
              安全驗證信已發送至 <strong>{email}</strong>。<br />
              請至您的電子信箱收取 <strong>6 位數安全驗證碼</strong>，並於下方輸入以完成密碼設定。
            </p>

            <form onSubmit={handleVerifyOtpAndSetPassword} className="space-y-5">
              <div className="flex flex-col border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                <label className="text-[9px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">
                  6 位數驗證碼 OTP Code
                </label>
                <input
                  type="text"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="例如: 123456"
                  maxLength={6}
                  disabled={loading}
                  className="w-full text-center text-sm font-mono tracking-[0.3em] border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300 placeholder:tracking-normal placeholder:font-sans"
                />
              </div>

              <div className="flex flex-col border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                <label className="text-[9px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">
                  新密碼 New Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="請輸入新密碼 (至少 6 碼)"
                  minLength={6}
                  disabled={loading}
                  className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                />
              </div>

              <div className="flex flex-col border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                <label className="text-[9px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">
                  再次確認新密碼 Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="請再次輸入新密碼"
                  minLength={6}
                  disabled={loading}
                  className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0D0D0D] hover:bg-[#C9A96E] text-white py-3.5 rounded-none text-xs font-semibold tracking-[0.25em] uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer active:scale-[0.99] shadow-md border-0"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    驗證儲存中 SAVING...
                  </span>
                ) : (
                  '驗證並完成設定 VERIFY & LOGIN'
                )}
              </button>

              {message.text && (
                <div
                  className={`text-[11px] font-light leading-relaxed p-4 border text-center ${
                    message.type === 'error'
                      ? 'text-rose-600 bg-rose-50 border-rose-200'
                      : 'text-[#8C7853] bg-[#C9A96E]/10 border-[#C9A96E]/30'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-[#8C7853] hover:underline cursor-pointer bg-transparent border-0"
                >
                  重新發送驗證碼
                </button>
                <button
                  type="button"
                  onClick={() => setMode('direct_setup')}
                  className="text-neutral-400 hover:text-neutral-700 cursor-pointer bg-transparent border-0"
                >
                  返回直接設定
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── MODE 3: Set Password via Active Recovery Session ── */}
        {mode === 'set_password' && (
          <div className="space-y-6">
            <p className="text-xs text-neutral-600 font-light leading-relaxed text-center">
              安全驗證通過！請為您的參展商帳號輸入新密碼（至少 6 碼）。
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="flex flex-col border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                <label className="text-[9px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">
                  新密碼 New Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="請輸入新密碼 (至少 6 碼)"
                  minLength={6}
                  disabled={loading}
                  className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                />
              </div>

              <div className="flex flex-col border-b border-[#0D0D0D]/10 focus-within:border-[#C9A96E] transition-colors duration-300">
                <label className="text-[9px] font-semibold tracking-[0.25em] text-[#C9A96E] uppercase mb-1">
                  確認新密碼 Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="請再次輸入新密碼"
                  minLength={6}
                  disabled={loading}
                  className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0D0D0D] hover:bg-[#C9A96E] text-white py-3.5 rounded-none text-xs font-semibold tracking-[0.25em] uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer active:scale-[0.99] shadow-md border-0"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    儲存中 SAVING...
                  </span>
                ) : (
                  '確認設定並進入平台 CONFIRM & LOGIN'
                )}
              </button>

              {message.text && (
                <div
                  className={`text-[11.5px] font-light leading-relaxed p-4 border text-center whitespace-pre-wrap ${
                    message.type === 'error'
                      ? 'text-rose-600 bg-rose-50 border-rose-200'
                      : 'text-[#8C7853] bg-[#C9A96E]/10 border-[#C9A96E]/30'
                  }`}
                >
                  {message.text}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Footer Navigation & Immediate Support */}
        <div className="pt-4 border-t border-neutral-100 flex flex-col gap-3 text-[11px] text-neutral-400">
          <div className="flex items-center justify-between">
            <Link
              href="/exhibitor/portal"
              className="flex items-center gap-1.5 hover:text-[#C9A96E] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              已有密碼？返回登入協作平台
            </Link>

            {mode !== 'direct_setup' && (
              <button
                type="button"
                onClick={() => setMode('direct_setup')}
                className="text-[#8C7853] hover:underline cursor-pointer bg-transparent border-0 text-[11px]"
              >
                返回直接設定
              </button>
            )}
          </div>

          <div className="bg-[#FAF9F6] border border-neutral-200/60 p-2.5 rounded text-[10.5px] text-neutral-500 leading-relaxed text-center">
            若登入有任何疑問，歡迎隨時添加大會官方 LINE ID: <strong className="text-[#06C755] font-mono">vis_culture</strong> 由專人為您快速核對。
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center text-[#C9A96E]">
          <div className="text-center font-sans">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-xs font-light tracking-[0.2em] uppercase text-[#1A1A1A]">載入中 Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
