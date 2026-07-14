'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCheck, 
  ShieldCheck, 
  Signature, 
  CheckSquare, 
  Loader2, 
  Info, 
  ChevronDown, 
  Check, 
  AlertCircle,
  FileText,
  Upload,
  Download
} from 'lucide-react';

export default function ExhibitorCompliancePage({ brand: parentBrand }: { brand?: any }) {
  const [brand, setBrand] = useState<any>(() => {
    if (parentBrand) return parentBrand;
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('vis_portal_brand_data');
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    }
    return null;
  });

  const [loading, setLoading] = useState(() => {
    return !brand;
  });

  const [submitting, setSubmitting] = useState(false);
  const [signedData, setSignedData] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(`vis_portal_compliance_${brand?.id}`);
        return saved ? JSON.parse(saved) : null;
      } catch { return null; }
    }
    return null;
  });

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    rule_booth: true,
    rule_conduct: false,
    rule_liability: false,
    rule_exit: false,
    rule_ip: false,
    rule_return_inspection: false,
  });

  // Form states
  const [rules, setRules] = useState(() => {
    if (signedData) {
      return {
        rule_booth: signedData.rule_booth,
        rule_conduct: signedData.rule_conduct,
        rule_liability: signedData.rule_liability,
        rule_exit: signedData.rule_exit,
        rule_ip: signedData.rule_ip,
        rule_return_inspection: signedData.rule_return_inspection || false,
      };
    }
    return {
      rule_booth: false,
      rule_conduct: false,
      rule_liability: false,
      rule_exit: false,
      rule_ip: false,
      rule_return_inspection: false,
    };
  });

  // New States for compliance requirements
  const [specialDeposit, setSpecialDeposit] = useState(() => signedData?.rule_deposit_forfeiture || false);
  const [specialDamage, setSpecialDamage] = useState(() => signedData?.rule_damage_compensation || false);
  const [specialRefund, setSpecialRefund] = useState(() => signedData?.rule_refund_policy || false);
  const [signedName, setSignedName] = useState(() => signedData?.signed_name || '');
  const [signerIdNumber, setSignerIdNumber] = useState(() => signedData?.signer_id_number || '');
  const [isLegalRepresentative, setIsLegalRepresentative] = useState(() => signedData?.is_legal_representative || false);
  const [privacyConsent, setPrivacyConsent] = useState(() => signedData?.privacy_consent || false);
  const [physicalContractUrl, setPhysicalContractUrl] = useState(() => signedData?.physical_contract_url || '');
  const [uploading, setUploading] = useState(false);
  
  // Scroll states for special clauses
  const [scrolledDeposit, setScrolledDeposit] = useState(!!signedData);
  const [scrolledDamage, setScrolledDamage] = useState(!!signedData);
  const [scrolledRefund, setScrolledRefund] = useState(!!signedData);

  const [errorMessage, setErrorMessage] = useState('');

  const depositRef = useRef<HTMLDivElement>(null);
  const damageRef = useRef<HTMLDivElement>(null);
  const refundRef = useRef<HTMLDivElement>(null);

  // Check scrollability of containers dynamically
  useEffect(() => {
    if (signedData || loading) return;

    const checkScrollability = () => {
      if (depositRef.current) {
        const { scrollHeight, clientHeight } = depositRef.current;
        if (scrollHeight <= clientHeight + 10) {
          setScrolledDeposit(true);
        }
      }
      if (damageRef.current) {
        const { scrollHeight, clientHeight } = damageRef.current;
        if (scrollHeight <= clientHeight + 10) {
          setScrolledDamage(true);
        }
      }
      if (refundRef.current) {
        const { scrollHeight, clientHeight } = refundRef.current;
        if (scrollHeight <= clientHeight + 10) {
          setScrolledRefund(true);
        }
      }
    };

    // Run after layout/render tick
    const timer = setTimeout(checkScrollability, 300);
    window.addEventListener('resize', checkScrollability);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [signedData, loading, brand, rules, expandedSections]);

  useEffect(() => {
    const loadCompliance = async () => {
      try {
        let currentBrand = brand;
        if (!currentBrand) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            const { data } = await supabase
              .from('exhibitor_brands')
              .select('*')
              .eq('portal_email', session.user.email.toLowerCase().trim())
              .maybeSingle();
            currentBrand = data;
          }
        }

        if (currentBrand) {
          setBrand(currentBrand);
          sessionStorage.setItem('vis_portal_brand_data', JSON.stringify(currentBrand));

          const { data: compliance } = await supabase
            .from('exhibitor_compliance')
            .select('*')
            .eq('brand_id', currentBrand.id)
            .maybeSingle();
          
          if (compliance) {
            setSignedData(compliance);
            sessionStorage.setItem(`vis_portal_compliance_${currentBrand.id}`, JSON.stringify(compliance));
            setRules({
              rule_booth: compliance.rule_booth,
              rule_conduct: compliance.rule_conduct,
              rule_liability: compliance.rule_liability,
              rule_exit: compliance.rule_exit,
              rule_ip: compliance.rule_ip,
              rule_return_inspection: compliance.rule_return_inspection || false,
            });
            setSpecialDeposit(compliance.rule_deposit_forfeiture || false);
            setSpecialDamage(compliance.rule_damage_compensation || false);
            setSpecialRefund(compliance.rule_refund_policy || false);
            setSignedName(compliance.signed_name || '');
            setSignerIdNumber(compliance.signer_id_number || '');
            setIsLegalRepresentative(compliance.is_legal_representative || false);
            setPrivacyConsent(compliance.privacy_consent || false);
            setPhysicalContractUrl(compliance.physical_contract_url || '');
            
            // Set scrolled states to true since it is already loaded/signed
            setScrolledDeposit(true);
            setScrolledDamage(true);
            setScrolledRefund(true);
          }
        }
      } catch (err) {
        console.error('Error loading compliance:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCompliance();
  }, [parentBrand]);

  const toggleExpand = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleCheckboxChange = (name: keyof typeof rules, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent accordion from toggling when clicking the checkbox directly
    }
    if (signedData) return; // read-only if signed
    setRules(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleAgreeAll = () => {
    if (signedData) return;
    const allTrue = {
      rule_booth: true,
      rule_conduct: true,
      rule_liability: true,
      rule_exit: true,
      rule_ip: true,
      rule_return_inspection: true,
    };
    setRules(allTrue);
  };

  const handleScroll = (type: 'deposit' | 'damage' | 'refund', e: React.UIEvent<HTMLDivElement>) => {
    if (signedData) return;
    const target = e.currentTarget;
    // Check if scrolled to bottom (within 10px buffer)
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 10) {
      if (type === 'deposit') {
        setScrolledDeposit(true);
      } else if (type === 'damage') {
        setScrolledDamage(true);
      } else if (type === 'refund') {
        setScrolledRefund(true);
      }
    }
  };

  const handlePhysicalContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !brand) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('單個檔案大小不能超過 2MB (實體掃描檔建議尺寸)。');
      return;
    }

    setUploading(true);
    setErrorMessage('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;

        let fileUrl = '';
        const fileExt = file.name.split('.').pop() || 'pdf';
        const fileName = `${brand.id}/contract_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        
        try {
          const base64Clean = base64Data.split(',')[1];
          const buffer = Buffer.from(base64Clean, 'base64');

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('exhibitor-media')
            .upload(fileName, buffer, {
              contentType: file.type,
              upsert: true
            });

          if (uploadError) {
            console.error('Storage upload error, falling back to base64:', uploadError);
            fileUrl = base64Data; // fallback
          } else {
            const { data: publicUrlData } = supabase.storage
              .from('exhibitor-media')
              .getPublicUrl(fileName);
            fileUrl = publicUrlData?.publicUrl || base64Data;
          }
        } catch (storageEx) {
          console.error('Exception during storage upload, using base64 fallback:', storageEx);
          fileUrl = base64Data;
        }

        setPhysicalContractUrl(fileUrl);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage('上傳過程中發生異常。');
      setUploading(false);
    }
  };

  const allChecked = Object.values(rules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || signedData) return;

    if (physicalContractUrl) {
      // Physical contract flow validation
      if (!privacyConsent) {
        setErrorMessage('請勾選並同意《隱私權政策與個資蒐集聲明》。');
        return;
      }
    } else {
      // Online signing flow validation
      if (!allChecked) {
        setErrorMessage('請勾選並同意所有參展規範條款。');
        return;
      }

      if (!specialDeposit || !specialDamage || !specialRefund) {
        setErrorMessage('請詳閱並勾選同意「保證金沒收機制」、「古蹟場地毀損賠償」與「參展費退費與展位取消規範」三項特別重大條款。');
        return;
      }

      if (signedName.trim() === '') {
        setErrorMessage('請填寫授權簽署人姓名。');
        return;
      }

      if (signerIdNumber.trim() === '') {
        setErrorMessage('請填寫授權簽署人身分證字號。');
        return;
      }

      if (!isLegalRepresentative) {
        setErrorMessage('請確認並勾選「本人確認為參展品牌之法定代理人，或已取得充分授權」核取方塊。');
        return;
      }

      if (!privacyConsent) {
        setErrorMessage('請勾選並同意《隱私權政策與個資蒐集聲明》。');
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        brand_id: brand.id,
        rule_booth: rules.rule_booth,
        rule_conduct: rules.rule_conduct,
        rule_liability: rules.rule_liability,
        rule_exit: rules.rule_exit,
        rule_ip: rules.rule_ip,
        rule_return_inspection: rules.rule_return_inspection,
        rule_deposit_forfeiture: specialDeposit,
        rule_damage_compensation: specialDamage,
        rule_refund_policy: specialRefund,
        signed_name: signedName.trim() || null,
        signer_id_number: signerIdNumber.trim() || null,
        is_legal_representative: isLegalRepresentative,
        privacy_consent: privacyConsent,
        physical_contract_url: physicalContractUrl || null,
        signed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('exhibitor_compliance')
        .insert(payload)
        .select()
        .single();

      if (error) {
        setErrorMessage(`儲存失敗: ${error.message}`);
      } else {
        setSignedData(data);
      }
    } catch (err: any) {
      setErrorMessage('系統連線異常。');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#DFBA87]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const sections = [
    {
      id: 'rule_booth' as const,
      title: '一、保證金繳交與展位設計規範 Deposit & Booth Design Regulations',
      summary: '規範保證金新台幣 20,000 元之匯款繳交、未錄取退款、履約退還，以及展位搭建安全規範與基本場地限制。',
      content: (
        <div className="space-y-4 text-neutral-300 text-xs font-light leading-relaxed">
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              保證金繳交與退款規範
            </h4>
            <ul className="list-decimal pl-5 space-y-2 text-neutral-400">
              <li>
                <strong className="text-white">保證金繳交：</strong>
                為維護大展申請公正秩序，申請單位須於提交申請表之同時，匯款繳交保證金新台幣 20,000 元整，並提供匯款證明。未依規定或逾期繳納者，視同未完成申請手續，主辦單位將不予受理審查。
              </li>
              <li>
                <strong className="text-white">未錄取單位之退款：</strong>
                經審查未獲錄取之單位，主辦單位將於公告錄取名單後之 <span className="text-[#DFBA87] font-semibold border-b border-[#DFBA87]/40 px-1">14</span> 個工作日內，將保證金無息退還至申請單位之原匯款帳戶。退款所產生之銀行跨行匯款手續費，將由退款金額中逕行扣除。
              </li>
              <li>
                <strong className="text-white">錄取單位之退款：</strong>
                入選單位若依約完成參展/進駐，且經主辦單位確認無違反活動規範或造成場地損害等情事，保證金將於活動結束後7個工作日內全額無息退還。
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              展位規範與限制 (備忘錄第四條)
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>參展品牌須依大會統一規劃進行展位搭設與陳列，不得擅自更改位置或超出大會提供之範圍。</li>
              <li>展位設計需符合安全規範（電力負載、防火材料等），並於進場前完成安全檢查。</li>
              <li>禁止於展區內進行任何危險行為或擺放易燃、易爆、違禁品。</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'rule_conduct' as const,
      title: '二、現場行為與環境維護守則 On-site Conduct & Environment Maintenance',
      summary: '規範現場人員動線、宣傳活動申報限制，以及環境整潔與撤展後場地復原基本義務。',
      content: (
        <div className="space-y-4 text-neutral-300 text-xs font-light leading-relaxed">
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              現場行為規範
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-neutral-400">
              <li>參展品牌應遵守現場工作人員指示，保持展區整潔，並不得影響其他品牌或觀眾動線。</li>
              <li>展期內所有宣傳、活動與表演需事先向大會申請核可，避免影響展會整體氛圍。</li>
              <li>嚴禁從事與參展申請內容不符或違反公共秩序、善良風俗之行為。</li>
              <li>展位裝置及活動若違規造成任何損害，品牌方須負全額賠償責任。</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              環境維護義務規範 (備忘錄第六條)
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>保持展位及其周邊環境整潔，不得任意丟棄垃圾、包材、飲食廢棄物或其他雜物。</li>
              <li>不得於非指定區域堆放物品、空箱、工具、包裝材料或私人用品。</li>
              <li>展期結束前，應自行清理展位內之所有物品、垃圾及廢棄物，不得遺留於現場。</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'rule_liability' as const,
      title: '三、品牌責任、審核與展務管理權責 Brand Responsibility & Administration',
      summary: '定義大會付費對價範圍、一般通案展務管理界限，以及品牌審核權、智慧財產權等保障。',
      content: (
        <div className="space-y-4 text-[#DFBA87] text-xs font-light leading-relaxed">
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              品牌安全與損害責任
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-neutral-400">
              <li>參展單位商品、物品保管與安全由參展品牌自行負責；若遺失或損壞，大會不負賠償責任。</li>
              <li>因參展品牌自身行為或違規所造成之任何損害（包括對場地、他人展位或觀眾），須由該品牌全權負責，並承擔修復或賠償費用。</li>
              <li>若因違反規範導致大會形象受損或遭第三方追究責任時，相關額外成本與損害概由品牌自行負責。</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              合約對價與一般展務界限 (備忘錄第二、三條)
            </h4>
            <p className="text-neutral-400 mb-2">
              品牌方支付之所有對價僅限包含：(1) 雙方協議之展位規格、(2) 參展三日 (2027/1/7~9)、(3) 場佈一日 (2027/1/6 09:00-17:00)、(4) 貴賓卡 20-40 張、(5) 展商工作證 4 張。
            </p>
            <p className="text-neutral-400">
              除上述五項之外，大會所提供之展務管理（如動線維護、公關新聞稿發送、行政協助等）為通案性管理，大會得依現場營運情況調整，不屬付費對價，品牌方不得據此要求賠償。
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'rule_exit' as const,
      title: '四、違規處置與合約效力 Demobilization & Termination Rules',
      summary: '規範大會對吵鬧、超界佈置、未授權活動之處置，重大違規之即時撤展終止條款，以及不得單方終止合約條款。',
      content: (
        <div className="space-y-4 text-neutral-300 text-xs font-light leading-relaxed">
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              違規行為之類型與處置 (備忘錄第八條)
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-neutral-400">
              <li><span className="text-white">噪音喧嘩：</span>禁止高聲喧嘩、未經核准使用擴音設備或播放音樂音量過大。</li>
              <li><span className="text-white">展位超界與動線安全：</span>超出劃定範圍陳列、阻擋消防通道或緊急出口。</li>
              <li><span className="text-white">活動違規：</span>未經事前書面核准擅自舉辦講座、表演、直播或商業攝影。</li>
              <li>
                <strong className="text-rose-400 font-medium">重大違規即時處理：</strong>
                經警告後仍持續或重複違規、破壞古蹟場地、對大會形象或VIP體驗造成重大損害、或涉及假貨侵權者，大會得<strong className="text-white">不經催告立即終止合約，要求撤展</strong>，已繳費用概不退還。
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              乙方不得單方終止合約 (備忘錄第十條)
            </h4>
            <p className="text-neutral-400 mb-2">
              自本合約成立日起，品牌方<strong className="text-white">不得以任何理由單方終止、解除、撤銷或拒絕履行</strong>本合約。未達預期銷售成果、未獲額外宣傳資源、內部營運決策變動或市場變化等均不得作為解約理由。
            </p>
            <p className="text-neutral-400">
              拒絕進場、未完成設置或提前撤離均視為重大違約，大會將沒收全額費用，並得向品牌方請求包含行政、場地、招商損失及商譽損害在內之一切損害賠償。
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'rule_ip' as const,
      title: '五、合作保密、支持裁量與法律管轄 Confidentiality, Support & Jurisdiction',
      summary: '保護大會商業機密與價格條件、定義大會支持資源裁量權，以及約定準據法與管轄法院。',
      content: (
        <div className="space-y-4 text-neutral-300 text-xs font-light leading-relaxed">
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              合作資訊保密條款 (備忘錄第七條)
            </h4>
            <ul className="list-disc pl-5 space-y-1.5 text-neutral-400">
              <li>
                <strong className="text-white">保密範圍：</strong>
                本合約所載之展費金額、條件、折扣、大會內部招商策略、品牌分級、資源配置、VIP導入與媒體安排等任何未公開資訊，品牌方負有嚴格保密義務。
              </li>
              <li>
                <strong className="text-white">禁止行為：</strong>
                禁止向其他參展品牌、第三人揭露價格或合作條件，或於公開/半公開場合比較散布價格政策。
              </li>
              <li>
                <strong className="text-rose-400 font-medium">違約後果：</strong>
                違反保密義務者，大會得不經催告立即終止合約、沒收費用，並請求因此所生之一切損害賠償。保密義務自合約成立日起生效，且於<strong className="text-white">合約終止後持續有效三年</strong>。
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              大會支持資源之裁量權 (備忘錄第九條)
            </h4>
            <p className="text-neutral-400">
              大會對於是否提供額外支持資源（宣傳曝光、媒體引導、VIP參觀等）享有最高裁量權，該支持屬自願性善意行為。大會對個別展商之支持得有所不同，品牌方不得以「差別待遇」要求退費或補償。
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              準據法與管轄法院 (備忘錄第十一條)
            </h4>
            <p className="text-neutral-400">
              本合約之成立、效力、解釋、履行及權利義務關係均以<strong className="text-white">中華民國法律</strong>為準據法。因合約所生爭議應先本於誠信原則協商，協商不成時，雙方同意以<strong className="text-[#DFBA87]">臺灣臺北地方法院</strong>為第一審合意管轄法院。
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'rule_return_inspection' as const,
      title: '六、展位點交與損害賠償規範 Return & Damage Compensation Regulations',
      summary: '規範展會結束後標準展台與硬體設備之點交、恢復原狀要求，以及受污損破壞時之損害賠償與保證金扣抵機制。',
      content: (
        <div className="space-y-4 text-neutral-300 text-xs font-light leading-relaxed">
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              展位點交與無損歸還
            </h4>
            <p className="text-neutral-400">
              大會所提供之標準展台、展架、照明設備及附屬硬體，均屬於完整場復之規範範圍。展會結束後，參展單位必須於大會明訂之撤場時限內，將展位及所有大會提供之硬體設施清潔、無損並「恢復原狀」，交由大會營運團隊進行現場點交。
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-1.5 flex items-center gap-1">
              <span className="w-1.5 h-3.5 bg-[#DFBA87] rounded-full inline-block"></span>
              損害賠償與保證金扣抵
            </h4>
            <p className="text-neutral-400">
              若經撤場點交確認，大會提供之展台或硬體設備有受污、破損、擅自變更結構、遺失，或因未妥善防護導致古蹟場域受損之情事，主辦單位有權要求參展單位「照價賠償」或全額支付修繕整新費用。該筆賠償款項將逕自參展保證金中扣抵；若保證金餘額不足以支付實際損害賠償總額，主辦單位將另行開立請款單據追償差額，參展單位絕無異議。
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans text-white pb-12">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1c1917] to-[#0c0a09] border border-white/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A96E]/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A96E]/10 border border-[#C9A96E]/20 text-xs text-[#DFBA87] uppercase tracking-wider font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" /> 2027 VIS Lifestyle and Art Festival
            </div>
            <h1 className="text-2xl md:text-3xl font-serif text-white tracking-wide">
              模組 B — 參展規範備忘錄暨行為守則簽署
            </h1>
            <p className="text-xs text-neutral-400 max-w-xl font-light leading-relaxed">
              為維護國家二級古蹟安全、整體展會美學品質及保障各參展品牌權益，請詳細閱讀參展備忘錄規範，並於下方完成線上法人或授權代表簽章。
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-3">
            <div className="text-right hidden md:block">
              <span className="block text-[10px] text-neutral-500 uppercase tracking-widest font-mono">Current Status</span>
              <span className={`text-xs font-semibold ${signedData ? 'text-emerald-400' : 'text-amber-400'}`}>
                {signedData ? '● 已簽署 Completed' : '○ 待簽署 Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {signedData ? (
        /* Signed Locked State Card */
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-emerald-500/[0.03] border border-emerald-500/25 rounded-2xl p-6 md:p-8 space-y-6"
        >
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
          
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-medium text-white tracking-wide">
                {signedData.physical_contract_url ? '實體備忘錄合約用印檔案已提交' : '大會參展規範備忘錄簽署完成'}
              </h2>
              <p className="text-xs text-neutral-400 font-light max-w-xl leading-relaxed">
                貴品牌已成功簽署參展備忘錄。此線上合約具有正式之法律拘束力。如有任何疑問，請透過大會官方群組與您的專屬展商專員聯絡。
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 bg-white/[0.02] border border-white/5 rounded-xl p-5 text-xs font-mono">
            <div>
              <span className="text-neutral-500 block text-[9px] uppercase tracking-wider mb-1">簽署品牌 Brand Name</span>
              <span className="text-white font-medium">{brand?.brand_name_zh} ({brand?.brand_name_en})</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[9px] uppercase tracking-wider mb-1">
                {signedData.physical_contract_url ? '合約類型 / 下載' : '授權簽署人 Signatory'}
              </span>
              <span className="text-white font-medium flex items-center gap-1.5">
                {signedData.physical_contract_url ? (
                  <a href={signedData.physical_contract_url} target="_blank" rel="noopener noreferrer" className="text-[#DFBA87] hover:underline flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" /> 實體用印合約檔案
                  </a>
                ) : (
                  <>
                    <Signature className="w-3.5 h-3.5 text-[#DFBA87] inline" /> {signedData.signed_name}
                  </>
                )}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[9px] uppercase tracking-wider mb-1">簽署時間 Timestamp</span>
              <span className="text-[#DFBA87] font-medium">
                {new Date(signedData.signed_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} (CST)
              </span>
            </div>

            {!signedData.physical_contract_url && (
              <>
                <div>
                  <span className="text-neutral-500 block text-[9px] uppercase tracking-wider mb-1">身分證字號 ID Number</span>
                  <span className="text-white font-medium">
                    {signedData.signer_id_number 
                      ? `${signedData.signer_id_number.slice(0, 3)}*****${signedData.signer_id_number.slice(-2)}` 
                      : '未填寫'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[9px] uppercase tracking-wider mb-1">簽署人身分 Status</span>
                  <span className="text-white font-medium">
                    {signedData.is_legal_representative ? '✓ 法定代理人 / 充分授權代表' : '一般代表'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[9px] uppercase tracking-wider mb-1">特別條款簽署 Special Clauses</span>
                  <span className="text-emerald-400 font-medium">✓ 已同意重大條款 (A, B & C)</span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      ) : (
        /* Unsigned Signature Form */
        <div className="space-y-6">
          
          {/* Quick Action bar to Agree all */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-[#DFBA87]" />
              <span className="text-xs text-neutral-300 font-light">為了方便您快速閱讀與確認，您可以展開各段落查閱，或一鍵勾選六項基本規範。</span>
            </div>
            <button
              type="button"
              onClick={handleAgreeAll}
              className="px-4 py-1.5 rounded bg-white/5 border border-white/10 text-white text-xs hover:bg-[#C9A96E]/20 hover:border-[#C9A96E]/30 transition-all cursor-pointer font-medium uppercase tracking-wider"
            >
              一鍵勾選基本條款 Agree Basics
            </button>
          </div>

          {/* Standard five clauses */}
          <div className="space-y-4">
            {sections.map((sec) => {
              const isExpanded = expandedSections[sec.id];
              const isChecked = rules[sec.id];
              return (
                <div 
                  key={sec.id}
                  className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                    isChecked 
                      ? 'bg-white/[0.03] border-[#C9A96E]/25 shadow-lg shadow-black/10' 
                      : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                  }`}
                >
                  {/* Header */}
                  <div 
                    onClick={() => toggleExpand(sec.id)}
                    className="flex items-center justify-between p-4 md:p-5 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4 flex-1 pr-4">
                      {/* Checkbox Container */}
                      <div 
                        onClick={(e) => handleCheckboxChange(sec.id, e)}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all flex-shrink-0 ${
                          isChecked 
                            ? 'bg-[#C9A96E] border-[#C9A96E] text-white' 
                            : 'border-white/20 hover:border-[#C9A96E]/50'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className={`text-xs md:text-sm font-medium tracking-wide transition-colors ${isChecked ? 'text-[#DFBA87]' : 'text-neutral-200'}`}>
                          {sec.title}
                        </h3>
                        <p className="text-[11px] text-neutral-500 font-light truncate max-w-[280px] sm:max-w-xl md:max-w-2xl">
                          {sec.summary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded ${isChecked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-neutral-800 text-neutral-400'}`}>
                        {isChecked ? 'Accepted' : 'Unchecked'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Body Content */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-1 border-t border-white/5 bg-black/[0.15]">
                          {sec.content}
                          
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={(e) => handleCheckboxChange(sec.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-medium tracking-wider uppercase transition-all cursor-pointer ${
                                isChecked 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-white/5 text-white hover:bg-[#C9A96E]/20 hover:text-[#DFBA87] border border-white/10 hover:border-[#C9A96E]/30'
                              }`}
                            >
                              {isChecked ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> 已確認此項目 Agreed
                                </>
                              ) : (
                                <>
                                  確認同意此項 Agree Section
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Special Clauses block - Scroll required */}
          <div className="bg-[#110f0e] border border-rose-500/15 rounded-xl p-5 md:p-6 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/[0.02] rounded-full blur-2xl"></div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-semibold tracking-wider text-rose-400 uppercase flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-rose-400" /> 法律重大特別條款 (強制滾動至底部解鎖)
              </h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed font-light">
                依法律實務與風險合規性，以下兩項條款涉及重大權益。請分別將文字方塊滾動至最底部，以解鎖個別複選框。
              </p>
            </div>
            
            {/* Special Clause A: Deposit forfeiture */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-200">特別條款 A：保證金沒收機制 Deposit Forfeiture Mechanism</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${scrolledDeposit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-neutral-800 text-neutral-400'}`}>
                  {scrolledDeposit ? '✓ 已解鎖 Unlocked' : '請向下滾動閱讀至底部'}
                </span>
              </div>
              <div 
                ref={depositRef}
                onScroll={(e) => handleScroll('deposit', e)}
                className="max-h-36 overflow-y-auto bg-black/40 border border-white/5 rounded-lg p-3.5 text-xs text-neutral-400 font-light leading-relaxed space-y-2 custom-scrollbar"
              >
                <p className="text-[#DFBA87] font-semibold">重要提示：本條款攸關您的保證金權益，請務必詳閱。</p>
                <p>1. <strong>錄取放棄沒收：</strong>參展品牌於大會公告入選錄取名單後，若因品牌方自身因素放棄參展資格、要求退出，或未於大會規定的期限內完成後續簽約與付費手續者，視同違約，主辦單位將全額沒收保證金新台幣 20,000 元整，不予退還。</p>
                <p>2. <strong>撤展違規與未復原沒收：</strong>大會活動結束撤展時，品牌方需將展位空間回復至使用前原狀（無污損、殘膠、垃圾、廢棄包材）。若經大會檢查發現遺留垃圾、包材廢棄物，或牆面、地面留有殘膠、污漬、破壞等未完成復原之情形，大會得不經催告，直接沒收全額保證金新台幣 20,000 元整。若保證金金額不足以支應實際清潔或古蹟修復費用，品牌方仍應就不足部分負完全損害賠償責任。</p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div 
                  onClick={() => {
                    if (scrolledDeposit) {
                      setSpecialDeposit(!specialDeposit);
                    }
                  }}
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    !scrolledDeposit ? 'bg-neutral-800 border-neutral-700 cursor-not-allowed text-neutral-600' :
                    specialDeposit ? 'bg-rose-500/80 border-rose-500 text-white cursor-pointer' : 'border-white/20 hover:border-rose-500/50 cursor-pointer'
                  }`}
                >
                  {specialDeposit && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                </div>
                <label className={`text-xs select-none ${!scrolledDeposit ? 'text-neutral-500 cursor-not-allowed' : 'text-neutral-300 cursor-pointer'}`}>
                  本人已詳閱並同意「特別條款 A：保證金沒收機制」 *
                </label>
              </div>
            </div>

            {/* Special Clause B: Historic site damage */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-200">特別條款 B：古蹟場地毀損賠償 Historical Site Damage Compensation</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${scrolledDamage ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-neutral-800 text-neutral-400'}`}>
                  {scrolledDamage ? '✓ 已解鎖 Unlocked' : '請向下滾動閱讀至底部'}
                </span>
              </div>
              <div 
                ref={damageRef}
                onScroll={(e) => handleScroll('damage', e)}
                className="max-h-36 overflow-y-auto bg-black/40 border border-white/5 rounded-lg p-3.5 text-xs text-neutral-400 font-light leading-relaxed space-y-2 custom-scrollbar"
              >
                <p className="text-[#DFBA87] font-semibold">重要提示：本展會於歷史古蹟園區舉辦，場地保護責任極為嚴苛。</p>
                <p>1. <strong>古蹟禁止釘掛：</strong>由於本屆大展之展場（松山文創園區）屬國家級古蹟歷史場地，禁止於古蹟本體牆面、樑柱、地面、窗框進行任何釘掛、鑽孔、噴漆、油漆或破壞性黏貼。若需加掛燈具或佈置線材，僅能使用既有掛點與大會指定之防護材料。</p>
                <p>2. <strong>毀損修復與法律責任：</strong>若品牌方或其委託之搭設廠商在裝修、展出、撤展期間，因任何行為造成古蹟本體、場地歷史建構物或設施損害，品牌方須無條件負擔全額專業古蹟修復、清理及大會因此遭受之損害賠償費用，並承擔相關文化資產保護法之法律責任。</p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div 
                  onClick={() => {
                    if (scrolledDamage) {
                      setSpecialDamage(!specialDamage);
                    }
                  }}
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    !scrolledDamage ? 'bg-neutral-800 border-neutral-700 cursor-not-allowed text-neutral-600' :
                    specialDamage ? 'bg-rose-500/80 border-rose-500 text-white cursor-pointer' : 'border-white/20 hover:border-rose-500/50 cursor-pointer'
                  }`}
                >
                  {specialDamage && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                </div>
                <label className={`text-xs select-none ${!scrolledDamage ? 'text-neutral-500 cursor-not-allowed' : 'text-neutral-300 cursor-pointer'}`}>
                  本人已詳閱並同意「特別條款 B：古蹟場地毀損賠償」 *
                </label>
              </div>
            </div>

            {/* Special Clause C: Refund and cancellation policy */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-neutral-200">特別條款 C：參展費退費與展位取消規範 Refund & Cancellation Policy</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${scrolledRefund ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-neutral-800 text-neutral-400'}`}>
                  {scrolledRefund ? '✓ 已解鎖 Unlocked' : '請向下滾動閱讀至底部'}
                </span>
              </div>
              <div 
                ref={refundRef}
                onScroll={(e) => handleScroll('refund', e)}
                className="max-h-36 overflow-y-auto bg-black/40 border border-white/5 rounded-lg p-3.5 text-xs text-neutral-400 font-light leading-relaxed space-y-3 custom-scrollbar"
              >
                <p className="text-[#DFBA87] font-semibold">重要提示：本條款涉及參展費退費比例與展位取消規範，請務必詳閱。</p>
                <div>
                  <p className="font-semibold text-white">一、 退出通知之法定要件</p>
                  <p className="pl-3">參展單位若因故主動要求退出本展會，必須以「書面形式（限雙方確認收訖之電子郵件或實體存證信函）」正式通知主辦單位。退款手續與級距之計算基準，概以主辦單位實際接收該書面通知之日期為準，未經雙方明文確認之口頭或通訊軟體告知皆不具效力。</p>
                </div>
                <div>
                  <p className="font-semibold text-white">二、 參展費退費級距與損害賠償預定</p>
                  <p className="pl-3">考量大會整體策展品質、二級古蹟場域之特殊規範及行銷資源之排他性，參展費退費標準依據退出時間點計算如下：</p>
                  <ul className="list-disc pl-8 space-y-1 mt-1 text-neutral-300">
                    <li>於正式開展日 120 天（含）前提出者： 退還已繳納參展費之 70%。</li>
                    <li>於正式開展日 89 天至 60 天前提出者： 退還已繳納參展費之 30%。</li>
                    <li>於正式開展日 59 天內（含）提出者： 鑒於展會之整體行銷公關宣傳、場地硬體規劃、公共安全安檢申報及行政管理資源均已全數投入。為彌補主辦單位之沉沒成本與營運損害，所繳交之參展費全數不予退還，轉作懲罰性違約金與損害賠償預定額。</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-white">三、 展位重分配與權益保全</p>
                  <p className="pl-3">若參展單位確認退出或因違規遭取消資格，主辦單位即刻收回該展位之使用權，並絕對保留該空間之重新分配、變更用途或遞補招商之權利。原參展單位不得對該展位之後續使用方式提出任何異議，亦不得以主辦單位已將展位另行轉售為由，主張扣抵或要求返還違約金。</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div 
                  onClick={() => {
                    if (scrolledRefund) {
                      setSpecialRefund(!specialRefund);
                    }
                  }}
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    !scrolledRefund ? 'bg-neutral-800 border-neutral-700 cursor-not-allowed text-neutral-600' :
                    specialRefund ? 'bg-rose-500/80 border-rose-500 text-white cursor-pointer' : 'border-white/20 hover:border-rose-500/50 cursor-pointer'
                  }`}
                >
                  {specialRefund && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                </div>
                <label className={`text-xs select-none ${!scrolledRefund ? 'text-neutral-500 cursor-not-allowed' : 'text-neutral-300 cursor-pointer'}`}>
                  本人已詳閱並同意「特別條款 C：參展費退費與展位取消規範」 *
                </label>
              </div>
            </div>

          </div>

          {/* Combined Memorandum Signature Section */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-[#110f0e] border border-white/5 rounded-xl p-6 md:p-8 space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C9A96E]"></div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-semibold tracking-wider text-[#DFBA87] uppercase flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5" /> 2027 VIS Lifestyle and Art Festival 參展規範備忘錄立約人
                </h3>
                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                  本備忘錄由以下立約雙方共同遵守。簽署人填寫法定姓名與身分證字號並點擊送出，即代表品牌法人完成本電子合約備忘錄之正式簽字。
                </p>
              </div>

              {/* Contracting Parties dynamic preview */}
              <div className="grid md:grid-cols-2 gap-4 bg-white/[0.02] border border-white/5 rounded-lg p-4 text-xs">
                <div className="space-y-1">
                  <span className="text-neutral-500 block text-[9px] uppercase tracking-wider">甲方 (主辦單位) Party A</span>
                  <span className="text-white font-medium">2027 VIS Lifestyle and Art Festival 主辦單位</span>
                </div>
                <div className="space-y-1">
                  <span className="text-neutral-500 block text-[9px] uppercase tracking-wider">乙方 (參展品牌) Party B</span>
                  <span className="text-white font-medium text-amber-200">
                    {brand?.brand_name_zh ? `${brand.brand_name_zh} (${brand.brand_name_en || ''})` : '_______________________________'}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-lg font-mono">
                  <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Physical Contract Alternative Section */}
              <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-xl p-4 md:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-[#DFBA87]" /> 實體用印合約替代方案 (非必要)
                    </h4>
                    <p className="text-[10px] text-neutral-400 leading-normal">
                      若您不便使用線上電子簽章，可下載實體備忘錄，蓋公司大小章與簽署後，上傳掃描檔（PDF或圖片）存查。
                    </p>
                  </div>
                  <a 
                    href="https://drive.google.com/file/d/13VpAISbn3EvBSyBgNowZ3WYwWh4YwKA1/view?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] text-[#DFBA87] hover:text-white border border-[#C9A96E]/30 hover:border-[#C9A96E] rounded px-3 py-1.5 bg-[#C9A96E]/5 hover:bg-[#C9A96E]/20 transition-all font-medium whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" /> 下載完整合約
                  </a>
                </div>

                {physicalContractUrl ? (
                  <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Check className="w-4 h-4 stroke-[3px]" />
                      <span>已成功上傳實體用印掃描檔</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <a href={physicalContractUrl} target="_blank" rel="noopener noreferrer" className="text-[#DFBA87] hover:underline">
                        [ 預覽已上傳檔案 ]
                      </a>
                      <button 
                        type="button" 
                        onClick={() => setPhysicalContractUrl('')}
                        className="text-neutral-500 hover:text-rose-400"
                      >
                        清除重新上傳
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative border border-dashed border-white/10 hover:border-[#C9A96E]/30 rounded-lg p-5 transition-colors bg-black/20 flex flex-col items-center justify-center text-center">
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={handlePhysicalContractUpload}
                      disabled={uploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    {uploading ? (
                      <div className="flex flex-col items-center gap-1.5 text-xs text-neutral-400">
                        <Loader2 className="w-6 h-6 animate-spin text-[#DFBA87]" />
                        <span>檔案上傳中...</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-6 h-6 text-[#C9A96E]/70 mx-auto mb-1" />
                        <p className="text-xs text-neutral-300">拖曳實體合約用印掃描檔至此，或點擊選擇檔案</p>
                        <p className="text-[10px] text-neutral-500">支援 PDF、JPG、PNG，限制檔案大小在 2MB 以內</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Online Signature inputs (Disabled if physical contract is uploaded) */}
              <div className={`space-y-5 transition-opacity ${physicalContractUrl ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold tracking-widest text-neutral-400 uppercase">
                      授權簽署人法定姓名 SIGNER FULL NAME *
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={signedName}
                        onChange={(e) => setSignedName(e.target.value)}
                        placeholder={physicalContractUrl ? "（使用實體合約，免填此欄）" : "請輸入法定代表人或授權簽署人姓名"}
                        className="w-full text-xs border border-white/10 focus:border-[#C9A96E] bg-white/5 rounded-lg pl-10 pr-4 py-3 outline-none text-white transition-colors"
                        disabled={!!physicalContractUrl}
                        required={!physicalContractUrl}
                      />
                      <Signature className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold tracking-widest text-neutral-400 uppercase">
                      簽署人身分證字號 SIGNER NATIONAL ID *
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={signerIdNumber}
                        onChange={(e) => setSignerIdNumber(e.target.value)}
                        placeholder={physicalContractUrl ? "（使用實體合約，免填此欄）" : "請輸入身分證字號 (僅供合約核實使用)"}
                        className="w-full text-xs border border-white/10 focus:border-[#C9A96E] bg-white/5 rounded-lg pl-10 pr-4 py-3 outline-none text-white transition-colors font-mono"
                        disabled={!!physicalContractUrl}
                        required={!physicalContractUrl}
                      />
                      <FileText className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div 
                    onClick={() => {
                      if (!physicalContractUrl) {
                        setIsLegalRepresentative(!isLegalRepresentative);
                      }
                    }}
                    className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                      isLegalRepresentative ? 'bg-[#C9A96E] border-[#C9A96E] text-white cursor-pointer' : 'border-white/20 hover:border-[#C9A96E]/50 cursor-pointer'
                    }`}
                  >
                    {isLegalRepresentative && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                  </div>
                  <label className="text-xs text-neutral-300 cursor-pointer select-none leading-normal">
                    本人確認為參展品牌之法定代理人，或已取得法定代理人之充分授權，有權代表本公司簽署此備忘錄。 *
                  </label>
                </div>
              </div>

              {/* General Consent (Always enabled, because they still submit the form) */}
              <div className="flex items-start gap-3 border-t border-white/5 pt-4">
                <div 
                  onClick={() => {
                    setPrivacyConsent(!privacyConsent);
                  }}
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    privacyConsent ? 'bg-[#C9A96E] border-[#C9A96E] text-white cursor-pointer' : 'border-white/20 hover:border-[#C9A96E]/50 cursor-pointer'
                  }`}
                >
                  {privacyConsent && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                </div>
                <div className="text-xs text-neutral-400 select-none leading-normal">
                  本人確認並同意 <strong className="text-neutral-300">《隱私權政策與個資蒐集聲明》</strong>。主辦單位承諾：本表單所蒐集之身分證字號與用印合約檔案，僅供本屆大展締約、法務備查與身分核實使用，並將採用完善的加密存儲措施保護，本展會結束後 60 日內將對此類機敏性資料進行去識別化或全數刪除。 *
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || (!physicalContractUrl && (!allChecked || !specialDeposit || !specialDamage || !specialRefund || signedName.trim() === '' || signerIdNumber.trim() === '' || !isLegalRepresentative)) || !privacyConsent}
                  className="w-full bg-[#C9A96E] hover:bg-[#B39359] disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3 rounded-lg text-xs font-semibold tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed hover:shadow-lg hover:shadow-[#C9A96E]/10"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      合約送出中 Submitting...
                    </>
                  ) : (
                    <>
                      確認並提交備忘錄簽署 COMMIT SIGNATURE
                    </>
                  )}
                </button>
              </div>

              <div className="flex gap-2 text-[10px] leading-relaxed text-neutral-500 font-light border-t border-white/5 pt-4">
                <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#DFBA87] mt-0.5" />
                <p>
                  當您點擊送出時，系統將依法記錄您的使用者帳號、IP 位址與精確時間戳記，以確保本電子合約之合法性與不可否認性。
                </p>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
