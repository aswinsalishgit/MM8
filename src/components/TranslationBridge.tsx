'use client';

import { useEffect } from 'react';

export default function TranslationBridge() {
  useEffect(() => {
    // Initialize Google Translate
    window.googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,ml,ta,hi,te,kn,es,fr,de,zh-CN,ja',
        autoDisplay: false
      }, 'google_translate_element');
    };

    // Aggressively remove Google Translate UI
    const observer = new MutationObserver(() => {
      const banner = document.querySelector('.goog-te-banner-frame');
      if (banner) {
        banner.remove();
        document.body.style.top = '0px';
      }
      const skiptranslate = document.querySelectorAll('.skiptranslate');
      skiptranslate.forEach(el => {
        if (el.innerHTML.includes('google')) {
          (el as HTMLElement).style.display = 'none';
        }
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div 
      id="google_translate_element" 
      style={{ display: 'none' }} 
      aria-hidden="true"
    />
  );
}
