"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SplashScreen from "@/components/SplashScreen";

export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <SplashScreen onComplete={() => setShowSplash(false)} />
      
      {!showSplash && (
        <main className="relative h-screen w-full overflow-hidden selection:bg-brand-red-neon selection:text-white flex flex-col">
          <Navbar />
          
          <div className="flex-1 relative flex flex-col">
            <Hero />
          </div>

          {/* Minimalist Legal Footer */}
          <footer className="relative z-10 px-6 py-8 border-t border-white/5 bg-black/20 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">
              <div className="flex items-center gap-8">
                <a href="/privacy" className="hover:text-brand-red-neon transition-colors">Privacy Policy</a>
                <a href="/terms" className="hover:text-brand-red-neon transition-colors">Terms of Service</a>
              </div>
              <div className="text-zinc-600">
                © 2026 MM8 SYSTEM — ALL RIGHTS RESERVED
              </div>
            </div>
          </footer>
        </main>
      )}
    </>
  );
}
