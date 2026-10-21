'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ExhibitorLang = 'zh' | 'en';

interface ExhibitorLanguageContextType {
  lang: ExhibitorLang;
  setLang: (lang: ExhibitorLang) => void;
  toggleLang: () => void;
  t: (zhText: string, enText: string) => string;
}

const ExhibitorLanguageContext = createContext<ExhibitorLanguageContextType>({
  lang: 'zh',
  setLang: () => {},
  toggleLang: () => {},
  t: (zhText) => zhText,
});

export function ExhibitorLanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<ExhibitorLang>('zh');

  // 1. Monkey-patch Node DOM operations once on mount to prevent Google Translate React removeChild crashes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!(window as any).__googleTranslateDomPatched) {
      (window as any).__googleTranslateDomPatched = true;
      const originalRemoveChild = Node.prototype.removeChild;
      Node.prototype.removeChild = function <T extends Node>(child: T): T {
        if (child.parentNode !== this) {
          return child;
        }
        return originalRemoveChild.apply(this, [child]) as T;
      };

      const originalInsertBefore = Node.prototype.insertBefore;
      Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
        if (referenceNode && referenceNode.parentNode !== this) {
          return newNode;
        }
        return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
      };
    }

    // 2. Setup Google Translate initialization callback
    (window as any).googleTranslateElementInit = () => {
      try {
        if ((window as any).google && (window as any).google.translate) {
          new (window as any).google.translate.TranslateElement(
            {
              pageLanguage: 'zh-TW',
              includedLanguages: 'en,zh-TW',
              autoDisplay: false,
            },
            'google_translate_element'
          );

          // If current language is English, apply translation after initialization
          const savedLang = localStorage.getItem('vis_portal_lang');
          if (savedLang === 'en') {
            setTimeout(() => {
              const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
              if (select && select.value !== 'en') {
                select.value = 'en';
                select.dispatchEvent(new Event('change'));
              }
            }, 400);
          }
        }
      } catch (err) {
        console.warn('Google Translate initialization:', err);
      }
    };

    // 3. Inject Google Translate script if not already present
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }

    // 4. Load persisted language preference
    try {
      const saved = localStorage.getItem('vis_portal_lang') as ExhibitorLang | null;
      if (saved === 'en' || saved === 'zh') {
        setLangState(saved);
        if (saved === 'en') {
          triggerGoogleTranslate('en');
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const triggerGoogleTranslate = (targetLang: 'zh' | 'en') => {
    try {
      if (typeof window === 'undefined') return;

      const hostname = window.location.hostname;
      const googleLang = targetLang === 'en' ? 'en' : 'zh-TW';

      if (targetLang === 'en') {
        document.cookie = `googtrans=/zh-TW/en; path=/;`;
        document.cookie = `googtrans=/zh-TW/en; domain=${hostname}; path=/;`;
      } else {
        document.cookie = `googtrans=/zh-TW/zh-TW; path=/;`;
        document.cookie = `googtrans=/zh-TW/zh-TW; domain=${hostname}; path=/;`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=${hostname}; path=/;`;
      }

      // Check if google translate select element is available
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
      if (select) {
        select.value = googleLang;
        select.dispatchEvent(new Event('change'));
      }
    } catch (e) {
      console.warn('Translate trigger error:', e);
    }
  };

  const setLang = (newLang: ExhibitorLang) => {
    setLangState(newLang);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('vis_portal_lang', newLang);
      }
    } catch {}
    triggerGoogleTranslate(newLang);
  };

  const toggleLang = () => {
    const next = lang === 'zh' ? 'en' : 'zh';
    setLang(next);
  };

  const t = (zhText: string, enText: string) => {
    return lang === 'en' ? enText : zhText;
  };

  return (
    <ExhibitorLanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {/* Hidden Google Translate container */}
      <div id="google_translate_element" style={{ display: 'none' }} className="hidden pointer-events-none opacity-0" />
      {/* Global CSS to suppress ugly Google Translate toolbar / banner & tooltips */}
      <style dangerouslySetInnerHTML={{ __html: `
        .goog-te-banner-frame { display: none !important; }
        .goog-te-balloon-frame { display: none !important; }
        #goog-gt-tt { display: none !important; }
        .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
        .skiptranslate { display: none !important; }
        body { top: 0px !important; position: static !important; }
      `}} />
      {children}
    </ExhibitorLanguageContext.Provider>
  );
}

export function useExhibitorLanguage() {
  return useContext(ExhibitorLanguageContext);
}
