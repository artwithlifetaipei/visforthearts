'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// Admin emails — only these accounts can access this page
const ADMIN_EMAILS = [
    'artwithlifetaipei@gmail.com',
];

type VIPEntry = {
    id: string;
    email: string;
    name: string | null;
    tier: 'VIP' | 'SVIP';
    role: string;
    rsvp_status: string;
    created_at: string;
};

type CampaignEntry = {
    id: string;
    subject: string;
    content: string;
    target_role: string;
    status: string;
    scheduled_at: string | null;
    sent_at: string | null;
    created_at: string;
};

export default function VIPAdminPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Tab switching: 'audience' or 'campaigns' or 'vcheck' or 'blindbox'
    const [activeTab, setActiveTab] = useState<'audience' | 'campaigns' | 'vcheck' | 'blindbox'>('audience');

    // Blind Box Brands States
    const [brands, setBrands] = useState<any[]>([]);
    const [editableBrands, setEditableBrands] = useState<any[]>([]);
    const [isBrandsLoading, setIsBrandsLoading] = useState(false);
    const [brandsError, setBrandsError] = useState<string | null>(null);
    const [brandSavingId, setBrandSavingId] = useState<string | null>(null);
    const [brandFeedback, setBrandFeedback] = useState<Record<string, string>>({});

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };
    
    // Audience States
    const [vipList, setVipList] = useState<VIPEntry[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newTier, setNewTier] = useState<'VIP' | 'SVIP'>('VIP');
    const [newRole, setNewRole] = useState<string>('VIP');
    const [isAdding, setIsAdding] = useState(false);
    const [audienceFeedback, setAudienceFeedback] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Campaign States
    const [campaigns, setCampaigns] = useState<CampaignEntry[]>([]);
    const [cSubject, setCSubject] = useState('');
    const [cContent, setCContent] = useState('');
    const [cTargetRole, setCTargetRole] = useState('All');
    const [cScheduledAt, setCScheduledAt] = useState('');
    const [isSavingCampaign, setIsSavingCampaign] = useState(false);
    const [campaignFeedback, setCampaignFeedback] = useState('');

    // V-Check Analytics States
    const [checkinLogs, setCheckinLogs] = useState<any[]>([]);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
                router.push('/vip');
                return;
            }
            setIsAuthorized(true);
            await Promise.all([fetchList(), fetchCampaigns(), fetchCheckinLogs(), fetchBrands()]);
            setIsLoading(false);
        };
        init();
    }, [router]);

    // Live refetch logic
    useEffect(() => {
        if (!isAuthorized) return;
        const interval = setInterval(() => {
            if (activeTab === 'vcheck') {
                fetchCheckinLogs();
            }
        }, 15000);
        return () => clearInterval(interval);
    }, [isAuthorized, activeTab]);

    const fetchList = async () => {
        const { data } = await supabase
            .from('vip_allowlist')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setVipList(data);
    };

    const fetchCampaigns = async () => {
        const { data } = await supabase
            .from('email_campaigns')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setCampaigns(data);
    };

    const fetchBrands = async () => {
        setIsBrandsLoading(true);
        setBrandsError(null);
        try {
            const { data, error } = await supabase
                .from('vip_blind_box_brands')
                .select('*')
                .order('id', { ascending: true });
            
            if (error) {
                setBrandsError(error.message);
                setBrands([]);
                setEditableBrands([]);
            } else {
                setBrands(data || []);
                setEditableBrands(JSON.parse(JSON.stringify(data || [])));
                setBrandsError(null);
            }
        } catch (err: any) {
            setBrandsError(err.message || 'Failed to fetch brands');
            setBrands([]);
            setEditableBrands([]);
        } finally {
            setIsBrandsLoading(false);
        }
    };

    const handleInitializeBrands = async () => {
        setIsBrandsLoading(true);
        const defaultBrands = [
            {
                id: 'brand-1',
                name: 'Fountain Tokyo',
                desc_text: '源自東京的奢華香氛與生活美學設計。',
                image_url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?q=80&w=600&auto=format&fit=crop'
            },
            {
                id: 'brand-2',
                name: 'Looom Space',
                desc_text: '探索光影與永續材質交織的軟裝家居。',
                image_url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=600&auto=format&fit=crop'
            },
            {
                id: 'brand-3',
                name: 'Pola Art Gallery',
                desc_text: '匯聚東亞當代最受矚目的新銳藝術家作品。',
                image_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=600&auto=format&fit=crop'
            },
            {
                id: 'brand-4',
                name: 'Aesthetic Design Lab',
                desc_text: '極簡主義極致工藝的現代家具設計品牌。',
                image_url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=600&auto=format&fit=crop'
            },
            {
                id: 'brand-5',
                name: 'Aura Scent Studio',
                desc_text: '調配專屬大自然與心靈共感的純淨沙龍香水。',
                image_url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=600&auto=format&fit=crop'
            }
        ];

        try {
            const { error } = await supabase
                .from('vip_blind_box_brands')
                .insert(defaultBrands);
            
            if (error) {
                alert('匯入失敗：' + error.message);
            } else {
                alert('成功匯入 5 家預設品牌！');
                await fetchBrands();
            }
        } catch (err: any) {
            alert('錯誤：' + err.message);
        } finally {
            setIsBrandsLoading(false);
        }
    };

    const handleFieldChange = (id: string, field: string, value: string) => {
        setEditableBrands(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    };

    const handleImageUpload = async (id: string, file: File) => {
        try {
            setBrandFeedback(prev => ({ ...prev, [id]: '正在處理並壓縮圖片...' }));
            const compressedBase64 = await compressImage(file);
            handleFieldChange(id, 'image_url', compressedBase64);
            setBrandFeedback(prev => ({ ...prev, [id]: '圖片上傳成功，請點擊儲存！' }));
        } catch (err: any) {
            setBrandFeedback(prev => ({ ...prev, [id]: '圖片壓縮失敗: ' + err.message }));
        }
    };

    const handleSaveBrand = async (brand: any) => {
        setBrandSavingId(brand.id);
        setBrandFeedback(prev => ({ ...prev, [brand.id]: '正在儲存至資料庫...' }));
        try {
            const { error } = await supabase
                .from('vip_blind_box_brands')
                .update({
                    name: brand.name,
                    desc_text: brand.desc_text,
                    image_url: brand.image_url,
                    updated_at: new Date().toISOString()
                })
                .eq('id', brand.id);
            
            if (error) {
                setBrandFeedback(prev => ({ ...prev, [brand.id]: '儲存失敗：' + error.message }));
            } else {
                setBrandFeedback(prev => ({ ...prev, [brand.id]: '✓ 儲存成功！' }));
                await fetchBrands();
            }
        } catch (err: any) {
            setBrandFeedback(prev => ({ ...prev, [brand.id]: '錯誤：' + err.message }));
        } finally {
            setBrandSavingId(null);
        }
    };

    const fetchCheckinLogs = async () => {
        const { data } = await supabase
            .from('vip_checkin_logs')
            .select('*')
            .order('scanned_at', { ascending: false });
        if (data) setCheckinLogs(data);
    };

    // Handle Audience Add
    const handleAddAudience = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;
        setIsAdding(true);
        setAudienceFeedback('');

        const { error } = await supabase
            .from('vip_allowlist')
            .insert({ 
                email: newEmail.toLowerCase().trim(), 
                name: newName.trim() || null,
                tier: newTier,
                role: newRole
            });

        if (error) {
            if (error.code === '23505') {
                setAudienceFeedback('⚠️ 此信箱已在名單中。');
            } else {
                setAudienceFeedback(`錯誤：${error.message}`);
            }
        } else {
            setAudienceFeedback('✓ 已成功加入受眾名單。');
            setNewEmail('');
            setNewName('');
            await fetchList();
        }
        setIsAdding(false);
    };

    // Handle Audience Delete
    const handleDeleteAudience = async (id: string, email: string) => {
        if (!confirm(`確定要將 ${email} 從受眾名單中移除嗎？`)) return;
        setDeletingId(id);
        await supabase.from('vip_allowlist').delete().eq('id', id);
        await fetchList();
        setDeletingId(null);
    };

    // Handle Campaign Add/Schedule
    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cSubject.trim() || !cContent.trim()) return;
        setIsSavingCampaign(true);
        setCampaignFeedback('');

        const { data: { user } } = await supabase.auth.getUser();

        const scheduledTime = cScheduledAt ? new Date(cScheduledAt).toISOString() : null;
        const status = scheduledTime ? 'Scheduled' : 'Draft';

        const { error } = await supabase
            .from('email_campaigns')
            .insert({
                subject: cSubject,
                content: cContent,
                target_role: cTargetRole,
                status: status,
                scheduled_at: scheduledTime,
                created_by: user?.email
            });

        if (error) {
            setCampaignFeedback(`儲存活動失敗：${error.message}`);
        } else {
            setCampaignFeedback(scheduledTime ? '✓ 活動排程成功！' : '✓ 儲存為草稿成功！');
            setCSubject('');
            setCContent('');
            setCScheduledAt('');
            await fetchCampaigns();
        }
        setIsSavingCampaign(false);
    };

    // Trigger Campaign Send Immediately
    const handleSendNow = async (id: string) => {
        if (!confirm('確定要立即發送此活動信件給所有指定受眾嗎？')) return;
        
        const campaign = campaigns.find(c => c.id === id);
        if (!campaign) {
            alert('找不到該行銷活動');
            return;
        }

        try {
            // 1. Fetch recipients directly from DB via authenticated client-side where RLS is satisfied
            let query = supabase.from('vip_allowlist').select('email, name');
            if (campaign.target_role !== 'All') {
                query = query.eq('role', campaign.target_role);
            }
            const { data: recipients, error: recipError } = await query;

            if (recipError || !recipients || recipients.length === 0) {
                alert('沒有找到符合此活動目標受眾的貴賓信箱');
                return;
            }

            // 2. Call SMTP background API route with compiled payload
            const response = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId: id,
                    subject: campaign.subject,
                    content: campaign.content,
                    recipients: recipients
                })
            });

            const result = await response.json();

            if (!response.ok || result.error) {
                alert(`發送失敗: ${result.error || '未知錯誤'}`);
                return;
            }

            // 3. Mark as Sent in the database from authenticated client-side
            await supabase
                .from('email_campaigns')
                .update({ 
                    status: 'Sent', 
                    sent_at: new Date().toISOString() 
                })
                .eq('id', id);

            // 4. Insert email logs from authenticated client-side
            const logs = recipients.map(r => ({
                campaign_id: id,
                recipient_email: r.email
            }));
            await supabase.from('email_logs').insert(logs);

            alert(`✓ 成功發送給 ${recipients.length} 位受眾成員！`);
        } catch (err: any) {
            console.error('Failed to trigger send API', err);
            alert(`發送錯誤: ${err.message || err}`);
        }
        await fetchCampaigns();
    };

    if (isLoading) return null;
    if (!isAuthorized) return null;

    return (
        <div className="min-h-screen bg-[#0D0D0D] text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="mb-12 flex justify-between items-end border-b border-neutral-800 pb-8"
                >
                    <div>
                        <p className="text-[9px] tracking-[0.5em] text-[#DFBA87] uppercase mb-3">VIS FOR THE ARTS</p>
                        <h1 className="text-2xl font-serif font-light tracking-wide mb-1">VIP & 專業買家 CRM 後台</h1>
                        <p className="text-[10px] tracking-widest text-neutral-500 uppercase">Customer Relationship Management</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => router.push('/vip/dashboard')}
                            className="text-[9px] tracking-[0.4em] uppercase text-neutral-400 hover:text-white border border-neutral-800 hover:border-white px-5 py-2 transition-all duration-300"
                        >
                            ← 返回儀表板
                        </button>
                    </div>
                </motion.div>

                {/* Tabs */}
                <div className="flex gap-8 mb-12 border-b border-neutral-900 pb-px">
                    <button
                        onClick={() => setActiveTab('audience')}
                        className={`pb-4 text-[11px] tracking-[0.4em] uppercase font-light transition-all duration-300 relative ${activeTab === 'audience' ? 'text-[#DFBA87]' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        受眾與名單管理 (Audience)
                        {activeTab === 'audience' && (
                            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 w-full h-[1px] bg-[#DFBA87]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('campaigns')}
                        className={`pb-4 text-[11px] tracking-[0.4em] uppercase font-light transition-all duration-300 relative ${activeTab === 'campaigns' ? 'text-[#DFBA87]' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Email 自助行銷與排程 (Campaigns)
                        {activeTab === 'campaigns' && (
                            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 w-full h-[1px] bg-[#DFBA87]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('vcheck')}
                        className={`pb-4 text-[11px] tracking-[0.4em] uppercase font-light transition-all duration-300 relative ${activeTab === 'vcheck' ? 'text-[#DFBA87]' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        現場核銷與數據分析 (V-Check)
                        {activeTab === 'vcheck' && (
                            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 w-full h-[1px] bg-[#DFBA87]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('blindbox')}
                        className={`pb-4 text-[11px] tracking-[0.4em] uppercase font-light transition-all duration-300 relative ${activeTab === 'blindbox' ? 'text-[#DFBA87]' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        品味預測品牌管理 (Prediction)
                        {activeTab === 'blindbox' && (
                            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 w-full h-[1px] bg-[#DFBA87]" />
                        )}
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'audience' ? (
                        <motion.div
                            key="audience"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.5 }}
                        >
                            {/* Add New VIP Form */}
                            <div className="border border-neutral-800 p-8 mb-12 bg-neutral-950/30">
                                <h2 className="text-[10px] tracking-[0.4em] uppercase text-neutral-400 mb-8">新增受眾與設定身分</h2>
                                <form onSubmit={handleAddAudience} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="border-b border-neutral-700 focus-within:border-[#DFBA87] transition-colors duration-300">
                                            <input
                                                type="email"
                                                placeholder="EMAIL ADDRESS"
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                                required
                                                className="w-full py-3 bg-transparent outline-none text-xs tracking-widest placeholder:text-neutral-600 text-white"
                                            />
                                        </div>
                                        <div className="border-b border-neutral-700 focus-within:border-[#DFBA87] transition-colors duration-300">
                                            <input
                                                type="text"
                                                placeholder="姓名 NAME (選填)"
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                className="w-full py-3 bg-transparent outline-none text-xs tracking-widest placeholder:text-neutral-600 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[8px] tracking-widest text-neutral-500 uppercase mb-3">邀請層級 (Tier)</label>
                                            <div className="flex gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewTier('VIP')}
                                                    className={`flex-1 py-2.5 text-[10px] tracking-[0.3em] uppercase border transition-all duration-300 ${newTier === 'VIP' ? 'border-[#DFBA87] text-[#DFBA87] bg-[#DFBA87]/5' : 'border-neutral-800 text-neutral-600'}`}
                                                >
                                                    VIP
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewTier('SVIP')}
                                                    className={`flex-1 py-2.5 text-[10px] tracking-[0.3em] uppercase border transition-all duration-300 ${newTier === 'SVIP' ? 'border-[#DFBA87] text-[#DFBA87] bg-[#DFBA87]/5' : 'border-neutral-800 text-neutral-600'}`}
                                                >
                                                    SVIP
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[8px] tracking-widest text-neutral-500 uppercase mb-3">身分標籤 / 受眾細分 (CRM Role)</label>
                                            <select
                                                value={newRole}
                                                onChange={(e) => setNewRole(e.target.value)}
                                                className="w-full py-3 bg-transparent outline-none text-xs tracking-widest text-white border-b border-neutral-700 bg-neutral-900 px-2"
                                            >
                                                <option value="VIP" className="bg-[#0D0D0D]">VIP 貴賓</option>
                                                <option value="Professional Buyer" className="bg-[#0D0D0D]">Professional Buyer 專業買家</option>
                                                <option value="Press" className="bg-[#0D0D0D]">Press 媒體</option>
                                                <option value="Partner" className="bg-[#0D0D0D]">Partner 合作夥伴</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 pt-4">
                                        <motion.button
                                            whileHover={{ scale: 0.98 }}
                                            whileTap={{ scale: 0.95 }}
                                            type="submit"
                                            disabled={isAdding}
                                            className="px-10 py-3 bg-[#DFBA87] text-black text-[10px] tracking-[0.4em] uppercase disabled:opacity-50 transition-all font-medium"
                                        >
                                            {isAdding ? '加入中...' : '加入名單'}
                                        </motion.button>
                                        {audienceFeedback && (
                                            <p className={`text-[10px] tracking-wider ${audienceFeedback.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {audienceFeedback}
                                            </p>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Audience List */}
                            <div>
                                <div className="flex items-baseline justify-between mb-6">
                                    <h2 className="text-[10px] tracking-[0.4em] uppercase text-neutral-400">現有貴賓與專業買家名單</h2>
                                    <span className="text-[10px] tracking-widest text-neutral-600">{vipList.length} 位受眾成員</span>
                                </div>

                                <div className="space-y-2">
                                    <AnimatePresence>
                                        {vipList.map((vip, i) => (
                                            <motion.div
                                                key={vip.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                                                className="flex items-center justify-between bg-neutral-900/40 border border-neutral-800/40 px-6 py-4 hover:border-neutral-700 transition-colors duration-300"
                                            >
                                                <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                                                    <div className={`text-[8px] px-2 py-0.5 border ${vip.tier === 'SVIP' ? 'border-[#DFBA87] text-[#DFBA87]' : 'border-neutral-700 text-neutral-400'} tracking-tighter`}>
                                                        {vip.tier}
                                                    </div>
                                                    <div className="text-[8px] px-2 py-0.5 bg-neutral-800 text-neutral-300 uppercase tracking-widest font-mono">
                                                        {vip.role === 'Professional Buyer' ? 'BUYER 專業買家' : vip.role}
                                                    </div>
                                                    <div className="ml-2">
                                                        <p className="text-xs tracking-wider text-white font-mono">{vip.email}</p>
                                                        {vip.name && (
                                                            <p className="text-[10px] tracking-widest text-neutral-400 mt-1">{vip.name}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[8px] text-neutral-500 uppercase tracking-widest">RSVP 狀態</p>
                                                        <p className={`text-[10px] tracking-wider font-mono mt-0.5 ${vip.rsvp_status === 'Confirmed' ? 'text-emerald-400' : 'text-neutral-400'}`}>
                                                            {vip.rsvp_status}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteAudience(vip.id, vip.email)}
                                                        disabled={deletingId === vip.id}
                                                        className="text-[9px] tracking-widest uppercase text-neutral-500 hover:text-rose-400 transition-colors duration-300 disabled:opacity-50"
                                                    >
                                                        {deletingId === vip.id ? '移除中' : '移除'}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {vipList.length === 0 && (
                                        <p className="text-center text-neutral-600 text-xs tracking-widest py-12">
                                            受眾名單中尚無任何成員。
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : activeTab === 'campaigns' ? (
                        <motion.div
                            key="campaigns"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.5 }}
                        >
                            {/* Create/Schedule Campaign */}
                            <div className="border border-neutral-800 p-8 mb-12 bg-neutral-950/30">
                                <h2 className="text-[10px] tracking-[0.4em] uppercase text-neutral-400 mb-8">建立新活動 / 排程發送通知</h2>
                                <form onSubmit={handleCreateCampaign} className="space-y-6">
                                    <div className="space-y-6">
                                        <div className="border-b border-neutral-700 focus-within:border-[#DFBA87] transition-colors duration-300">
                                            <input
                                                type="text"
                                                placeholder="EMAIL SUBJECT (信件主旨)"
                                                value={cSubject}
                                                onChange={(e) => setCSubject(e.target.value)}
                                                required
                                                className="w-full py-3 bg-transparent outline-none text-xs tracking-widest placeholder:text-neutral-600 text-white font-medium"
                                            />
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[8px] tracking-widest text-neutral-500 uppercase mb-3">目標受眾 (Target Role)</label>
                                                <select
                                                    value={cTargetRole}
                                                    onChange={(e) => setCTargetRole(e.target.value)}
                                                    className="w-full py-3 bg-transparent outline-none text-xs tracking-widest text-white border-b border-neutral-700 bg-neutral-900 px-2"
                                                >
                                                    <option value="All" className="bg-[#0D0D0D]">全體名單成員 (All)</option>
                                                    <option value="VIP" className="bg-[#0D0D0D]">僅限 VIP 貴賓</option>
                                                    <option value="Professional Buyer" className="bg-[#0D0D0D]">僅限 Professional Buyer 專業買家</option>
                                                    <option value="Press" className="bg-[#0D0D0D]">僅限 Press 媒體</option>
                                                    <option value="Partner" className="bg-[#0D0D0D]">僅限 Partner 合作夥伴</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[8px] tracking-widest text-neutral-500 uppercase mb-3">排程發送時間 (設定即代表排程)</label>
                                                <input
                                                    type="datetime-local"
                                                    value={cScheduledAt}
                                                    onChange={(e) => setCScheduledAt(e.target.value)}
                                                    className="w-full py-2.5 bg-transparent outline-none text-xs text-white border-b border-neutral-700 font-mono px-2"
                                                    style={{ colorScheme: 'dark' }}
                                                />
                                                <span className="text-[8px] text-neutral-500 mt-1 block">若不填寫時間，活動將儲存為「草稿」供隨時手動點擊發送。</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[8px] tracking-widest text-neutral-500 uppercase mb-3">信件內容 (Content Body)</label>
                                            <textarea
                                                rows={8}
                                                placeholder="請輸入欲寄送給 VIP 的信件內文... (系統會自動為您套用精緻的 VIS 視覺排版與頂部/底部 Logo，您只需專注於內容寫作)"
                                                value={cContent}
                                                onChange={(e) => setCContent(e.target.value)}
                                                required
                                                className="w-full p-4 bg-neutral-900/50 border border-neutral-800 focus:border-[#DFBA87] outline-none text-xs tracking-widest text-white leading-relaxed placeholder:text-neutral-600 font-light"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 pt-4">
                                        <motion.button
                                            whileHover={{ scale: 0.98 }}
                                            whileTap={{ scale: 0.95 }}
                                            type="submit"
                                            disabled={isSavingCampaign}
                                            className="px-10 py-3 bg-[#DFBA87] text-black text-[10px] tracking-[0.4em] uppercase disabled:opacity-50 transition-all font-medium"
                                        >
                                            {isSavingCampaign ? '儲存中...' : (cScheduledAt ? '排程活動' : '儲存為草稿')}
                                        </motion.button>
                                        {campaignFeedback && (
                                            <p className="text-[10px] tracking-wider text-emerald-400">
                                                {campaignFeedback}
                                            </p>
                                        )}
                                    </div>
                                </form>
                            </div>

                            {/* Scheduled/Past Campaigns */}
                            <div>
                                <h2 className="text-[10px] tracking-[0.4em] uppercase text-neutral-400 mb-6">活動排程紀錄</h2>
                                <div className="space-y-4">
                                    {campaigns.map((camp) => (
                                        <div key={camp.id} className="bg-neutral-900/30 border border-neutral-800 p-6 flex justify-between items-center flex-wrap md:flex-nowrap gap-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[8px] px-2 py-0.5 font-mono uppercase tracking-widest ${camp.status === 'Sent' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : camp.status === 'Scheduled' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}>
                                                        {camp.status}
                                                    </span>
                                                    <span className="text-[8px] font-mono text-neutral-500">
                                                        受眾: {camp.target_role === 'All' ? '全體名單' : camp.target_role}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-medium tracking-wide text-white">{camp.subject}</h3>
                                                <p className="text-[10px] text-neutral-500 line-clamp-1 font-light max-w-lg">{camp.content}</p>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    {camp.status === 'Sent' ? (
                                                        <>
                                                            <p className="text-[8px] text-neutral-500 uppercase tracking-widest">發送時間</p>
                                                            <p className="text-[9px] font-mono text-neutral-400 mt-0.5">{new Date(camp.sent_at!).toLocaleString('zh-TW')}</p>
                                                        </>
                                                    ) : camp.status === 'Scheduled' ? (
                                                        <>
                                                            <p className="text-[8px] text-neutral-500 uppercase tracking-widest">預定發送</p>
                                                            <p className="text-[9px] font-mono text-amber-400 mt-0.5">{new Date(camp.scheduled_at!).toLocaleString('zh-TW')}</p>
                                                        </>
                                                    ) : (
                                                        <p className="text-[9px] text-neutral-500 font-mono italic">未排程 (草稿)</p>
                                                    )}
                                                </div>
                                                {camp.status !== 'Sent' && (
                                                    <button
                                                        onClick={() => handleSendNow(camp.id)}
                                                        className="text-[9px] tracking-[0.3em] uppercase bg-white text-black hover:bg-[#DFBA87] hover:text-black transition-all px-4 py-2 text-center"
                                                    >
                                                        立即發送
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {campaigns.length === 0 && (
                                        <p className="text-center text-neutral-600 text-xs tracking-widest py-12">
                                            尚未建立任何 Email 行銷活動。
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : activeTab === 'vcheck' ? (
                        <motion.div
                            key="vcheck"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-12"
                        >
                            {/* Metric Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="border border-neutral-800 bg-neutral-950/20 p-6 flex flex-col justify-between" style={{ minHeight: '120px' }}>
                                    <span className="text-[8px] tracking-[0.3em] uppercase text-neutral-500 font-mono">總進場人次 / Total check-ins</span>
                                    <h3 className="text-3xl font-serif tracking-widest text-[#DFBA87] font-light mt-4">
                                        {checkinLogs.length} <span className="text-[10px] font-sans text-neutral-500 font-light ml-1">人次</span>
                                    </h3>
                                </div>
                                <div className="border border-neutral-800 bg-neutral-950/20 p-6 flex flex-col justify-between">
                                    <span className="text-[8px] tracking-[0.3em] uppercase text-neutral-500 font-mono">不重複蒞臨貴賓 / Unique visitors</span>
                                    <h3 className="text-3xl font-serif tracking-widest text-white font-light mt-4">
                                        {Array.from(new Set(checkinLogs.map(log => log.email.toLowerCase().trim()))).length} <span className="text-[10px] font-sans text-neutral-500 font-light ml-1">人</span>
                                    </h3>
                                </div>
                                <div className="border border-neutral-800 bg-neutral-950/20 p-6 flex flex-col justify-between">
                                    <span className="text-[8px] tracking-[0.3em] uppercase text-neutral-500 font-mono">高度黏著再訪人數 / Repeat visitors</span>
                                    <h3 className="text-3xl font-serif tracking-widest text-white font-light mt-4">
                                        {(() => {
                                            const fMap: Record<string, number> = {};
                                            checkinLogs.forEach(log => {
                                                const email = log.email.toLowerCase().trim();
                                                fMap[email] = (fMap[email] || 0) + 1;
                                            });
                                            return Object.values(fMap).filter(count => count > 1).length;
                                        })()} <span className="text-[10px] font-sans text-neutral-500 font-light ml-1">人</span>
                                    </h3>
                                </div>
                            </div>

                            {/* Live Scanner Feed & Freq Leaderboard split screen */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                
                                {/* Left Side: Live Scanner feed */}
                                <div className="border border-neutral-800 p-8 bg-neutral-950/20 flex flex-col h-[600px]">
                                    <div className="flex justify-between items-baseline border-b border-neutral-900 pb-4 mb-6">
                                        <h3 className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 font-mono">即時進場狀態動態 / Live Scanner Feed</h3>
                                        <button 
                                            onClick={fetchCheckinLogs}
                                            className="text-[8px] tracking-widest text-[#DFBA87] uppercase hover:underline"
                                        >
                                            手動重整 ↻
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                                        {checkinLogs.map((log) => (
                                            <div 
                                                key={log.id} 
                                                className="bg-neutral-900/20 border border-neutral-800/40 px-5 py-3.5 flex justify-between items-center"
                                            >
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[7px] font-bold px-2 py-0.5 border ${log.tier === 'SVIP' ? 'border-[#DFBA87] text-[#DFBA87] bg-[#DFBA87]/5' : 'border-neutral-700 text-neutral-400 bg-neutral-800/30'} tracking-tighter`}>
                                                            {log.tier}
                                                        </span>
                                                        <span className="text-[8px] px-2 py-0.5 bg-neutral-950 border border-neutral-900 text-neutral-500 font-mono tracking-widest uppercase">
                                                            {log.scanned_by_device || 'Scanner'}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xs font-serif font-light tracking-wide text-white">
                                                        {log.name || log.email.split('@')[0]}
                                                    </h4>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[7.5px] font-mono text-neutral-500">
                                                        {new Date(log.scanned_at).toLocaleTimeString('zh-TW', { hour12: false })}
                                                    </p>
                                                    <p className="text-[7.5px] font-mono text-neutral-600 mt-1">
                                                        {new Date(log.scanned_at).toLocaleDateString('zh-TW')}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}

                                        {checkinLogs.length === 0 && (
                                            <p className="text-center text-neutral-600 text-xs tracking-widest py-24 font-light">
                                                尚無任何現場掃描進場紀錄。
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Analysis columns */}
                                <div className="space-y-8 flex flex-col justify-between h-[600px]">
                                    
                                    {/* Leaderboard */}
                                    <div className="border border-neutral-800 p-8 bg-neutral-950/20 flex flex-col h-[320px] overflow-hidden">
                                        <h3 className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 font-mono border-b border-neutral-900 pb-4 mb-6">高度黏著再訪名單 / Repeat Leaderboard</h3>
                                        
                                        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                                            {(() => {
                                                const fMap: Record<string, { email: string; name: string | null; tier: string; count: number }> = {};
                                                checkinLogs.forEach(log => {
                                                    const email = log.email.toLowerCase().trim();
                                                    if (!fMap[email]) {
                                                        fMap[email] = {
                                                            email: log.email,
                                                            name: log.name,
                                                            tier: log.tier,
                                                            count: 0
                                                        };
                                                    }
                                                    fMap[email].count += 1;
                                                });
                                                const sorted = Object.values(fMap)
                                                    .filter(item => item.count > 1)
                                                    .sort((a, b) => b.count - a.count);

                                                return sorted.map((item, idx) => (
                                                    <div 
                                                        key={item.email} 
                                                        className="bg-neutral-900/30 border border-neutral-800/40 px-5 py-3 flex justify-between items-center font-mono"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] text-[#DFBA87] font-serif w-4">{idx + 1}.</span>
                                                            <div>
                                                                <p className="text-[11px] font-sans font-light tracking-wide text-neutral-200">
                                                                    {item.name || item.email.split('@')[0]}
                                                                </p>
                                                                <p className="text-[8px] text-neutral-600 tracking-wider font-mono mt-0.5">
                                                                    {/* security masked email */}
                                                                    {item.email.split('@')[0].slice(0, 2)}***@{item.email.split('@')[1]}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-[7px] font-bold px-1.5 py-0.5 border ${item.tier === 'SVIP' ? 'border-[#DFBA87] text-[#DFBA87]' : 'border-neutral-700 text-neutral-400'} tracking-tighter scale-90`}>
                                                                {item.tier}
                                                            </span>
                                                            <span className="text-[10px] text-neutral-300 font-semibold bg-[#DFBA87]/10 px-2 py-0.5 border border-[#DFBA87]/20 rounded-sm">
                                                                {item.count} 次入場
                                                            </span>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}

                                            {checkinLogs.length === 0 && (
                                                <p className="text-center text-neutral-600 text-xs tracking-widest py-12 font-light">
                                                    尚無高度黏著再訪名單。
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Device Activity */}
                                    <div className="border border-neutral-800 p-8 bg-neutral-950/20 flex flex-col h-[250px] overflow-hidden">
                                        <h3 className="text-[10px] tracking-[0.3em] uppercase text-neutral-400 font-mono border-b border-neutral-900 pb-4 mb-5">核銷設備統計 / Device scan activity</h3>
                                        
                                        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                                            {(() => {
                                                const dMap: Record<string, number> = {};
                                                checkinLogs.forEach(log => {
                                                    const device = log.scanned_by_device || 'Entrance Scanner A';
                                                    dMap[device] = (dMap[device] || 0) + 1;
                                                });
                                                const sorted = Object.entries(dMap)
                                                    .map(([name, count]) => ({ name, count }))
                                                    .sort((a, b) => b.count - a.count);

                                                return sorted.map((dev) => (
                                                    <div 
                                                        key={dev.name} 
                                                        className="bg-neutral-900/10 border border-neutral-800/30 px-5 py-3 flex justify-between items-center"
                                                    >
                                                        <span className="text-xs font-mono tracking-widest text-neutral-300 font-light">🖥 {dev.name}</span>
                                                        <span className="text-xs font-serif text-[#DFBA87] font-medium bg-[#DFBA87]/5 px-2.5 py-0.5 border border-[#DFBA87]/20">
                                                            {dev.count} <span className="text-[8px] font-sans text-neutral-500 font-light ml-0.5">次掃描</span>
                                                        </span>
                                                    </div>
                                                ));
                                            })()}

                                            {checkinLogs.length === 0 && (
                                                <p className="text-center text-neutral-600 text-xs tracking-widest py-10 font-light">
                                                    尚無裝置掃描活動數據。
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="blindbox"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-8"
                        >
                            {brandsError ? (
                                <div className="border border-neutral-800 p-8 bg-neutral-950/30">
                                    <h3 className="text-sm tracking-[0.2em] font-serif font-light text-[#DFBA87] mb-4">初始化品味預測品牌資料庫</h3>
                                    <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-light">
                                        您好！若要在後台直接上傳圖片與輸入文字，我們需要先在您的 Supabase 資料庫中建立品牌設定資料表。<br/>
                                        請按照以下簡單步驟完成初始化：
                                    </p>
                                    <div className="space-y-4 text-xs font-light text-neutral-400 bg-neutral-900/40 p-6 border border-neutral-800/80 mb-6">
                                        <p>1. 複製下方的 SQL 語法</p>
                                        <p>2. 前往您的 <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[#DFBA87] underline font-semibold">Supabase Dashboard</a></p>
                                        <p>3. 點選左側選單的 <strong>SQL Editor</strong>，接著開啟新查詢 (New Query)</p>
                                        <p>4. 貼上語法並按下 <strong>Run</strong> 按鈕執行</p>
                                        <p>5. 執行成功後，回到此頁面點擊下方「已完成，重新檢測」按鈕即可開始使用！</p>
                                    </div>
                                    
                                    <pre className="bg-neutral-900 p-4 border border-neutral-800 text-[10px] text-neutral-300 font-mono overflow-x-auto mb-6 max-h-48 rounded">
{`CREATE TABLE IF NOT EXISTS vip_blind_box_brands (
    id text PRIMARY KEY,
    name text NOT NULL,
    desc_text text NOT NULL,
    image_url text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE vip_blind_box_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on blind box brands" ON vip_blind_box_brands;
CREATE POLICY "Allow public read on blind box brands" 
ON vip_blind_box_brands FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow admins all on blind box brands" ON vip_blind_box_brands;
CREATE POLICY "Allow admins all on blind box brands" 
ON vip_blind_box_brands FOR ALL TO authenticated 
USING (auth.email() IN ('artwithlifetaipei@gmail.com'))
WITH CHECK (auth.email() IN ('artwithlifetaipei@gmail.com'));`}
                                    </pre>

                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS vip_blind_box_brands (
    id text PRIMARY KEY,
    name text NOT NULL,
    desc_text text NOT NULL,
    image_url text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE vip_blind_box_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on blind box brands" ON vip_blind_box_brands;
CREATE POLICY "Allow public read on blind box brands" 
ON vip_blind_box_brands FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow admins all on blind box brands" ON vip_blind_box_brands;
CREATE POLICY "Allow admins all on blind box brands" 
ON vip_blind_box_brands FOR ALL TO authenticated 
USING (auth.email() IN ('artwithlifetaipei@gmail.com'))
WITH CHECK (auth.email() IN ('artwithlifetaipei@gmail.com'));`);
                                            alert('SQL 語法已複製至剪貼簿！');
                                        }}
                                        className="px-8 py-3 bg-[#DFBA87] text-black text-[10px] tracking-[0.3em] uppercase font-bold hover:bg-white transition-all duration-300 cursor-pointer"
                                    >
                                        一鍵複製 SQL 語法
                                    </button>
                                    <button
                                        onClick={fetchBrands}
                                        className="ml-4 px-8 py-3 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white text-[10px] tracking-[0.3em] uppercase transition-all duration-300 cursor-pointer"
                                    >
                                        已完成，重新檢測
                                    </button>
                                </div>
                            ) : brands.length === 0 ? (
                                <div className="border border-neutral-800 p-8 bg-neutral-950/30 text-center">
                                    <h3 className="text-sm tracking-[0.2em] font-serif font-light text-[#DFBA87] mb-4">資料庫尚未初始化品牌資料</h3>
                                    <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-light">
                                        資料表已成功建立！點擊下方按鈕可快速將系統預設的五個品牌資料（Fountain Tokyo, Looom Space 等）匯入資料庫，方便您直接在此基礎上修改。
                                    </p>
                                    <button
                                        onClick={handleInitializeBrands}
                                        className="px-10 py-4 bg-[#DFBA87] text-black text-[10px] tracking-[0.3em] uppercase font-bold hover:bg-white transition-all duration-300 cursor-pointer"
                                    >
                                        匯入預設品牌資料
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="border-b border-neutral-900 pb-4">
                                        <h2 className="text-sm tracking-[0.2em] font-serif font-light text-[#DFBA87]">「品味預測迎賓禮」品牌卡片管理</h2>
                                        <p className="text-[10px] text-neutral-500 tracking-widest mt-1">在這裡您可以自行替換 5 個品味遊戲品牌的名稱、簡介描述與滿版底圖圖片。</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-8">
                                        {editableBrands.map((brand) => (
                                            <div key={brand.id} className="border border-neutral-800 p-8 bg-neutral-950/20 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                                                {/* Left side: Image and Upload */}
                                                <div className="md:col-span-4 space-y-4">
                                                    <label className="block text-[8px] tracking-widest text-neutral-500 uppercase">品牌卡片底圖 / Image Card Preview</label>
                                                    <div className="relative aspect-[3/4] w-full max-w-[200px] border border-neutral-800 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center">
                                                        {brand.image_url ? (
                                                            <img src={brand.image_url} alt={brand.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-[10px] text-neutral-600 tracking-widest uppercase">無圖片</span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* File Input */}
                                                    <div className="space-y-2">
                                                        <label className="block text-[9px] tracking-widest text-neutral-400 hover:text-white cursor-pointer py-2 px-4 border border-neutral-800 text-center uppercase bg-neutral-900/30 hover:bg-neutral-800/40 transition-colors">
                                                            📷 上傳圖片檔案 (自動壓縮)
                                                            <input 
                                                                type="file" 
                                                                accept="image/*"
                                                                className="hidden" 
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleImageUpload(brand.id, file);
                                                                }}
                                                            />
                                                        </label>
                                                        
                                                        <input 
                                                            type="text"
                                                            placeholder="或貼上外部圖片網址 (URL)"
                                                            value={brand.image_url.startsWith('data:') ? '已上傳為本地圖片數據' : brand.image_url}
                                                            disabled={brand.image_url.startsWith('data:')}
                                                            onChange={(e) => handleFieldChange(brand.id, 'image_url', e.target.value)}
                                                            className="w-full py-2 bg-transparent border-b border-neutral-800 focus:border-[#DFBA87] outline-none text-[10px] tracking-wider text-neutral-300 placeholder:text-neutral-700"
                                                        />
                                                        {brand.image_url.startsWith('data:') && (
                                                            <button 
                                                                onClick={() => handleFieldChange(brand.id, 'image_url', '')}
                                                                className="text-[8px] text-rose-500 tracking-wider underline hover:text-rose-400"
                                                            >
                                                                重設圖片並重新上傳 / 使用網址
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right side: Texts & Actions */}
                                                <div className="md:col-span-8 space-y-6 flex flex-col justify-between h-full">
                                                    <div className="space-y-4">
                                                        <div className="border-b border-neutral-800 focus-within:border-[#DFBA87] transition-all">
                                                            <label className="block text-[8px] tracking-widest text-neutral-500 uppercase mb-1">品牌名稱 / Brand Name</label>
                                                            <input 
                                                                type="text"
                                                                value={brand.name}
                                                                onChange={(e) => handleFieldChange(brand.id, 'name', e.target.value)}
                                                                className="w-full py-2 bg-transparent outline-none text-sm tracking-widest font-serif text-white"
                                                            />
                                                        </div>

                                                        <div className="border-b border-neutral-800 focus-within:border-[#DFBA87] transition-all">
                                                            <label className="block text-[8px] tracking-widest text-neutral-500 uppercase mb-1">品牌描述 / Description</label>
                                                            <textarea 
                                                                rows={3}
                                                                value={brand.desc_text}
                                                                onChange={(e) => handleFieldChange(brand.id, 'desc_text', e.target.value)}
                                                                className="w-full py-2 bg-transparent outline-none text-xs tracking-wider text-neutral-300 leading-relaxed resize-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 flex items-center justify-between border-t border-neutral-900/60 mt-4">
                                                        <span className="text-[10px] text-[#DFBA87] font-mono">
                                                            {brandFeedback[brand.id] || '準備就緒'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleSaveBrand(brand)}
                                                            disabled={brandSavingId === brand.id}
                                                            className="px-8 py-2.5 bg-[#DFBA87] text-black text-[10px] tracking-[0.3em] font-bold hover:bg-white disabled:opacity-50 transition-all uppercase cursor-pointer"
                                                        >
                                                            {brandSavingId === brand.id ? '儲存中...' : '儲存此品牌修改'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
