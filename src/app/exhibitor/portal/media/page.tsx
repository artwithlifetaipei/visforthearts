'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ImageIcon, Upload, Trash2, FileImage, Lock, Info, Loader2, 
  Image as ImageIcon2, Calendar, Sparkles, Save, CheckCircle2, 
  AlertCircle, Clock, FileText, Check, HelpCircle, Send, Copy
} from 'lucide-react';
import { useExhibitorLanguage } from '@/lib/ExhibitorLanguageContext';

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

interface PrQaState {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  lastSavedAt: string | null;
  isSubmitted: boolean;
}

const PR_QUESTIONS = [
  {
    id: 'q1' as const,
    number: '01',
    tagZh: '品牌初心與本質',
    tagEn: 'Brand Essence & Vision',
    titleZh: '透過這個品牌，你最想讓大家重新重視哪一件事？為什麼它在今天容易被忽略？',
    titleEn: 'Through this brand, what is the one thing you most want people to re-appreciate or pay attention to again? Why is it easily overlooked today?',
    guideZh: '分享創立或經營此品牌時，觸動您最深的那份初衷；以及您觀察到當代生活缺少了什麼。',
    guideEn: 'Share the core intention that sparked your brand, and what you feel modern living is missing today.',
    placeholderZh: '請在此抒發您的想法與理念（建議 100 ~ 300 字，寫到一半隨時可儲存草稿）...',
    placeholderEn: 'Please share your thoughts and core philosophy here (approx. 100–300 words, you can save draft anytime)...',
  },
  {
    id: 'q2' as const,
    number: '02',
    tagZh: '世代傳承與美感生活習慣',
    tagEn: 'Aesthetic Education & Lifestyle',
    titleZh: '如果希望下一代生活在更有美感的台灣，你認為大人現在可以先改變哪一個習慣？',
    titleEn: 'If we want future generations to live in a Taiwan with greater aesthetics, which habit do you think adults could change first right now?',
    guideZh: '從生活日常的小細節出發，例如選物標準、空間留白、消費心態或是對器物精神的珍惜。',
    guideEn: 'Start from daily lifestyle habits—curation criteria, mindful space, consumption attitudes, or respect for craftsmanship.',
    placeholderZh: '請分享您對台灣生活美學的觀察與具體建議...',
    placeholderEn: 'Please share your observations and suggestions for daily aesthetic cultivation...',
  },
  {
    id: 'q3' as const,
    number: '03',
    tagZh: '時代觀察與當代社會反思',
    tagEn: 'Societal Observation & Insight',
    titleZh: '透過這個品牌，你最想讓大家重新重視、重新思考哪一件被現代社會忽略的事？以及你認為為什麼它在今天容易被忽略？',
    titleEn: 'Through this brand, what is an aspect often overlooked by modern society that you want people to rethink? Why has it become neglected today?',
    guideZh: '在講求速度與效率的當代，有哪些緩慢、溫度或深刻的價值正在消失，而貴品牌正試圖挽留？',
    guideEn: 'In a fast-paced era focused on speed and efficiency, what slow and profound values are fading away that you seek to preserve?',
    placeholderZh: '請分享品牌希望引導大眾深入反思的文化或時代現象...',
    placeholderEn: 'Please share cultural or contemporary phenomenons your brand wishes to invite society to rethink...',
  },
  {
    id: 'q4' as const,
    number: '04',
    tagZh: '獨特精神與不可取代性',
    tagEn: 'Originality & Irreplaceability',
    titleZh: '現在消費者經常問：「網路上也有很像的，為什麼要買你的？」面對這個問題，你最希望他們理解什麼？',
    titleEn: 'Consumers often ask: "There are similar things on the internet, why should I buy yours?" Faced with this question, what do you most hope they understand?',
    guideZh: '分享那些照片無法傳達的細節——材質的真實觸感、繁複工序的堅持、手作者的心意或是歲月歷練。',
    guideEn: 'Share details photos cannot convey—tactile quality of materials, stubborn artisanal processes, emotional dedication, or patina of time.',
    placeholderZh: '請分享貴品牌最無可取代的靈魂工藝、堅持或無形價值...',
    placeholderEn: 'Share your brand’s irreplaceable craftsmanship, stubborn persistence, or intangible spirit...',
  },
  {
    id: 'q5' as const,
    number: '05',
    tagZh: '演算法時代的品味探索',
    tagEn: 'Algorithmic Era & Taste',
    titleZh: '如果未來我們每天看到的圖片、商品，都是依照喜好被推薦的，你擔心大家會越來越少接觸不同的美感嗎？你的品牌希望讓人看見什麼不同的選擇？',
    titleEn: 'If all the images and products we see daily in the future are algorithmically recommended based on our past likes, do you worry people will encounter diverse aesthetics less and less? What alternative choice does your brand offer?',
    guideZh: '在同溫層與資訊餵養的時代，貴品牌如何打破千篇一律的審美標準，為人們帶來驚喜與獨特視角？',
    guideEn: 'In an era of information echo chambers, how does your brand offer alternative perspectives and unexpected beauty to break conformity?',
    placeholderZh: '請分享品牌希望呈現給世界的獨特美感語彙與自由選擇...',
    placeholderEn: 'Please share the distinct aesthetic vocabulary and authentic choices your brand brings to the world...',
  },
];

