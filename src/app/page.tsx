"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const HEADLINES = [
  "TALENT IS BROKEN. NETWORKS ARE RIGGED. ENTER MM8.",
  "THE GATEKEEPERS LOSE TODAY.",
  "RAW TALENT DESERVES A STAGE.",
];

function Counter({ to, duration, label }: { to: number; duration: number; label: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(ease * to));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [to, duration]);

  return (
    <div className="flex flex-col border-l-8 border-mm8-red pl-6 py-2 uppercase tracking-tighter">
      <span className="text-5xl md:text-7xl font-black text-white leading-none tabular-nums">
        {count.toLocaleString()}
      </span>
      <span className="text-sm md:text-lg font-bold text-mm8-red mt-2">
        {label}
      </span>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [headlineIndex, setHeadlineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % HEADLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white selection:bg-mm8-red selection:text-white flex flex-col justify-center px-6 md:px-16 py-24 relative overflow-hidden">
      
      {/* Abstract background noise/grid can go here */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDAwIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')]"></div>

      <div className="max-w-screen-2xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 z-10 relative">
        
        {/* Left Column: Headlines & CTAs */}
        <div className="lg:col-span-8 flex flex-col justify-center">
          
          {/* Headline Container - Fixed height to prevent layout shifts */}
          <div className="h-[280px] md:h-[350px] lg:h-[400px] mb-12 relative">
            <AnimatePresence mode="wait">
              <motion.h1
                key={headlineIndex}
                initial={{ opacity: 0, y: 30, skewX: 15 }}
                animate={{ opacity: 1, y: 0, skewX: 0 }}
                exit={{ opacity: 0, y: -30, skewX: -15, filter: "blur(8px)" }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-6xl md:text-8xl lg:text-[7.5rem] font-black uppercase leading-[0.85] tracking-tighter absolute inset-0"
                style={{ textShadow: "6px 6px 0px var(--color-mm8-red)" }}
              >
                {HEADLINES[headlineIndex]}
              </motion.h1>
            </AnimatePresence>
          </div>

          <div className="flex flex-col md:flex-row flex-wrap gap-6 mt-8 md:mt-0">
            {/* CTA 1 */}
            <button 
              onClick={() => router.push("/auth")}
              className="group relative px-10 py-6 bg-black text-white font-black text-2xl md:text-3xl uppercase tracking-tighter border-4 border-white overflow-hidden transition-colors duration-300 w-full md:w-auto"
            >
              <span className="relative z-10 group-hover:text-black transition-colors duration-300">I WANT IN</span>
              <div className="absolute inset-0 bg-mm8-red scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-[0.22,1,0.36,1] z-0"></div>
            </button>
            
            {/* CTA 2 */}
            <button 
              onClick={() => router.push("/auth")}
              className="group relative px-10 py-6 bg-black text-mm8-red font-black text-xl md:text-2xl uppercase tracking-tighter border-4 border-mm8-red hover:bg-mm8-red hover:text-black transition-all duration-300 w-full md:w-auto"
            >
              DISCOVER TALENT
            </button>
            
            {/* CTA 3 */}
            <button 
              onClick={() => router.push("/auth")}
              className="group relative px-10 py-6 bg-black text-white font-black text-xl md:text-2xl uppercase tracking-tighter border-4 border-zinc-800 hover:border-white transition-all duration-300 w-full md:w-auto"
            >
              START CASTING
            </button>
          </div>
        </div>

        {/* Right Column: Counters */}
        <div className="lg:col-span-4 flex flex-col justify-end lg:justify-center gap-16 lg:pl-16 mt-12 lg:mt-0 relative before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-zinc-900 hidden md:flex">
          <Counter to={18204} duration={2500} label="talents waiting" />
          <Counter to={311} duration={2500} label="active casting calls" />
          <Counter to={92} duration={2500} label="auditions closing soon" />
        </div>

        {/* Mobile Counters */}
        <div className="md:hidden flex flex-col gap-10 mt-12 border-t-4 border-zinc-900 pt-12">
          <Counter to={18204} duration={2500} label="talents waiting" />
          <Counter to={311} duration={2500} label="active casting calls" />
          <Counter to={92} duration={2500} label="auditions closing soon" />
        </div>
      </div>

      {/* Decorative brutalist elements */}
      <div className="absolute top-0 right-0 p-6 md:p-12 flex justify-end">
        <span className="text-mm8-red font-black text-3xl md:text-5xl tracking-tighter mix-blend-difference">MM8 // MVP</span>
      </div>
      <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full border-t-4 border-mm8-red flex flex-col md:flex-row justify-between items-start md:items-center bg-black gap-2">
        <span className="text-white font-bold uppercase tracking-widest text-xs md:text-sm">System Active: MOLLYWOOD_SEC_01</span>
        <span className="text-mm8-red font-bold uppercase tracking-widest text-xs md:text-sm animate-pulse">Establishing Connection...</span>
      </div>
    </main>
  );
}
