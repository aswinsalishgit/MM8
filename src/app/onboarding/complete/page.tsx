"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function CompletionTransitionFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<"REWARD" | "REVEAL">("REWARD");

  useEffect(() => {
    // Automatically transition to REVEAL after the dopamine hit
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
      <AnimatePresence mode="wait">
        
        {phase === "REWARD" && (
          <motion.div
            key="reward"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center text-center w-full max-w-4xl mx-auto"
          >
            {/* The Stamping Effect */}
            <motion.div
              initial={{ scale: 5, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
              className="border-8 border-green-500 text-green-500 px-8 py-4 mb-12 shadow-[0_0_50px_rgba(34,197,94,0.3)]"
            >
              <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-none">
                VERIFIED
              </h1>
            </motion.div>

            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4"
            >
              Profile Created.
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-xl md:text-2xl font-bold text-zinc-400 uppercase tracking-tight mb-12"
            >
              You are now visible to casting networks.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.8, type: "spring" }}
              className="bg-zinc-900 border-4 border-zinc-800 p-8 w-full max-w-md relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 h-1 bg-green-500 w-[72%]"></div>
              <h3 className="text-2xl font-black uppercase text-zinc-500 tracking-widest">Profile Strength</h3>
              <div className="text-7xl font-black text-white tracking-tighter mt-2">72%</div>
            </motion.div>
          </motion.div>
        )}

        {phase === "REVEAL" && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full max-w-5xl mx-auto"
          >
            <div className="border-l-8 border-[#ff0000] pl-6 md:pl-10 mb-16">
              <motion.h2 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 leading-tight text-white"
              >
                You already match <span className="text-[#ff0000]">8</span> open opportunities.
              </motion.h2>
              <motion.h3 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="text-2xl md:text-4xl font-bold uppercase tracking-tighter text-zinc-400 mb-2"
              >
                <span className="text-white">3</span> casting calls near you.
              </motion.h3>
              <motion.h3 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 }}
                className="text-xl md:text-3xl font-bold uppercase tracking-tighter text-zinc-500"
              >
                <span className="text-white">2</span> directors viewed similar profiles today.
              </motion.h3>
            </div>

            {/* Blurred Variable Rewards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 pointer-events-none select-none">
              {[1, 2].map((item, i) => (
                <motion.div 
                  key={item}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.5 + (i * 0.2) }}
                  className="p-6 md:p-8 border-4 border-zinc-800 bg-zinc-900/50 flex flex-col gap-4 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start blur-[6px]">
                    <div className="w-2/3 h-8 bg-zinc-700"></div>
                    <div className="w-16 h-8 bg-[#ff0000]"></div>
                  </div>
                  <div className="w-full h-4 bg-zinc-800 blur-[4px] mt-4"></div>
                  <div className="w-4/5 h-4 bg-zinc-800 blur-[4px]"></div>
                  
                  {/* Aggressive lock overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[#ff0000] text-3xl font-black uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] -rotate-6">CLASSIFIED</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2 }}
              onClick={enterDashboard}
              className="w-full relative group px-12 py-8 bg-[#ff0000] border-4 border-[#ff0000] hover:bg-black transition-colors duration-300"
            >
              <div className="relative z-10 flex items-center justify-center gap-4 text-black group-hover:text-[#ff0000] transition-colors duration-300">
                <span className="text-3xl md:text-5xl font-black uppercase tracking-tighter">UNLOCK DASHBOARD</span>
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </div>
            </motion.button>
          </motion.div>
        )}
        
      </AnimatePresence>
    </main>
  );
}
