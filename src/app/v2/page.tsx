'use client';

import { useEffect, useRef, useState } from 'react';

const quotes = [
    {
        text: "我們一直相信，身體是靈魂的載具。你如何照顧身體，不只是冰冷的健康管理，而是決定你能不能更細緻地感受、體驗世界的每一個瞬間。當身體被好好安放、感官重新打開，我們就更能享受當下，也更願意把維持健康變成日常的生活方式，而不是短期自律或焦慮式補救。VIS 正好是能落實這份品牌哲學的完美存在，「健康」不再被簡化為成分、功效，而是一種更完整、更有質感的生活體驗。",
        author: "elaceite有好研製"
    },
    {
        text: "對 Everijoy ⽽⾔，這次參與 VIS Contemporary Culture Fair，是⼀次能更具體、也更⽴體地向更多人傳遞品牌理念的珍貴經驗。我們⼀直希望透過花，帶來溫柔、浪漫且具有療癒力量的感受，⽽ VIS 提供了⼀個⾼度策展、且能被真正理解的場域，讓花藝不只是被觀看，⽽是成為⼀種被感受、被回應的藝術體驗。",
        author: "Everijoy Floral Boutique"
    },
    {
        text: "ayaᵃ 與 tins.ground 長期參與歐洲設計展，本次首度回台展售作品，並透過 VIS 與更多元的藏家及跨領域創作者交流，開始 founctional art 被新生代收藏家看見的可能。",
        author: "ayaᵃ"
    },
    {
        text: "透過此次展覽與來訪嘉賓的實際交流，深刻感受到實體互動所帶來的溫度與深度。在共享空間與時間的狀態下，氣味成為一種對話的起點，也讓品牌理念得以被更完整地理解與感受。",
        author: "K度十光"
    },
    {
        text: "當美感與人文價值能以更快的速度在社會中產生影響，那將是十分值得俱樂部貴賓投入支持的方向。因為這樣的支持，影響的不記是藝術領域，而是整體文化環境的累積與深化。",
        author: "Looom Club 共同創辦人 Bonny Liu"
    },
    {
        text: "當美感與人文美學能在社會中更快地被傳遞與感受，其所帶來的影響，往往超乎我們的想像。若能找到一種方式，讓這樣的擴散持續發酵，對俱樂部的貴賓而言，所支持的不限制是藝術，而是一種讓世界更柔軟的選擇。",
        author: "Looom Club Official Partner Connie Chang"
    },
    {
        text: "我一直相信，做品牌就像創作，不是為了快，而是為了走得久。比起短暫的熱度，那些值得被長久經營、反覆相遇的關係，才是奠基一個又一個偉大品牌與藝術家的根本。",
        author: "VIS 創辦人 Amelie KUO"
    }
];

const quotesEn = [
    {
        text: "We have always believed that the body is the vehicle of the soul. How you care for your body is not just cold health management, but determines whether you can feel and experience every moment of the world more delicately. When the body is well settled and the senses are reopened, we can enjoy the present moment more. VIS is the perfect showcase to implement this brand philosophy: 'health' is no longer simplified into ingredients or efficacy, but a complete, high-quality lifestyle experience.",
        author: "elaceite"
    },
    {
        text: "For Everijoy, participating in the VIS Contemporary Culture Fair was a precious experience to convey our brand philosophy to more people. We have always hoped to bring a gentle, romantic, and healing feeling through flowers. VIS provided a highly curated space that can be truly understood, letting floral art not just be viewed, but become an artistic experience felt and responded to.",
        author: "Everijoy Floral Boutique"
    },
    {
        text: "ayaᵃ and tins.ground have long participated in European design exhibitions. This is our first time showcasing works back in Taiwan. Through VIS, we exchange with diverse collectors and cross-disciplinary creators, opening the possibility for functional art to be seen by the new generation of collectors.",
        author: "ayaᵃ"
    },
    {
        text: "Through the actual exchange with visiting guests, we deeply felt the warmth and depth brought by physical interaction. Sharing space and time, scent becomes a starting point for dialogue, allowing the brand philosophy to be understood more completely.",
        author: "K's Time"
    },
    {
        text: "When aesthetics and humanistic values can influence society at a faster pace, that is a direction worthy of the support of our club guests. Because this support accumulates and deepens the entire cultural environment, not just art.",
        author: "Looom Club Co-founder Bonny Liu"
    },
    {
        text: "When aesthetic values and design are faster transmitted and felt in society, their impact often exceeds our imagination. Finding a way to sustain this diffusion is not just supporting art, but supporting a choice that makes the world gentler.",
        author: "Looom Club Official Partner Connie Chang"
    },
    {
        text: "I always believe that building a brand is like creating art; it's not about speed, but longevity. Rather than fleeting trends, those relationships that are worth nurturing and meeting repeatedly are the foundation of great brands and artists.",
        author: "VIS Founder Amelie KUO"
    }
];

