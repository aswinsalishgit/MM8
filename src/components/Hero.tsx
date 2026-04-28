"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function Hero() {
  const router = useRouter();

  return (
    <section 
      className="relative h-full flex flex-col justify-center px-6 md:px-16 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto w-full z-10 flex flex-col items-center text-center px-4 mt-20 md:mt-0">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="mb-6 px-4 py-1 border border-brand-red-neon/30 bg-brand-red-neon/5 inline-block">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-brand-red-neon">
              App Purpose: A secure talent discovery platform using Google Drive for portfolio management.
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-[7rem] lg:text-[8.5rem] font-black leading-[0.9] md:leading-[0.85] tracking-tighter text-white uppercase mb-6">
            TALENT IS<br />
            <span className="text-brand-red-neon drop-shadow-[0_0_20px_rgba(255,49,49,0.4)]">BROKEN</span>
          </h1>
          <h2 className="text-lg sm:text-xl md:text-3xl font-bold uppercase tracking-[0.2em] md:tracking-widest text-zinc-500 mb-10 md:mb-16">
            GATEKEEPERS LOSE <span className="text-white">TODAY</span>
          </h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-6 md:gap-8 w-full sm:w-auto"
        >
          <button 
            onClick={() => router.push("/auth")}
            className="px-10 md:px-12 py-5 md:py-6 bg-brand-red-neon text-white font-black text-xl md:text-2xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all duration-500 brutal-border-red shadow-[0_0_40px_rgba(255,49,49,0.3)] cursor-pointer"
            style={{ clipPath: "polygon(15% 0, 100% 0, 100% 75%, 85% 100%, 0 100%, 0 25%)" }}
          >
            Get Started
          </button>
          <button 
            onClick={() => router.push("/learn-more")}
            className="px-10 md:px-12 py-5 md:py-6 glass-button text-white font-black text-xl md:text-2xl uppercase tracking-tighter cursor-pointer"
            style={{ clipPath: "polygon(0 0, 85% 0, 100% 25%, 100% 100%, 15% 100%, 0 75%)" }}
          >
            Learn More
          </button>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-16 text-xs font-bold uppercase tracking-[0.5em] text-zinc-700 max-w-lg"
        >
          The decentralized system for discovering, proving, and deploying next-generation talent.
        </motion.p>
      </div>
    </section>
  );
}
