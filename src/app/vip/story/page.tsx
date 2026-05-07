'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';

const ZODIAC_QUOTES: Record<string, { quote: string, artist: string, bg: string }> = {
    'Aries': { quote: "Creativity takes courage.", artist: "Henri Émile Benoît Matisse / 亨利·馬諦斯", bg: "bg-rose-950" },
    'Taurus': { quote: "I found I could say things with color and shapes that I couldn't say any other way.", artist: "Georgia O'Keeffe / 喬治亞·歐姬芙", bg: "bg-emerald-950" },
    'Gemini': { quote: "My work is a game, a very serious game.", artist: "Maurits Cornelis Escher / 莫里茲·柯尼利斯·艾雪", bg: "bg-amber-950" },
    'Cancer': { quote: "I don't paint dreams or nightmares, I paint my own reality.", artist: "Frida Kahlo / 芙烈達·卡蘿", bg: "bg-slate-800" },
    'Leo': { quote: "I don't design clothes. I design dreams.", artist: "Ralph Lauren / 拉爾夫·勞倫", bg: "bg-orange-950" },
    'Virgo': { quote: "Details are not the details. They make the design.", artist: "Charles Eames / 查爾斯·伊姆斯", bg: "bg-stone-800" },
    'Libra': { quote: "I am going to make everything around me beautiful — that will be my life.", artist: "Elsie de Wolfe / 艾爾西·德·沃夫", bg: "bg-pink-950" },
    'Scorpio': { quote: "Art is a lie that makes us realize truth.", artist: "Pablo Ruiz Picasso / 巴勃羅·畢卡索", bg: "bg-purple-950" },
    'Sagittarius': { quote: "There are 360 degrees, so why stick to one?", artist: "Dame Zaha Mohammad Hadid / 札哈·哈蒂", bg: "bg-blue-950" },
    'Capricorn': { quote: "I prefer drawing to talking. Drawing is faster, and leaves less room for lies.", artist: "Le Corbusier (Charles-Édouard Jeanneret) / 勒·柯比意", bg: "bg-neutral-900" },
    'Aquarius': { quote: "I want to make the beautiful accessible to everyone.", artist: "Issey Miyake / 三宅一生", bg: "bg-cyan-950" },
    'Pisces': { quote: "It is good to love many things, for therein lies the true strength...", artist: "Vincent Willem van Gogh / 文森·梵谷", bg: "bg-sky-950" },
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
                    <div className="flex justify-between items-start relative z-10">
                        <div className="text-[10px] tracking-[0.5em] uppercase opacity-70 font-light">
                            VIS / {profile.tier}
                        </div>
                    </div>

                    <div className="relative z-10 py-10">
                        <p className="text-xl md:text-2xl font-light italic leading-relaxed tracking-wide text-white/90">
                            "{data.quote}"
                        </p>
                        <div className="h-px w-12 bg-[#D4AF37] my-6 opacity-60"></div>
                        <p className="text-[10px] tracking-[0.3em] uppercase opacity-60 font-light leading-relaxed">
                            — {data.artist}
                        </p>
                    </div>

                    <div className="text-center pt-8 border-t border-white/10 relative z-10">
                        <img 
                            src="/vis_logo.png" 
                            className="h-7 mx-auto invert opacity-60"
                            alt="VIS Logo"
                        />
                    </div>

                    {/* Subtle background texture */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                </div>

                <div className="text-center pt-4">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="px-12 py-4 bg-white text-black text-[10px] tracking-[0.5em] uppercase hover:bg-neutral-200 transition-all duration-500 disabled:opacity-50 shadow-xl"
                    >
                        {isGenerating ? 'Generating...' : 'Download Story'}
                    </button>
                </div>
            </main>
        </div>
    );
}
