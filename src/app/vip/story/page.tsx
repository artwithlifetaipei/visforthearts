'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';

const ZODIAC_QUOTES: Record<string, { quote: string, artist: string, bg: string }> = {
    'Aries': { quote: "Creativity takes courage.", artist: "Henri Matisse", bg: "bg-rose-950" },
    'Taurus': { quote: "I found I could say things with color and shapes that I couldn't say any other way.", artist: "Georgia O'Keeffe", bg: "bg-emerald-950" },
    'Gemini': { quote: "My work is a game, a very serious game.", artist: "M.C. Escher", bg: "bg-amber-950" },
    'Cancer': { quote: "What I like about photographs is that they capture a moment that's gone forever, impossible to reproduce.", artist: "Karl Lagerfeld", bg: "bg-slate-800" },
    'Leo': { quote: "I don't design clothes. I design dreams.", artist: "Ralph Lauren", bg: "bg-orange-950" },
    'Virgo': { quote: "Details are not the details. They make the design.", artist: "Charles Eames", bg: "bg-stone-800" },
    'Libra': { quote: "Elegance is refusal.", artist: "Coco Chanel", bg: "bg-pink-950" },
    'Scorpio': { quote: "Art is a lie that makes us realize truth.", artist: "Pablo Picasso", bg: "bg-purple-950" },
    'Sagittarius': { quote: "There are 360 degrees, so why stick to one?", artist: "Zaha Hadid", bg: "bg-blue-950" },
    'Capricorn': { quote: "Good design is long-lasting.", artist: "Dieter Rams", bg: "bg-neutral-900" },
    'Aquarius': { quote: "I want to make the beautiful accessible to everyone.", artist: "Issey Miyake", bg: "bg-cyan-950" },
    'Pisces': { quote: "To take a photograph is to align the head, the eye and the heart. It's a way of life.", artist: "Henri Cartier-Bresson", bg: "bg-sky-950" },
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
            setProfile(data);
            if (data?.birthdate) {
                setZodiac(getZodiac(data.birthdate));
            }
        };
        fetchProfile();
    }, [router]);

    const handleDownload = async () => {
        if (!storyRef.current) return;
        setIsGenerating(true);
        const canvas = await html2canvas(storyRef.current, {
            scale: 2,
            useCORS: true,
            backgroundColor: null,
        });
        const link = document.createElement('a');
        link.download = `VIS_Zodiac_Story_${zodiac}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        setIsGenerating(false);
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

            <main className="flex-1 flex flex-col items-center justify-center gap-12">
                {/* IG Story Preview (9:16) */}
                <div 
                    ref={storyRef}
                    className={`relative w-[280px] aspect-[9/16] ${data.bg} rounded-xl overflow-hidden p-8 flex flex-col justify-between shadow-2xl`}
                >
                    <div className="flex justify-between items-start">
                        <div className="text-[8px] tracking-[0.4em] uppercase opacity-70">
                            VIS / VIP
                        </div>
                        <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-light">
                            {profile.email[0].toUpperCase()}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <p className="text-xl md:text-2xl font-light italic leading-relaxed tracking-wide">
                            "{data.quote}"
                        </p>
                        <p className="text-[10px] tracking-[0.3em] uppercase opacity-60">
                            — {data.artist}
                        </p>
                    </div>

                    <div className="text-center pt-8 border-t border-white/10">
                        <img 
                            src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" 
                            className="h-6 mx-auto invert opacity-50"
                        />
                    </div>
                </div>

                <div className="text-center space-y-6">
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="px-10 py-4 bg-white text-black text-[10px] tracking-[0.4em] uppercase hover:scale-105 transition-all duration-500 disabled:opacity-50"
                    >
                        {isGenerating ? 'Generating...' : 'Download Story'}
                    </button>
                </div>
            </main>
        </div>
    );
}