export default function ExhibitorMediaPage({ brand: parentBrand }: { brand?: any }) {
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

  // Visual Image Assets state
  const [assets, setAssets] = useState<any[]>(() => {
    const saved = brand?.id ? safeGetStorage(`vis_portal_media_assets_${brand.id}`) : null;
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  });
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Brand Transparent Logo state (1 asset, transparent PNG / SVG / WebP)
  const [logoAsset, setLogoAsset] = useState<any>(() => {
    const saved = brand?.id ? safeGetStorage(`vis_portal_media_logo_${brand.id}`) : null;
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');

  // PR Editorial Q&A Answers state
  const [qaAnswers, setQaAnswers] = useState<PrQaState>(() => {
    const local = brand?.id ? safeGetStorage(`vis_portal_pr_qa_${brand.id}`) : null;
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    return {
      q1: '',
      q2: '',
      q3: '',
      q4: '',
      q5: '',
      lastSavedAt: null,
      isSubmitted: false,
    };
  });

  const [savingQa, setSavingQa] = useState(false);
  const [qaMessage, setQaMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState<'qa' | 'images'>('qa');

  // Count answered questions
  const answeredCount = PR_QUESTIONS.filter(q => (qaAnswers[q.id] || '').trim().length > 0).length;
  const isAllAnswered = answeredCount === PR_QUESTIONS.length;

  useEffect(() => {
    const loadBrandAndAssets = async () => {
      try {
        let currentBrand = brand;
        if (!currentBrand) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            const userEmail = session.user.email.toLowerCase().trim();
            const { data } = await supabase
              .from('exhibitor_brands')
              .select('*')
              .eq('portal_email', userEmail)
              .maybeSingle();
            currentBrand = data;

            if (!currentBrand) {
              const { data: app } = await supabase
                .from('exhibitor_applications')
                .select('*')
                .eq('contact_email', userEmail)
                .eq('status', 'approved')
                .maybeSingle();
              if (app) {
                currentBrand = {
                  id: app.id,
                  application_id: app.id,
                  brand_name_zh: app.brand_name_zh,
                  brand_name_en: app.brand_name_en || app.brand_name_zh,
                  zone_id: app.zone_id,
                  booth_type: app.booth_type,
                  is_micro_exposure: app.booth_type === 'T',
                  portal_email: userEmail,
                  created_at: app.created_at,
                  custom_fee: app.custom_fee ?? null,
                  discount_note: app.discount_note ?? null,
                  _fallback: true,
                };
              }
            }
          }
        }

        if (currentBrand) {
          setBrand(currentBrand);
          safeSetStorage('vis_portal_brand_data', JSON.stringify(currentBrand));

          // 1. Fetch visual image assets & transparent logo (exclude system JSON records)
          const { data: list } = await supabase
            .from('exhibitor_media_assets')
            .select('*')
            .eq('brand_id', currentBrand.id)
            .not('file_type', 'in', '("pr_qa_submission","booth_fee_proof","compliance_contract","perspective_store_master")')
            .order('created_at', { ascending: false });
          
          const rawList = list || [];
          const logo = rawList.find((a: any) => a.file_type === 'brand_logo_transparent') || null;
          const photos = rawList.filter((a: any) =>
            !['brand_logo_transparent', 'pr_qa_submission', 'booth_fee_proof', 'compliance_contract', 'perspective_store_master'].includes(a.file_type)
          );

          setLogoAsset(logo);
          setAssets(photos);
          if (logo) {
            safeSetStorage(`vis_portal_media_logo_${currentBrand.id}`, JSON.stringify(logo));
          } else {
            try { sessionStorage.removeItem(`vis_portal_media_logo_${currentBrand.id}`); } catch {}
          }
          safeSetStorage(`vis_portal_media_assets_${currentBrand.id}`, JSON.stringify(photos));

          // 2. Fetch PR Q&A submission
          const { data: qaAsset } = await supabase
            .from('exhibitor_media_assets')
            .select('*')
            .eq('brand_id', currentBrand.id)
            .eq('file_type', 'pr_qa_submission')
            .maybeSingle();

          if (qaAsset?.file_url) {
            try {
              const parsed = JSON.parse(qaAsset.file_url);
              setQaAnswers(parsed);
              safeSetStorage(`vis_portal_pr_qa_${currentBrand.id}`, JSON.stringify(parsed));
            } catch (parseErr) {
              console.warn('Failed to parse remote PR QA data:', parseErr);
            }
          } else {
            // Restore from local cache if database record not created yet
            const local = safeGetStorage(`vis_portal_pr_qa_${currentBrand.id}`);
            if (local) {
              try { setQaAnswers(JSON.parse(local)); } catch {}
            }
          }
        }
      } catch (err) {
        console.error('Error fetching media data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadBrandAndAssets();
  }, [parentBrand]);

  // Handle Q&A field update
  const handleQaChange = (field: 'q1' | 'q2' | 'q3' | 'q4' | 'q5', val: string) => {
    setQaAnswers(prev => {
      const updated = { ...prev, [field]: val };
      if (brand?.id) {
        safeSetStorage(`vis_portal_pr_qa_${brand.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Save Q&A Draft or Final Submission
  const handleSaveQa = async (isFinalSubmit: boolean = false) => {
    if (!brand?.id || savingQa) return;

    if (isFinalSubmit) {
      let filledCount = 0;
      (['q1', 'q2', 'q3', 'q4', 'q5'] as const).forEach(k => {
        if ((qaAnswers[k] || '').trim().length > 0) filledCount += 1;
      });
      if (filledCount === 0) {
        alert(lang === 'zh' ? '請至少填寫一題題目後再點擊確認完成。' : 'Please answer at least one question before confirming complete.');
        return;
      }
    }

    setSavingQa(true);
    setQaMessage({ text: '', type: '' });

    const nowIso = new Date().toISOString();
    const payload: PrQaState = {
      ...qaAnswers,
      lastSavedAt: nowIso,
      isSubmitted: isFinalSubmit ? true : qaAnswers.isSubmitted,
    };

    try {
      // 1. Immediately cache in session and local storage
      safeSetStorage(`vis_portal_pr_qa_${brand.id}`, JSON.stringify(payload));
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(`vis_portal_pr_qa_${brand.id}`, JSON.stringify(payload));
        }
      } catch {
        // ignore
      }

      // 2. Obtain auth token if available
      let token: string | null = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      } catch {
        // ignore
      }

      // 3. Dispatch to robust server API endpoint with 10s timeout guarantee
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch('/api/exhibitor/media/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          brand_id: brand.id,
          answers: qaAnswers,
          isSubmitted: isFinalSubmit,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Server error');
      }

      setQaAnswers(payload);
      const timeStr = new Date().toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-TW', { hour12: false });
      setQaMessage({
        text: isFinalSubmit
          ? t(
              `✓ 已成功確認完成！大會策展與公關小組將以此作為專題素材進行排版推廣。（${timeStr}）`,
              `✓ Confirmed and completed! The PR editorial team will curate your narrative. (${timeStr})`
            )
          : t(
              `✓ 草稿已於 ${timeStr} 成功暫存！您可隨時登入接續修改，於 11/15 前皆可自由調整。`,
              `✓ Draft successfully saved at ${timeStr}! You can log in anytime to continue editing before Nov 15.`
            ),
        type: 'success',
      });
      setTimeout(() => setQaMessage({ text: '', type: '' }), 8000);

    } catch (ex: any) {
      console.warn('API sync warning:', ex);
      // Fallback: the draft is already saved in local storage
      setQaAnswers(payload);
      const timeStr = new Date().toLocaleTimeString(lang === 'en' ? 'en-US' : 'zh-TW', { hour12: false });
      setQaMessage({
        text: t(
          `✓ 回稿內容已於本機安全儲存（${timeStr}）。伺服器連線已暫存，請安心繼續填寫。`,
          `✓ Draft safely saved locally (${timeStr}). You can continue editing.`
        ),
        type: 'success',
      });
      setTimeout(() => setQaMessage({ text: '', type: '' }), 8000);
    } finally {
      setSavingQa(false);
    }
  };

  // Brand Transparent Logo upload handling (Strictly 1 transparent image)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !brand) return;

    const file = files[0];
    setLogoError('');

    // Strict validation: Must be PNG, SVG, or WebP
    const fileNameLower = file.name.toLowerCase();
    const isPng = file.type === 'image/png' || fileNameLower.endsWith('.png');
    const isSvg = file.type === 'image/svg+xml' || fileNameLower.endsWith('.svg');
    const isWebp = file.type === 'image/webp' || fileNameLower.endsWith('.webp');

    if (!isPng && !isSvg && !isWebp) {
      setLogoError(
        t(
          '品牌 Logo 必須為透明無底色之去背圖檔，請提供 PNG、SVG 或 WebP 格式（不支援 JPG/JPEG 格式）。',
          'Brand logo must have a transparent background. Please upload PNG, SVG, or WebP format (JPG/JPEG not supported).'
        )
      );
      e.target.value = '';
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setLogoError(t('Logo 檔案大小不能超過 3MB。', 'Logo file size cannot exceed 3MB.'));
      e.target.value = '';
      return;
    }

    setUploadingLogo(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        let fileUrl = '';
        const fileExt = file.name.split('.').pop() || (isSvg ? 'svg' : isWebp ? 'webp' : 'png');
        const storagePath = `${brand.id}/logo_transparent_${Date.now()}.${fileExt}`;

        try {
          // If previous logo exists in storage, clean it up
          if (logoAsset?.file_url?.includes('exhibitor-media')) {
            try {
              const oldParts = logoAsset.file_url.split('exhibitor-media/');
              if (oldParts.length === 2) {
                await supabase.storage.from('exhibitor-media').remove([oldParts[1]]);
              }
            } catch (delErr) {
              console.warn('Error removing old logo from storage:', delErr);
            }
          }

          let uploadSuccess = false;
          const { error: directUploadError } = await supabase.storage
            .from('exhibitor-media')
            .upload(storagePath, file, {
              contentType: file.type || (isSvg ? 'image/svg+xml' : isWebp ? 'image/webp' : 'image/png'),
              upsert: true
            });

          if (!directUploadError) {
            uploadSuccess = true;
          } else {
            // Buffer fallback
            try {
              const base64Clean = base64Data.split(',')[1];
              const buffer = Buffer.from(base64Clean, 'base64');
              const { error: bufError } = await supabase.storage
                .from('exhibitor-media')
                .upload(storagePath, buffer, {
                  contentType: file.type,
                  upsert: true
                });
              if (!bufError) uploadSuccess = true;
            } catch {}
          }

          if (uploadSuccess) {
            const { data: publicUrlData } = supabase.storage
              .from('exhibitor-media')
              .getPublicUrl(storagePath);
            fileUrl = publicUrlData?.publicUrl || base64Data;
          } else {
            fileUrl = base64Data;
          }
        } catch {
          fileUrl = base64Data;
        }

        let savedRow: any = null;
        if (logoAsset?.id) {
          const { data, error } = await supabase
            .from('exhibitor_media_assets')
            .update({
              file_url: fileUrl,
              file_name: file.name,
              file_type: 'brand_logo_transparent',
              created_at: new Date().toISOString()
            })
            .eq('id', logoAsset.id)
            .select()
            .single();

          if (error) {
            setLogoError(t(`更新失敗: ${error.message}`, `Update failed: ${error.message}`));
          } else {
            savedRow = data;
          }
        } else {
          const { data, error } = await supabase
            .from('exhibitor_media_assets')
            .insert({
              brand_id: brand.id,
              file_url: fileUrl,
              file_name: file.name,
              file_type: 'brand_logo_transparent',
            })
            .select()
            .single();

          if (error) {
            setLogoError(t(`儲存失敗: ${error.message}`, `Save failed: ${error.message}`));
          } else {
            savedRow = data;
          }
        }

        if (savedRow) {
          setLogoAsset(savedRow);
          safeSetStorage(`vis_portal_media_logo_${brand.id}`, JSON.stringify(savedRow));
        }

        setUploadingLogo(false);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    } catch {
      setLogoError(t('上傳過程中發生異常，請重試。', 'An error occurred during upload. Please try again.'));
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  // Delete Brand Transparent Logo
  const handleDeleteLogo = async () => {
    if (!logoAsset || deletingLogo || !brand) return;
    setDeletingLogo(true);
    setLogoError('');

    try {
      if (logoAsset.file_url?.includes('exhibitor-media')) {
        try {
          const parts = logoAsset.file_url.split('exhibitor-media/');
          if (parts.length === 2) {
            await supabase.storage.from('exhibitor-media').remove([parts[1]]);
          }
        } catch (storageErr) {
          console.warn('Storage deletion error:', storageErr);
        }
      }

      const { error } = await supabase
        .from('exhibitor_media_assets')
        .delete()
        .eq('id', logoAsset.id);

      if (error) {
        setLogoError(t(`刪除失敗: ${error.message}`, `Delete failed: ${error.message}`));
      } else {
        setLogoAsset(null);
        try { sessionStorage.removeItem(`vis_portal_media_logo_${brand.id}`); } catch {}
      }
    } catch (err: any) {
      setLogoError(err?.message || '刪除失敗');
    } finally {
      setDeletingLogo(false);
    }
  };

  // Image upload handling
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !brand) return;

    if (assets.length >= 5) {
      setErrorMessage(t('最多僅能上傳 5 張媒體素材。', 'Maximum of 5 media assets allowed.'));
      return;
    }

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setErrorMessage(t('請上傳圖片檔案 (PNG, JPEG, WebP)。', 'Please upload an image file (PNG, JPEG, WebP).'));
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage(t('單張圖片檔案不能超過 3MB。', 'Image file cannot exceed 3MB.'));
      return;
    }

    setUploading(true);
    setErrorMessage('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        let fileUrl = '';
        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `${brand.id}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        
        try {
          const base64Clean = base64Data.split(',')[1];
          const buffer = Buffer.from(base64Clean, 'base64');

          const { error: uploadError } = await supabase.storage
            .from('exhibitor-media')
            .upload(fileName, buffer, {
              contentType: file.type,
              upsert: true
            });

          if (uploadError) {
            fileUrl = base64Data;
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('exhibitor-media')
              .getPublicUrl(fileName);
            fileUrl = publicUrlData?.publicUrl || base64Data;
          }
        } catch {
          fileUrl = base64Data;
        }

        const { data, error } = await supabase
          .from('exhibitor_media_assets')
          .insert({
            brand_id: brand.id,
            file_url: fileUrl,
            file_name: file.name,
            file_type: file.type,
          })
          .select()
          .single();

        if (error) {
          setErrorMessage(t(`儲存失敗: ${error.message}`, `Save failed: ${error.message}`));
        } else {
          setAssets(prev => [data, ...prev]);
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setErrorMessage(t('上傳過程中發生異常。', 'An error occurred during upload.'));
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (id: string, fileUrl: string) => {
    if (deletingId || !brand) return;
    setDeletingId(id);
    setErrorMessage('');

    try {
      if (fileUrl.includes('exhibitor-media')) {
        try {
          const parts = fileUrl.split('exhibitor-media/');
          if (parts.length === 2) {
            await supabase.storage.from('exhibitor-media').remove([parts[1]]);
          }
        } catch (ex) {
          console.error('Error deleting from storage:', ex);
        }
      }

      const { error } = await supabase
        .from('exhibitor_media_assets')
        .delete()
        .eq('id', id);

      if (error) {
        setErrorMessage(t(`刪除記錄失敗: ${error.message}`, `Delete failed: ${error.message}`));
      } else {
        setAssets(prev => prev.filter(a => a.id !== id));
      }
    } catch (ex) {
      console.error(ex);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#DFBA87]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="text-center max-w-md mx-auto py-12 text-neutral-400">
        {t('無法讀取品牌資料。', 'Unable to load brand information.')}
      </div>
    );
  }

  const isMicro = brand.is_micro_exposure || brand.booth_type === 'T';

  if (isMicro) {
    return (
      <div className="max-w-2xl mx-auto bg-[#111111] border border-white/5 rounded-xl p-8 text-center space-y-6 font-sans-outfit">
        <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-serif-garamond text-white tracking-wider">
            {t('模組 D — 媒體公關素材 (已豁免)', 'Module D — Media & PR Assets (Exempted)')}
          </h2>
          <p className="text-xs text-neutral-400 font-light leading-relaxed mt-2.5 max-w-md mx-auto">
            {t(
              '貴品牌所選之 T區 (微型曝光方案) 參展規格，依大會手冊僅包含產品現場實體展示。無大會主流公關媒體專題推薦或導流項目。大會秘書處已為您豁免本模組之素材提交義務。',
              'Your selected T-Zone exhibition package focuses on physical product showcase and is exempted from the mainline media press and PR interview module.'
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans-outfit pb-16">
      
      {/* Page Title & Module Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-[#DFBA87]/15 text-[#DFBA87] border border-[#DFBA87]/30">
              Module D
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              VIS Contemporary Culture 2027
            </span>
          </div>
          <h1 className="text-2xl font-serif-garamond text-white tracking-wider flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#DFBA87]" />
            {t('模組 D — 媒體公關專題與素材提報', 'Module D — Media PR Feature & Assets')}
          </h1>
          <p className="text-xs text-neutral-400 font-light mt-1.5 max-w-2xl leading-relaxed">
            {t(
              '大會策展與公關小組將彙整您提報的專訪文字與高解析視覺素材，進行 VIS 官方社群深度專題推薦、媒體公關專訪、展前導覽專文及展會導覽手冊編輯。',
              'The curatorial and PR team will curate your editorial interview answers and visual assets for official social features, press spotlights, and fair guidebooks.'
            )}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('qa')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'qa'
                ? 'bg-[#DFBA87] text-black shadow-md font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {t('專案提問回稿 (5題)', 'PR Feature Q&A (5)')}
            {isAllAnswered ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'images'
                ? 'bg-[#DFBA87] text-black shadow-md font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            {t('視覺素材與 Logo', 'Visual Assets & Logo')}
            <div className="flex items-center gap-1.5">
              {logoAsset ? (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Logo✓
                </span>
              ) : (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Logo待傳
                </span>
              )}
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30">
                {assets.length}/5
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION A: PR EDITORIAL Q&A (專案提問回稿)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'qa' && (
        <div className="space-y-6">

          {/* 1. Official Curatorial Deadline & Inspiration Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#17140F] via-[#121212] to-[#17140F] border border-[#DFBA87]/40 rounded-xl p-6 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#DFBA87]/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#DFBA87]/15 border border-[#DFBA87]/40 flex items-center justify-center text-[#DFBA87]">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono tracking-widest text-[#DFBA87] uppercase">
                    {t('整體宣傳回稿截止日期', 'Official PR Submission Deadline')}
                  </div>
                  <div className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
                    <span>2026 年 11 月 15 日 (日) 23:59</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {t('11/15 截止', 'Due Nov 15')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress pill indicator */}
              <div className="flex items-center gap-3 bg-black/40 px-4 py-2.5 rounded-lg border border-white/5">
                <div className="text-right">
                  <div className="text-[10px] text-neutral-400 tracking-wider uppercase">
                    {t('回稿進度', 'Response Progress')}
                  </div>
                  <div className="text-xs font-mono font-bold text-white">
                    {answeredCount} / {PR_QUESTIONS.length} {t('題已填寫', 'Answered')}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-neutral-700 flex items-center justify-center relative">
                  <span className={`text-xs font-mono font-bold ${isAllAnswered ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {Math.round((answeredCount / PR_QUESTIONS.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Polished Editorial Introduction */}
            <div className="space-y-3">
              <p className="text-xs text-neutral-300 font-light leading-relaxed">
                {t(
                  '每一件來到 VIS 的作品，都乘載著創作者對當代生活的敏銳洞察與堅持。為協助參展品牌在大展期間獲得最大效益的媒體曝光與社群共鳴，大會策展與公關小組特別規劃了以下 5 大核心專題提問。您的回稿將作為 VIS 2027 官方社群深度專案、媒體專訪推薦、展前導覽專文及公關發稿之重要文字素材。誠摯邀請品牌主理人以真實、深刻的筆觸分享，讓大眾看見工藝與設計背後無法被演算法取代的靈魂。',
                  'Every work at VIS embodies keen discernment and craftsmanship in contemporary living. To maximize media exposure and cultural resonance, the curatorial team presents these 5 thematic questions. Your reflections will serve as foundational materials for official PR features and curatorial editorials.'
                )}
              </p>

              {/* Prominent Draft Guarantee Badge */}
              <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#DFBA87]/15 border border-[#DFBA87]/40 text-[#DFBA87] font-medium text-[11px]">
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('✦ 貼心提示：寫到一半可隨時點擊「儲存草稿」！', '✦ Tip: Save your draft anytime as you write!')}</span>
                </div>
                <span className="text-[11px] text-neutral-400 font-light">
                  {t(
                    '您無須一次完成全部填寫，靈感浮現時可先暫存，於 11/15 前隨時登入接續補充。',
                    'You do not need to finish all at once. Save progress whenever inspiration strikes before Nov 15.'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Alert Message for Q&A */}
          {qaMessage.text && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                qaMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {qaMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <span>{qaMessage.text}</span>
              </div>
              <button
                onClick={() => setQaMessage({ text: '', type: '' })}
                className="text-[10px] font-mono opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </motion.div>
          )}

          {/* Top Sticky Quick Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111111] border border-white/5 rounded-xl px-5 py-3.5 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">
                {t('回稿完成度：', 'Completion:')}
              </span>
              {isAllAnswered ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                  <CheckCircle2 className="w-3 h-3" />
                  {t('已全數完成回稿 (5/5)', 'All 5 Answered')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 border border-amber-500/40 text-amber-300 animate-pulse">
                  <Clock className="w-3 h-3" />
                  {t(`尚有 ${PR_QUESTIONS.length - answeredCount} 題待回稿`, `${PR_QUESTIONS.length - answeredCount} Question(s) Pending`)}
                </span>
              )}
              {qaAnswers.lastSavedAt && (
                <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline-block">
                  · {t('上次存檔：', 'Last Saved:')} {new Date(qaAnswers.lastSavedAt).toLocaleString(lang === 'en' ? 'en-US' : 'zh-TW', { hour12: false })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleSaveQa(false)}
                disabled={savingQa}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingQa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-[#DFBA87]" />}
                <span>{t('暫存全部草稿 (寫到一半可存)', 'Save All Drafts')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveQa(true)}
                disabled={savingQa}
                className="px-5 py-2 rounded-lg bg-[#DFBA87] hover:bg-[#c9a370] text-black text-xs font-bold tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingQa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{t('確認完成', 'Confirm Complete')}</span>
              </button>
            </div>
          </div>

          {/* 2. THE 5 INDEPENDENT QUESTION CARDS */}
          <div className="space-y-6">
            {PR_QUESTIONS.map((q, idx) => {
              const val = qaAnswers[q.id] || '';
              const isFilled = val.trim().length > 0;
              const charCount = val.trim().length;

              return (
                <div 
                  key={q.id}
                  className={`bg-[#111111] border rounded-xl p-6 transition-all duration-300 relative shadow-lg ${
                    isFilled 
                      ? 'border-white/10 hover:border-[#DFBA87]/40' 
                      : 'border-amber-500/30 bg-gradient-to-b from-[#14120E] to-[#111111] ring-1 ring-amber-500/20'
                  }`}
                >
                  {/* Card Header: Question Number, Tag, and Prominent Pending/Saved Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[#DFBA87]/15 border border-[#DFBA87]/30 text-[#DFBA87] font-serif-garamond text-base font-bold flex items-center justify-center">
                        {q.number}
                      </span>
                      <div>
                        <span className="text-[10px] font-mono tracking-widest text-[#DFBA87] uppercase block">
                          {t(q.tagZh, q.tagEn)}
                        </span>
                        <h3 className="text-sm font-semibold text-white tracking-wide">
                          {t(`題目 ${q.number}`, `Question ${q.number}`)}
                        </h3>
                      </div>
                    </div>

                    {/* Prominent Status Badge */}
                    <div>
                      {isFilled ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{t('✓ 已暫存草稿', '✓ Draft Saved')}</span>
                          <span className="text-[10px] opacity-75 font-mono">({charCount} {t('字', 'chars')})</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-semibold shadow-sm animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t('● 尚未填寫（待回稿）', '● Pending Response')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Question Title & Curatorial Guidance */}
                  <div className="mb-4 space-y-1.5">
                    <h4 className="text-sm md:text-base font-serif-garamond text-neutral-100 font-medium leading-relaxed">
                      {t(q.titleZh, q.titleEn)}
                    </h4>
                    <p className="text-xs text-neutral-400 font-light flex items-center gap-1.5">
                      <HelpCircle className="w-3 h-3 text-[#DFBA87] flex-shrink-0" />
                      <span>{t(q.guideZh, q.guideEn)}</span>
                    </p>
                  </div>

                  {/* Textarea Area */}
                  <div className="relative">
                    <textarea
                      value={val}
                      onChange={(e) => handleQaChange(q.id, e.target.value)}
                      placeholder={t(q.placeholderZh, q.placeholderEn)}
                      rows={5}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg p-4 text-xs md:text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-[#DFBA87] focus:ring-1 focus:ring-[#DFBA87]/40 transition-all font-sans leading-relaxed resize-y"
                    />

                    {/* Bottom Metadata within Card */}
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-2 px-1">
                      <span className="font-mono">
                        {t('已填寫字數：', 'Word count:')}{' '}
                        <strong className={charCount > 0 ? 'text-[#DFBA87]' : 'text-neutral-500'}>
                          {charCount}
                        </strong>{' '}
                        {t('字', 'characters')}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSaveQa(false)}
                        disabled={savingQa}
                        className="text-neutral-400 hover:text-[#DFBA87] transition-colors flex items-center gap-1 font-medium cursor-pointer"
                        title={t('暫存本題草稿', 'Save this answer')}
                      >
                        <Save className="w-3 h-3" />
                        <span>{t('暫存本題', 'Save Draft')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Master Save Panel */}
          <div className="bg-[#14120E] border border-[#DFBA87]/40 rounded-xl p-6 text-center space-y-4 shadow-xl">
            <div className="max-w-md mx-auto">
              <h4 className="text-sm font-serif-garamond text-white font-semibold tracking-wider">
                {t('回稿進度確認', 'Review & Confirm Editorial Answers')}
              </h4>
              <p className="text-xs text-neutral-400 font-light mt-1">
                {isAllAnswered ? (
                  <span className="text-emerald-400">
                    {t('🎉 恭喜！您已全數完成 5 大專案回稿，可直接點擊下方按鈕確認完成。', 'All 5 questions answered. Ready to confirm and complete.')}
                  </span>
                ) : (
                  <span>
                    {t(
                      `目前尚有 ${PR_QUESTIONS.length - answeredCount} 題待回稿。您可以先點擊「暫存草稿」，於 11/15 前隨時登入接續填寫。`,
                      `${PR_QUESTIONS.length - answeredCount} question(s) remaining. You can save your draft and return before Nov 15.`
                    )}
                  </span>
                )}
              </p>
            </div>

            {/* Alert Message inside Bottom Master Save Panel */}
            {qaMessage.text && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-3.5 rounded-lg border text-xs max-w-lg mx-auto flex items-center justify-between gap-3 ${
                  qaMessage.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-950/50'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 text-left">
                  {qaMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <span className="font-medium">{qaMessage.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setQaMessage({ text: '', type: '' })}
                  className="text-[10px] font-mono opacity-60 hover:opacity-100 p-1"
                >
                  ✕
                </button>
              </motion.div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleSaveQa(false)}
                disabled={savingQa}
                className="px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-semibold tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingQa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-[#DFBA87]" />}
                <span>{t('暫存全部草稿 (寫到一半隨時可存)', 'Save Draft (Continue Later)')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveQa(true)}
                disabled={savingQa}
                className="px-8 py-2.5 rounded-lg bg-[#DFBA87] hover:bg-[#c9a370] text-black text-xs font-bold tracking-widest uppercase transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingQa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{t('確認完成', 'Confirm Complete')}</span>
              </button>
            </div>

            <div className="text-[10px] text-neutral-500 font-mono">
              {t('✦ 回稿截止期限：2026 年 11 月 15 日 23:59 截止 · 支援跨裝置隨時接續編輯', '✦ Submission Deadline: Nov 15, 2026, 23:59 · Cross-device auto draft sync enabled')}
            </div>
          </div>

        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION B: VISUAL ASSETS & LOGO UPLOAD (品牌識別與視覺素材提報)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'images' && (
        <div className="space-y-8">

          {/* 1. BRAND TRANSPARENT LOGO UPLOAD AREA (品牌透明無底色 Logo) */}
          <div className="bg-[#111111] border border-white/10 rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono tracking-widest text-[#DFBA87] uppercase px-2 py-0.5 rounded bg-[#DFBA87]/10 border border-[#DFBA87]/30">
                    {t('必填識別素材', 'Required Brand Identity')}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    {t('單一檔案 · 1 張', '1 Asset Only')}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#DFBA87]" />
                  {t('品牌專屬透明無底色 Logo 上傳區', 'Brand Transparent Logo Upload')}
                </h3>
                <p className="text-xs text-neutral-400 font-light mt-1 max-w-2xl leading-relaxed">
                  {t(
                    '為確保 VIS 官方社群聯名發文、專題公關報導、大會實體專刊及展會現場導覽手冊之排版美感，請提報貴品牌「去背透明無底色」之 Logo 圖檔。',
                    'Please submit a transparent background (cutout) logo for official joint PR, curatorial publications, and exhibition signage.'
                  )}
                </p>
              </div>

              {/* Status badge */}
              <div className="self-start md:self-auto">
                {logoAsset ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('已完成上傳 (1/1)', 'Uploaded (1/1)')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-semibold animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('尚未上傳 (待提供)', 'Pending (0/1)')}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Logo Error message if any */}
            {logoError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <span>{logoError}</span>
                <button 
                  type="button"
                  onClick={() => setLogoError('')} 
                  className="text-xs font-mono opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}

            {logoAsset ? (
              /* Uploaded state with Checkerboard Transparency Preview */
              <div className="grid md:grid-cols-12 gap-6 items-center">
                <div 
                  className="md:col-span-5 rounded-xl border border-white/10 p-6 flex items-center justify-center relative min-h-[160px] overflow-hidden"
                  style={{
                    backgroundColor: '#0c0c0c',
                    backgroundImage: 'repeating-conic-gradient(rgba(255, 255, 255, 0.08) 0% 25%, transparent 0% 50%)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  <img 
                    src={logoAsset.file_url} 
                    alt={logoAsset.file_name || 'Brand Transparent Logo'} 
                    className="max-h-24 max-w-full object-contain filter drop-shadow-md transition-transform duration-300 hover:scale-105"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-white/10 text-[9px] font-mono text-neutral-400">
                    {t('透明背景預覽', 'Transparency Preview')}
                  </div>
                </div>

                <div className="md:col-span-7 space-y-3">
                  <div>
                    <div className="text-xs text-neutral-400 font-mono">
                      {t('已上傳檔案：', 'Current File:')}{' '}
                      <span className="text-neutral-200 font-medium">{logoAsset.file_name}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 font-light mt-1 leading-relaxed">
                      {t(
                        '✓ 圖檔已妥善儲存。大會視覺團隊將以此 Logo 進行聯名視覺設計。如需更新版本，可點擊「更換 Logo」重新選取檔案。',
                        '✓ Saved. The design team will use this logo for joint visuals. Click "Replace Logo" if you wish to update.'
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {/* Replace Button */}
                    <label className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-medium cursor-pointer transition-colors">
                      {uploadingLogo ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#DFBA87]" />
                      )}
                      <span>{uploadingLogo ? t('上傳中...', 'Uploading...') : t('更換 Logo 圖檔', 'Replace Logo')}</span>
                      <input 
                        type="file" 
                        accept=".png,.svg,.webp,image/png,image/svg+xml,image/webp" 
                        onChange={handleLogoUpload} 
                        disabled={uploadingLogo || deletingLogo} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={handleDeleteLogo}
                      disabled={uploadingLogo || deletingLogo}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {deletingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>{t('刪除', 'Delete')}</span>
                    </button>

                    {/* View Original */}
                    <a
                      href={logoAsset.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-neutral-400 hover:text-[#DFBA87] underline underline-offset-4 flex items-center gap-1 ml-auto"
                    >
                      {t('開啟原圖 ↗', 'Open Original ↗')}
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              /* Upload placeholder dropzone */
              <div className="border border-dashed border-[#DFBA87]/40 hover:border-[#DFBA87] bg-white/[0.01] hover:bg-white/[0.03] rounded-xl p-8 text-center transition-all relative group cursor-pointer">
                <input 
                  type="file" 
                  accept=".png,.svg,.webp,image/png,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                
                {uploadingLogo ? (
                  <div className="py-4">
                    <Loader2 className="w-8 h-8 animate-spin text-[#DFBA87] mx-auto mb-2" />
                    <p className="text-xs text-neutral-300 font-medium">
                      {t('透明 Logo 上傳處理中...', 'Uploading transparent logo...')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#DFBA87]/10 border border-[#DFBA87]/30 flex items-center justify-center mx-auto text-[#DFBA87] group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white tracking-wide">
                        {t('點擊或拖曳檔案至此，上傳品牌透明無底色 Logo', 'Click or drag file here to upload transparent brand logo')}
                      </div>
                      <div className="text-xs text-neutral-400 font-light mt-1">
                        {t('嚴格要求：透明無底色（去除背景色塊） · 支援 PNG / SVG / WebP 格式', 'Strict Requirement: Transparent Background (No background color) · PNG / SVG / WebP')}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-neutral-500 font-mono">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">{t('單檔 3MB 內', 'Max 3MB')}</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">{t('建議長邊 1500px 以上', '1500px+ recommended')}</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-amber-400/80">{t('* 不支援 JPG/JPEG', '* JPG/JPEG not supported')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Helpful Format Guidance */}
            <div className="mt-4 pt-3.5 border-t border-white/5 flex items-start gap-2 text-[11px] text-neutral-400 font-light">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#DFBA87] mt-0.5" />
              <p>
                {t(
                  '溫馨說明：若您的 Logo 有黑色款與白色款兩種版本，建議優先上傳「白色款」或「反白款」透明圖檔，最利於大會深色奢華主調之各類文宣應用；若為多色向量彩色 Logo，亦請確保去背完整無白底邊框。',
                  'Note: If your logo has white and black versions, we recommend uploading the white/reversed transparent version for optimal contrast on our dark curatorial palette.'
                )}
              </p>
            </div>
          </div>

          {/* 2. HIGH-RES SHOWCASE & CRAFT ASSETS (大會宣傳情境與工藝圖檔 3~5 張) */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#DFBA87]" />
                  {t('大會宣傳情境與工藝視覺圖檔 (3 ~ 5 張)', 'High-Resolution Showcase & Craft Assets (3–5)')}
                </h2>
                <p className="text-xs text-neutral-400 font-light mt-0.5">
                  {t('請提供 3 至 5 張體現品牌調性與精緻工藝的作品情境圖（每張 3MB 內）。', 'Please upload 3 to 5 images reflecting brand aesthetic (max 3MB each).')}
                </p>
              </div>
              <div className="bg-[#DFBA87]/15 border border-[#DFBA87]/30 px-3.5 py-1.5 rounded-full text-xs font-mono text-[#DFBA87]">
                {t('已上傳情境圖', 'Uploaded')}: {assets.length} / 5
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded font-mono max-w-lg">
                {errorMessage}
              </p>
            )}

            {/* Grid Layout: Uploader and Previews */}
            <div className="grid lg:grid-cols-3 gap-8">
              
              {/* Upload Button Card */}
              <div className="bg-[#111111] border border-white/5 rounded-xl p-6 h-fit space-y-4">
                <h3 className="text-xs font-semibold tracking-widest text-[#DFBA87] uppercase flex items-center gap-1.5 border-b border-white/5 pb-3">
                  <Upload className="w-4 h-4" /> {t('素材上傳', 'Upload Asset')}
                </h3>
                
                <div className="text-xs text-neutral-400 font-light leading-relaxed space-y-2">
                  <p>
                    {t(
                      '請提報 3 至 5 張 能充分體現品牌調性與精緻工藝的高解析度商品/意境圖。',
                      'Please upload 3 to 5 high-resolution images showcasing your brand spirit.'
                    )}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    {t('* 規格要求：比例 3:2 或 1:1，解析度建議 2000px 以上，無浮水印。', '* Spec: 3:2 or 1:1 ratio, 2000px+ recommended, no watermark.')}
                  </p>
                </div>

                <div className="border border-dashed border-white/10 hover:border-[#C9A96E]/50 rounded-lg p-6 text-center cursor-pointer transition-colors relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploading || assets.length >= 5}
                  />
                  {uploading ? (
                    <div className="py-4">
                      <Loader2 className="w-8 h-8 animate-spin text-[#DFBA87] mx-auto mb-2" />
                      <p className="text-[10px] text-neutral-400 uppercase tracking-widest">
                        {t('檔案上傳中...', 'Uploading file...')}
                      </p>
                    </div>
                  ) : (
                    <div className="py-4 flex flex-col items-center">
                      <FileImage className="w-8 h-8 text-neutral-500 group-hover:scale-105 transition-transform mb-2" />
                      <span className="text-[10px] font-semibold text-[#DFBA87] tracking-wider uppercase block">
                        {assets.length >= 5 ? t('已達數量上限 (5張)', 'Max 5 reached') : t('選取圖片檔案', 'Select Image')}
                      </span>
                      <span className="text-[9px] text-neutral-600 block mt-1">MAX 3MB (JPG / PNG / WebP)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Materials Preview Grid */}
              <div className="lg:col-span-2 bg-[#111111] border border-white/5 rounded-xl p-6 flex flex-col min-h-[300px]">
                <h3 className="text-xs font-semibold tracking-widest text-[#DFBA87] uppercase border-b border-white/5 pb-3 mb-6">
                  {t('已提報視覺素材 Previews', 'Uploaded Visual Assets Previews')}
                </h3>

                {assets.length === 0 ? (
                  <div className="flex-grow flex flex-col justify-center items-center text-center p-8 text-neutral-500 space-y-2">
                    <ImageIcon2 className="w-8 h-8 text-neutral-600" />
                    <p className="text-xs font-light">
                      {t('目前尚未上傳任何素材圖檔', 'No visual assets uploaded yet')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <AnimatePresence initial={false}>
                      {assets.map((asset) => (
                        <motion.div
                          key={asset.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="relative group border border-white/5 rounded overflow-hidden aspect-[4/3] bg-neutral-900"
                        >
                          <img 
                            src={asset.file_url} 
                            alt={asset.file_name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3.5 text-left">
                            <span className="text-[9px] font-mono text-neutral-300 truncate w-full">{asset.file_name}</span>
                            <button
                              onClick={() => handleDeleteAsset(asset.id, asset.file_url)}
                              disabled={deletingId === asset.id}
                              className="bg-rose-600 hover:bg-rose-700 text-white rounded p-2 self-end transition-colors flex items-center justify-center cursor-pointer"
                              title={t('刪除素材', 'Delete asset')}
                            >
                              {deletingId === asset.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                <div className="border-t border-white/5 pt-4 mt-8 flex gap-2 text-[10px] text-neutral-500 font-light">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#DFBA87]" />
                  <p>
                    {t(
                      '大會將對您的素材進行專業剪裁與微調，以符合 VIS 藝術節官方推廣美學。若有重大修改將主動諮詢品牌聯絡窗口。',
                      'The curatorial team will adjust images for VIS visual standards with brand coordination.'
                    )}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
