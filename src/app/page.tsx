'use client';

import { useEffect, useRef } from 'react';

export default function LandingPage() {
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const scripts = [
            'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js',
            'https://unpkg.com/lenis@1.0.45/dist/lenis.min.js',
            'https://unpkg.com/lucide@latest'
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
            // @ts-ignore
            const Lenis = window.Lenis;
            
            gsap.registerPlugin(ScrollTrigger);

            // 1. Ultra-Snappy Smooth Scroll (Lenis)
            const lenis = new Lenis({
                duration: 0.5,
                lerp: 0.15,
                easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothWheel: true,
                wheelMultiplier: 1.5,
            });
            // @ts-ignore
            window.lenis = lenis;
            function raf(time: number) {
                lenis.raf(time);
                requestAnimationFrame(raf);
            }
            requestAnimationFrame(raf);

            window.addEventListener('scroll', () => {
                if (window.scrollY > 100) {
                    navRef.current?.classList.add('scrolled');
                } else {
                    navRef.current?.classList.remove('scrolled');
                }
            });

            const scroller = document.querySelector('.exhibition-scroller') as HTMLElement;
            if (scroller) {
                gsap.to(scroller, {
                    x: () => -(scroller.scrollWidth - window.innerWidth),
                    ease: "none",
                    scrollTrigger: {
                        trigger: ".exhibition-section",
                        start: "top top",
                        end: () => `+=${scroller.scrollWidth}`,
                        scrub: 1,
                        pin: true,
                        anticipatePin: 1,
                        invalidateOnRefresh: true
                    }
                });
            }

            document.querySelectorAll('.img-parallax').forEach(img => {
                gsap.to(img, {
                    y: -60,
                    ease: "none",
                    scrollTrigger: {
                        trigger: img.parentElement,
                        scrub: true
                    }
                });
            });

            const cursor = document.querySelector('.cursor-follower');
            const dot = document.querySelector('.cursor-dot');
            if (cursor && dot) {
                window.addEventListener('mousemove', (e) => {
                    gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.6, ease: "power3.out" });
                    gsap.to(dot, { x: e.clientX, y: e.clientY, duration: 0.1 });
                });

                document.querySelectorAll('a, button, .img-card').forEach(el => {
                    el.addEventListener('mouseenter', () => {
                        gsap.to(cursor, { scale: 1.8, borderColor: "#C9A96E", duration: 0.3 });
                        gsap.to(dot, { scale: 0, duration: 0.3 });
                    });
                    el.addEventListener('mouseleave', () => {
                        gsap.to(cursor, { scale: 1, borderColor: "#C9A96E", duration: 0.3 });
                        gsap.to(dot, { scale: 1, duration: 0.3 });
                    });
                });
            }

            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        const target = document.querySelector(href);
                        if (target) lenis.scrollTo(target);
                    }
                });
            });
        };

        initAnimations();
    }, []);

    return (
        <main className="landing-root">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700&family=Outfit:wght@100..900&display=swap');
                
                :root {
                    --bg: #FBFBFA;
                    --text: #0D0D0D;
                    --gold: #C9A96E;
                    --border: rgba(13, 13, 13, 0.08);
                    --font-serif: 'Cormorant Garamond', serif;
                    --font-sans: 'Outfit', sans-serif;
                }

                * { margin: 0; padding: 0; box-sizing: border-box; cursor: none !important; }
                body {
                    background-color: var(--bg);
                    color: var(--text);
                    font-family: var(--font-sans);
                    -webkit-font-smoothing: antialiased;
                    line-height: 1.6;
                    overflow-x: hidden;
                }

                .noise-overlay {
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    background: url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZmlsdGVyIGlkPSJub2lzZUZpbHRlciI+CiAgICA8ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC42NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPgogIDwvZmlsdGVyPgogIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZUZpbHRlcikiLz4KPC9zdmc+');
                    opacity: 0.04; pointer-events: none; z-index: 9000;
                }

                .cursor-follower {
                    position: fixed;
                    width: 25px; height: 25px;
                    border: 1px solid var(--gold);
                    border-radius: 50%;
                    pointer-events: none; z-index: 10000;
                    transform: translate(-50%, -50%);
                    display: flex; align-items: center; justify-content: center;
                }
                .cursor-dot { width: 4px; height: 4px; background-color: var(--gold); border-radius: 50%; }

                nav {
                    position: fixed; top: 0; width: 100%; padding: 4rem 8vw;
                    display: flex; justify-content: space-between; align-items: center;
                    z-index: 1000; transition: all 0.5s ease;
                }
                nav.scrolled {
                    background: rgba(251, 251, 250, 0.8);
                    backdrop-filter: blur(20px); padding: 2rem 8vw;
                }
                .nav-logo { height: 60px; transition: height 0.5s ease; }
                .nav-links { display: flex; gap: 4rem; }
                .nav-link {
                    font-size: 13px; font-weight: 500;
                    text-transform: uppercase; letter-spacing: 0.2em;
                    text-decoration: none; color: inherit;
                    position: relative;
                }
                nav.scrolled .nav-logo { height: 30px; }
                nav.scrolled .nav-link { font-size: 11px; }

                .btn-access {
                    font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase;
                    font-weight: 700; border: 1px solid var(--text);
                    padding: 0.8rem 1.5rem; text-decoration: none; color: var(--text);
                    transition: all 0.3s ease;
                }
                .btn-access:hover { background: var(--text); color: #fff; }

                .hero-layout {
                    display: flex; justify-content: space-between; align-items: flex-end;
                    height: 100vh; padding: 25vh 8vw 12vh 8vw;
                }
                .hero-img-container { height: 100%; width: 50vw; display: flex; align-items: flex-end; }
                .hero-img-container img { max-width: 100%; max-height: 100%; object-fit: contain; }
                .hero-text-container { max-width: 450px; text-align: right; }
                .hero-zh { font-size: 1rem; font-weight: 300; line-height: 2; margin-bottom: 1.5rem; }
                .hero-en { font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; color: #888; white-space: nowrap; }

                .exhibition-section { background: #fff; overflow: hidden; }
                .exhibition-scroller {
                    height: 100vh; display: flex; align-items: center;
                    padding: 0 15vw; gap: 12vw; width: fit-content;
                }
                .exhibit-item { width: 25vw; flex-shrink: 0; display: flex; flex-direction: column; }
                .exhibit-item.intro { width: 30vw; justify-content: center; }
                .exhibit-title { font-size: 1rem; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 4rem; }
                .exhibit-title span { font-family: var(--font-serif); font-style: italic; font-size: 1.2rem; }
                .exhibit-intro-zh { font-size: 1.3rem; line-height: 1.8; font-weight: 300; margin-bottom: 1.5rem; }
                .exhibit-intro-en { font-size: 0.9rem; line-height: 1.6; color: #888; font-family: var(--font-serif); font-style: italic; }
                
                .img-card { width: 100%; aspect-ratio: 2/3; overflow: hidden; transition: transform 1s ease; }
                .img-card:hover { transform: scale(1.02); }
                .card-text-zh { font-size: 1.2rem; margin-top: 2rem; font-family: var(--font-serif); font-style: italic; }
                .card-text-en { font-size: 0.6rem; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0.5rem; }
                .img-parallax { width: 100%; height: 120%; object-fit: cover; }

                .vip-section { padding: 20vh 10vw; background: #fff; border-top: 1px solid var(--border); }
                .vip-portal-wrapper { text-align: center; border: 1px solid var(--border); padding: 8vh 5vw; }
                .vip-portal-desc { font-size: 1.8rem; font-family: var(--font-serif); font-style: italic; margin-bottom: 1rem; }
                
                .btn-pola {
                    display: inline-block; background: var(--text); color: white;
                    padding: 1.25rem 3rem; font-size: 10px; text-transform: uppercase;
                    letter-spacing: 0.4em; font-weight: 700; transition: all 0.5s ease;
                    text-decoration: none;
                }
                .btn-pola:hover { background: var(--gold); }

                .press-section { padding: 20vh 10vw; }
                .press-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5vw; margin-top: 10vh; }
                .press-item { border-bottom: 1px solid var(--border); padding-bottom: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
                .press-img { width: 100%; aspect-ratio: 16/9; object-fit: cover; margin-bottom: 1rem; transition: transform 0.5s ease; }
                .press-item:hover .press-img { transform: scale(1.02); }
                .press-media { font-size: 2rem; font-family: var(--font-serif); font-style: italic; line-height: 1; }
                .press-title { font-size: 0.9rem; font-weight: 300; color: #666; line-height: 1.6; }

                @media (max-width: 768px) {
                    nav { padding: 2rem 5vw; }
                    .nav-links { display: none; }
                    .hero-layout { flex-direction: column; align-items: center; padding-top: 20vh; }
                    .hero-img-container { width: 100%; height: 50vh; }
                    .hero-text-container { text-align: center; margin-top: 5vh; }
                    .exhibit-item { width: 75vw; }
                    .press-grid { grid-template-columns: 1fr; }
                    .hero-en { white-space: normal; }
                }
            `}</style>

            <div className="noise-overlay"></div>
            <div className="cursor-follower"><div className="cursor-dot"></div></div>

            <nav ref={navRef}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6rem' }}>
                    <a href="#" className="nav-logo-link" onClick={(e) => {
                        e.preventDefault();
                        // @ts-ignore
                        window.lenis?.scrollTo(0);
                    }}>
                        <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" className="nav-logo" alt="VIS Logo" />
                    </a>
                    <div className="nav-links">
                        <a href="#about" className="nav-link">ABOUT 關於</a>
                        <a href="#exhibition" className="nav-link">EXHIBITION 參展</a>
                        <a href="#vip" className="nav-link">VIP-Looom Club 禮賓入口</a>
                        <a href="#press" className="nav-link">PRESS 媒體</a>
                    </div>
                </div>
                <div>
                    <a href="/vip" className="btn-access">VIP ACCESS</a>
                </div>
            </nav>

            <section className="hero" id="about">
                <div className="hero-layout">
                    <div className="hero-img-container">
                        <img src="hero_main.png" alt="Hero" />
                    </div>
                    <div className="hero-text-container">
                        <p className="hero-zh">
                            VIS 始於2022年，至今已與無數的品味質富人士們，<br />實踐著人文與美感如何展現於美好的生活中。
                        </p>
                        <p className="hero-en">
                            Established in 2024. Curating Aesthetic Dialogues with Spirit.
                        </p>
                    </div>
                </div>
            </section>

            <section className="exhibition-section" id="exhibition">
                <div id="exhibition-trigger">
                <div className="exhibition-scroller">
                    <div className="exhibit-item intro">
                        <h2 className="exhibit-title">EXHIBITION <span>參展</span></h2>
                        <p className="exhibit-intro-zh">
                            不只是一個博覽會，而是一個聚集品味人士<br />所建構而成的高質量場域。
                        </p>
                        <p className="exhibit-intro-en">
                            More than a fair, but a purposefully architected space for intellectual and aesthetic elevation.
                        </p>
                        <a href="mailto:artwithlifetaipei@gmail.com" className="btn-pola" style={{ marginTop: '4rem' }}>Apply 索取2027年簡章</a>
                    </div>

                    <div className="exhibit-item">
                        <div className="img-card">
                            <img src="blue_island.png" className="img-parallax" alt="Blue Island" />
                        </div>
                        <p className="card-text-zh">告別獨立品牌行銷的商業孤島</p>
                        <p className="card-text-en">Bridging the commercial islands of independent branding.</p>
                    </div>

                    <div className="exhibit-item" style={{ paddingTop: '15vh' }}>
                        <div className="img-card">
                            <img src="traditional_formats.png" className="img-parallax" alt="Formats" />
                        </div>
                        <p className="card-text-zh">跳脫傳統展位的框架</p>
                        <p className="card-text-en">Beyond traditional formats.</p>
                    </div>

                    <div className="exhibit-item">
                        <div className="img-card">
                            <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/IMG_4751%20(1).PNG" className="img-parallax" alt="Gallery" />
                        </div>
                        <p className="card-text-zh">精準觸及兼具高消費力與<br />生活美學品味的場域</p>
                        <p className="card-text-en">A curated space for discerning tastes.</p>
                    </div>
                </div>
                </div>
            </section>

            <section className="vip-section" id="vip">
                <div className="vip-portal-wrapper">
                    <h2 className="vip-portal-title" style={{ fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '3rem' }}>VIP ACCESS</h2>
                    <p className="vip-portal-desc">專屬於美感、影響力交會的私密網絡。</p>
                    <p className="vip-portal-en" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', marginBottom: '4rem' }}>An intimate nexus of aesthetics and influence.</p>
                    <a href="/vip" className="btn-pola">VIP ACCESS 貴賓禮賓入口</a>
                </div>
            </section>

            <section className="press-section" id="press">
                <span style={{ fontSize: '10px', letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '2rem', display: 'block', fontWeight: '600' }}>Archive & News</span>
                <h2 className="press-title-main" style={{ fontSize: '2.25rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4rem' }}>PRESS <span>媒體</span></h2>
                <div className="press-grid">
                    <div className="press-item">
                        <div style={{ overflow: 'hidden' }}><img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/GettyImages-2209624027-1024x683.jpg" className="press-img" alt="Press 1" /></div>
                        <h3 className="press-media">artnet</h3>
                        <p className="press-title">New Art Fair Alternative Plans 2026 Launch in Taipei, Hong Kong</p>
                    </div>
                    <div className="press-item">
                        <div style={{ overflow: 'hidden' }}><img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/hong-kong4-1.jpg" className="press-img" alt="Press 2" /></div>
                        <h3 className="press-media">Prestige</h3>
                        <p className="press-title">週末逛街好去處！從時尚、藝術與居家設計感受來自日本、台灣以及香港獨立品牌魅力</p>
                    </div>
                    <div className="press-item">
                        <div style={{ overflow: 'hidden' }}><img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/%E6%9C%A8%E4%BB%8B%E7%94%9F%E6%B4%BBMujieLiving_2025%20Lifestyle%20and%20Art%20Festiva.jpg" className="press-img" alt="Press 3" /></div>
                        <h3 className="press-media">Mujie Living</h3>
                        <p className="press-title">當代社會品味或風格，藝術如何自外於生活？全台首個以生活為核心的藝術節</p>
                    </div>
                    <div className="press-item">
                        <div style={{ overflow: 'hidden' }}><img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/mottimes_images_3620230407121417.jpeg" className="press-img" alt="Press 4" /></div>
                        <h3 className="press-media">Mujie Living</h3>
                        <p className="press-title">來自台灣獨立品牌們的聲音！匯聚20組質感設計品牌、3位藝術家，2023 vis ™ - gratia 藝術與生活風格博覽會</p>
                    </div>
                    <div className="press-item">
                        <div style={{ overflow: 'hidden' }}><img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/172535144791714_P22278065.jpg" className="press-img" alt="Press 5" /></div>
                        <h3 className="press-media">Tatler Taiwan</h3>
                        <p className="press-title">跳脫代工思維的質感品牌，若僅透過網路其質地如何能傳遞？ 這次獨立品牌不單打獨鬥，共11個品牌齊聲同台</p>
                    </div>
                    <div className="press-item">
                        <div style={{ overflow: 'hidden' }}><img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/atl_m_230023176_260.jpg" className="press-img" alt="Press 6" /></div>
                        <h3 className="press-media">Tatler Taiwan</h3>
                        <p className="press-title">2023 vis™️-wild 藝術與潮流聯合文化祭重磅登場，這間「GD 愛店」也參展！</p>
                    </div>
                    <div className="press-item">
                        <div style={{ overflow: 'hidden' }}><img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/02104210-0-1_cover_1600x1201.jpeg" className="press-img" alt="Press 7" /></div>
                        <h3 className="press-media">聯合報 - 500輯</h3>
                        <p className="press-title">首屆 vis-gratia 藝術與生活風格博覽會：匯集20個台灣設計師品牌、3組當代藝術</p>
                    </div>
                    <div className="press-item">
                        <div style={{ overflow: 'hidden' }}><img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/d8ca1a39-6bfb-40a3-8fa6-1ae3fba45157-172465816.jpg" className="press-img" alt="Press 8" /></div>
                        <h3 className="press-media">聯合報 - 500輯</h3>
                        <p className="press-title">2023vis™-wild藝術與潮流文化祭！限期三天，酉5PM TWCAUDE攜10組設計品牌、藝術家亮相</p>
                    </div>
                    <div className="press-item">
                        <div style={{ overflow: 'hidden' }}><img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/mottimes_images_8120230407121424.jpg" className="press-img" alt="Press 9" /></div>
                        <h3 className="press-media">Mujie Living</h3>
                        <p className="press-title">永續設計、文化思維，來自台灣獨立品牌們的聲音：匯聚20組質感設計品牌、3位藝術家</p>
                    </div>
                    <div className="press-item">
                        <div style={{ overflow: 'hidden' }}><img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/3e696a6ac6ae77c4822c5f5daf23a7f8.jpeg" className="press-img" alt="Press 10" /></div>
                        <h3 className="press-media">Mujie Living</h3>
                        <p className="press-title">一個聚集「美」的市集：3 個必逛品牌，從減法保養到最美保健食品！</p>
                    </div>
                    <div className="press-item">
                        <div style={{ overflow: 'hidden' }}><img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/800x.jpg" className="press-img" alt="Press 11" /></div>
                        <h3 className="press-media">YAHOO NEWS</h3>
                        <p className="press-title">11組設計師原創品牌同台！2023 vis ™ – terra設計與生活風格博覽會 置身喧囂城市之外</p>
                    </div>
                </div>
            </section>

            <footer style={{ padding: '10vh 10vw', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/VIS%20LOGO_%E5%B7%A5%E4%BD%9C%E5%8D%80%E5%9F%9F%201%20(1).png" style={{ height: '24px', opacity: 0.3, marginBottom: '2rem' }} alt="Footer Logo" />
                <div style={{ marginBottom: '2rem' }}>
                    <a href="https://www.instagram.com/vis_for_the_arts/" target="_blank" style={{ color: 'var(--text)', textDecoration: 'none', opacity: 0.4 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </a>
                </div>
                <div style={{ marginBottom: '2rem', fontSize: '11px', letterSpacing: '0.1em', lineHeight: 2, opacity: 0.6 }}>
                    <p>欲聯繫 參展 TEAM 請至 artwithlifetaipei@gmail.com</p>
                    <p>欲聯繫 貴賓 TEAM 請至 visvipteam@gmail.com</p>
                </div>
                <p style={{ fontSize: '9px', letterSpacing: '0.4em', opacity: 0.3 }}>&copy; 2026 VIS FOR THE ARTS. ALL RIGHTS RESERVED.</p>
            </footer>
        </main>
    );
}
