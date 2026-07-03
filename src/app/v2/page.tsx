'use client';

import { useEffect, useRef, useState } from 'react';

export default function V2LandingPage() {
    const navRef = useRef<HTMLElement>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                .v2-hero-text { max-width: 500px; text-align: right; }
                .v2-hero-zh { font-size: 1.625rem; font-weight: 300; line-height: 2; margin-bottom: 2rem; color: #444; }
                .v2-hero-en { 
                    font-family: var(--v2-font-serif); font-style: italic;
                    font-size: 3.25rem; line-height: 1.1; color: var(--v2-text);
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

                @media (max-width: 768px) {
                    nav { padding: 1.5rem 6vw; }
                    .v2-nav-links { display: none; }
                    .v2-hero { flex-direction: column; padding-bottom: 10vh; }
                    .v2-hero-img-box { width: 85vw; height: 45vh; position: relative; top: 0; left: 0; margin-bottom: 5vh; }
                    .v2-hero-text { text-align: left; }
                    .v2-hero-zh { font-size: 1.3rem; }
                    .v2-hero-en { font-size: 2.25rem; }
                    .v2-exhibition-scroller { gap: 15vw; padding: 0 6vw; }
                    .v2-exhibit-intro { width: 80vw; }
                    .v2-card { width: 80vw; }
                    .v2-press-item { grid-column: span 12; }
                    .v2-press-item:nth-child(even) { margin-top: 0; }
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
                    <a href="#about" className="v2-nav-link">About</a>
                    <a href="#exhibition" className="v2-nav-link">Exhibition</a>
                    <a href="#vip" className="v2-nav-link">VIP Club</a>
                    <a href="#press" className="v2-nav-link">Press</a>
                </div>
                <a href="/vip" className="v2-btn-magnetic" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textDecoration: 'none', color: 'inherit', border: '1px solid #000', padding: '0.6rem 1.2rem' }}>Access</a>
            </nav>

            <section className="v2-hero" id="about">
                <div className="v2-hero-img-box">
                    <img src="/hero_main_new.jpg" className="v2-parallax" alt="VIS Hero" />
                </div>
                <div className="v2-hero-content">
                    <div className="v2-hero-text">
                        <p className="v2-hero-zh v2-reveal">
                            VIS 始於2022年，至今已與無數的品味質富人士們，實踐著人文與美感如何展現於美好的生活中。
                        </p>
                        <h1 className="v2-hero-en v2-reveal">
                            Established in 2024.<br />
                            Curating Aesthetic Dialogues with Spirit.
                        </h1>
                    </div>
                </div>
            </section>

            <section className="v2-exhibition-section" id="exhibition">
                <div className="v2-exhibition-scroller">
                    <div className="v2-exhibit-intro">
                        <span className="v2-section-subtitle">Exhibition</span>
                        <h2 className="v2-section-title">Beyond The Frames.</h2>
                        <p>不只是一個博覽會，而是一個聚集品味人士所建構而成的高質量場域。</p>
                        <a href="mailto:artwithlifetaipei@gmail.com" className="v2-btn-gold v2-btn-magnetic">Apply for 2027</a>
                    </div>

                    <div className="v2-card">
                        <div className="v2-card-img-wrap">
                            <img src="blue_island.png" className="v2-parallax" alt="Blue Island" />
                        </div>
                        <div className="v2-card-info">
                            <h3 className="v2-card-title">Blue Island</h3>
                            <span className="v2-card-tag">Branding / Strategy</span>
                        </div>
                    </div>

                    <div className="v2-card" style={{ marginTop: '10vh' }}>
                        <div className="v2-card-img-wrap">
                            <img src="traditional_formats.png" className="v2-parallax" alt="Formats" />
                        </div>
                        <div className="v2-card-info">
                            <h3 className="v2-card-title">Traditional Formats</h3>
                            <span className="v2-card-tag">Exhibition / Design</span>
                        </div>
                    </div>

                    <div className="v2-card">
                        <div className="v2-card-img-wrap">
                            <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/IMG_4751%20(1).PNG" className="v2-parallax" alt="Gallery" />
                        </div>
                        <div className="v2-card-info">
                            <h3 className="v2-card-title">Curated Gallery</h3>
                            <span className="v2-card-tag">Space / Lifestyle</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="v2-vip-section" id="vip">
                <div className="v2-vip-box v2-reveal">
                    <span className="v2-section-subtitle">Exclusive</span>
                    <h2 className="v2-vip-desc">專屬於美感、影響力交會的私密網絡。</h2>
                    <p style={{ opacity: 0.4, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>An intimate nexus of aesthetics and influence.</p>
                    <a href="/vip" className="v2-btn-gold v2-btn-magnetic">VIP ACCESS 貴賓禮賓入口</a>
                    <div style={{ marginTop: '3.5rem', fontSize: '0.75rem', letterSpacing: '0.08em', color: '#666666', lineHeight: '1.8' }}>
                        如有貴賓服務相關等任何垂詢，請聯絡VIP辦公室 <a href="mailto:visvipteam@gmail.com" style={{ color: '#C9A96E', textDecoration: 'underline' }}>visvipteam@gmail.com</a>。<br/>
                        <span style={{ fontSize: '0.65rem', color: '#999999', display: 'block', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            For any inquiries regarding VIP services, please contact the VIP Office at <a href="mailto:visvipteam@gmail.com" style={{ color: '#C9A96E', textDecoration: 'underline' }}>visvipteam@gmail.com</a>.
                        </span>
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
                        <p className="v2-press-title">週末逛街好去處！從時尚、藝術與居家設計感受來自日本、台灣以及香港品牌魅力</p>
                    </div>
                    <div className="v2-press-item v2-reveal">
                        <img src="https://img1.wsimg.com/isteam/ip/e6b4acac-1653-4d0e-9e55-ed5572206955/172535144791714_P22278065.jpg" className="v2-press-img" alt="Press" />
                        <h3 className="v2-press-media">Tatler</h3>
                        <p className="v2-press-title">跳脫代工思維的質感品牌，若僅透過網路其質地如何能傳遞？這次獨立品牌不單打獨鬥</p>
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
                <p style={{ fontSize: '9px', letterSpacing: '0.4em', opacity: 0.2 }}>&copy; 2026 VIS FOR THE ARTS. ALL RIGHTS RESERVED.</p>
            </footer>
        </main>
    );
}
