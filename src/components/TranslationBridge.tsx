'use client';

import { useEffect } from 'react';

export default function TranslationBridge() {
  useEffect(() => {
    // Prevent React from crashing when Google Translate modifies the DOM
    const handleError = (e: ErrorEvent) => {
      if (e.message?.includes('removeChild') || e.message?.includes('Node')) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };
    window.addEventListener('error', handleError);

    // Initialize Google Translate
    window.googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,ml,ta,hi,te,kn,es,fr,de,zh-CN,ja',
        autoDisplay: false
      }, 'google_translate_element');
    };

    // Aggressively remove Google Translate UI and fix DOM conflicts
    const observer = new MutationObserver(() => {
      const banner = document.querySelector('.goog-te-banner-frame');
      if (banner) {
        banner.remove();
        document.body.style.top = '0px';
      }
      
      // Remove any font tags Google Translate might inject which break React
      const fontTags = document.querySelectorAll('font');
      if (fontTags.length > 0) {
        fontTags.forEach(font => {
          if (font.id) font.removeAttribute('id');
        });
      }

      const skiptranslate = document.querySelectorAll('.skiptranslate');
      skiptranslate.forEach(el => {
        if (el.innerHTML.includes('google')) {
          (el as HTMLElement).style.display = 'none';
        }
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div 
      id="google_translate_element" 
      style={{ display: 'none' }} 
      aria-hidden="true"
    />
  );
}
