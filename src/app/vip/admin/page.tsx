'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// Admin emails — only these accounts can access this page
const ADMIN_EMAILS = [
    'artwithlifetaipei@gmail.com',
    'amelie@theartpressasia.com',
];

type VIPEntry = {
    id: string;
    email: string;
    name: string | null;
    created_at: string;
};

export default function VIPAdminPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [vipList, setVipList] = useState<VIPEntry[]>([]);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
                router.push('/vip');
                return;
            }
            setIsAuthorized(true);
            await fetchList();
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

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;
        setIsAdding(true);
        setFeedback('');

        const { error } = await supabase
            .from('vip_allowlist')
            .insert({ email: newEmail.toLowerCase().trim(), name: newName.trim() || null });

        if (error) {
            if (error.code === '23505') {
                setFeedback('⚠️ 此信箱已在名單中。');
            } else {
                setFeedback(`錯誤：${error.message}`);
            }
        } else {
            setFeedback('✓ 已成功加入貴賓名單。');
            setNewEmail('');
            setNewName('');
            await fetchList();
        }
        setIsAdding(false);
    };

    const handleDelete = async (id: string, email: string) => {
        if (!confirm(`確定要將 ${email} 從 VIP 名單中移除嗎？`)) return;
        setDeletingId(id);
        await supabase.from('vip_allowlist').delete().eq('id', id);
        await fetchList();
        setDeletingId(null);
    };

    if (isLoading) return null;
    if (!isAuthorized) return null;

    return (
        <div className="min-h-screen bg-[#0D0D0D] text-white p-8 font-sans">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="mb-16"
                >
                    <p className="text-[9px] tracking-[0.5em] text-[#D4AF37] uppercase mb-4">VIS FOR THE ARTS</p>
                    <h1 className="text-2xl font-serif font-light tracking-wide mb-2">貴賓名單管理</h1>
                    <p className="text-[10px] tracking-widest text-neutral-500 uppercase">VIP Allowlist Admin</p>
                </motion.div>

                {/* Add New VIP */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="border border-neutral-800 p-8 mb-12"
                >
                    <h2 className="text-[10px] tracking-[0.4em] uppercase text-neutral-400 mb-8">新增貴賓</h2>
                    <form onSubmit={handleAdd} className="space-y-6">
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
                        </div>
                        <div className="flex items-center gap-6">
                            <motion.button
                                whileHover={{ scale: 0.98 }}
                                whileTap={{ scale: 0.95 }}
                                type="submit"
                                disabled={isAdding}
                                className="px-10 py-3 bg-[#D4AF37] text-black text-[10px] tracking-[0.4em] uppercase disabled:opacity-50 transition-all"
                            >
                                {isAdding ? '新增中...' : '加入名單'}
                            </motion.button>
                            {feedback && (
                                <p className={`text-[10px] tracking-wider ${feedback.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {feedback}
                                </p>
                            )}
                        </div>
                    </form>
                </motion.div>

                {/* VIP List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <div className="flex items-baseline justify-between mb-6">
                        <h2 className="text-[10px] tracking-[0.4em] uppercase text-neutral-400">現有貴賓名單</h2>
                        <span className="text-[10px] tracking-widest text-neutral-600">{vipList.length} 位貴賓</span>
                    </div>

                    <div className="space-y-px">
                        <AnimatePresence>
                            {vipList.map((vip, i) => (
                                <motion.div
                                    key={vip.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.4, delay: i * 0.05 }}
                                    className="flex items-center justify-between bg-neutral-900 px-6 py-4 group hover:bg-neutral-800 transition-colors duration-300"
                                >
                                    <div>
                                        <p className="text-xs tracking-wider text-white">{vip.email}</p>
                                        {vip.name && (
                                            <p className="text-[10px] tracking-widest text-neutral-500 mt-1">{vip.name}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <p className="text-[9px] tracking-wider text-neutral-600 hidden md:block">
                                            {new Date(vip.created_at).toLocaleDateString('zh-TW')}
                                        </p>
                                        <button
                                            onClick={() => handleDelete(vip.id, vip.email)}
                                            disabled={deletingId === vip.id}
                                            className="text-[9px] tracking-widest uppercase text-neutral-600 hover:text-rose-400 transition-colors duration-300 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                        >
                                            {deletingId === vip.id ? '移除中' : '移除'}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {vipList.length === 0 && (
                            <p className="text-center text-neutral-600 text-xs tracking-widest py-12">
                                名單尚無貴賓
                            </p>
                        )}
                    </div>
                </motion.div>

                {/* Back */}
                <div className="mt-16 text-center">
                    <button
                        onClick={() => router.push('/vip/dashboard')}
                        className="text-[9px] tracking-[0.4em] uppercase text-neutral-600 hover:text-white transition-colors duration-300"
                    >
                        ← 返回儀表板
                    </button>
                </div>
            </div>
        </div>
    );
}
