'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShieldCheck, Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [mode, setMode] = useState<'checking' | 'set_password' | 'request_link'>('checking');
  
  // Request Link Form States
  const [email, setEmail] = useState(initialEmail);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestMessage, setRequestMessage] = useState({ text: '', type: '' });

  // Set Password Form States
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setLoading, setSetLoading] = useState(false);
  const [setMessage, setSetMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    let hasRecoveryIntent = false;

    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const code = searchParams.get('code');
      if (hash.includes('type=recovery') || hash.includes('access_token=') || code) {
        hasRecoveryIntent = true;
      }
    }

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session || hasRecoveryIntent) {
          setMode('set_password');
        } else {
          setMode('request_link');
        }
      } catch (err) {
        console.error('Session check error:', err);
        setMode('request_link');
      }
    };

    checkInitialSession();

    // Listen for auth state changes (e.g. recovery link clicked and tokens exchanged)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setMode('set_password');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams]);

  // Handler: Request verification / reset link
  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestLoading(true);
    setRequestMessage({ text: '', type: '' });

    const formattedEmail = email.toLowerCase().trim();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formattedEmail, {
        redirectTo: `${window.location.origin}/exhibitor/reset-password`,
      });

      if (error) {
        // Fallback to OTP if SMTP recovery error occurs
        if (error.message.includes('Error sending recovery email') || error.message.includes('unable to send')) {
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email: formattedEmail,
            options: {
              emailRedirectTo: `${window.location.origin}/exhibitor/reset-password`,
              shouldCreateUser: true,
            },
          });

          if (!otpErr) {
            setRequestSent(true);
            setRequestMessage({
              text: '✓ 已發送一次性安全驗證連結至您的信箱！請前往收信並點擊連結完成登入與密碼設定。',
              type: 'success',
            });
            return;
          }
        }

        setRequestMessage({
          text: `發送失敗: ${error.message === 'Email rate limit exceeded' ? '發送過於頻繁，請於 60 秒後再試。' : error.message}`,
          type: 'error',
        });
      } else {
        setRequestSent(true);
        setRequestMessage({
          text: '✓ 驗證信件已寄出！請至您的信箱收取郵件，點擊信中的安全連結即可直接設定新密碼。（若未收到請檢查垃圾郵件匣）',
          type: 'success',
        });
      }
    } catch (err: any) {
      setRequestMessage({
        text: `發送異常: ${err.message || String(err)}`,
        type: 'error',
      });
    } finally {
      setRequestLoading(false);
    }
  };

  // Handler: Set new password
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetLoading(true);
    setSetMessage({ text: '', type: '' });

    if (password.length < 6) {
      setSetMessage({ text: '密碼長度至少需為 6 碼。', type: 'error' });
      setSetLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setSetMessage({ text: '兩次輸入的密碼不相符，請重新確認。', type: 'error' });
      setSetLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setSetMessage({
          text: error.message.includes('Auth session missing')
            ? '驗證憑證已過期或無效，請點選下方切換為「發送驗證信」以重新獲取連結。'
            : `密碼更新失敗: ${error.message}`,
          type: 'error',
        });
      } else {
        setSetMessage({
          text: '✓ 密碼設定成功！正在為您安全導向參展商協作平台...',
          type: 'success',
        });
        setTimeout(() => {
          router.push('/exhibitor/portal');
        }, 1500);
      }
    } catch (err: any) {
      setSetMessage({
        text: `發生非預期錯誤: ${err.message || String(err)}`,
        type: 'error',
      });
    } finally {
      setSetLoading(false);
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
        className="w-full max-w-md border border-neutral-200/80 bg-white/95 p-8 py-10 relative backdrop-blur-xl shadow-2xl flex flex-col gap-6"
      >
        {/* Top Header */}
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border border-[#C9A96E]/30 flex items-center justify-center bg-[#C9A96E]/5 mx-auto text-[#C9A96E] mb-4">
            {mode === 'set_password' ? <KeyRound className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
          </div>
          <h2 className="text-[17px] font-light tracking-[0.25em] uppercase text-[#1a1a1a] mb-1">
            {mode === 'set_password' ? '設定參展商密碼' : '參展商密碼設定與驗證'}
          </h2>
          <p className="text-[10px] tracking-[0.25em] text-[#C9A96E] uppercase font-mono">
            {mode === 'set_password' ? 'Set exhibitor password' : 'Password setup & recovery'}
          </p>
        </div>

        {/* ── MODE 1: Request Reset / Setup Link ── */}
        {mode === 'request_link' && (
          <div className="space-y-6">
            <p className="text-xs text-neutral-600 font-light leading-relaxed text-center">
              若您是首次登入或忘記密碼，請確認您的參展商電子信箱。大會系統將立即寄送<strong>專屬安全驗證連結</strong>至您的信箱，點擊信中連結即可直接設定新密碼。
            </p>

            <form onSubmit={handleRequestLink} className="space-y-5">
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
                  disabled={requestLoading || requestSent}
                  className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                />
              </div>

              <button
                type="submit"
                disabled={requestLoading || requestSent}
                className="w-full bg-[#0D0D0D] hover:bg-[#C9A96E] text-white py-3.5 rounded-none text-xs font-semibold tracking-[0.25em] uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer active:scale-[0.99] shadow-md border-0"
              >
                {requestLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    發送中 SENDING...
                  </span>
                ) : requestSent ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    已發送驗證信 SENT
                  </span>
                ) : (
                  '發送密碼設定驗證信 SEND VERIFICATION LINK'
                )}
              </button>

              {requestMessage.text && (
                <div
                  className={`text-[11px] font-light leading-relaxed p-4 border text-center ${
                    requestMessage.type === 'error'
                      ? 'text-rose-600 bg-rose-50 border-rose-200'
                      : 'text-[#8C7853] bg-[#C9A96E]/10 border-[#C9A96E]/30'
                  }`}
                >
                  {requestMessage.text}
                </div>
              )}
            </form>
          </div>
        )}

        {/* ── MODE 2: Set New Password Form ── */}
        {mode === 'set_password' && (
          <div className="space-y-6">
            <p className="text-xs text-neutral-600 font-light leading-relaxed text-center">
              安全驗證通過！請為您的參展商帳號輸入新密碼（至少 6 碼）。
            </p>

            <form onSubmit={handleSetPassword} className="space-y-5">
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
                  disabled={setLoading}
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
                  disabled={setLoading}
                  className="w-full text-xs tracking-wider border-0 bg-transparent rounded-none px-0 py-2.5 outline-none text-[#0D0D0D] transition-all placeholder:text-neutral-300"
                />
              </div>

              <button
                type="submit"
                disabled={setLoading}
                className="w-full bg-[#0D0D0D] hover:bg-[#C9A96E] text-white py-3.5 rounded-none text-xs font-semibold tracking-[0.25em] uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 mt-4 cursor-pointer active:scale-[0.99] shadow-md border-0"
              >
                {setLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    儲存中 SAVING...
                  </span>
                ) : (
                  '確認設定並進入平台 CONFIRM & LOGIN'
                )}
              </button>

              {setMessage.text && (
                <div
                  className={`text-[11px] font-light leading-relaxed p-4 border text-center ${
                    setMessage.type === 'error'
                      ? 'text-rose-600 bg-rose-50 border-rose-200'
                      : 'text-[#8C7853] bg-[#C9A96E]/10 border-[#C9A96E]/30'
                  }`}
                >
                  {setMessage.text}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
          <Link
            href="/exhibitor/portal"
            className="flex items-center gap-1.5 hover:text-[#C9A96E] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回協作平台登入
          </Link>

          {mode === 'set_password' && (
            <button
              type="button"
              onClick={() => setMode('request_link')}
              className="text-[#8C7853] hover:underline cursor-pointer bg-transparent border-0 text-[11px]"
            >
              重新發送驗證信
            </button>
          )}
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
