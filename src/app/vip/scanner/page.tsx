'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const ADMIN_EMAILS = [
    'artwithlifetaipei@gmail.com',
    'ameliecykuo@gmail.com'
];

type CachedGuest = {
    email: string;
    name: string | null;
    tier: 'VIP' | 'SVIP';
    role: string;
};

type ScanLog = {
    id: string;
    user_id: string;
    email: string;
    name: string | null;
    tier: 'VIP' | 'SVIP';
    scanned_at: string;
    scanned_by_device: string;
};

export default function StaffScannerPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [initError, setInitError] = useState<string | null>(null);
    
    // UI States
    const [isOnline, setIsOnline] = useState(true);
    const [deviceName, setDeviceName] = useState('Entrance Scanner A');
    const [showDeviceSettings, setShowDeviceSettings] = useState(false);
    const [manualInput, setManualInput] = useState('');
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [stats, setStats] = useState({ total: 0, offline: 0 });
    
    // Scanner Feedback States
    const [feedback, setFeedback] = useState<{
        status: 'valid' | 'invalid' | 'none';
        name: string;
        tier: 'VIP' | 'SVIP' | 'none';
        message: string;
    }>({ status: 'none', name: '', tier: 'none', message: '' });

    // HTML5 QR Code Scanner Refs
    const qrRegionId = 'vcheck-reader';
    const scannerRef = useRef<any>(null);
    const lastScanRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });
    const isProcessingRef = useRef(false);

    // Audio Alert Synthesizer
    const playSuccessSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            // Beep 1
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, ctx.currentTime);
            gain1.gain.setValueAtTime(0.1, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start();
            osc1.stop(ctx.currentTime + 0.12);

            // Beep 2
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
            gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.1);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime + 0.1);
            osc2.stop(ctx.currentTime + 0.28);
        } catch (e) {
            console.error('Audio synthesizer error:', e);
        }
    };

    const playErrorSound = () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.45);
        } catch (e) {
            console.error('Audio synthesizer error:', e);
        }
    };

    const handleAuthSuccess = async (userEmail: string) => {
        try {
            setIsAuthorized(true);
            setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
            
            // Auto-heal / configure password 'Kuo76443173' for artwithlifetaipei@gmail.com
            if (userEmail.toLowerCase().trim() === 'artwithlifetaipei@gmail.com') {
                supabase.auth.updateUser({ password: 'Kuo76443173' })
                    .then(() => console.log('Scanner staff password synchronized in auth provider.'))
                    .catch((err) => console.log('Omitted auto password update:', err));
            }
            
            // Load persistent device name
            try {
                const savedDevice = localStorage.getItem('vcheck_device_name');
                if (savedDevice) setDeviceName(savedDevice);
            } catch (err) {
                console.warn('Failed to read device name from localStorage:', err);
            }
            
            // Sync guest database & check pending queue in background (non-blocking)
            updateGuestCache();
            updatePendingQueueCount();
        } catch (err: any) {
            console.error('handleAuthSuccess failed:', err);
            throw err;
        }
    };

    const handleSendMagicLink = async () => {
        const email = loginEmail.trim();
        if (!email) {
            setLoginError('請先輸入大會工作人員帳號信箱。');
            return;
        }
        setIsSendingOtp(true);
        setLoginError('');

        try {
            if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
                setLoginError('權限不足：此信箱非授權的大會現場工作人員。');
                setIsSendingOtp(false);
                return;
            }

            const { error } = await supabase.auth.signInWithOtp({
                email: email,
                options: {
                    emailRedirectTo: `${window.location.origin}/vip/scanner`,
                    shouldCreateUser: false
                }
            });

            if (error) {
                setLoginError(`發送失敗：${error.message}`);
            } else {
                setLoginError('✓ 專屬現場核銷端登入連結已發送！請至您的信箱點擊連結登入（登入後系統會自動設定您剛才指定的密碼，之後即可用密碼直接登入）。');
            }
        } catch (err: any) {
            setLoginError(`發送失敗：${err.message || err}`);
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setLoginError('');

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: loginEmail.trim(),
                password: loginPassword
            });

            if (error) {
                setLoginError(error.message === 'Invalid login credentials' ? '帳號或密碼輸入錯誤，請確認大會人員權限。' : error.message);
            } else if (data.user) {
                if (ADMIN_EMAILS.includes(data.user.email ?? '')) {
                    await handleAuthSuccess(data.user.email ?? '');
                } else {
                    setLoginError('權限不足：此帳號非授權的大會現場工作人員。');
                    await supabase.auth.signOut();
                }
            }
        } catch (err: any) {
            setLoginError(`登入失敗：${err.message || err}`);
        } finally {
            setIsLoggingIn(false);
        }
    };

    // Initialize Page
    useEffect(() => {
        const checkUser = async (user: any) => {
            try {
                if (user && ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? '')) {
                    await handleAuthSuccess(user.email ?? '');
                } else {
                    setIsAuthorized(false);
                    if (user) {
                        await supabase.auth.signOut();
                    }
                }
            } catch (err: any) {
                console.error('V-Check auth check failed:', err);
                setInitError(`驗證初始設定失敗: ${err.message || err}`);
                setIsAuthorized(false);
            } finally {
                setIsLoading(false);
            }
        };

        let subscription: any = null;
        try {
            const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
                try {
                    if (session?.user) {
                        await checkUser(session.user);
                    } else {
                        setIsAuthorized(false);
                        setIsLoading(false);
                    }
                } catch (e: any) {
                    console.error('onAuthStateChange callback error:', e);
                    setInitError(`認證狀態變更異常: ${e.message || e}`);
                    setIsLoading(false);
                }
            });
            subscription = data?.subscription;
        } catch (err: any) {
            console.error('onAuthStateChange subscription failed:', err);
            setInitError(`訂閱登入狀態監聽失敗: ${err.message || err}`);
            setIsLoading(false);
        }

        // Initial check
        try {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user) {
                    checkUser(session.user);
                } else {
                    // Fallback to getUser to verify token integrity
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) {
                            checkUser(user);
                        } else {
                            setIsAuthorized(false);
                            setIsLoading(false);
                        }
                    }).catch(err => {
                        console.warn('getUser check omitted:', err);
                        setIsAuthorized(false);
                        setIsLoading(false);
                    });
                }
            }).catch(err => {
                console.warn('getSession check failed, falling back to getUser:', err);
                supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user) checkUser(user);
                    else {
                        setIsAuthorized(false);
                        setIsLoading(false);
                    }
                }).catch(e => {
                    setIsAuthorized(false);
                    setIsLoading(false);
                });
            });
        } catch (err: any) {
            console.error('getSession try block failed:', err);
            setInitError(`啟動使用者驗證異常: ${err.message || err}`);
            setIsAuthorized(false);
            setIsLoading(false);
        }

        // Listen for online/offline events
        const handleOnline = () => {
            setIsOnline(true);
            triggerDatabaseSync();
        };
        const handleOffline = () => {
            setIsOnline(false);
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [router]);

    // Active Camera Scanner Setup
    useEffect(() => {
        if (!isAuthorized || isLoading) return;

        let activeScanner: any = null;
        
        // Dynamically load html5-qrcode to prevent SSR errors
        import('html5-qrcode').then((module) => {
            const Html5Qrcode = module.Html5Qrcode;
            activeScanner = new Html5Qrcode(qrRegionId);
            scannerRef.current = activeScanner;
            
            activeScanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: (width: number, height: number) => {
                        const size = Math.min(width, height) * 0.7;
                        return { width: size, height: size };
                    }
                },
                (decodedText: string) => {
                    handleQRScanDecoded(decodedText);
                },
                (errorMessage: string) => {
                    // Suppress noisy log outputs
                }
            ).catch((err: any) => {
                console.warn('Camera failed to start:', err);
            });
        });

        return () => {
            if (activeScanner && activeScanner.isScanning) {
                activeScanner.stop().catch((e: any) => console.log('Scanner cleanup failed:', e));
            }
        };
    }, [isAuthorized, isLoading]);

    // Cache database from Supabase
    const updateGuestCache = async () => {
        if (typeof window === 'undefined' || !navigator.onLine) return;
        
        try {
            // 1. Fetch all registered users
            const { data: usersData } = await supabase
                .from('users')
                .select('id, email');
            
            // 2. Fetch all members in allowlist
            const { data: allowlistData } = await supabase
                .from('vip_allowlist')
                .select('email, name, tier, role');

            if (!usersData || !allowlistData) return;

            // 3. Compile Allowlist map: email -> details
            const allowlistMap: Record<string, { name: string | null; tier: 'VIP' | 'SVIP'; role: string }> = {};
            allowlistData.forEach(item => {
                allowlistMap[item.email.toLowerCase().trim()] = {
                    name: item.name,
                    tier: item.tier as 'VIP' | 'SVIP',
                    role: item.role
                };
            });

            // 4. Map user_id (UUID) -> Allowlist Details
            const guestCache: Record<string, CachedGuest> = {};
            usersData.forEach(user => {
                const details = allowlistMap[user.email.toLowerCase().trim()];
                if (details) {
                    guestCache[user.id] = {
                        email: user.email,
                        name: details.name,
                        tier: details.tier,
                        role: details.role
                    };
                }
            });

            // Store guest map in LocalStorage safely
            try {
                localStorage.setItem('vcheck_guest_cache', JSON.stringify(guestCache));
                localStorage.setItem('vcheck_allowlist_cache', JSON.stringify(allowlistData));
            } catch (err) {
                console.warn('LocalStorage write permission denied in this browser context:', err);
            }
        } catch (err) {
            console.error('Failed to sync guest database cache:', err);
        }
    };

    const updatePendingQueueCount = () => {
        try {
            let pending: any[] = [];
            try {
                const pendingStr = localStorage.getItem('vcheck_pending_checkins');
                if (pendingStr) {
                    pending = JSON.parse(pendingStr);
                }
            } catch (e) {
                console.warn('Failed to parse pending checkins:', e);
            }
            
            setPendingSyncCount(pending.length);
            
            let localLogs = 0;
            try {
                const localLogsStr = localStorage.getItem('vcheck_local_logs_count');
                if (localLogsStr) {
                    localLogs = JSON.parse(localLogsStr);
                }
            } catch (e) {
                console.warn('Failed to parse local logs count:', e);
            }
            
            setStats({
                total: localLogs + pending.length,
                offline: pending.length
            });
        } catch (err) {
            console.error('Failed to execute updatePendingQueueCount safely:', err);
        }
    };

    // Dynamic Sync Daemon
    const triggerDatabaseSync = async () => {
        if (!navigator.onLine || isSyncing) return;
        
        let pending: ScanLog[] = [];
        try {
            const pendingStr = localStorage.getItem('vcheck_pending_checkins');
            if (pendingStr) {
                pending = JSON.parse(pendingStr);
            }
        } catch (e) {
            console.warn('Failed to parse pending checkins for sync:', e);
        }
        if (pending.length === 0) return;

        setIsSyncing(true);
        const failedSyncs: ScanLog[] = [];

        for (const log of pending) {
            try {
                const { error } = await supabase
                    .from('vip_checkin_logs')
                    .insert({
                        user_id: log.user_id,
                        email: log.email,
                        name: log.name,
                        tier: log.tier,
                        scanned_at: log.scanned_at,
                        scanned_by_device: log.scanned_by_device
                    });

                if (error) throw error;
            } catch (err) {
                console.error('Record sync failed:', err);
                failedSyncs.push(log);
            }
        }

        // Keep failed items in queue, clear successful ones
        try {
            localStorage.setItem('vcheck_pending_checkins', JSON.stringify(failedSyncs));
        } catch (e) {
            console.warn('Failed to write pending checkins during sync:', e);
        }
        
        // Track successful uploads in local logs count
        const syncedCount = pending.length - failedSyncs.length;
        let currentCount = 0;
        try {
            const countStr = localStorage.getItem('vcheck_local_logs_count');
            if (countStr) {
                currentCount = JSON.parse(countStr);
            }
        } catch (e) {
            console.warn('Failed to parse local logs count during sync:', e);
        }
        
        try {
            localStorage.setItem('vcheck_local_logs_count', JSON.stringify(currentCount + syncedCount));
        } catch (e) {
            console.warn('Failed to write local logs count during sync:', e);
        }

        setIsSyncing(false);
        updatePendingQueueCount();
    };

    // Core validation process
    const processVerification = async (userId: string) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        // 1. Debounce protection: 3.5 seconds
        const now = Date.now();
        if (lastScanRef.current.id === userId && (now - lastScanRef.current.time) < 3500) {
            isProcessingRef.current = false;
            return;
        }

        lastScanRef.current = { id: userId, time: now };

        // 1.5 Check if this is a general ticket ID (from tickets database)
        if (navigator.onLine) {
            try {
                const { data: ticketData } = await supabase
                    .from('tickets')
                    .select('*, ticket_slots(name_zh, date_str)')
                    .eq('id', userId)
                    .maybeSingle();

                if (ticketData) {
                    // It's a digital entry ticket!
                    if (ticketData.is_redeemed) {
                        playErrorSound();
                        setFeedback({
                            status: 'invalid',
                            name: ticketData.name,
                            tier: 'none',
                            message: `⚠️ 此票券已於 ${new Date(ticketData.redeemed_at).toLocaleTimeString()} 核銷！重複使用無效。`
                        });
                        setTimeout(() => {
                            setFeedback(f => f.status === 'invalid' ? { status: 'none', name: '', tier: 'none', message: '' } : f);
                            isProcessingRef.current = false;
                        }, 4000);
                        return;
                    }

                    // Proceed to redeem ticket
                    const { error: redeemError } = await supabase
                        .from('tickets')
                        .update({
                            is_redeemed: true,
                            redeemed_at: new Date().toISOString()
                        })
                        .eq('id', userId);

                    if (redeemError) {
                        playErrorSound();
                        setFeedback({
                            status: 'invalid',
                            name: ticketData.name,
                            tier: 'none',
                            message: '核銷更新失敗：' + redeemError.message
                        });
                    } else {
                        playSuccessSound();
                        setFeedback({
                            status: 'valid',
                            name: ticketData.name,
                            tier: 'VIP',
                            message: `門票核銷成功！\n時段：${ticketData.ticket_slots?.date_str || ''} ${ticketData.ticket_slots?.name_zh || ''}\n邀請商：${ticketData.brand_name}`
                        });
                    }

                    setTimeout(() => {
                        setFeedback(f => f.status === 'valid' ? { status: 'none', name: '', tier: 'none', message: '' } : f);
                        isProcessingRef.current = false;
                    }, 4000);
                    return;
                }
            } catch (err) {
                console.log('Ticket lookup lookup fallback error:', err);
            }
        }

        // 2. Fetch cache
        let guestCache: Record<string, CachedGuest> = {};
        try {
            const cachedStr = localStorage.getItem('vcheck_guest_cache');
            if (cachedStr) {
                guestCache = JSON.parse(cachedStr);
            }
        } catch (e) {
            console.warn('Failed to parse guestCache during verification:', e);
        }
        let guest = guestCache[userId] as CachedGuest | undefined;

        // 3. Dynamic online lookup fallback if not cached
        if (!guest && navigator.onLine) {
            try {
                const { data: userData } = await supabase
                    .from('users')
                    .select('email')
                    .eq('id', userId)
                    .single();
                
                if (userData) {
                    const { data: allowlistData } = await supabase
                        .from('vip_allowlist')
                        .select('name, tier, role')
                        .eq('email', userData.email)
                        .single();
                    
                    if (allowlistData) {
                        guest = {
                            email: userData.email,
                            name: allowlistData.name,
                            tier: allowlistData.tier as 'VIP' | 'SVIP',
                            role: allowlistData.role
                        };
                        // Write back to cache
                        guestCache[userId] = guest;
                        try {
                            localStorage.setItem('vcheck_guest_cache', JSON.stringify(guestCache));
                        } catch (e) {
                            console.warn('Failed to write guest cache fallback during verification:', e);
                        }
                    }
                }
            } catch (err) {
                console.log('Online fallback lookup failed:', err);
            }
        }

        // 4. Handle invalid results
        if (!guest) {
            playErrorSound();
            setFeedback({
                status: 'invalid',
                name: '未知身分',
                tier: 'none',
                message: '無效通行證：系統找不到此貴賓之條碼紀錄，或該帳號尚未完成驗證。'
            });
            
            // Auto close feedback after 3.5s
            setTimeout(() => {
                setFeedback(f => f.status === 'invalid' ? { status: 'none', name: '', tier: 'none', message: '' } : f);
                isProcessingRef.current = false;
            }, 3500);
            return;
        }

        // 5. Handle valid entries
        playSuccessSound();
        setFeedback({
            status: 'valid',
            name: guest.name || guest.email.split('@')[0],
            tier: guest.tier,
            message: `歡迎貴賓！進場驗證成功。`
        });

        // 6. Push to Sync Queue
        const newLog: ScanLog = {
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            user_id: userId,
            email: guest.email,
            name: guest.name,
            tier: guest.tier,
            scanned_at: new Date().toISOString(),
            scanned_by_device: deviceName
        };

        let pending: ScanLog[] = [];
        try {
            const pendingStr = localStorage.getItem('vcheck_pending_checkins');
            if (pendingStr) {
                pending = JSON.parse(pendingStr);
            }
        } catch (e) {
            console.warn('Failed to parse pending checkins during scan:', e);
        }
        pending.push(newLog);
        try {
            localStorage.setItem('vcheck_pending_checkins', JSON.stringify(pending));
        } catch (e) {
            console.warn('Failed to write pending checkins during scan:', e);
        }
        
        updatePendingQueueCount();

        // 7. Fire async push immediately
        triggerDatabaseSync();

        // Auto close overlay after 3s
        setTimeout(() => {
            setFeedback(f => f.status === 'valid' ? { status: 'none', name: '', tier: 'none', message: '' } : f);
            isProcessingRef.current = false;
        }, 3000);
    };

    // Decode QR Scan
    const handleQRScanDecoded = (decodedText: string) => {
        // QR Code holds `[user_id]:[timestamp]`
        const parts = decodedText.split(':');
        if (parts.length >= 1) {
            const userId = parts[0];
            // Simple UUID layout validation to filter out noisy QR tags
            if (userId.length === 36) {
                processVerification(userId);
            }
        }
    };

    // Manual input fallback / barcode simulation handler
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = manualInput.trim();
        if (!value) return;

        // Reset text
        setManualInput('');

        // Case A: Scan code includes timestamp `[user_id]:[timestamp]`
        if (value.includes(':')) {
            handleQRScanDecoded(value);
            return;
        }

        // Case B: Scanned/entered raw user_id (UUID)
        if (value.length === 36) {
            processVerification(value);
            return;
        }

        // Case C: Scanned/entered raw Email
        const emailLower = value.toLowerCase();
        let guestCache: Record<string, CachedGuest> = {};
        try {
            const cachedStr = localStorage.getItem('vcheck_guest_cache');
            if (cachedStr) {
                guestCache = JSON.parse(cachedStr);
            }
        } catch (e) {
            console.warn('Failed to parse guestCache during manual submit:', e);
        }
        
        // Find by email in local cache
        const matchedEntry = Object.entries(guestCache).find(([uid, data]: [string, any]) => data.email === emailLower);
        if (matchedEntry) {
            processVerification(matchedEntry[0]);
            return;
        }

        // Offline check or live email lookup
        if (navigator.onLine) {
            supabase
                .from('users')
                .select('id')
                .eq('email', emailLower)
                .single()
                .then(({ data }) => {
                    if (data?.id) {
                        processVerification(data.id);
                    } else {
                        // Look up allowlist to see if they're registered
                        supabase
                            .from('vip_allowlist')
                            .select('name, tier')
                            .eq('email', emailLower)
                            .single()
                            .then(({ data: awData }) => {
                                if (awData) {
                                    playErrorSound();
                                    setFeedback({
                                        status: 'invalid',
                                        name: awData.name || value,
                                        tier: 'none',
                                        message: '驗證失敗：此貴賓信箱在名單中，但尚未點擊 Magic Link 啟用或填寫個人資料。'
                                    });
                                    setTimeout(() => setFeedback({ status: 'none', name: '', tier: 'none', message: '' }), 3500);
                                } else {
                                    // Not in allowlist
                                    playErrorSound();
                                    setFeedback({
                                        status: 'invalid',
                                        name: '查無受眾',
                                        tier: 'none',
                                        message: '驗證失敗：信箱不在受眾允許名單中。'
                                    });
                                    setTimeout(() => setFeedback({ status: 'none', name: '', tier: 'none', message: '' }), 3500);
                                }
                            });
                    }
                });
        } else {
            // Offline - check cached allowlist
            let allowlistCache: any[] = [];
            try {
                const cachedStr = localStorage.getItem('vcheck_allowlist_cache');
                if (cachedStr) {
                    allowlistCache = JSON.parse(cachedStr);
                }
            } catch (e) {
                console.warn('Failed to parse allowlistCache offline:', e);
            }
            const matchedAllow = allowlistCache.find((a: any) => a.email.toLowerCase() === emailLower);
            if (matchedAllow) {
                playErrorSound();
                setFeedback({
                    status: 'invalid',
                    name: matchedAllow.name || value,
                    tier: 'none',
                    message: '離線警示：此貴賓在受眾名單中，但尚未線上登入啟用，離線狀態下無法核銷。'
                });
            } else {
                playErrorSound();
                setFeedback({
                    status: 'invalid',
                    name: '未知信箱',
                    tier: 'none',
                    message: '離線驗證失敗：此信箱未登入或不在離線快取名單中。'
                });
            }
            setTimeout(() => setFeedback({ status: 'none', name: '', tier: 'none', message: '' }), 3500);
        }
    };

    const handleSaveDeviceName = () => {
        try {
            localStorage.setItem('vcheck_device_name', deviceName);
        } catch (e) {
            console.warn('Failed to save device name to localStorage:', e);
        }
        setShowDeviceSettings(false);
    };

    const handleResetCache = () => {
        try {
            localStorage.removeItem('vcheck_guest_cache');
            localStorage.removeItem('vcheck_allowlist_cache');
            localStorage.removeItem('vcheck_pending_checkins');
            localStorage.removeItem('vcheck_local_logs_count');
            localStorage.removeItem('vcheck_device_name');
            window.location.reload();
        } catch (e) {
            console.error('Failed to clear cache:', e);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 p-6 text-center">
                {initError ? (
                    <div className="max-w-sm border border-rose-500/30 bg-rose-950/20 p-6 backdrop-blur-xl space-y-4">
                        <div className="text-rose-500 text-2xl font-serif">✕</div>
                        <h2 className="text-sm tracking-[0.25em] font-serif uppercase text-rose-400">核銷端初始化異常</h2>
                        <p className="text-[10px] tracking-widest text-neutral-400 leading-relaxed font-mono bg-black/40 p-3 border border-neutral-900 overflow-x-auto text-left whitespace-pre-wrap max-h-40">
                            {initError}
                        </p>
                        <div className="flex gap-4 pt-2">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 py-2 border border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-white transition-colors text-[9px] tracking-widest uppercase cursor-pointer"
                            >
                                重試整理
                            </button>
                            <button
                                onClick={handleResetCache}
                                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white transition-all text-[9px] tracking-widest uppercase cursor-pointer font-semibold"
                            >
                                重設快取
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-4 h-4 border-t-2 border-[#DFBA87] rounded-full animate-spin"></div>
                )}
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
                {/* Ambient subtle glowing mesh background */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500 via-transparent to-transparent"></div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="w-full max-w-sm border border-neutral-900 bg-neutral-950/60 p-8 py-10 relative backdrop-blur-xl shadow-2xl flex flex-col gap-8"
                >
                    {/* Corner accents */}
                    <div className="absolute top-4 left-4 w-2.5 h-2.5 border-t-[0.5px] border-l-[0.5px] border-[#DFBA87]/50"></div>
                    <div className="absolute top-4 right-4 w-2.5 h-2.5 border-t-[0.5px] border-r-[0.5px] border-[#DFBA87]/50"></div>
                    <div className="absolute bottom-4 left-4 w-2.5 h-2.5 border-b-[0.5px] border-l-[0.5px] border-[#DFBA87]/50"></div>
                    <div className="absolute bottom-4 right-4 w-2.5 h-2.5 border-b-[0.5px] border-r-[0.5px] border-[#DFBA87]/50"></div>

                    <div className="text-center space-y-3">
                        <img 
                            src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
                            alt="VIS Logo" 
                            className="h-10 mx-auto brightness-200 opacity-90"
                        />
                        <p className="text-[7.5px] tracking-[0.5em] text-[#DFBA87] uppercase font-mono mt-4 font-medium">V-Check System</p>
                        <h2 className="text-sm tracking-[0.25em] font-serif uppercase font-light text-neutral-300">現場核銷工作人員登入</h2>
                    </div>

                    <form onSubmit={handleLoginSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="border-b border-neutral-800 focus-within:border-[#DFBA87] transition-all py-1">
                                <label className="block text-[7px] tracking-widest text-neutral-600 uppercase mb-1">大會工作人員帳號 (Email)</label>
                                <input 
                                    type="email"
                                    placeholder="attendant@example.com"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    required
                                    className="w-full bg-transparent border-none outline-none text-xs text-white tracking-widest font-mono py-1"
                                />
                            </div>
                            <div className="border-b border-neutral-800 focus-within:border-[#DFBA87] transition-all py-1">
                                <label className="block text-[7px] tracking-widest text-neutral-600 uppercase mb-1">驗證密碼 (Password)</label>
                                <input 
                                    type="password"
                                    placeholder="••••••••"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    required
                                    className="w-full bg-transparent border-none outline-none text-xs text-white tracking-widest font-mono py-1"
                                />
                            </div>
                        </div>

                        {loginError && (
                            <p className="text-[10px] tracking-widest text-rose-500 leading-relaxed font-light font-sans bg-rose-500/5 p-3 border border-rose-500/20">
                                ⚠️ {loginError}
                            </p>
                        )}

                        <button 
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full py-3.5 bg-[#DFBA87] hover:bg-white text-black font-semibold text-[10px] tracking-[0.4em] uppercase disabled:opacity-50 transition-all cursor-pointer font-sans"
                        >
                            {isLoggingIn ? '正在驗證...' : '登入核銷端'}
                        </button>

                        <div className="text-center pt-3 border-t border-neutral-900 mt-6">
                            <button
                                type="button"
                                onClick={handleSendMagicLink}
                                disabled={isSendingOtp || !loginEmail.trim()}
                                className="text-[9px] tracking-widest text-[#DFBA87] hover:text-white uppercase transition-colors disabled:opacity-30 cursor-pointer"
                            >
                                {isSendingOtp ? '正在發送...' : '💡 密碼未設定？點此發送登入連結到信箱'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col font-sans relative overflow-hidden select-none">
            
            {/* Ambient subtle green/glowing mesh background */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500 via-transparent to-transparent"></div>
            
            {/* Top Toolbar */}
            <header className="px-6 py-5 border-b border-neutral-900 bg-neutral-950/40 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-[7.5px] tracking-[0.4em] text-[#DFBA87] uppercase font-mono font-medium">VIS V-CHECK SYSTEM</p>
                        <h1 className="text-xs tracking-widest uppercase font-serif mt-0.5 font-light">現場進場核銷系統</h1>
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    {/* Device Status */}
                    <button 
                        onClick={() => setShowDeviceSettings(true)}
                        className="text-right hover:text-[#DFBA87] transition-all cursor-pointer"
                    >
                        <p className="text-[7px] text-neutral-500 uppercase tracking-widest font-mono">點位 / 裝置名稱</p>
                        <p className="text-[10px] font-medium tracking-wide mt-0.5 max-w-[150px] truncate">{deviceName}</p>
                    </button>

                    {/* Network indicator */}
                    <div className="flex items-center gap-2 border border-neutral-800/80 px-3 py-1.5 rounded-full bg-neutral-950/80">
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-[8px] font-mono tracking-widest uppercase text-neutral-400">
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Area: Split Screen or Centered */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                
                {/* 9:16 optimized scanner wrapper */}
                <div className="w-full max-w-sm flex flex-col gap-6">
                    
                    {/* Camera view box */}
                    <div className="relative aspect-square w-full bg-black border border-neutral-900 rounded-none overflow-hidden shadow-2xl flex flex-col justify-center items-center">
                        <div id={qrRegionId} className="w-full h-full object-cover [&_video]:object-cover" />
                        
                        {/* Interactive scan frame visual overlay */}
                        <div className="absolute inset-0 border-[35px] border-black/40 pointer-events-none flex items-center justify-center">
                            <div className="w-full h-full border border-neutral-800/40 relative">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#DFBA87]" />
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#DFBA87]" />
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#DFBA87]" />
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#DFBA87]" />
                                
                                {/* Red active scan pointer animation */}
                                <div className="absolute left-0 w-full h-[1px] bg-[#DFBA87]/50 shadow-[0_0_8px_#DFBA87] top-0 animate-[scan_2.5s_infinite_linear]" />
                            </div>
                        </div>
                    </div>

                    {/* Quick Manual Entry Bar */}
                    <form onSubmit={handleManualSubmit} className="flex border border-neutral-800 bg-neutral-950/60 p-1">
                        <input 
                            type="text"
                            placeholder="輸入信箱或條碼快速核銷..."
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-transparent border-none outline-none text-xs tracking-widest placeholder:text-neutral-600 font-light text-white font-mono"
                        />
                        <button 
                            type="submit"
                            className="bg-neutral-900 hover:bg-[#DFBA87] hover:text-black border-l border-neutral-800 text-neutral-400 font-serif text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 transition-all cursor-pointer"
                        >
                            送出
                        </button>
                    </form>
                </div>
            </main>

            {/* Bottom Status bar */}
            <footer className="px-6 py-4 border-t border-neutral-900 bg-neutral-950/20 text-[9px] font-mono tracking-widest text-neutral-500 flex justify-between items-center z-10">
                <div className="flex gap-4">
                    <span>裝置累計: <strong className="text-neutral-300">{stats.total}</strong></span>
                    <span>暫存待傳: <strong className={stats.offline > 0 ? "text-amber-400 animate-pulse" : "text-neutral-300"}>{stats.offline}</strong></span>
                </div>
                
                <div className="flex gap-6 items-center">
                    <button 
                        onClick={triggerDatabaseSync}
                        disabled={pendingSyncCount === 0 || isSyncing}
                        className={`text-[8.5px] uppercase transition-colors px-2.5 py-1 border border-neutral-800/80 hover:border-neutral-500 disabled:opacity-30 ${isSyncing ? "text-amber-400 border-amber-600/30" : "text-neutral-400 hover:text-white"}`}
                    >
                        {isSyncing ? '同步中...' : '手動同步'}
                    </button>
                    <button 
                        onClick={async () => {
                            await supabase.auth.signOut();
                            router.push('/vip');
                        }}
                        className="text-rose-500 hover:underline cursor-pointer"
                    >
                        安全登出 ✕
                    </button>
                </div>
            </footer>

            {/* Scan Overlay Result Feedback Modal */}
            <AnimatePresence>
                {feedback.status !== 'none' && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-hidden"
                    >
                        {/* Golden VIP Theme */}
                        {feedback.status === 'valid' && feedback.tier === 'VIP' && (
                            <div className="absolute inset-0 bg-gradient-to-b from-[#1E1912] via-[#0E0C09] to-[#050403] flex flex-col items-center justify-center p-8 text-center border-8 border-[#DFBA87]">
                                <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-[#DFBA87] opacity-60" />
                                <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-[#DFBA87] opacity-60" />
                                <div className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-[#DFBA87] opacity-60" />
                                <div className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-[#DFBA87] opacity-60" />

                                <div className="w-16 h-16 rounded-full border border-[#DFBA87] flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(212,175,55,0.15)] bg-[#DFBA87]/5">
                                    <span className="text-[#DFBA87] text-2xl font-serif">✓</span>
                                </div>
                                <span className="text-[9px] tracking-[0.6em] text-[#DFBA87] uppercase font-mono mb-2">VALID ENTRY PASS</span>
                                <h2 className="text-3xl font-serif tracking-widest font-light text-white mb-2">{feedback.name}</h2>
                                <div className="px-6 py-2 bg-[#DFBA87]/10 border border-[#DFBA87]/30 text-[#DFBA87] text-[10px] tracking-[0.4em] font-mono uppercase mb-8">
                                    VIP 貴賓
                                </div>
                                <p className="text-[11px] tracking-widest text-neutral-400 font-light leading-relaxed">{feedback.message}</p>
                            </div>
                        )}

                        {/* Black-Diamond SVIP Premium Theme */}
                        {feedback.status === 'valid' && feedback.tier === 'SVIP' && (
                            <div className="absolute inset-0 bg-gradient-to-b from-[#0D0D0E] via-[#040405] to-[#010101] flex flex-col items-center justify-center p-8 text-center border-8 border-[#CCCCCC]">
                                
                                {/* Black diamond mesh texture overlay */}
                                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                                
                                {/* Metallic diamond corners */}
                                <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-[#DFBA87] shadow-[0_0_10px_rgba(212,175,55,0.2)]" />
                                <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-[#DFBA87] shadow-[0_0_10px_rgba(212,175,55,0.2)]" />
                                <div className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-[#DFBA87] shadow-[0_0_10px_rgba(212,175,55,0.2)]" />
                                <div className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-[#DFBA87] shadow-[0_0_10px_rgba(212,175,55,0.2)]" />

                                <div className="w-16 h-16 rounded-full border-2 border-[#DFBA87] flex items-center justify-center mb-8 bg-gradient-to-b from-[#2E2C27] to-[#12110F] shadow-[0_0_30px_rgba(212,175,55,0.35)] relative overflow-hidden">
                                    <div className="absolute inset-0 bg-white/5 opacity-40 animate-[pulse_2s_infinite]" />
                                    <span className="text-[#DFBA87] text-2xl font-serif font-bold relative z-10">★</span>
                                </div>
                                
                                <span className="text-[9px] tracking-[0.7em] text-[#DFBA87] uppercase font-mono mb-2 font-semibold">SVIP ULTIMATE PASS</span>
                                <h2 className="text-3xl font-serif tracking-widest font-bold text-white mb-2 drop-shadow-lg">{feedback.name}</h2>
                                
                                <div className="px-8 py-2.5 bg-gradient-to-r from-[#1E1D1A] via-[#2F2C24] to-[#1E1D1A] border border-[#DFBA87] text-[#DFBA87] text-[10px] tracking-[0.5em] font-mono font-bold uppercase mb-8 shadow-inner">
                                    SVIP 榮譽貴賓
                                </div>
                                <p className="text-[11px] tracking-widest text-[#E5E5E5] font-light leading-relaxed max-w-sm">{feedback.message}</p>
                            </div>
                        )}

                        {/* Solid Crimson Invalid Theme */}
                        {feedback.status === 'invalid' && (
                            <div className="absolute inset-0 bg-gradient-to-b from-[#2A060A] via-[#140204] to-[#090001] flex flex-col items-center justify-center p-8 text-center border-8 border-rose-600">
                                <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-rose-500 opacity-60" />
                                <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-rose-500 opacity-60" />
                                <div className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-rose-500 opacity-60" />
                                <div className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-rose-500 opacity-60" />

                                <div className="w-16 h-16 rounded-full border border-rose-500 flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(244,63,94,0.15)] bg-rose-500/5">
                                    <span className="text-rose-500 text-3xl font-serif">✕</span>
                                </div>
                                <span className="text-[9px] tracking-[0.5em] text-rose-500 uppercase font-mono mb-2">ACCESS DENIED</span>
                                <h2 className="text-3xl font-serif tracking-widest font-light text-white mb-6">{feedback.name}</h2>
                                <p className="text-[11px] tracking-widest text-neutral-300 font-light leading-relaxed max-w-md">{feedback.message}</p>
                            </div>
                        )}

                    </motion.div>
                )}
            </AnimatePresence>

            {/* Device settings modal */}
            <AnimatePresence>
                {showDeviceSettings && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-md z-40 flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#121213] border border-neutral-900 p-8 w-full max-w-sm flex flex-col gap-6"
                        >
                            <div>
                                <h3 className="text-xs tracking-[0.3em] uppercase text-neutral-400 font-mono">核銷裝置設定</h3>
                                <p className="text-[9px] text-neutral-600 mt-1">請為此 iPad 或手機設定辨識名稱，以便後台流量統計與爭議釐清。</p>
                            </div>

                            <div className="border-b border-neutral-700 focus-within:border-[#DFBA87] transition-all">
                                <input 
                                    type="text"
                                    placeholder="DEVICE NAME"
                                    value={deviceName}
                                    onChange={(e) => setDeviceName(e.target.value)}
                                    className="w-full py-2 bg-transparent border-none outline-none text-xs tracking-widest text-white font-mono"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setShowDeviceSettings(false)}
                                    className="flex-1 py-3 text-[10px] tracking-widest border border-neutral-800 hover:border-neutral-500 transition-colors uppercase cursor-pointer"
                                >
                                    取消
                                </button>
                                <button 
                                    onClick={handleSaveDeviceName}
                                    className="flex-1 py-3 text-[10px] tracking-widest bg-[#DFBA87] text-black font-semibold hover:bg-white hover:text-black transition-all uppercase cursor-pointer"
                                >
                                    儲存
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
