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

          {/* System Purpose Section */}
          <section className="relative z-10 px-6 md:px-16 py-24 bg-zinc-950/50 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
              <div>
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-8">
                  THE SYSTEM <br/>
                  <span className="text-brand-red-neon">OBJECTIVE</span>
                </h2>
                <div className="brutal-border-red p-1 bg-brand-red-neon w-20 mb-8" />
              </div>
              <div className="space-y-6 text-zinc-400 font-medium text-lg md:text-xl leading-relaxed">
                <p>
                  MM8 is an elite discovery ecosystem designed to bridge the gap between <span className="text-white font-bold">world-class directors</span> and <span className="text-white font-bold">raw talent</span>. 
                </p>
                <p>
                  By dismantling traditional industry barriers, we provide a secure, high-fidelity pipeline for talent to showcase their capabilities. Our integrated system leverages secure Google Drive infrastructure to manage your portfolio and audition assets, ensuring that your work is seen by those who matter—without the interference of gatekeepers.
                </p>
                <div className="pt-8 flex gap-4">
                  <div className="px-4 py-2 brutal-border-zinc text-[10px] font-black uppercase tracking-widest text-zinc-500">Talent Discovery</div>
                  <div className="px-4 py-2 brutal-border-zinc text-[10px] font-black uppercase tracking-widest text-zinc-500">Secure Storage</div>
                  <div className="px-4 py-2 brutal-border-zinc text-[10px] font-black uppercase tracking-widest text-zinc-500">Direct Pipeline</div>
                </div>
              </div>
            </div>
          </section>

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
