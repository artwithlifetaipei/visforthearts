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
    
    // Tab switching: 'audience' or 'campaigns'
    const [activeTab, setActiveTab] = useState<'audience' | 'campaigns'>('audience');
    
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

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
                router.push('/vip');
                return;
            }
            setIsAuthorized(true);
            await Promise.all([fetchList(), fetchCampaigns()]);
            setIsLoading(false);
        };
        init();
    }, [router]);

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
        
        // Mark as Sent first
        await supabase
            .from('email_campaigns')
            .update({ status: 'Sent', sent_at: new Date().toISOString() })
            .eq('id', id);

        // Call background API route to send emails (Phase 3)
        try {
            await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaignId: id })
            });
            alert('信件發送排程已啟動！');
        } catch (err) {
            console.error('Failed to trigger send API', err);
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
                        <p className="text-[9px] tracking-[0.5em] text-[#D4AF37] uppercase mb-3">VIS FOR THE ARTS</p>
                        <h1 className="text-2xl font-serif font-light tracking-wide mb-1">VIP & 專業買家 CRM 後台</h1>
                        <p className="text-[10px] tracking-widest text-neutral-500 uppercase">Customer Relationship Management</p>
                    </div>
                    <button
                        onClick={() => router.push('/vip/dashboard')}
                        className="text-[9px] tracking-[0.4em] uppercase text-neutral-400 hover:text-white border border-neutral-800 hover:border-white px-5 py-2 transition-all duration-300"
                    >
                        ← 返回儀表板
                    </button>
                </motion.div>

                {/* Tabs */}
                <div className="flex gap-8 mb-12 border-b border-neutral-900 pb-px">
                    <button
                        onClick={() => setActiveTab('audience')}
                        className={`pb-4 text-[11px] tracking-[0.4em] uppercase font-light transition-all duration-300 relative ${activeTab === 'audience' ? 'text-[#D4AF37]' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        受眾與名單管理 (Audience)
                        {activeTab === 'audience' && (
                            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 w-full h-[1px] bg-[#D4AF37]" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('campaigns')}
                        className={`pb-4 text-[11px] tracking-[0.4em] uppercase font-light transition-all duration-300 relative ${activeTab === 'campaigns' ? 'text-[#D4AF37]' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Email 自助行銷與排程 (Campaigns)
                        {activeTab === 'campaigns' && (
                            <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 w-full h-[1px] bg-[#D4AF37]" />
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
                                        <div className="border-b border-neutral-700 focus-within:border-[#D4AF37] transition-colors duration-300">
                                            <input
                                                type="email"
                                                placeholder="EMAIL ADDRESS"
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                                required
                                                className="w-full py-3 bg-transparent outline-none text-xs tracking-widest placeholder:text-neutral-600 text-white"
                                            />
                                        </div>
                                        <div className="border-b border-neutral-700 focus-within:border-[#D4AF37] transition-colors duration-300">
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
                                                    className={`flex-1 py-2.5 text-[10px] tracking-[0.3em] uppercase border transition-all duration-300 ${newTier === 'VIP' ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' : 'border-neutral-800 text-neutral-600'}`}
                                                >
                                                    VIP
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewTier('SVIP')}
                                                    className={`flex-1 py-2.5 text-[10px] tracking-[0.3em] uppercase border transition-all duration-300 ${newTier === 'SVIP' ? 'border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5' : 'border-neutral-800 text-neutral-600'}`}
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
                                            className="px-10 py-3 bg-[#D4AF37] text-black text-[10px] tracking-[0.4em] uppercase disabled:opacity-50 transition-all font-medium"
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
                                                    <div className={`text-[8px] px-2 py-0.5 border ${vip.tier === 'SVIP' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-neutral-700 text-neutral-400'} tracking-tighter`}>
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
                    ) : (
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
                                        <div className="border-b border-neutral-700 focus-within:border-[#D4AF37] transition-colors duration-300">
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
                                                className="w-full p-4 bg-neutral-900/50 border border-neutral-800 focus:border-[#D4AF37] outline-none text-xs tracking-widest text-white leading-relaxed placeholder:text-neutral-600 font-light"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 pt-4">
                                        <motion.button
                                            whileHover={{ scale: 0.98 }}
                                            whileTap={{ scale: 0.95 }}
                                            type="submit"
                                            disabled={isSavingCampaign}
                                            className="px-10 py-3 bg-[#D4AF37] text-black text-[10px] tracking-[0.4em] uppercase disabled:opacity-50 transition-all font-medium"
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
                                                        className="text-[9px] tracking-[0.3em] uppercase bg-white text-black hover:bg-[#D4AF37] hover:text-black transition-all px-4 py-2 text-center"
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
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
