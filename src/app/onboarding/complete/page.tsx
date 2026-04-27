"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import BackgroundCanvas from "@/components/BackgroundCanvas";

import { supabase } from "@/utils/supabase/client";

export default function CompletionTransitionFlow() {
  const router = useRouter();

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

  const enterDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-center px-6 md:px-16 overflow-hidden relative">
      <BackgroundCanvas />
      
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col w-full max-w-6xl mx-auto z-10"
      >
        <div className="border-l-[16px] border-brand-red-neon pl-10 md:pl-16 mb-24">
          <motion.h2 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-8xl font-black uppercase tracking-tighter mb-10 leading-[1.1] text-white"
          >
            You’re all set.<br />
            Your profile is now ready to be discovered.<br />
            <span className="text-brand-red-neon drop-shadow-[0_0_20px_rgba(255,49,49,0.5)]">
              Enter your dashboard to unlock opportunities tailored to your potential.
            </span>
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

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          onClick={enterDashboard}
          className="w-full relative group p-12 bg-brand-red-neon text-white transition-all duration-700 shadow-[0_0_80px_rgba(255,49,49,0.4)] clip-brutal-hero-primary hover:bg-white hover:text-black hover:shadow-[0_0_120px_rgba(255,49,49,0.6)]"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 group-hover:scale-105 transition-transform duration-500">
            <span className="text-3xl md:text-7xl font-black uppercase tracking-tighter">ENTER DASHBOARD</span>
            <svg className="w-10 h-10 md:w-16 md:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="6"><path strokeLinecap="square" d="M13 5l7 7-7 7M5 12h15"></path></svg>
          </div>
        </motion.button>
      </motion.div>
    </main>
  );
}