export default function V2LandingPage() {
    const navRef = useRef<HTMLElement>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [lang, setLang] = useState<'zh' | 'en'>('zh');
    const [quoteIndex, setQuoteIndex] = useState(0);
    const quoteSectionRef = useRef<HTMLElement>(null);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);

    // Intersection Observer to start Quote Carousel only when visible
    useEffect(() => {
        const element = quoteSectionRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setHasStartedPlaying(true);
                }
            },
            { threshold: 0.15 }
        );

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    // Quote Carousel auto-play effect (runs only after scrolled into view, resets when index changes)
    useEffect(() => {
        if (!hasStartedPlaying) return;

        const timer = setInterval(() => {
            setQuoteIndex((prev) => (prev + 1) % quotes.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [hasStartedPlaying, quoteIndex]);

    useEffect(() => {
        const scripts = [
            'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js',
        ];

        const loadScript = (src: string) => {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                document.head.appendChild(script);
            });
        };

        const initAnimations = async () => {
            for (const src of scripts) {
                await loadScript(src);
            }

            // @ts-ignore
            const gsap = window.gsap;
            // @ts-ignore
            const ScrollTrigger = window.ScrollTrigger;
            
            gsap.registerPlugin(ScrollTrigger);

            // Smooth Navigation Shrink
            window.addEventListener('scroll', () => {
                if (window.scrollY > 80) {
                    navRef.current?.classList.add('scrolled');
                } else {
                    navRef.current?.classList.remove('scrolled');
                }
            });

            // Refined Exhibition Horizontal Scroll
            const scroller = document.querySelector('.v2-exhibition-scroller') as HTMLElement;
            if (scroller) {
                gsap.to(scroller, {
                    x: () => -(scroller.scrollWidth - window.innerWidth),
                    ease: "none",
                    scrollTrigger: {
                        trigger: ".v2-exhibition-section",
                        start: "top top",
                        end: () => `+=${scroller.scrollWidth}`,
                        scrub: 1.2, // Smoother scrub
                        pin: true,
                        anticipatePin: 1,
                        invalidateOnRefresh: true
                    }
                });
            }

            // Lightweight Custom Cursor
            const cursor = document.querySelector('.v2-cursor');
            const dot = document.querySelector('.v2-cursor-dot');
            if (cursor && dot) {
                window.addEventListener('mousemove', (e: MouseEvent) => {
                    gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.6, ease: "power3.out" });
                    gsap.to(dot, { x: e.clientX, y: e.clientY, duration: 0.1 });
                });

                document.querySelectorAll('a, button, .v2-card').forEach(el => {
                    el.addEventListener('mouseenter', () => {
                        gsap.to(cursor, { scale: 1.5, borderColor: "#C9A96E", duration: 0.3 });
                        gsap.to(dot, { scale: 0, duration: 0.2 });
                    });
                    el.addEventListener('mouseleave', () => {
                        gsap.to(cursor, { scale: 1, borderColor: "#C9A96E", duration: 0.3 });
                        gsap.to(dot, { scale: 1, duration: 0.2 });
                    });
                });
            }

            // Magnetic Buttons
            document.querySelectorAll('.v2-btn-magnetic').forEach(btn => {
                btn.addEventListener('mousemove', (e: any) => {
                    const rect = btn.getBoundingClientRect();
                    const x = e.clientX - rect.left - rect.width / 2;
                    const y = e.clientY - rect.top - rect.height / 2;
                    gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: "power2.out" });
                });
                btn.addEventListener('mouseleave', () => {
                    gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
                });
            });

            // Parallax Images
            document.querySelectorAll('.v2-parallax').forEach(img => {
                gsap.to(img, {
                    yPercent: 20,
                    ease: "none",
                    scrollTrigger: {
                        trigger: img.parentElement,
                        scrub: true
                    }
                });
            });

            // Section Reveal
            gsap.from(".v2-reveal", {
                y: 50,
                opacity: 0,
                duration: 1,
                stagger: 0.2,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: ".v2-reveal",
                    start: "top 85%"
                }
            });
        };

        initAnimations();
    }, []);

    return (
        <main className="v2-root">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Outfit:wght@100..900&display=swap');
                
                :root {
                    --v2-bg: #FBFBFA;
                    --v2-text: #0D0D0D;
                    --v2-gold: #C9A96E;
                    --v2-border: rgba(13, 13, 13, 0.06);
                    --v2-font-serif: 'Cormorant Garamond', serif;
                    --v2-font-sans: 'Outfit', sans-serif;
                }

                .v2-root {
                    background-color: var(--v2-bg);
                    color: var(--v2-text);
                    font-family: var(--v2-font-sans);
                    overflow-x: hidden;
                    -webkit-font-smoothing: antialiased;
                }

                * { cursor: none !important; }

                .v2-noise {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZmlsdGVyIGlkPSJub2lzZUZpbHRlciI+CiAgICA8ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC42NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPgogIDwvZmlsdGVyPgogIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZUZpbHRlcikiLz4KPC9zdmc+');
                    opacity: 0.04; pointer-events: none; z-index: 9999;
                }

                .v2-cursor {
                    position: fixed; top: 0; left: 0;
                    width: 30px; height: 30px;
                    border: 1px solid var(--v2-gold);
                    border-radius: 50%;
                    pointer-events: none; z-index: 10000;
                    transform: translate(-50%, -50%);
                }
                .v2-cursor-dot {
                    position: fixed; top: 0; left: 0;
                    width: 4px; height: 4px;
                    background-color: var(--v2-gold);
                    border-radius: 50%;
                    pointer-events: none; z-index: 10001;
                    transform: translate(-50%, -50%);
                }

                nav {
                    position: fixed; top: 0; width: 100%; padding: 3rem 6vw;
                    display: flex; justify-content: space-between; align-items: center;
                    z-index: 1000; transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }
                nav.scrolled {
                    padding: 1.5rem 6vw;
                    background: rgba(251, 251, 250, 0.85);
                    backdrop-filter: blur(15px);
                    border-bottom: 1px solid var(--v2-border);
                }
                .v2-logo { height: 50px; transition: height 0.6s ease; }
                nav.scrolled .v2-logo { height: 30px; }

                .v2-nav-links { display: flex; gap: 4rem; }
                .v2-nav-link {
                    font-size: 12px; font-weight: 500; text-transform: uppercase;
                    letter-spacing: 0.2em; text-decoration: none; color: inherit;
                    position: relative; padding-bottom: 4px;
                }
                .v2-nav-link::after {
                    content: ''; position: absolute; bottom: 0; left: 0; width: 0; height: 1px;
                    background: var(--v2-gold); transition: width 0.4s ease;
                }
                .v2-nav-link:hover::after { width: 100%; }

                .v2-hero {
                    height: 100vh; display: flex; align-items: flex-end;
                    padding: 0 6vw 15vh 6vw; position: relative;
                }
                .v2-hero-img-box {
                    position: absolute; left: 6vw; top: 15vh;
                    width: 50vw; height: 65vh; overflow: hidden;
                    background: #eee;
                }
                .v2-hero-img-box img { width: 100%; height: 120%; object-fit: cover; }
                
                .v2-hero-content {
                    width: 100%; display: flex; justify-content: flex-end; align-items: flex-end;
                }
                .v2-hero-text {
                    max-width: 680px;
                    text-align: right;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }
                .lang-toggle-wrapper {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .lang-toggle-btn-single {
                    font-size: 10px;
                    letter-spacing: 0.25em;
                    font-weight: 500;
                    color: var(--v2-text);
                    background: transparent;
                    border: 1px solid var(--v2-text);
                    border-radius: 20px;
                    cursor: pointer;
                    padding: 6px 18px;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    text-transform: uppercase;
                }
                .lang-toggle-btn-single:hover {
                    background: var(--v2-text);
                    color: #FAF9F6;
                    transform: scale(0.97);
                }
                .v2-hero-zh { width: 100%; font-size: 1.45rem; font-weight: 300; line-height: 2; margin-bottom: 2rem; color: #444; }
                .v2-hero-en { 
                    font-family: var(--v2-font-serif); font-style: italic;
                    font-size: 2.2rem; line-height: 1.1; color: var(--v2-text);
                    width: 100%;
                    text-align: inherit;
                }

                .v2-section-title {
                    font-family: var(--v2-font-serif); font-size: 3.5rem; font-weight: 400;
                    letter-spacing: 0.05em; margin-bottom: 1.5rem;
                }
                .v2-section-subtitle {
                    font-size: 11px; text-transform: uppercase; letter-spacing: 0.4em;
                    color: var(--v2-gold); margin-bottom: 3rem; display: block;
                }

                .v2-exhibition-section { background: #fff; position: relative; }
                .v2-exhibition-scroller {
                    height: 100vh; display: flex; align-items: center;
                    padding: 0 10vw; gap: 10vw; width: fit-content;
                }
                .v2-exhibit-intro { width: 35vw; flex-shrink: 0; }
                .v2-exhibit-intro p { font-size: 1.1rem; line-height: 2; opacity: 0.6; margin-bottom: 3rem; }

                .v2-card { width: 30vw; flex-shrink: 0; }
                .v2-card-img-wrap { width: 100%; aspect-ratio: 2/3; overflow: hidden; background: #f5f5f5; }
                .v2-card-img-wrap img { width: 100%; height: 115%; object-fit: cover; }
                .v2-card-info { margin-top: 2rem; }
                .v2-card-title { font-family: var(--v2-font-serif); font-style: italic; font-size: 1.75rem; margin-bottom: 0.5rem; }
                .v2-card-tag { font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.4; }

                .v2-vip-section { padding: 25vh 10vw; background: #fff; }
                .v2-vip-box {
                    padding: 10vh 5vw; border: 1px solid var(--v2-border);
                    text-align: center; background: rgba(251, 251, 250, 0.4);
                    backdrop-filter: blur(10px);
                }
                .v2-vip-desc { font-family: var(--v2-font-serif); font-size: 2.25rem; font-style: italic; margin-bottom: 1rem; }
                .v2-btn-gold {
                    display: inline-block; padding: 1.25rem 3.5rem;
                    background: var(--v2-text); color: white;
                    font-weight: 600; font-size: 11px; letter-spacing: 0.3em;
                    text-transform: uppercase; text-decoration: none;
                    transition: all 0.4s ease; margin-top: 3rem;
                }
                .v2-btn-gold:hover { background: var(--v2-gold); }

                .v2-press-section { padding: 20vh 10vw; }
                .v2-press-grid {
                    display: grid; grid-template-columns: repeat(12, 1fr); gap: 4vw;
                    margin-top: 8vh;
                }
                .v2-press-item { grid-column: span 4; border-bottom: 1px solid var(--v2-border); padding-bottom: 3rem; }
                .v2-press-item:nth-child(even) { margin-top: 10vh; }
                .v2-press-img { width: 100%; aspect-ratio: 16/10; object-fit: cover; filter: sepia(0.2) contrast(0.9); margin-bottom: 2rem; }
                .v2-press-media { font-family: var(--v2-font-serif); font-size: 2.5rem; font-style: italic; margin-bottom: 1rem; }
                .v2-press-title { font-size: 0.95rem; font-weight: 300; line-height: 1.8; opacity: 0.6; }

                footer { padding: 10vh 10vw; border-top: 1px solid var(--v2-border); text-align: center; }
                .v2-footer-links { display: flex; justify-content: center; gap: 3rem; margin: 3rem 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.4; }
                .v2-footer-link { text-decoration: none; color: inherit; }

                /* Quote Carousel Section */
                .quote-section {
                    position: relative;
                    padding: 12vh 10vw;
                    background: #FAF9F6;
                    border-top: 1px solid var(--v2-border);
                    border-bottom: 1px solid var(--v2-border);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .quote-container {
                    width: 100%;
                    max-width: 820px;
                    margin: 0 auto;
                    display: block;
                    min-height: 300px;
                    position: relative;
                }
                .quote-slide {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.6s ease-in-out;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }
                .quote-slide.active {
                    opacity: 1;
                    pointer-events: auto;
                    position: relative;
                }
                .quote-icon {
                    font-size: 4rem;
                    font-family: var(--v2-font-serif);
                    color: var(--v2-gold);
                    line-height: 1;
                    margin-bottom: 1.5rem;
                    opacity: 0.35;
                    text-align: center;
                }
                .quote-body {
                    font-family: var(--v2-font-serif);
                    font-size: 1.45rem;
                    line-height: 1.9;
                    color: var(--v2-text);
                    font-style: italic;
                    font-weight: 300;
                    margin-bottom: 2.5rem;
                    letter-spacing: 0.02em;
                    text-align: center;
                }
                .quote-author {
                    font-size: 0.85rem;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--v2-gold);
                    font-weight: 500;
                    border-bottom: 1px solid rgba(201,169,110,0.25);
                    padding-bottom: 0.4rem;
                    display: inline-block;
                }
                .quote-nav {
                    display: flex;
                    justify-content: center;
                    gap: 0.5rem;
                    margin-top: 3.5rem;
                    position: relative;
                    z-index: 10;
                }
                .quote-dot {
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    position: relative;
                    padding: 0;
                }
                .quote-dot::after {
                    content: '';
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #E0DFDB;
                    transition: all 0.3s ease;
                }
                .quote-dot.active::after {
                    background: var(--v2-gold);
                    transform: scale(1.35);
                }

                @media (max-width: 768px) {
                    .quote-section {
                        padding: 8vh 6vw;
                    }
                    .quote-container {
                        max-width: 100%;
                        min-height: auto;
                    }
                    .quote-body {
                        font-size: 1.15rem;
                        line-height: 1.75;
                        margin-bottom: 2rem;
                    }
                    .quote-nav {
                        margin-top: 2rem;
                    }
                    nav { padding: 1.5rem 6vw; }
                    .v2-nav-links { display: none; }
                    .v2-hero { flex-direction: column; padding-bottom: 10vh; }
                    .v2-hero-img-box { width: 85vw; height: 45vh; position: relative; top: 0; left: 0; margin-bottom: 5vh; }
                    .v2-hero-text { text-align: left; display: flex; flex-direction: column; align-items: flex-start; }
                    .lang-toggle-wrapper { justify-content: flex-start; }
                    .v2-hero-zh { font-size: 1.15rem; width: 100%; }
                    .v2-hero-en { font-size: 0.85rem; width: 100%; text-align: inherit; }
                    .v2-exhibition-scroller { gap: 15vw; padding: 0 6vw; }
                    .v2-exhibit-intro { width: 80vw; }
                    .v2-card { width: 80vw; }
                    .v2-press-item { grid-column: span 12; }
                    .v2-press-item:nth-child(even) { margin-top: 0; }
                }
            
                /* Metrics & About Section Styling */
                .about-metrics-section {
                    background: #FAF9F6;
                    padding: 12vh 10vw;
                    border-top: 1px solid var(--v2-border);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .metrics-container {
                    width: 100%;
                    max-width: 1100px;
                    display: flex;
                    gap: 6rem;
                    align-items: center;
                }
                .metrics-grid {
                    width: 50%;
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 2rem;
                }
                .metric-card {
                    background: #FFFFFF;
                    border: 1px solid rgba(201, 169, 110, 0.15);
                    padding: 2rem 1rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.02);
                    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .metric-card:hover {
                    transform: translateY(-5px);
                    border-color: var(--v2-gold);
                    box-shadow: 0 15px 40px rgba(201, 169, 110, 0.08);
                }
                .metric-card.full-width {
                    grid-column: span 2;
                    padding: 2rem 3rem;
                }
                .metric-number {
                    font-family: var(--v2-font-serif);
                    font-size: 3rem;
                    color: var(--v2-gold);
                    font-weight: 300;
                    line-height: 1;
                    margin-bottom: 0.5rem;
                }
                .metric-label {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
                    font-size: 0.95rem;
                    letter-spacing: 0.08em;
                    color: #1a1a1a;
                    font-weight: 400;
                    line-height: 1.5;
                    white-space: nowrap;
                }
                .metrics-divider {
                    width: 1px;
                    height: 350px;
                    background: rgba(201, 169, 110, 0.25);
                    flex-shrink: 0;
                }
                .metrics-text-content {
                    width: 50%;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .metrics-heading {
                    font-family: var(--v2-font-serif);
                    font-size: 1.8rem;
                    font-weight: 300;
                    letter-spacing: 0.1em;
                    color: var(--v2-text);
                    margin-bottom: 2rem;
                }
                .metrics-p {
                    font-size: 0.95rem;
                    line-height: 1.85;
                    color: #555555;
                    margin-bottom: 2rem;
                    text-align: justify;
                }
                .metrics-highlight {
                    font-family: var(--v2-font-serif);
                    font-size: 1.15rem;
                    line-height: 1.7;
                    font-style: italic;
                    color: var(--v2-gold);
                    border-left: 2px solid var(--v2-gold);
                    padding-left: 1.5rem;
                    margin-top: 1rem;
                }

                @media (max-width: 991px) {
                    .metrics-container {
                        flex-direction: column;
                        gap: 4rem;
                    }
                    .metrics-grid {
                        width: 100%;
                    }
                    .metrics-divider {
                        width: 100%;
                        height: 1px;
                    }
                    .metrics-text-content {
                        width: 100%;
                    }
                }
                @media (max-width: 480px) {
                    .metrics-grid {
                        grid-template-columns: 1fr;
                    }
                    .metric-card.full-width {
                        grid-column: span 1;
                    }
                }
`}</style>

            <div className="v2-noise"></div>
            <div className="v2-cursor"></div>
            <div className="v2-cursor-dot"></div>

            <nav ref={navRef}>
                <a href="/v2">
                    <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" className="v2-logo" alt="VIS" />
                </a>
                <div className="v2-nav-links">
                    <a href="#about" className="v2-nav-link">{lang === 'zh' ? 'About 關於' : 'About'}</a>
                    <a href="#exhibition" className="v2-nav-link">{lang === 'zh' ? 'Exhibition 參展' : 'Exhibition'}</a>
                    <a href="#vip" className="v2-nav-link">{lang === 'zh' ? 'VIP Club 禮賓入口' : 'VIP Club'}</a>
                    <a href="#press" className="v2-nav-link">{lang === 'zh' ? 'Press 媒體' : 'Press'}</a>
                </div>
                <a href="/vip" className="v2-btn-magnetic" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textDecoration: 'none', color: 'inherit', border: '1px solid #000', padding: '0.6rem 1.2rem' }}>{lang === 'zh' ? 'Access 登入' : 'Access'}</a>
            </nav>

            <section className="v2-hero" id="hero">
                <div className="v2-hero-img-box">
                    <img src="/hero_main_new.jpg" className="v2-parallax" alt="VIS Hero" />
                </div>
                <div className="v2-hero-content">
                    <div className="v2-hero-text">
                        {/* EN/CH Language Switcher */}
                        <div className="lang-toggle-wrapper">
                            <button
                                type="button"
                                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                                className="lang-toggle-btn-single"
                            >
                                EN/CH
                            </button>
                        </div>

                        {lang === 'zh' ? (
                            <p className="v2-hero-zh v2-reveal">
                                VIS 始於2022年，至今已與無數的品味質富人士們，<br />實踐著人文與美感如何展現於美好的生活中。
                            </p>
                        ) : (
                            <p className="v2-hero-zh v2-reveal font-sans" style={{ width: '100%', fontFamily: 'var(--font-sans)', fontStyle: 'normal', fontSize: '1.2rem', lineHeight: '1.8', letterSpacing: '0.04em', color: '#444', fontWeight: 3, textTransform: 'none', margin: '0 0 1.5rem 0' }}>
                                VIS was founded in 2022. Since its inception, it has collaborated with numerous individuals of discerning taste and wealth to explore how humanity and aesthetics manifest in a beautiful life.
                            </p>
                        )}
                        <h1 className="v2-hero-en v2-reveal">
                            Culture shapes Living. Taste defines Lifestyle.
                        </h1>
                    </div>
                </div>
            </section>

            {/* New Metrics & About Section */}
            <section className="about-metrics-section" id="about">
                <div className="metrics-container">
                    <div className="metrics-grid">
                        <div className="metric-card">
                            <span className="metric-number">71%</span>
                            <span className="metric-label">{lang === 'zh' ? '具高消費力與品味貴賓' : 'Taste VIPs & Affluent Guests'}</span>
                        </div>
                        <div className="metric-card">
                            <span className="metric-number">21%</span>
                            <span className="metric-label">{lang === 'zh' ? '收藏人士' : 'Art Collectors'}</span>
                        </div>
                        <div className="metric-card">
                            <span className="metric-number">34%</span>
                            <span className="metric-label">{lang === 'zh' ? '企業主' : 'Business Owners'}</span>
                        </div>
                        <div className="metric-card">
                            <span className="metric-number">13%</span>
                            <span className="metric-label">{lang === 'zh' ? '媒體/意見領袖' : 'Press & KOLs'}</span>
                        </div>
                        <div className="metric-card full-width">
                            <span className="metric-number">67%</span>
                            <span className="metric-label">{lang === 'zh' ? '一年購買預算80萬以上' : 'Annual Purchase Budget > 800k TWD'}</span>
                        </div>
                    </div>
                    
                    <div className="metrics-divider"></div>
                    
                    <div className="metrics-text-content">
                        <h3 className="metrics-heading">{lang === 'zh' ? '精準客群 ‧ 關係延續' : 'Discerning Audience · Deep Connection'}</h3>
                        <p className={`metrics-p ${lang === 'zh' ? 'font-zh' : 'font-sans'}`} style={lang === 'en' ? { fontFamily: 'var(--font-sans)', fontStyle: 'normal', fontSize: '0.85rem', lineHeight: '1.8', letterSpacing: '0.04em', color: '#666', fontWeight: 3, textTransform: 'none' } : {}}>
                            {lang === 'zh' ? (
                                '不同於以大量人流與即時銷售為主的市集，VIS 高度重視客群品質，篩選出適合品牌深度交流與展後延續的客群。參展效益從現場接觸，進一步延伸至展後到店、收藏諮詢、媒體關係、跨界合作與長期客群累積，因此而最為適合重視產品質量的高單價品牌。'
                            ) : (
                                'Unlike conventional art fairs focusing on high foot traffic and transactional sales, VIS curates an elite group of attendees, fostering genuine brand engagement that extends far beyond the exhibition floor. This targeted ecosystem is ideal for high-ticket brands seeking premium client acquisition, strategic partnerships, and long-term brand loyalty.'
                            )}
                        </p>
                        <p className={`metrics-highlight ${lang === 'zh' ? 'font-zh' : 'font-sans'}`} style={lang === 'en' ? { fontFamily: 'var(--font-sans)', fontStyle: 'normal', fontSize: '0.9rem', lineHeight: '1.7', letterSpacing: '0.04em', color: '#1a1a1a', fontWeight: 4, textTransform: 'none' } : {}}>
                            {lang === 'zh' ? (
                                'VIS 提供的不只是一個展位，而是一套從客群導入到關係延續的品牌成長機制。'
                            ) : (
                                'By connecting the worlds of art, media, collecting, fashion, design, entrepreneurship and business leadership, VIS offers more than exhibition space, it\'s an access to a carefully cultivated network that can lead to collecting, editorial exposure, cross-disciplinary collaboration and international opportunities.'
                            )}
                        </p>
                    </div>
                </div>
            </section>


            {/* Quote Carousel Section */}
            <section className="quote-section" ref={quoteSectionRef}>
                <div className="quote-container">
                    {(lang === 'zh' ? quotes : quotesEn).map((quote, idx) => (
                        <div key={idx} className={`quote-slide ${quoteIndex === idx ? 'active' : ''}`}>
                            <div className="quote-icon">“</div>
                            <blockquote className={`quote-body ${lang === 'zh' ? 'font-zh' : 'font-sans'}`} style={lang === 'en' ? { fontFamily: 'var(--font-sans)', fontStyle: 'normal', fontWeight: 3, letterSpacing: '0.04em', fontSize: '0.95rem', lineHeight: '1.75' } : {}}>
                                {quote.text}
                            </blockquote>
                            <div className={`quote-author ${lang === 'zh' ? 'font-zh' : 'font-sans'}`} style={lang === 'en' ? { fontFamily: 'var(--font-sans)', fontStyle: 'normal', fontWeight: 4, letterSpacing: '0.05em', fontSize: '0.85rem' } : {}}>
                                —— {quote.author}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="quote-nav">
                    {quotes.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setQuoteIndex(idx)}
                            className={`quote-dot ${quoteIndex === idx ? 'active' : ''}`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            </section>

            <section className="v2-exhibition-section" id="exhibition">
                <div className="v2-exhibition-scroller">
                    <div className="v2-exhibit-intro">
                        <span className="v2-section-subtitle">Exhibition</span>
                        <h2 className="v2-section-title">Beyond The Frames.</h2>
                        <p>{lang === 'zh' ? '不只是一個博覽會，而是一個聚集品味人士所建構而成的高質量場域。' : 'More than an art fair, but a Curated space designed for discerning minds.'}</p>
                        <a href="mailto:artwithlifetaipei@gmail.com" className="v2-btn-gold v2-btn-magnetic">{lang === 'zh' ? 'Apply for 2027 申請參展' : 'Apply for 2027'}</a>
                    </div>

                    <div className="v2-card">
                        <div className="v2-card-img-wrap">
                            <img src="blue_island.png" className="v2-parallax" alt="Blue Island" />
                        </div>
                        <div className="v2-card-info">
                            <h3 className="v2-card-title">Blue Island</h3>
                            <span className="v2-card-tag">{lang === 'zh' ? '告別獨立品牌行銷的商業孤島' : 'Strategy / Branding'}</span>
                        </div>
                    </div>

                    <div className="v2-card" style={{ marginTop: '10vh' }}>
                        <div className="v2-card-img-wrap">
                            <img src="traditional_formats.png" className="v2-parallax" alt="Formats" />
                        </div>
                        <div className="v2-card-info">
                            <h3 className="v2-card-title">Traditional Formats</h3>
                            <span className="v2-card-tag">{lang === 'zh' ? '精緻環境展現平易近人的優雅設計' : 'Exhibition / Design'}</span>
                        </div>
                    </div>

                    <div className="v2-card">
                        <div className="v2-card-img-wrap">
                            <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/IMG_4751%20(1).PNG" className="v2-parallax" alt="Gallery" />
                        </div>
                        <div className="v2-card-info">
                            <h3 className="v2-card-title">Curated Gallery</h3>
                            <span className="v2-card-tag">{lang === 'zh' ? '精準觸及兼具高消費力與生活美學的場域' : 'Space / Curated Gallery'}</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="v2-vip-section" id="vip">
                <div className="v2-vip-box v2-reveal">
                    <span className="v2-section-subtitle">Exclusive</span>
                    {lang === 'zh' && <h2 className="v2-vip-desc">專屬於美感、影響力交會的私密網絡。</h2>}
                    <p style={{ opacity: 0.4, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>An intimate nexus of aesthetics and influence.</p>
                    <a href="/vip" className="v2-btn-gold v2-btn-magnetic">{lang === 'zh' ? 'VIP ACCESS 貴賓禮賓入口' : 'VIP ACCESS PORTAL'}</a>
                    <div style={{ marginTop: '3.5rem', fontSize: '0.75rem', letterSpacing: '0.08em', color: '#666666', lineHeight: '1.8' }}>
                        {lang === 'zh' ? (
                            <>如有貴賓服務相關等任何垂詢，請聯絡VIP辦公室 <a href="mailto:visvipteam@gmail.com" style={{ color: '#C9A96E', textDecoration: 'underline' }}>visvipteam@gmail.com</a>。<br/></>
                        ) : (
                            <span style={{ fontSize: '0.65rem', color: '#999999', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                                For any inquiries regarding VIP services, please contact the VIP Office at <a href="mailto:visvipteam@gmail.com" style={{ color: '#C9A96E', textDecoration: 'underline' }}>visvipteam@gmail.com</a>.
                            </span>
                        )}
                        {lang === 'zh' && (
                            <span style={{ fontSize: '0.65rem', color: '#999999', display: 'block', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                For any inquiries regarding VIP services, please contact the VIP Office at <a href="mailto:visvipteam@gmail.com" style={{ color: '#C9A96E', textDecoration: 'underline' }}>visvipteam@gmail.com</a>.
                            </span>
                        )}
                    </div>
                </div>
            </section>

            <section className="v2-press-section" id="press">
                <span className="v2-section-subtitle">Archive</span>
                <h2 className="v2-section-title">Latest Press.</h2>
                
                <div className="v2-press-grid">
                    <div className="v2-press-item v2-reveal">
                        <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/GettyImages-2209624027-1024x683.jpg" className="v2-press-img" alt="Press" />
                        <h3 className="v2-press-media">Artnet</h3>
                        <p className="v2-press-title">New Art Fair Alternative Plans 2026 Launch in Taipei, Hong Kong</p>
                    </div>
                    <div className="v2-press-item v2-reveal">
                        <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/hong-kong4-1.jpg" className="v2-press-img" alt="Press" />
                        <h3 className="v2-press-media">Prestige</h3>
                        <p className="v2-press-title">
                            {lang === 'zh' 
                                ? '週末逛街好去處！從時尚、藝術與居家設計感受來自日本、台灣以及香港品牌魅力' 
                                : 'Weekend destination: experience the unique charm of design, fashion, and home design brands from Japan, Taiwan, and Hong Kong.'}
                        </p>
                    </div>
                    <div className="v2-press-item v2-reveal">
                        <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/172535144791714_P22278065.jpg" className="v2-press-img" alt="Press" />
                        <h3 className="v2-press-media">Tatler</h3>
                        <p className="v2-press-title">
                            {lang === 'zh' 
                                ? '跳脫代工思維的質感品牌，若僅透過網路其質地如何能傳遞？這次獨立品牌不單打獨鬥' 
                                : 'Beyond the OEM mindset: how independent design brands unite to convey physical craftsmanship and material textures in a physical space.'}
                        </p>
                    </div>
                </div>
            </section>

            <footer>
                <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" style={{ height: '24px', opacity: 0.3, marginBottom: '2rem' }} alt="Footer Logo" />
                <div className="v2-footer-links">
                    <a href="#" className="v2-footer-link">Instagram</a>
                    <a href="#" className="v2-footer-link">Contact</a>
                    <a href="#" className="v2-footer-link">Privacy</a>
                </div>
                <p style={{ fontSize: '9px', letterSpacing: '0.4em', opacity: 0.2 }}>&copy; 2026 VIS Contemporary Culture. ALL RIGHTS RESERVED.</p>
            </footer>
        </main>
    );
}
