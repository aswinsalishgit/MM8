"use client";

import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LearnMore() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden selection:bg-brand-red-neon selection:text-white flex flex-col bg-black">
      <Navbar />
      
      <div className="flex-1 relative z-10 pt-40 md:pt-56 px-6 md:px-16 max-w-7xl mx-auto w-full pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter text-white mb-12 uppercase leading-[0.85]">
            THE <span className="text-brand-red-neon drop-shadow-[0_0_30px_rgba(255,49,49,0.5)]">AGENTIC</span><br/>LAYER
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-24">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel p-10 md:p-14 brutal-border-red group hover:bg-brand-red-deep/5 transition-all"
            >
              <h2 className="text-4xl md:text-5xl font-black text-white mb-8 uppercase tracking-tighter flex items-center gap-4">
                <span className="text-brand-red-neon">01 //</span> THE PROBLEM
              </h2>
              <p className="text-zinc-400 text-xl leading-relaxed font-medium">
                The legacy talent industry is built on gatekeeping, opaque networks, and centralized control. Talent is commoditized, and opportunity is limited by who you know. <span className="text-white">The system is rigged against the raw and the unproven.</span>
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-panel p-10 md:p-14 brutal-border group hover:bg-white/5 transition-all"
            >
              <h2 className="text-4xl md:text-5xl font-black text-white mb-8 uppercase tracking-tighter flex items-center gap-4">
                <span className="text-white">02 //</span> THE SOLUTION
              </h2>
              <p className="text-zinc-400 text-xl leading-relaxed font-medium">
                MM8 is a decentralized agentic layer that empowers creators. We use AI agents to understand intent, verify history, and connect talent directly to global pipelines. <span className="text-brand-red-neon">We bypass the gatekeepers entirely.</span>
              </p>
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-32 flex flex-col items-center text-center max-w-4xl mx-auto"
          >
            <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-12">
              READY TO JOIN THE <span className="text-brand-red-neon underline decoration-4 underline-offset-8">RESISTANCE?</span>
            </h2>
            <Link 
              href="/auth"
              className="px-20 py-8 bg-brand-red-neon text-white font-black text-3xl uppercase tracking-tighter hover:bg-white hover:text-black transition-all duration-500 brutal-border-red shadow-[0_0_60px_rgba(255,49,49,0.4)] clip-brutal-hero-primary"
            >
              Get Started
            </Link>
            
            <p className="mt-16 text-zinc-700 font-black uppercase tracking-[0.6em] text-xs">
              INITIALIZING DECENTRALIZED PROTOCOLS
            </p>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
