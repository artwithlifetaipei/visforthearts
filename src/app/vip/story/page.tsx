'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';

const ZODIAC_QUOTES: Record<string, { quote: string, artist: string, image: string }> = {
    'Aries': { 
        quote: "Creativity takes courage.", 
        artist: "Henri Émile Benoît Matisse / 亨利·馬諦斯", 
        image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=600&auto=format&fit=crop" 
    },
    'Taurus': { 
        quote: "I found I could say things with color and shapes that I couldn't say any other way.", 
        artist: "Georgia O'Keeffe / 喬治亞·歐姬芙", 
        image: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?q=80&w=600&auto=format&fit=crop" 
    },
    'Gemini': { 
        quote: "My work is a game, a very serious game.", 
        artist: "Maurits Cornelis Escher / 莫里茲·柯尼利斯·艾雪", 
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop" 
    },
    'Cancer': { 
        quote: "I don't paint dreams or nightmares, I paint my own reality.", 
        artist: "Frida Kahlo / 芙烈達·卡蘿", 
        image: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=600&auto=format&fit=crop" 
    },
    'Leo': { 
        quote: "I don't design clothes. I design dreams.", 
        artist: "Ralph Lauren / 拉爾夫·勞倫", 
        image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop" 
    },
    'Virgo': { 
        quote: "Details are not the details. They make the design.", 
        artist: "Charles Eames / 查爾斯·伊姆斯", 
        image: "https://images.unsplash.com/photo-1581428982868-e410dd047a90?q=80&w=600&auto=format&fit=crop" 
    },
    'Libra': { 
        quote: "I am going to make everything around me beautiful — that will be my life.", 
        artist: "Elsie de Wolfe / 艾爾西·德·沃夫", 
        image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=600&auto=format&fit=crop" 
    },
    'Scorpio': { 
        quote: "Art is a lie that makes us realize truth.", 
        artist: "Pablo Ruiz Picasso / 巴勃羅·畢卡索", 
        image: "https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=600&auto=format&fit=crop" 
    },
    'Sagittarius': { 
        quote: "There are 360 degrees, so why stick to one?", 
        artist: "Dame Zaha Mohammad Hadid / 札哈·哈蒂", 
        image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=600&auto=format&fit=crop" 
    },
    'Capricorn': { 
        quote: "I prefer drawing to talking. Drawing is faster, and leaves less room for lies.", 
        artist: "Le Corbusier (Charles-Édouard Jeanneret) / 勒·柯比意", 
        image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=600&auto=format&fit=crop" 
    },
    'Aquarius': { 
        quote: "I want to make the beautiful accessible to everyone.", 
        artist: "Issey Miyake / 三宅一生", 
        image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=600&auto=format&fit=crop" 
    },
    'Pisces': { 
        quote: "It is good to love many things, for therein lies the true strength...", 
        artist: "Vincent Willem van Gogh / 文森·梵谷", 
        image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=600&auto=format&fit=crop" 
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
                    className="relative w-[85vw] max-w-[320px] aspect-[9/16] rounded-xl overflow-hidden p-8 md:p-10 flex flex-col justify-between shadow-2xl transition-all duration-700 bg-black"
                >
                    {/* Full-bleed background image */}
                    <img 
                        src={data.image} 
                        className="absolute inset-0 w-full h-full object-cover z-0" 
                        alt={zodiac}
                    />
                    
                    {/* Glassmorphism gradient overlay for high contrast text readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/85 z-10"></div>

                    <div className="flex justify-between items-start relative z-20 w-full">
                        <div className="text-[10px] tracking-[0.5em] uppercase text-white/80 font-light">
                            VIS / {profile.tier}
                        </div>
                        <div className="text-[10px] tracking-[0.2em] font-mono text-white/80 font-light">
                            2027
                        </div>
                    </div>

                    <div className="relative z-20 py-10">
                        <p className="text-xl md:text-2xl font-light italic leading-relaxed tracking-wide text-white drop-shadow-md">
                            "{data.quote}"
                        </p>
                        <div className="h-px w-12 bg-[#DFBA87] my-6 opacity-80"></div>
                        <p className="text-[10px] tracking-[0.3em] uppercase text-[#DFBA87] font-medium leading-relaxed drop-shadow-md">
                            — {data.artist}
                        </p>
                    </div>

                    <div className="text-center pt-8 border-t border-white/10 relative z-20">
                        <img 
                            src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
                            className="h-6 mx-auto brightness-200 opacity-80"
                            alt="VIS Logo"
                        />
                    </div>

                    {/* Subtle background texture */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] z-10"></div>
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
