'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { FileCheck, ShieldCheck, Signature, CheckSquare, Loader2, Info } from 'lucide-react';

export default function ExhibitorCompliancePage({ brand: parentBrand }: { brand?: any }) {
  const [brand, setBrand] = useState<any>(parentBrand || null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signedData, setSignedData] = useState<any>(null);

  // Form states
  const [rules, setRules] = useState({
    rule_booth: false,
    rule_conduct: false,
    rule_liability: false,
    rule_exit: false,
    rule_ip: false,
  });
  const [signedName, setSignedName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadCompliance = async () => {
      setLoading(true);
      try {
        let currentBrand = parentBrand;
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

          const { data: compliance } = await supabase
            .from('exhibitor_compliance')
            .select('*')
            .eq('brand_id', currentBrand.id)
            .maybeSingle();
          
          if (compliance) {
            setSignedData(compliance);
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

  const handleCheckboxChange = (name: keyof typeof rules) => {
    if (signedData) return; // read-only if signed
    setRules(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const allChecked = Object.values(rules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || signedData) return;

    if (!allChecked) {
      setErrorMessage('請勾選並同意所有參展規範條款。');
      return;
    }

    if (signedName.trim() === '') {
      setErrorMessage('請填寫簽署人法定姓名。');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('exhibitor_compliance')
        .insert({
          brand_id: brand.id,
          rule_booth: rules.rule_booth,
          rule_conduct: rules.rule_conduct,
          rule_liability: rules.rule_liability,
          rule_exit: rules.rule_exit,
          rule_ip: rules.rule_ip,
          signed_name: signedName.trim(),
          signed_at: new Date().toISOString(),
        })
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
      title: '一、展位裝修與佈置規範 Stall Setup & Fire Safety',
      content: '需依大會審核通過之設計規劃進行攤位裝修與陳列，不得擅自變更展位結構或超出租賃紅線邊界。展位搭建材料需符合國家二級古蹟之防火與消防法規，電力負載配置需配合場館限制，且嚴禁擺放任何易燃、易爆或有損古蹟建築之物品。'
    },
    {
      id: 'rule_conduct' as const,
      title: '二、現場行為與推廣守則 On-site Conduct & Promotion',
      content: '展位代表應穿著得體，展期內需派員駐守展位。現場展品促銷、大分貝宣傳及媒體公關派對活動需事先向大會執行委員會申報備查。嚴禁現場發生任何有違公共秩序、善良風俗或與參展申請書「核心概念」不符之不當推銷行為。'
    },
    {
      id: 'rule_liability' as const,
      title: '三、展品保管與損害賠償 Liability & Insurance',
      content: '參展商對其展品、展示道具及現場商品負有完全之安全保管義務，大會雖備有展館保安，但不承擔任何展品失竊或毀損之責任。若因品牌方施工不當或人員疏忽造成場館古蹟結構、他人展位或觀眾生命財產損害者，品牌方需承擔全額法律責任與損害賠償。'
    },
    {
      id: 'rule_exit' as const,
      title: '四、撤場清運與還原義務 Stall Demobilization',
      content: '品牌方須於大會規定之拆展撤場時段內，將所有展品及廢棄搭建材料清除完畢，並將使用空間還原至進場前狀態。展位宣傳所使用之商標、影像、文字及現場銷售之原創商品，須保證具備合法授權或完整智慧財產權，若有侵權，需承擔全部法律責任。'
    },
    {
      id: 'rule_ip' as const,
      title: '五、合約效力與補充條約 General Terms & Supplementary Contracts',
      content: '本線上參展規範同意書為正式參展合約之不可分割附件，具備同等合約法律效力。大會將在展前說明會召開後，於本品牌協作平台線上發布 2027 年正式參展商電子合約，品牌方承諾需在進場施工日前完成該電子合約之簽署。'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans-outfit">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-serif-garamond text-white tracking-wider flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-[#DFBA87]" />
          模組 B — 展位規範與行為守則簽署
        </h1>
        <p className="text-xs text-neutral-400 font-light mt-1">
          為維護國家二級古蹟安全與頂級參展氛圍，請詳細閱讀以下參展守則，並於線上完成法人/代表簽字。
        </p>
      </div>

      {signedData ? (
        /* Signed Locked State Card */
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-serif-garamond text-white tracking-wider">大會參展規範簽署完成</h2>
            <p className="text-xs text-neutral-400 font-light mt-2 max-w-md mx-auto">
              貴品牌已完成線上規範簽署。此記錄已具有正式附件之合約法律效力，大會將於後續正式合約發布時另行通知。
            </p>
          </div>
          <div className="bg-white/5 border border-white/5 rounded p-4 max-w-sm mx-auto text-xs font-mono text-left space-y-2">
            <div>
              <span className="text-neutral-500 block text-[9px] uppercase font-sans">簽署品牌 Brand Name</span>
              <span className="text-white">{brand.brand_name_zh}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[9px] uppercase font-sans">簽署人授權代表 Signee Name</span>
              <span className="text-white">{signedData.signed_name}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[9px] uppercase font-sans">簽署時間 Timestamp</span>
              <span className="text-[#DFBA87]">{new Date(signedData.signed_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} (CST)</span>
            </div>
          </div>
        </div>
      ) : (
        /* Unsigned Signature Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Rules List */}
          <div className="space-y-4">
            {sections.map((sec) => (
              <div 
                key={sec.id}
                onClick={() => handleCheckboxChange(sec.id)}
                className={`border rounded-lg p-5 cursor-pointer transition-all ${
                  rules[sec.id] 
                    ? 'bg-white/5 border-[#C9A96E]/30' 
                    : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex gap-4">
                  <div className="mt-1">
                    <input 
                      type="checkbox"
                      checked={rules[sec.id]}
                      onChange={() => {}} // handled by div click
                      className="w-4 h-4 rounded border-white/20 text-[#C9A96E] focus:ring-0 cursor-pointer accent-[#C9A96E]"
                    />
                  </div>
                  <div>
                    <h3 className={`text-xs font-semibold tracking-wider transition-colors ${rules[sec.id] ? 'text-[#DFBA87]' : 'text-neutral-300'}`}>
                      {sec.title}
                    </h3>
                    <p className="text-xs text-neutral-400 font-light leading-relaxed mt-2 whitespace-pre-line">
                      {sec.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Signature and Submit Button */}
          <div className="bg-[#111111] border border-white/5 rounded-lg p-6 space-y-4">
            <h3 className="text-xs font-semibold tracking-widest text-[#DFBA87] uppercase flex items-center gap-1.5">
              <Signature className="w-4 h-4" /> 參展授權代表數位簽章
            </h3>

            {errorMessage && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded font-mono">{errorMessage}</p>
            )}

            <div className="grid md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-semibold tracking-widest text-neutral-400 uppercase mb-2">
                  簽署人法定姓名 SIGNER FULL NAME *
                </label>
                <input 
                  type="text" 
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  placeholder="請輸入繁體中文或英文法定姓名"
                  className="w-full text-xs border border-white/10 focus:border-[#C9A96E] bg-white/5 rounded px-4 py-2.5 outline-none text-white transition-colors"
                  required
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={!allChecked || signedName.trim() === '' || submitting}
                  className="w-full bg-[#C9A96E] hover:bg-[#B39359] disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-2.5 rounded text-xs font-semibold tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      提交簽章中...
                    </>
                  ) : (
                    <>
                      確認並提交規範簽署 COMMIT SIGNATURE
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex gap-2 text-[10px] leading-relaxed text-neutral-500 font-light border-t border-white/5 pt-4">
              <Info className="w-3.5 h-3.5 flex-shrink-0 text-[#DFBA87]" />
              <p>
                本系統由大會「數位白手套」信託協作。提交電子簽章後，系統將記錄您的 IP 與時間戳記，不可任意撤回或編輯。
              </p>
            </div>
          </div>

        </form>
      )}

    </div>
  );
}
