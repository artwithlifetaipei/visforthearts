'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, CheckCircle2, XCircle, Eye, EyeOff, Edit3, Trash2, 
  Download, Plus, Search, Filter, RefreshCw, AlertTriangle, Sparkles, 
  Check, X, Clock, HelpCircle, Save, Loader2, FileText, ArrowLeft
} from 'lucide-react';
import { PerspectiveSubmission, PerspectiveDisplaySettings } from '@/lib/perspectiveDb';

export default function PerspectiveAdminPage() {
  const [items, setItems] = useState<PerspectiveSubmission[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    display_on: 0,
    rejected: 0,
    archived: 0,
  });
  const [settings, setSettings] = useState<PerspectiveDisplaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<PerspectiveSubmission | null>(null);
  const [editForm, setEditForm] = useState({
    display_name: '',
    display_answer: '',
    role_title: '',
    type: 'visitor',
    display_order: '',
    featured: false,
  });

  // Editorial Entry Modal State
  const [showEditorialModal, setShowEditorialModal] = useState(false);
  const [editorialForm, setEditorialForm] = useState({
    display_name: '',
    answer: '',
    role_title: '',
    source: 'EDITORIAL' as const,
    type: 'vis_people' as const,
    display_order: '',
  });

  const [savingAction, setSavingAction] = useState(false);
  const [message, setMessage] = useState('');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/perspectives/admin?status=all`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setStats(data.stats || {});
        setSettings(data.settings || null);
      }
    } catch (err) {
      console.error('Fetch admin error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const showNotification = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  // Perform quick moderation action
  const handleAction = async (id: string, action: string, patch?: any) => {
    try {
      setSavingAction(true);
      const res = await fetch('/api/perspectives/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, patch }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('✓ 操作成功更新！');
        fetchAdminData();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      alert('Error updating item');
    } finally {
      setSavingAction(false);
    }
  };

  // Save Edit Modal
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      setSavingAction(true);
      const res = await fetch('/api/perspectives/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          action: 'edit',
          patch: {
            display_name: editForm.display_name.trim(),
            display_answer: editForm.display_answer.trim(),
            role_title: editForm.role_title.trim() || null,
            type: editForm.type,
            display_order: editForm.display_order ? Number(editForm.display_order) : null,
            featured: editForm.featured,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('✓ 編輯已儲存，公開展示即時生效！');
        setEditingItem(null);
        fetchAdminData();
      }
    } catch {
      alert('Failed to save edits');
    } finally {
      setSavingAction(false);
    }
  };

  // Save Editorial / Interview Entry
  const handleCreateEditorial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorialForm.display_name.trim() || !editorialForm.answer.trim()) return;

    try {
      setSavingAction(true);
      const res = await fetch('/api/perspectives/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editorialForm),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('✓ 已成功新增典藏專題觀點！');
        setShowEditorialModal(false);
        setEditorialForm({
          display_name: '',
          answer: '',
          role_title: '',
          source: 'EDITORIAL',
          type: 'vis_people',
          display_order: '',
        });
        fetchAdminData();
      }
    } catch {
      alert('Failed to create editorial entry');
    } finally {
      setSavingAction(false);
    }
  };

  // Toggle Emergency Mode or Settings
  const handleUpdateDisplaySettings = async (patch: Partial<PerspectiveDisplaySettings>) => {
    try {
      const res = await fetch('/api/perspectives/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settingsPatch: patch }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        showNotification('✓ LED 播放牆控制器參數已即時同步更新！');
      }
    } catch {
      alert('Failed to update display settings');
    }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (activeTab === 'pending' && item.status !== 'pending') return false;
    if (activeTab === 'approved' && item.status !== 'approved') return false;
    if (activeTab === 'rejected' && item.status !== 'rejected') return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (onlyFeatured && !item.featured) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.display_name.toLowerCase().includes(q) ||
        (item.display_answer || item.original_answer).toLowerCase().includes(q) ||
        (item.role_title && item.role_title.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 sm:p-8 font-sans selection:bg-[#DFBA87] selection:text-black">
      
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-[#DFBA87]/15 text-[#DFBA87] border border-[#DFBA87]/30">
                Live Perspective Wall CMS
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                Taipei Zhongshan Hall 2027
              </span>
            </div>
            <h1 className="text-2xl font-serif text-white tracking-wider flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#DFBA87]" />
              年度文化命題 · 觀點之牆後台審核管理
            </h1>
            <p className="text-xs text-neutral-400 font-light mt-1">
              審核大會現場觀眾、參展商、VIP 及策展團隊提交的觀點，並即時控制中山堂現場 LED 播放牆與跨年度典藏。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <Link
              href="/question/display"
              target="_blank"
              className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/15 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-[#DFBA87]" />
              <span>觀看現場 LED 播放 ↗</span>
            </Link>

            <a
              href="/api/perspectives/admin?format=csv"
              className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/15 text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="匯出完整 CSV 典藏紀錄"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>匯出 CSV</span>
            </a>

            <button
              onClick={() => setShowEditorialModal(true)}
              className="px-4 py-2 rounded-lg bg-[#DFBA87] hover:bg-[#c9a370] text-black text-xs font-bold tracking-wider flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新增專題/訪談觀點</span>
            </button>
          </div>
        </div>

        {/* Global Alert Notification */}
        {message && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs rounded-lg flex items-center justify-between animate-fade-in">
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            1. LED WALL CONTROLLER & EMERGENCY MODE (Section 14.2 & 14.3)
        ───────────────────────────────────────────────────────────── */}
        {settings && (
          <div className={`p-5 rounded-xl border transition-all ${
            settings.mode === 'emergency' 
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200' 
              : 'bg-[#121212] border-white/10'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  settings.mode === 'emergency'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                    : 'bg-[#DFBA87]/15 text-[#DFBA87] border border-[#DFBA87]/30'
                }`}>
                  {settings.mode === 'emergency' ? <AlertTriangle className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white tracking-wide">
                      中山堂 LED 播放牆即時控制面板
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold ${
                      settings.mode === 'emergency' 
                        ? 'bg-rose-500 text-black animate-pulse' 
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {settings.mode === 'emergency' ? '● 緊急停播模式' : '● 現場正常輪播中'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 font-light mt-0.5">
                    目前內容版本 Content Version: <strong className="font-mono text-[#DFBA87]">{settings.content_version}</strong> · 
                    單則停留秒數: <strong className="font-mono text-white">{settings.duration_seconds}s</strong>
                  </p>
                </div>
              </div>

              {/* Quick Controller Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 text-xs">
                  <span className="text-neutral-400 text-[11px]">輪播秒數：</span>
                  {[6, 8, 10].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => handleUpdateDisplaySettings({ duration_seconds: sec })}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        settings.duration_seconds === sec
                          ? 'bg-[#DFBA87] text-black font-bold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>

                {settings.mode === 'emergency' ? (
                  <button
                    onClick={() => handleUpdateDisplaySettings({ mode: 'normal' })}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>解除緊急模式（恢復輪播）</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateDisplaySettings({ mode: 'emergency' })}
                    className="px-4 py-2 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/50 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    title="立即停播所有觀點，切換為大會預設主視覺"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>觸發緊急模式 (停播上牆)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            2. STATISTICS CARDS
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
            <div className="text-[10px] font-mono uppercase text-neutral-500">總提報數 Total</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-[#111111] border border-amber-500/30 p-4 rounded-xl bg-gradient-to-b from-amber-500/5 to-transparent">
            <div className="text-[10px] font-mono uppercase text-amber-400 flex items-center justify-between">
              <span>待審核 Pending</span>
              {stats.pending > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300 mt-1">{stats.pending}</div>
          </div>
          <div className="bg-[#111111] border border-emerald-500/20 p-4 rounded-xl">
            <div className="text-[10px] font-mono uppercase text-emerald-400">已核准 Approved</div>
            <div className="text-2xl font-bold font-mono text-emerald-300 mt-1">{stats.approved}</div>
          </div>
          <div className="bg-[#111111] border border-[#DFBA87]/30 p-4 rounded-xl bg-gradient-to-b from-[#DFBA87]/5 to-transparent">
            <div className="text-[10px] font-mono uppercase text-[#DFBA87]">現場播放中 Display On</div>
            <div className="text-2xl font-bold font-mono text-[#DFBA87] mt-1">{stats.display_on}</div>
          </div>
          <div className="bg-[#111111] border border-amber-400/30 p-4 rounded-xl bg-gradient-to-b from-amber-400/10 to-transparent">
            <div className="text-[10px] font-mono uppercase text-[#DFBA87] flex items-center justify-between">
              <span>加強放大 Featured</span>
              <Sparkles className="w-3 h-3 text-[#DFBA87]" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-200 mt-1">
              {items.filter(i => i.featured).length}
            </div>
          </div>
          <div className="bg-[#111111] border border-white/5 p-4 rounded-xl">
            <div className="text-[10px] font-mono uppercase text-neutral-500">已婉拒 Rejected</div>
            <div className="text-2xl font-bold font-mono text-neutral-400 mt-1">{stats.rejected}</div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. SEARCH & FILTER TOOLBAR
        ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111111] border border-white/5 p-4 rounded-xl">
          {/* Sub Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'pending', label: '待審核 Pending', count: stats.pending, highlight: stats.pending > 0 },
              { id: 'approved', label: '已核准 Approved', count: stats.approved },
              { id: 'rejected', label: '已婉拒 Rejected', count: stats.rejected },
              { id: 'all', label: '全部典藏 All', count: stats.total },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#DFBA87] text-black font-semibold shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-white/5 text-neutral-300'
                }`}>
                  {tab.count}
                </span>
                {tab.highlight && activeTab !== tab.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            ))}

            {/* Quick Toggle for Featured Only */}
            <button
              type="button"
              onClick={() => setOnlyFeatured(!onlyFeatured)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                onlyFeatured
                  ? 'bg-gradient-to-r from-amber-500 to-[#DFBA87] text-black font-semibold border-transparent shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-[#DFBA87] border-[#DFBA87]/30'
              }`}
              title="只查看被標記為加強放大顯示的觀點"
            >
              <Sparkles className={`w-3.5 h-3.5 ${onlyFeatured ? 'text-black fill-black' : 'text-[#DFBA87]'}`} />
              <span>★ 僅看加強顯示</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                onlyFeatured ? 'bg-black/20 text-black' : 'bg-black/40 text-amber-300'
              }`}>
                {items.filter(i => i.featured).length}
              </span>
            </button>
          </div>

          {/* Search Input & Type Filter */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#080808] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-[#DFBA87]"
            >
              <option value="all">所有類別 (All Types)</option>
              <option value="visitor">Visitor (觀眾)</option>
              <option value="vis_people">VIS People (核心團隊)</option>
              <option value="artist">Artist (參展藝術家)</option>
              <option value="exhibitor">Exhibitor (參展商)</option>
              <option value="vip">VIP Guest (貴賓)</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋姓名或觀點關鍵字..."
                className="bg-[#080808] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-[#DFBA87] w-48 sm:w-60"
              />
            </div>

            <button
              onClick={fetchAdminData}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
              title="重新整理"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. SUBMISSIONS LIST TABLE
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden shadow-lg">
          {loading ? (
            <div className="p-12 text-center text-[#DFBA87]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <span className="text-xs font-mono">載入觀點資料庫中...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-16 text-center text-neutral-500 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-neutral-600" />
              <p className="text-xs font-light">目前此分類下沒有觀點紀錄。</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredItems.map((item) => {
                const isApproved = item.status === 'approved';
                const isPending = item.status === 'pending';
                const isRejected = item.status === 'rejected';

                return (
                  <div
                    key={item.id}
                    className={`p-5 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                      item.featured ? 'border-l-2 border-l-[#DFBA87] bg-[#DFBA87]/[0.02]' : ''
                    }`}
                  >
                    {/* Left: Content Details */}
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {/* Status Badge */}
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <Check className="w-3 h-3" /> Approved
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-neutral-800 text-neutral-400 border border-neutral-700">
                            <X className="w-3 h-3" /> Rejected
                          </span>
                        )}

                        {/* Enhanced Display Badge */}
                        {item.featured && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-gradient-to-r from-amber-500/20 to-[#DFBA87]/20 text-[#DFBA87] border border-[#DFBA87]/40 font-bold shadow-sm">
                            <Sparkles className="w-3 h-3 text-[#DFBA87]" /> ★ 加強放大顯示
                          </span>
                        )}

                        {/* Display On/Off Switch Badge */}
                        {isApproved && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${
                            item.display_enabled
                              ? 'bg-[#DFBA87]/20 text-[#DFBA87] border border-[#DFBA87]/40'
                              : 'bg-white/5 text-neutral-500 border border-white/5'
                          }`}>
                            {item.display_enabled ? '● 現場輪播中 (Display ON)' : '○ 現場未播放 (Display OFF)'}
                          </span>
                        )}

                        {/* Source & Type Pills */}
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-neutral-400">
                          {item.source} · {item.type}
                        </span>

                        {item.role_title && (
                          <span className="text-[11px] text-[#DFBA87] font-medium">
                            [{item.role_title}]
                          </span>
                        )}

                        {item.display_order && (
                          <span className="text-[10px] font-mono text-neutral-400">
                            順位: #{item.display_order}
                          </span>
                        )}
                      </div>

                      {/* Display Answer & Name */}
                      <blockquote className="text-sm md:text-base font-serif text-neutral-100 leading-relaxed pt-1">
                        “{item.display_answer || item.original_answer}”
                      </blockquote>

                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <span className="font-semibold text-white">— {item.display_name}</span>
                        {item.original_name !== item.display_name && (
                          <span className="text-[10px] text-neutral-500">
                            (原名: {item.original_name})
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-600 font-mono">
                          · {new Date(item.submitted_at).toLocaleString('zh-TW', { hour12: false })}
                        </span>
                      </div>

                      {/* If text was edited, show original text indicator */}
                      {item.display_answer && item.display_answer !== item.original_answer && (
                        <div className="text-[11px] text-neutral-500 bg-black/40 p-2 rounded border border-white/5">
                          <span className="text-neutral-400 font-medium">原始回答：</span>
                          {item.original_answer}
                        </div>
                      )}
                    </div>

                    {/* Right: Moderation Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-end md:self-start shrink-0 pt-2 md:pt-0">
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAction(item.id, 'approve', { featured: false })}
                            disabled={savingAction}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow cursor-pointer disabled:opacity-50"
                            title="核准為一般字級上牆播放"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>核准上牆</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAction(item.id, 'approve', { featured: true })}
                            disabled={savingAction}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 via-[#DFBA87] to-amber-400 hover:brightness-110 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                            title="核准並加強放大顯示（於現場 LED 大螢幕以特大字體、金色徽章醒目播放）"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-black fill-black" />
                            <span>★ 核准並加強顯示</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAction(item.id, 'reject')}
                            disabled={savingAction}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            title="婉拒此筆觀點"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>婉拒</span>
                          </button>
                        </>
                      )}

                      {/* Quick Toggle for Enhanced Display (Featured) */}
                      <button
                        type="button"
                        onClick={() => handleAction(item.id, 'toggle_featured', { featured: !item.featured })}
                        disabled={savingAction}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border ${
                          item.featured
                            ? 'bg-[#DFBA87]/20 hover:bg-[#DFBA87]/30 text-[#DFBA87] border-[#DFBA87]/50 shadow-sm'
                            : 'bg-white/5 hover:bg-white/10 text-neutral-400 border-white/10'
                        }`}
                        title="切換是否於現場 LED 牆加強放大顯示"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${item.featured ? 'text-[#DFBA87] fill-[#DFBA87]' : 'text-neutral-500'}`} />
                        <span>{item.featured ? '★ 已加強顯示' : '☆ 加強顯示'}</span>
                      </button>

                      {isApproved && (
                        <button
                          type="button"
                          onClick={() => handleAction(item.id, 'toggle_display', { display_enabled: !item.display_enabled })}
                          disabled={savingAction}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer border ${
                            item.display_enabled
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-[#DFBA87] hover:bg-[#c9a370] text-black font-semibold border-transparent'
                          }`}
                        >
                          {item.display_enabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{item.display_enabled ? '下架下牆' : '重新上牆'}</span>
                        </button>
                      )}

                      {isRejected && (
                        <button
                          type="button"
                          onClick={() => handleAction(item.id, 'approve')}
                          disabled={savingAction}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white border border-emerald-500/30 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>重審核准</span>
                        </button>
                      )}

                      {/* Edit Display Text Modal Trigger */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item);
                          setEditForm({
                            display_name: item.display_name,
                            display_answer: item.display_answer || item.original_answer,
                            role_title: item.role_title || '',
                            type: item.type,
                            display_order: item.display_order ? String(item.display_order) : '',
                            featured: item.featured,
                          });
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
                        title="修訂公開文字 (潤飾錯字標點)"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>潤飾</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL A: EDIT DISPLAY TEXT (RULE-004: 不可覆寫原始欄位)
      ───────────────────────────────────────────────────────────── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111111] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#DFBA87]" />
                修訂公開展示版本 (原始內容將安全保留)
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-neutral-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">公開展示名稱 (Display Name)</label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  maxLength={30}
                  className="w-full bg-[#080808] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DFBA87]"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">公開展示回答 (Display Answer，微調錯字與斷行)</label>
                <textarea
                  value={editForm.display_answer}
                  onChange={(e) => setEditForm({ ...editForm, display_answer: e.target.value })}
                  maxLength={120}
                  rows={4}
                  className="w-full bg-[#080808] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#DFBA87] leading-relaxed"
                />
                <div className="text-[10px] text-neutral-500 font-mono mt-1">
                  原始提交：{editingItem.original_answer}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">分類類別 (Type)</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full bg-[#080808] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-[#DFBA87]"
                  >
                    <option value="visitor">Visitor (觀眾)</option>
                    <option value="vis_people">VIS People (團隊)</option>
                    <option value="artist">Artist (藝術家)</option>
                    <option value="exhibitor">Exhibitor (參展商)</option>
                    <option value="vip">VIP Guest (貴賓)</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">身份頭銜 (Role/Title)</label>
                  <input
                    type="text"
                    value={editForm.role_title}
                    onChange={(e) => setEditForm({ ...editForm, role_title: e.target.value })}
                    placeholder="例: 資深建築師"
                    className="w-full bg-[#080808] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DFBA87]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <label className="text-neutral-400 block mb-1">手動指定播放順位 (選填)</label>
                  <input
                    type="number"
                    value={editForm.display_order}
                    onChange={(e) => setEditForm({ ...editForm, display_order: e.target.value })}
                    placeholder="順位數字 (如: 1, 2)"
                    className="w-32 bg-[#080808] border border-white/10 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#DFBA87]"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={editForm.featured}
                    onChange={(e) => setEditForm({ ...editForm, featured: e.target.checked })}
                    className="rounded bg-neutral-900 border-neutral-700 text-[#DFBA87] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-neutral-200 font-medium flex items-center gap-1.5 cursor-pointer">
                    <Sparkles className="w-3.5 h-3.5 text-[#DFBA87]" />
                    <span>加強顯示（於現場大型 LED 觀點牆特大字號顯著播放）</span>
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingAction}
                className="px-5 py-2 rounded-lg bg-[#DFBA87] hover:bg-[#c9a370] text-black text-xs font-bold shadow"
              >
                {savingAction ? '儲存中...' : '確認儲存潤飾'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL B: CREATE EDITORIAL / INTERVIEW ENTRY (Section 10.3)
      ───────────────────────────────────────────────────────────── */}
      {showEditorialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleCreateEditorial}
            className="bg-[#111111] border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#DFBA87]" />
                新增專題 / 訪談典藏觀點 (Editorial Entry)
              </h3>
              <button type="button" onClick={() => setShowEditorialModal(false)} className="text-neutral-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">受訪者或發言人姓名 *</label>
                <input
                  type="text"
                  required
                  value={editorialForm.display_name}
                  onChange={(e) => setEditorialForm({ ...editorialForm, display_name: e.target.value })}
                  placeholder="例如: 隈研吾、Norman、VIS 策展人"
                  className="w-full bg-[#080808] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DFBA87]"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">受訪者身份頭銜 (Role/Title)</label>
                <input
                  type="text"
                  value={editorialForm.role_title}
                  onChange={(e) => setEditorialForm({ ...editorialForm, role_title: e.target.value })}
                  placeholder="例如: 日本當代建築巨擘、參展品牌總監"
                  className="w-full bg-[#080808] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DFBA87]"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">核心回答觀點 (120 字以內) *</label>
                <textarea
                  required
                  maxLength={120}
                  rows={4}
                  value={editorialForm.answer}
                  onChange={(e) => setEditorialForm({ ...editorialForm, answer: e.target.value })}
                  placeholder="請填入一百年後依然重要的文化觀點..."
                  className="w-full bg-[#080808] border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[#DFBA87] leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">來源 (Source)</label>
                  <select
                    value={editorialForm.source}
                    onChange={(e) => setEditorialForm({ ...editorialForm, source: e.target.value as any })}
                    className="w-full bg-[#080808] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-[#DFBA87]"
                  >
                    <option value="EDITORIAL">EDITORIAL (大會專題)</option>
                    <option value="INTERVIEW">INTERVIEW (媒體訪談)</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">身份類別 (Type)</label>
                  <select
                    value={editorialForm.type}
                    onChange={(e) => setEditorialForm({ ...editorialForm, type: e.target.value as any })}
                    className="w-full bg-[#080808] border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-[#DFBA87]"
                  >
                    <option value="vis_people">VIS People (核心團隊)</option>
                    <option value="artist">Artist (藝術家)</option>
                    <option value="exhibitor">Exhibitor (參展商)</option>
                    <option value="vip">VIP Guest (榮譽貴賓)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowEditorialModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={savingAction}
                className="px-5 py-2 rounded-lg bg-[#DFBA87] hover:bg-[#c9a370] text-black text-xs font-bold shadow"
              >
                {savingAction ? '建立中...' : '建立並直接收錄'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
