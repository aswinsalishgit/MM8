"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import BackgroundCanvas from "@/components/BackgroundCanvas";

import { supabase } from "@/utils/supabase/client";

export default function CompletionTransitionFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<"REWARD" | "REVEAL">("REWARD");

  useEffect(() => {
    const completeOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ status: 'VERIFIED' })
          .eq('id', user.id);
      }
    };
    completeOnboarding();
  }, []);

  useEffect(() => {
    if (phase === "REWARD") {
      const timer = setTimeout(() => {
        setPhase("REVEAL");
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const enterDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-center px-6 md:px-16 overflow-hidden relative">
      <BackgroundCanvas />
      
      <AnimatePresence mode="wait">
        
        {phase === "REWARD" && (
          <motion.div
            key="reward"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center text-center w-full max-w-5xl mx-auto z-10"
          >
            {/* The Stamping Effect */}
            <motion.div
              initial={{ scale: 5, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
              className="border-[16px] border-brand-red-neon text-brand-red-neon px-16 py-8 mb-16 shadow-[0_0_100px_rgba(255,49,49,0.5)] clip-brutal-tl"
            >
              <h1 className="text-5xl md:text-[14rem] font-black uppercase tracking-tighter leading-none">
                VERIFIED
              </h1>
            </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-4xl md:text-8xl font-black uppercase tracking-tighter mb-6 leading-none"
            >
              UPLINK <span className="text-brand-red-neon drop-shadow-[0_0_15px_rgba(255,49,49,0.5)]">STABLE</span>
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-lg md:text-2xl font-black text-zinc-600 uppercase tracking-[0.3em] mb-16"
            >
              Your digital footprint is now active on the <span className="text-white">MM8</span> network.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.8, type: "spring" }}
              className="glass-panel brutal-border-red p-12 w-full max-w-xl relative overflow-hidden clip-brutal-slant"
            >
              <div className="absolute top-0 left-0 h-3 bg-brand-red-neon w-[72%] shadow-[0_0_20px_rgba(255,49,49,1)]"></div>
              <h3 className="text-xl font-black uppercase text-zinc-500 tracking-[0.4em]">NETWORK_AUTHORITY_SYNC</h3>
              <div className="text-6xl md:text-9xl font-black text-white tracking-tighter mt-4 tabular-nums">72<span className="text-2xl md:text-3xl text-brand-red-neon">%</span></div>
            </motion.div>
          </motion.div>
        )}

        {phase === "REVEAL" && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full max-w-6xl mx-auto z-10"
          >
            <div className="border-l-[16px] border-brand-red-neon pl-10 md:pl-16 mb-24">
              <motion.h2 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-6xl md:text-[10rem] font-black uppercase tracking-tighter mb-10 leading-[0.8] text-white"
              >
                SYSTEM MATCHED <span className="text-brand-red-neon drop-shadow-[0_0_20px_rgba(255,49,49,0.5)]">08</span><br />OPPORTUNITIES
              </motion.h2>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex flex-wrap gap-16"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-black text-zinc-600 tracking-[0.5em] mb-2 uppercase">PIPELINE_NODES</span>
                  <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white">
                    <span className="text-brand-red-neon">03</span> LOCAL
                  </h3>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-zinc-600 tracking-[0.5em] mb-2 uppercase">ACTIVE_VIEWERS</span>
                  <h3 className="text-3xl md:text-6xl font-black uppercase tracking-tighter text-white">
                    <span className="text-brand-red-neon">02</span> SYNCED
                  </h3>
                </div>
              </motion.div>
            </div>

            {/* Blurred Variable Rewards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-24 pointer-events-none select-none">
              {[1, 2].map((item, i) => (
                <motion.div 
                  key={item}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5 + (i * 0.2) }}
                  className={`p-12 glass-panel brutal-border-red flex flex-col gap-8 relative overflow-hidden ${
                    i === 0 ? 'clip-brutal-tl' : 'clip-brutal-tr'
                  }`}
                >
                  <div className="flex justify-between items-start blur-[15px]">
                    <div className="w-2/3 h-12 bg-zinc-900"></div>
                    <div className="w-24 h-12 bg-brand-red-neon/20"></div>
                  </div>
                  <div className="w-full h-4 bg-zinc-950 blur-[10px] mt-8"></div>
                  <div className="w-4/5 h-4 bg-zinc-950 blur-[10px]"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-brand-red-neon text-5xl font-black uppercase tracking-[0.3em] drop-shadow-[0_0_20px_rgba(255,49,49,0.8)] -rotate-3">DECRYPTING...</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2 }}
              onClick={enterDashboard}
              className="w-full relative group p-12 bg-brand-red-neon text-white transition-all duration-700 shadow-[0_0_80px_rgba(255,49,49,0.4)] clip-brutal-hero-primary hover:bg-white hover:text-black hover:shadow-[0_0_120px_rgba(255,49,49,0.6)]"
            >
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 group-hover:scale-105 transition-transform duration-500">
                <span className="text-3xl md:text-7xl font-black uppercase tracking-tighter">ENTER DASHBOARD</span>
                <svg className="w-10 h-10 md:w-16 md:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="6"><path strokeLinecap="square" d="M13 5l7 7-7 7M5 12h15"></path></svg>
              </div>
            </motion.button>
          </motion.div>
        )}
        
      </AnimatePresence>
    </main>
  );
}
