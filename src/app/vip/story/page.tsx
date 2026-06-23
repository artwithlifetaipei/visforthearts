'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';

const ZODIAC_QUOTES: Record<string, { quoteEn: string, quoteZh: string, artist: string, bg: string }> = {
    'Aries': { 
        quoteEn: "Creativity takes courage.", 
        quoteZh: "創意需要勇氣。", 
        artist: "Henri Matisse / 亨利·馬諦斯", 
        bg: "bg-[#4E3639]" 
    },
    'Taurus': { 
        quoteEn: "I found I could say things with color and shapes that I couldn't say any other way.", 
        quoteZh: "我發現，我能用色彩與形狀，表達出我無法用其他方式說出的話語。", 
        artist: "Georgia O'Keeffe / 喬治亞·歐姬芙", 
        bg: "bg-[#3C4A3E]" 
    },
    'Gemini': { 
        quoteEn: "My work is a game, a very serious game.", 
        quoteZh: "我的創作是一個遊戲，一個非常嚴肅的遊戲。", 
        artist: "M.C. Escher / 艾雪", 
        bg: "bg-[#4D4236]" 
    },
    'Cancer': { 
        quoteEn: "I don't paint dreams or nightmares, I paint my own reality.", 
        quoteZh: "我不畫夢境或惡夢，我畫我自己的真實人生。", 
        artist: "Frida Kahlo / 芙烈達·卡蘿", 
        bg: "bg-[#3D454A]" 
    },
    'Leo': { 
        quoteEn: "I don't design clothes. I design dreams.", 
        quoteZh: "我不設計衣服，我設計夢想。", 
        artist: "Ralph Lauren / 拉爾夫·勞倫", 
        bg: "bg-[#4D3A30]" 
    },
    'Virgo': { 
        quoteEn: "Details are not the details. They make the design.", 
        quoteZh: "細節不只是細節，它們造就了設計。", 
        artist: "Charles Eames / 查爾斯·伊姆斯", 
        bg: "bg-[#403E3B]" 
    },
    'Libra': { 
        quoteEn: "I am going to make everything around me beautiful — that will be my life.", 
        quoteZh: "我要讓我身邊的一切事物都變得美麗 —— 那將會是我的一生。", 
        artist: "Elsie de Wolfe / 艾爾西·德·沃夫", 
        bg: "bg-[#4C3B43]" 
    },
    'Scorpio': { 
        quoteEn: "Art is a lie that makes us realize truth.", 
        quoteZh: "藝術是一個謊言，但它讓我們理解真實。", 
        artist: "Pablo Picasso / 巴勃羅·畢卡索", 
        bg: "bg-[#42364D]" 
    },
    'Sagittarius': { 
        quoteEn: "There are 360 degrees, so why stick to one?", 
        quoteZh: "世界有 360 度，何必執著於同一個角度？", 
        artist: "Zaha Hadid / 札哈·哈蒂", 
        bg: "bg-[#363B4D]" 
    },
    'Capricorn': { 
        quoteEn: "I prefer drawing to talking. Drawing is faster, and leaves less room for lies.", 
        quoteZh: "我寧可繪畫也不願多言。繪畫更快，而且留給謊言的空間更少。", 
        artist: "Le Corbusier / 柯比意", 
        bg: "bg-[#353638]" 
    },
    'Aquarius': { 
        quoteEn: "I want to make the beautiful accessible to everyone.", 
        quoteZh: "我想讓美麗的事物能被每個人所觸及。", 
        artist: "Issey Miyake / 三宅一生", 
        bg: "bg-[#334245]" 
    },
    'Pisces': { 
        quoteEn: "It is good to love many things, for therein lies the true strength...", 
        quoteZh: "多去愛許多事物是好的，因為那才是力量的泉源...", 
        artist: "Vincent van Gogh / 文森·梵谷", 
        bg: "bg-[#3A454C]" 
    },
};

function getZodiac(dateStr: string) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return "Aries";
    if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return "Taurus";
    if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return "Gemini";
    if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return "Cancer";
    if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return "Leo";
    if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return "Virgo";
    if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return "Libra";
    if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return "Scorpio";
    if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return "Sagittarius";
    if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) return "Capricorn";
    if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return "Aquarius";
    return "Pisces";
}

