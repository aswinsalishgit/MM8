"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

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
      
      <button 
        onClick={() => router.push("/onboarding/actor")}
        className="absolute top-8 left-8 md:top-12 md:left-16 z-20 flex items-center gap-2 text-zinc-500 hover:text-white font-black uppercase tracking-widest text-xs transition-colors group cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        BACK
      </button>

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
        </div>
          
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          onClick={enterDashboard}
          className="w-full relative group p-12 bg-brand-red-neon text-white transition-all duration-700 shadow-[0_0_80px_rgba(255,49,49,0.4)] clip-brutal-hero-primary hover:bg-white hover:text-black hover:shadow-[0_0_120px_rgba(255,49,49,0.6)] cursor-pointer"
        >
          <div className="relative z-10 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            <span className="text-3xl md:text-7xl font-black uppercase tracking-tighter text-center">ENTER DASHBOARD</span>
          </div>
        </motion.button>
      </motion.div>
    </main>
  );
}
