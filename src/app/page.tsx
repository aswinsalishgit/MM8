"use client";

import { useState } from "react";
import BackgroundCanvas from "@/components/BackgroundCanvas";
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
          <BackgroundCanvas />
          <Navbar />
          
          <div className="flex-1 relative flex flex-col">
            <Hero />
          </div>

        </main>
      )}
    </>
  );
}