export default function ZodiacStoryPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [zodiac, setZodiac] = useState('');
    const storyRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/vip'); return; }
            const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
            
            // Fetch tier from allowlist
            const { data: allowlistData } = await supabase
                .from('vip_allowlist')
                .select('tier')
                .eq('email', user.email)
                .single();
            
            setProfile({ ...data, tier: allowlistData?.tier || 'VIP' });
            if (data?.birthdate) {
                setZodiac(getZodiac(data.birthdate));
            }
        };
        fetchProfile();
    }, [router]);

    const handleDownload = async () => {
        if (!storyRef.current) return;
        setIsGenerating(true);
        
        // Wait a small bit to ensure fonts and styles are fully applied
        await new Promise(r => setTimeout(r, 500));

        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(storyRef.current, {
                scale: 2, // Use 2x for better mobile compatibility while maintaining quality
                useCORS: true,
                allowTaint: true, // Allow tainted canvas for local resources
                backgroundColor: null,
                logging: false,
                width: storyRef.current.offsetWidth,
                height: storyRef.current.offsetHeight,
            });

            // Fallback for some mobile browsers using direct dataURL if Blob fails
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `VIS_Story_${zodiac}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            console.error('Download failed:', err);
            alert('下載失敗，請嘗試使用瀏覽器內建截圖功能保存，或更換瀏覽器重試。');
        } finally {
            setIsGenerating(false);
        }
    };

    if (!profile || !zodiac) return null;

    const data = ZODIAC_QUOTES[zodiac];

    return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col font-sans">
            <header className="py-4 flex justify-between items-center relative z-10">
                <button onClick={() => router.push('/vip/dashboard')} className="text-neutral-500 text-[10px] tracking-widest uppercase">
                    ← Back
                </button>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center gap-8 py-4">
                {/* IG Story Preview (9:16) */}
                <div 
                    ref={storyRef}
                    className={`relative w-[85vw] max-w-[320px] aspect-[9/16] ${data.bg} rounded-xl overflow-hidden p-8 md:p-10 flex flex-col justify-between shadow-2xl transition-all duration-700`}
                >
                    <div className="flex justify-between items-start relative z-20 w-full">
                        <div className="flex flex-col text-left">
                            <span className="text-[7px] tracking-[0.45em] uppercase text-white/40 mb-1.5 leading-none block font-light">
                                Member Tier
                            </span>
                            <div className="inline-flex items-center gap-1.5">
                                <span className="w-3 h-[0.5px] bg-[#DFBA87]/60"></span>
                                <span className="text-[11px] tracking-[0.35em] font-serif uppercase text-[#DFBA87] font-light leading-none letter-spacing-wide">
                                    {profile.tier}
                                </span>
                                <span className="w-3 h-[0.5px] bg-[#DFBA87]/60"></span>
                            </div>
                        </div>
                        <div className="text-[8px] tracking-[0.25em] font-mono text-white/40 font-light mt-0.5">
                            VIS 2027
                        </div>
                    </div>

                    <div className="relative z-20 py-4 flex-1 flex flex-col justify-center text-left">
                        <p className="text-[13px] md:text-[15px] font-serif font-light italic leading-[1.75] tracking-wide text-white/95 mb-3">
                            &ldquo;{data.quoteEn}&rdquo;
                        </p>
                        <p className="text-[11px] md:text-[13px] font-serif font-light leading-[1.9] tracking-wider text-white/75 mb-1">
                            「{data.quoteZh}」
                        </p>
                        <div className="h-px w-8 bg-[#DFBA87]/60 my-4"></div>
                        <p className="text-[8px] tracking-[0.3em] uppercase text-[#DFBA87]/80 font-light leading-relaxed">
                            — {data.artist}
                        </p>
                    </div>

                    <div className="text-center pt-5 border-t border-white/10 relative z-20">
                        <img 
                            src="/vis_logo.png" 
                            className="h-10 mx-auto brightness-0 invert opacity-80"
                            alt="VIS Logo"
                        />
                        <p className="text-[6.5px] tracking-[0.4em] uppercase text-white/30 mt-1.5 font-light">FOR THE ARTS</p>
                    </div>

                    {/* Subtle paper texture overlay */}
                    <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] z-10"></div>
                </div>

                <div className="text-center pt-4">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="px-12 py-4 bg-white text-black text-[10px] tracking-[0.3em] hover:bg-neutral-200 transition-all duration-500 disabled:opacity-50 shadow-xl"
                    >
                        {isGenerating ? '正在生成...' : '歡迎截圖分享至Instagram社群'}
                    </button>
                </div>
            </main>
        </div>
    );
}
